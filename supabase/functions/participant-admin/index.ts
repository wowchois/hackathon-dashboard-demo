import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── 환경변수 확인 ──────────────────────────────────────────────
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } =
    Deno.env.toObject();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Server misconfigured" }, 500);
  }

  // ── JWT 추출 ───────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1];
  if (!accessToken) return json({ error: "Unauthorized" }, 401);

  // ── JWT 검증 (anon 클라이언트 + 사용자 JWT 주입 — Supabase 공식 방식) ──
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

  // ── admin 역할 확인 ────────────────────────────────────────────
  // app_metadata 우선 (서버 전용, 위변조 불가), user_metadata 폴백 (레거시 계정 호환)
  const caller = userData.user;
  const callerRole = caller.app_metadata?.role ?? caller.user_metadata?.role;
  if (callerRole !== "admin") return json({ error: "Forbidden" }, 403);

  // ── service_role 클라이언트 (auth admin + DB 직접 조작) ────────
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { action } = body;

  // ── 참가자 생성 ────────────────────────────────────────────────
  if (action === "create") {
    const { name, email, password, department, position, team_id, status } = body;

    // password 미제공(엑셀 일괄 등록) 시 서버 환경변수 사용 — 클라이언트에 노출되지 않음
    const resolvedPassword = (password as string | undefined)?.trim()
      || Deno.env.get("IMPORT_DEFAULT_PASSWORD");
    if (!resolvedPassword) return json({ error: "비밀번호가 없고 IMPORT_DEFAULT_PASSWORD 환경변수도 설정되지 않았습니다." }, 500);

    // 1. auth user 생성
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email as string,
      password: resolvedPassword,
      email_confirm: true,
      app_metadata: { role: "participant" },       // 서버 전용 — 클라이언트 수정 불가
      user_metadata: { name, must_change_password: true },
    });
    if (authError) return json({ error: authError.message }, 400);

    // 2. participants 행 삽입
    const { data: participant, error: dbError } = await admin
      .from("participants")
      .insert({
        user_id: authData.user.id,
        name,
        email,
        team_id: team_id || null,
        department: department ?? "",
        position: position ?? "",
        status: status ?? "pending",
      })
      .select()
      .single();

    if (dbError) {
      // 롤백: auth user 삭제
      await admin.auth.admin.deleteUser(authData.user.id);
      return json({ error: dbError.message }, 400);
    }

    return json({ participant });
  }

  // ── 참가자 수정 ────────────────────────────────────────────────
  if (action === "update") {
    const { participant_id, user_id, name, team_id, department, position, status } = body;

    // 1. participants 행 업데이트
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (team_id !== undefined) patch.team_id = team_id;
    if (department !== undefined) patch.department = department;
    if (position !== undefined) patch.position = position;
    if (status !== undefined) patch.status = status;

    const { error: dbError } = await admin
      .from("participants")
      .update(patch)
      .eq("id", participant_id as string);

    if (dbError) return json({ error: dbError.message }, 400);

    // 2. auth user 이름 동기화 (이름 변경 시) — DB 업데이트 성공 후 진행, 실패해도 non-fatal
    if (user_id && name !== undefined) {
      const { error: authError } = await admin.auth.admin.updateUserById(
        user_id as string,
        { user_metadata: { name } }
      );
      if (authError) {
        // auth 동기화 실패는 치명적이지 않음 — DB는 이미 정상 업데이트됨
        console.warn("auth metadata sync failed (non-fatal):", authError.message);
      }
    }

    return json({ success: true });
  }

  // ── 참가자 삭제 ────────────────────────────────────────────────
  if (action === "delete") {
    const { participant_id, user_id } = body;

    // 1. participants 행 삭제
    const { error: dbError } = await admin
      .from("participants")
      .delete()
      .eq("id", participant_id as string);

    if (dbError) return json({ error: dbError.message }, 400);

    // 2. 연결된 auth user 삭제
    if (user_id) {
      const { error: authError } = await admin.auth.admin.deleteUser(
        user_id as string
      );
      if (authError) return json({ error: authError.message }, 400);
    }

    return json({ success: true });
  }

  // ── 비밀번호 초기화 ────────────────────────────────────────────
  if (action === "reset-password") {
    const { user_id } = body;
    if (!user_id) return json({ error: "user_id가 필요합니다." }, 400);

    const defaultPassword = Deno.env.get("IMPORT_DEFAULT_PASSWORD");
    if (!defaultPassword) return json({ error: "IMPORT_DEFAULT_PASSWORD 환경변수가 설정되지 않았습니다." }, 500);

    const { error: authError } = await admin.auth.admin.updateUserById(
      user_id as string,
      {
        password: defaultPassword,
        user_metadata: { must_change_password: true },
      }
    );
    if (authError) return json({ error: authError.message }, 400);

    return json({ success: true });
  }

  return json({ error: "Unknown action" }, 400);
});
