import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://your-domain.com", // prd 도메인으로 변경
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEAM_MEMBERS = 5;
const TEAM_MEMBER_LIMIT_MESSAGE = `팀은 최대 ${MAX_TEAM_MEMBERS}명까지 구성할 수 있습니다.`;

async function isTeamFull(
  admin: ReturnType<typeof createClient>,
  teamId: string,
  excludingParticipantId?: string,
) {
  let query = admin
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  if (excludingParticipantId) {
    query = query.neq("id", excludingParticipantId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) >= MAX_TEAM_MEMBERS;
}

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

  // ── service_role 클라이언트 (auth admin + DB 직접 조작) ────────
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── 역할 확인 (app_metadata + participants 연결 행) ───────────
  const caller = userData.user;
  const callerRole = caller.app_metadata?.role;
  const isAdmin = callerRole === "admin";

  const { data: callerParticipant } = await admin
    .from("participants")
    .select("id, team_id, is_leader")
    .eq("user_id", caller.id)
    .maybeSingle();

  // 기존/수동 생성 계정은 app_metadata.role이 없을 수 있으므로
  // participants.user_id로 연결된 인증 사용자는 participant로 인정한다.
  const isParticipant = callerRole === "participant" || !!callerParticipant;

  // admin 또는 participant(팀장 여부는 create 내부에서 추가 검증)만 허용
  if (!isAdmin && !isParticipant) return json({ error: "Forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { action } = body;

  // participant는 create, vote-attendance만 허용 (update, delete, reset-password는 admin 전용)
  if (!isAdmin && action !== "create" && action !== "vote-attendance") {
    return json({ error: "Forbidden" }, 403);
  }

  // ── 참가자 생성 ────────────────────────────────────────────────
  if (action === "create") {
    const { name, email, password, department, position, team_id, status, is_leader } = body;

    if (!email || !name) return json({ error: "email, name은 필수입니다." }, 400);

    // 이메일 중복 사전 체크
    const { data: existingByEmail } = await admin
      .from("participants")
      .select("id")
      .eq("email", email as string)
      .maybeSingle();
    if (existingByEmail) {
      return json({ error: "이미 등록된 이메일입니다." }, 409);
    }

    let resolvedTeamId = (team_id as string | undefined) || null;
    let resolvedIsLeader = (is_leader as boolean | undefined) ?? false;

    if (!isAdmin) {
      const leaderRow = callerParticipant;

      if (!leaderRow?.is_leader) {
        return json({ error: "팀장만 팀원을 추가할 수 있습니다." }, 403);
      }
      if (!leaderRow.team_id) {
        return json({ error: "팀에 소속되지 않은 팀장입니다." }, 400);
      }

      // 팀 잠금 여부 확인
      const { data: teamRow } = await admin
        .from("teams")
        .select("locked")
        .eq("id", leaderRow.team_id)
        .single();
      if (teamRow?.locked) {
        return json({ error: "잠금된 팀에는 팀원을 추가할 수 없습니다. 관리자에게 문의하세요." }, 403);
      }

      // 팀장은 자신의 팀에만 추가 가능, is_leader·status 강제 고정
      resolvedTeamId = leaderRow.team_id;
      resolvedIsLeader = false;
    }

    if (resolvedTeamId) {
      try {
        if (await isTeamFull(admin, resolvedTeamId)) {
          return json({ error: TEAM_MEMBER_LIMIT_MESSAGE }, 403);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "팀원 수 확인에 실패했습니다.";
        return json({ error: message }, 400);
      }
    }

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
        team_id: resolvedTeamId,
        department: department ?? "",
        position: position ?? "",
        status: isAdmin ? (status ?? "pending") : "pending",
        is_leader: resolvedIsLeader,
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

  // ── 참가자 수정 (admin 전용) ───────────────────────────────────
  if (action === "update") {
    const { participant_id, user_id, name, team_id, department, position, status, is_leader } = body;

    if (!participant_id) return json({ error: "participant_id가 필요합니다." }, 400);

    if (team_id) {
      const { data: currentParticipant, error: currentError } = await admin
        .from("participants")
        .select("team_id")
        .eq("id", participant_id as string)
        .single();
      if (currentError) return json({ error: currentError.message }, 400);

      if (currentParticipant?.team_id !== team_id) {
        try {
          if (await isTeamFull(admin, team_id as string, participant_id as string)) {
            return json({ error: TEAM_MEMBER_LIMIT_MESSAGE }, 403);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "팀원 수 확인에 실패했습니다.";
          return json({ error: message }, 400);
        }
      }
    }

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (team_id !== undefined) patch.team_id = team_id;
    if (department !== undefined) patch.department = department;
    if (position !== undefined) patch.position = position;
    if (status !== undefined) patch.status = status;
    if (is_leader !== undefined) patch.is_leader = is_leader;

    if (Object.keys(patch).length === 0) return json({ error: "수정할 항목이 없습니다." }, 400);

    const { error: dbError } = await admin
      .from("participants")
      .update(patch)
      .eq("id", participant_id as string);

    if (dbError) return json({ error: dbError.message }, 400);

    // auth user 이름 동기화 (이름 변경 시) — DB 업데이트 성공 후 진행, 실패해도 non-fatal
    if (user_id && name !== undefined) {
      const { error: authError } = await admin.auth.admin.updateUserById(
        user_id as string,
        { user_metadata: { name } }
      );
      if (authError) {
        console.warn("auth metadata sync failed (non-fatal):", authError.message);
      }
    }

    return json({ success: true });
  }

  // ── 참가자 삭제 (admin 전용) ───────────────────────────────────
  if (action === "delete") {
    const { participant_id, user_id } = body;

    if (!participant_id) return json({ error: "participant_id가 필요합니다." }, 400);

    // auth 먼저 삭제 → ON DELETE SET NULL이 participant.user_id 자동 처리
    if (user_id) {
      const { error: authError } = await admin.auth.admin.deleteUser(user_id as string);
      if (authError) return json({ error: authError.message }, 400);
    }

    const { error: dbError } = await admin
      .from("participants")
      .delete()
      .eq("id", participant_id as string);

    if (dbError) return json({ error: dbError.message }, 400);

    return json({ success: true });
  }

  // ── 비밀번호 초기화 (admin 전용) ──────────────────────────────
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

  // ── 참석 투표 (participant 전용) ──────────────────────────────
  if (action === "vote-attendance") {
    const { milestone_id, attending } = body;

    if (!milestone_id) return json({ error: "milestone_id가 필요합니다." }, 400);
    if (typeof attending !== "boolean") return json({ error: "attending은 boolean이어야 합니다." }, 400);

    if (!callerParticipant) {
      return json({ error: "참가자 정보를 찾을 수 없습니다." }, 404);
    }

    // 마일스톤 날짜 조회
    const { data: milestone, error: milestoneError } = await admin
      .from("milestones")
      .select("date")
      .eq("id", milestone_id as string)
      .single();

    if (milestoneError || !milestone) {
      return json({ error: "일정을 찾을 수 없습니다." }, 404);
    }

    // 투표 가능 기간 확인 (KST 기준: 7일 전 자정 ~ 당일 평일 18:00 / 주말 10:00)
    const milestoneDateStr = milestone.date as string; // "YYYY-MM-DD"
    const now = new Date();

    const kstMidnight = new Date(`${milestoneDateStr}T00:00:00+09:00`);
    const openTime = new Date(kstMidnight.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 요일 판단: 정오 KST(03:00 UTC)로 UTC 날짜와 KST 날짜를 동일하게 맞춤
    const dayOfWeek = new Date(`${milestoneDateStr}T12:00:00+09:00`).getUTCDay(); // 0=일, 6=토
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const closeHour = isWeekend ? 10 : 18;
    const closeTime = new Date(`${milestoneDateStr}T${String(closeHour).padStart(2, "0")}:00:00+09:00`);

    if (now < openTime || now > closeTime) {
      return json({
        error: "투표 가능 기간이 아닙니다. 일정 7일 전부터 당일 (평일 오후 6시, 주말 오전 10시)까지 투표할 수 있습니다.",
      }, 403);
    }

    const { error: upsertError } = await admin
      .from("milestone_attendances")
      .upsert(
        {
          milestone_id,
          participant_id: callerParticipant.id,
          attending,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "milestone_id,participant_id" }
      );

    if (upsertError) return json({ error: upsertError.message }, 400);

    return json({ success: true });
  }

  return json({ error: "Unknown action" }, 400);
});
