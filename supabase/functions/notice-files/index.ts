import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://your-domain.com", // prd 도메인으로 변경
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "text/plain",
  "application/zip",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── 환경변수 ───────────────────────────────────────────────────
  const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET,
  } = Deno.env.toObject();

  if (
    !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY ||
    !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET
  ) {
    return json({ error: "Server misconfigured" }, 500);
  }

  // ── JWT 인증 ───────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const accessToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return json({ error: "Unauthorized" }, 401);

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const caller = userData.user;
  const isAdmin = caller.app_metadata?.role === "admin";

  // ── S3 클라이언트 ──────────────────────────────────────────────
  const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { action } = body;

  // ── 업로드 URL 발급 (admin only) ──────────────────────────────
  if (action === "upload-url") {
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { notice_id, file_name, file_size, mime_type } = body;
    if (!notice_id || !file_name || !file_size || !mime_type) {
      return json(
        { error: "notice_id, file_name, file_size, mime_type은 필수입니다." },
        400,
      );
    }
    if ((file_size as number) > MAX_FILE_SIZE) {
      return json({ error: "파일 크기는 10MB를 초과할 수 없습니다." }, 400);
    }
    if (!ALLOWED_MIME_TYPES.has(mime_type as string)) {
      return json({ error: "허용되지 않는 파일 형식입니다." }, 400);
    }

    // 공지 존재 확인
    const { data: notice, error: noticeError } = await admin
      .from("notices")
      .select("id")
      .eq("id", notice_id as string)
      .single();
    if (noticeError || !notice) {
      return json({ error: "공지사항을 찾을 수 없습니다." }, 404);
    }

    // UUID 기반 S3 key 생성 (경로 예측 불가)
    const ext = (file_name as string).split(".").pop()?.toLowerCase() ?? "bin";
    const fileUuid = crypto.randomUUID();
    const s3Key = `notices/${notice_id}/${fileUuid}.${ext}`;

    // Presigned PUT URL 발급 (5분)
    const putCommand = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: s3Key,
      ContentType: mime_type as string,
    });
    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 300 });

    // DB에 파일 메타데이터 사전 삽입
    const { data: fileRecord, error: dbError } = await admin
      .from("notice_files")
      .insert({
        notice_id: notice_id as string,
        file_name: file_name as string,
        s3_key: s3Key,
        file_size: file_size as number,
        mime_type: mime_type as string,
      })
      .select()
      .single();

    if (dbError) return json({ error: dbError.message }, 400);

    return json({
      upload_url: uploadUrl,
      file_id: fileRecord.id,
      s3_key: s3Key,
    });
  }

  // ── 다운로드 URL 발급 (인증된 사용자, RLS로 접근 제어) ──────────
  if (action === "download-url") {
    const { file_id } = body;
    if (!file_id) return json({ error: "file_id가 필요합니다." }, 400);

    // callerClient로 조회 → notice_files RLS가 공개 여부 자동 필터
    const { data: file, error: fileError } = await callerClient
      .from("notice_files")
      .select("s3_key, file_name")
      .eq("id", file_id as string)
      .single();

    if (fileError || !file) {
      return json(
        { error: "파일을 찾을 수 없거나 접근 권한이 없습니다." },
        404,
      );
    }

    // Presigned GET URL 발급 (1시간)
    const getCommand = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: file.s3_key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
    });
    const downloadUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 });

    return json({ download_url: downloadUrl });
  }

  // ── DB 레코드만 삭제 (S3 업로드 실패 시 orphan 정리용, admin only) ──
  if (action === "delete-record") {
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { file_id } = body;
    if (!file_id) return json({ error: "file_id가 필요합니다." }, 400);

    const { error: dbError } = await admin
      .from("notice_files")
      .delete()
      .eq("id", file_id as string);

    if (dbError) return json({ error: dbError.message }, 400);

    return json({ success: true });
  }

  // ── 파일 삭제 (S3 + DB, admin only) ──────────────────────────
  if (action === "delete-file") {
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { file_id } = body;
    if (!file_id) return json({ error: "file_id가 필요합니다." }, 400);

    const { data: file, error: fileError } = await admin
      .from("notice_files")
      .select("s3_key")
      .eq("id", file_id as string)
      .single();

    if (fileError || !file) {
      return json({ error: "파일을 찾을 수 없습니다." }, 404);
    }

    // S3 삭제 → DB 삭제 순서로 진행 (S3 실패 시 DB는 보존)
    await s3.send(
      new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET, Key: file.s3_key }),
    );

    const { error: dbError } = await admin
      .from("notice_files")
      .delete()
      .eq("id", file_id as string);

    if (dbError) return json({ error: dbError.message }, 400);

    return json({ success: true });
  }

  return json({ error: "Unknown action" }, 400);
});
