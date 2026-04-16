import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // ── 호출자 인증 확인 (admin 역할만 허용) ────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (caller?.user_metadata?.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403);
  }

  // ── service_role 클라이언트 (DB 직접 조작 권한) ─────────────
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const body = await req.json();
  const { action } = body;

  // ── 참가자 생성 ──────────────────────────────────────────────
  if (action === 'create') {
    const { name, email, password, department, position, team_id, status } = body;

    // 1. auth user 생성
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,                          // 이메일 확인 생략
      user_metadata: { role: 'participant', name, must_change_password: true },
    });
    if (authError) return json({ error: authError.message }, 400);

    // 2. participants 행 삽입
    const { data: participant, error: dbError } = await admin
      .from('participants')
      .insert({
        user_id: authData.user.id,
        name,
        email,
        team_id: team_id || null,
        department: department ?? '',
        position: position ?? '',
        status: status ?? 'pending',
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

  // ── 참가자 수정 ──────────────────────────────────────────────
  if (action === 'update') {
    const { participant_id, user_id, name, team_id, department, position, status } = body;

    // 1. participants 행 업데이트
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (team_id !== undefined) patch.team_id = team_id;
    if (department !== undefined) patch.department = department;
    if (position !== undefined) patch.position = position;
    if (status !== undefined) patch.status = status;

    const { error: dbError } = await admin
      .from('participants')
      .update(patch)
      .eq('id', participant_id);

    if (dbError) return json({ error: dbError.message }, 400);

    // 2. auth user metadata 업데이트 (이름 변경 시)
    if (user_id && name !== undefined) {
      const { error: authError } = await admin.auth.admin.updateUserById(user_id, {
        user_metadata: { name },
      });
      if (authError) return json({ error: authError.message }, 400);
    }

    return json({ success: true });
  }

  // ── 참가자 삭제 ──────────────────────────────────────────────
  if (action === 'delete') {
    const { participant_id, user_id } = body;

    // 1. participants 행 삭제
    const { error: dbError } = await admin
      .from('participants')
      .delete()
      .eq('id', participant_id);

    if (dbError) return json({ error: dbError.message }, 400);

    // 2. 연결된 auth user 삭제
    if (user_id) {
      const { error: authError } = await admin.auth.admin.deleteUser(user_id);
      if (authError) return json({ error: authError.message }, 400);
    }

    return json({ success: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
