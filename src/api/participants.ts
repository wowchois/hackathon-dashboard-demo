import { supabase } from '../lib/supabase';
import type { Participant } from '../data/mockData';

// supabase.functions.invoke()의 기본 Authorization 헤더는 anon 키이므로
// Edge Function 호출 시 세션 JWT를 명시적으로 전달해야 한다.
// (Supabase 인프라의 verify_jwt 활성화 시 anon 키 → 401 반환)
async function edgeFnHeaders(): Promise<{ Authorization: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('인증 세션이 없습니다.');
  return { Authorization: `Bearer ${session.access_token}` };
}

// FunctionsHttpError (4xx) 응답 body의 실제 에러 메시지를 추출해 throw
async function throwFromInvokeError(error: unknown): Promise<never> {
  if (error && typeof error === 'object' && 'context' in error) {
    try {
      const body = await (error as { context: Response }).context.json() as { error?: string };
      if (body.error) throw new Error(body.error);
    } catch (inner) {
      if (inner instanceof Error && inner.message) throw inner;
    }
  }
  throw error as Error;
}

interface DBParticipant {
  id: string;
  user_id: string | null;
  name: string;
  employee_id: string;
  team_id: string | null;
  department: string;
  position: string;
  status: 'approved' | 'pending' | 'rejected';
  is_leader: boolean;
}

function fromDB(row: DBParticipant): Participant {
  return {
    id: row.id,
    name: row.name,
    employeeId: row.employee_id ?? '',
    team: row.team_id ?? '',
    department: row.department ?? '',
    position: row.position ?? '',
    status: row.status ?? 'pending',
    userId: row.user_id ?? undefined,
    isLeader: row.is_leader ?? false,
  };
}

export async function apiFetchParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as DBParticipant[]).map(fromDB);
}

export async function apiAddParticipant(p: Omit<Participant, 'id'>): Promise<Participant> {
  const employeeId = p.employeeId.toUpperCase();
  const { data, error } = await supabase
    .from('participants')
    .insert({
      name: p.name,
      employee_id: employeeId,
      email: `${employeeId}@hackathon.com`,
      team_id: p.team || null,
      department: p.department,
      position: p.position,
      status: p.status,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDB(data as DBParticipant);
}

// Edge Function으로 auth user + participant 동시 생성 (admin 전용 또는 팀장)
export async function apiCreateParticipantWithAuth(
  p: Omit<Participant, 'id'>,
  password?: string
): Promise<Participant> {
  const body: Record<string, unknown> = {
    action: 'create',
    name: p.name,
    employee_id: p.employeeId,
    department: p.department,
    position: p.position,
    team_id: p.team || null,
    status: p.status,
    is_leader: p.isLeader ?? false,
  };
  // password 미제공 시 Edge Function이 IMPORT_DEFAULT_PASSWORD 환경변수 사용
  if (password) body.password = password;
  const { data, error } = await supabase.functions.invoke('participant-admin', {
    body,
    headers: await edgeFnHeaders(),
  });
  if (error) await throwFromInvokeError(error);
  if (data?.error) throw new Error(data.error);
  return fromDB(data.participant as DBParticipant);
}

export async function apiUpdateParticipant(
  id: string,
  partial: Partial<Omit<Participant, 'id'>>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if ('name' in partial) patch.name = partial.name;
  if ('employeeId' in partial && partial.employeeId !== undefined) {
    const employeeId = partial.employeeId.toUpperCase();
    patch.employee_id = employeeId;
    patch.email = `${employeeId}@hackathon.com`;
  }
  if ('team' in partial) patch.team_id = partial.team || null;
  if ('department' in partial) patch.department = partial.department;
  if ('position' in partial) patch.position = partial.position;
  if ('status' in partial) patch.status = partial.status;
  const { error } = await supabase.from('participants').update(patch).eq('id', id);
  if (error) throw error;
}

// Edge Function으로 participant 수정 (service_role → RLS 우회)
// userId가 있으면 auth user metadata도 함께 동기화
export async function apiUpdateParticipantWithAuth(
  participantId: string,
  userId: string | undefined,
  partial: Partial<Omit<Participant, 'id'>>
): Promise<void> {
  const body: Record<string, unknown> = {
    action: 'update',
    participant_id: participantId,
  };
  if (userId !== undefined) body.user_id = userId;
  if ('name' in partial) body.name = partial.name;
  if ('employeeId' in partial) body.employee_id = partial.employeeId;
  if ('team' in partial) body.team_id = partial.team || null;
  if ('department' in partial) body.department = partial.department;
  if ('position' in partial) body.position = partial.position;
  if ('status' in partial) body.status = partial.status;
  if ('isLeader' in partial) body.is_leader = partial.isLeader;
  const { data, error } = await supabase.functions.invoke('participant-admin', {
    body,
    headers: await edgeFnHeaders(),
  });
  if (error) await throwFromInvokeError(error);
  if (data?.error) throw new Error(data.error);
}

export async function apiDeleteParticipant(id: string): Promise<void> {
  const { error } = await supabase.from('participants').delete().eq('id', id);
  if (error) throw error;
}

// Edge Function으로 auth user + participant 동시 삭제 (admin 전용)
export async function apiDeleteParticipantWithAuth(
  participantId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('participant-admin', {
    body: {
      action: 'delete',
      participant_id: participantId,
      user_id: userId,
    },
    headers: await edgeFnHeaders(),
  });
  if (error) await throwFromInvokeError(error);
  if (data?.error) throw new Error(data.error);
}

export async function apiFetchParticipantByEmployeeId(employeeId: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('employee_id', employeeId.toUpperCase())
    .single();
  if (error) return null;
  return fromDB(data as DBParticipant);
}

export async function apiFetchParticipantByUserId(userId: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return fromDB(data as DBParticipant);
}

// 비밀번호 초기화 (IMPORT_DEFAULT_PASSWORD + must_change_password 플래그)
export async function apiResetParticipantPassword(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('participant-admin', {
    body: { action: 'reset-password', user_id: userId },
    headers: await edgeFnHeaders(),
  });
  if (error) await throwFromInvokeError(error);
  if (data?.error) throw new Error(data.error);
}

// 레거시 참가자에 user_id 연결
export async function apiLinkParticipant(participantId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .update({ user_id: userId })
    .eq('id', participantId);
  if (error) throw error;
}
