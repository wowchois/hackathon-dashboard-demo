import { supabase } from '../lib/supabase';
import type { Participant } from '../data/mockData';

interface DBParticipant {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  team_id: string | null;
  department: string;
  position: string;
  status: 'approved' | 'pending' | 'rejected';
}

function fromDB(row: DBParticipant): Participant {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    team: row.team_id ?? '',
    department: row.department ?? '',
    position: row.position ?? '',
    status: row.status ?? 'pending',
    userId: row.user_id ?? undefined,
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
  const { data, error } = await supabase
    .from('participants')
    .insert({
      name: p.name,
      email: p.email,
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

// Edge Function으로 auth user + participant 동시 생성 (admin 전용)
export async function apiCreateParticipantWithAuth(
  p: Omit<Participant, 'id'>,
  password: string
): Promise<Participant> {
  const { data, error } = await supabase.functions.invoke('participant-admin', {
    body: {
      action: 'create',
      name: p.name,
      email: p.email,
      password,
      department: p.department,
      position: p.position,
      team_id: p.team || null,
      status: p.status,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return fromDB(data.participant as DBParticipant);
}

export async function apiUpdateParticipant(
  id: string,
  partial: Partial<Omit<Participant, 'id'>>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if ('name' in partial) patch.name = partial.name;
  if ('email' in partial) patch.email = partial.email;
  if ('team' in partial) patch.team_id = partial.team || null;
  if ('department' in partial) patch.department = partial.department;
  if ('position' in partial) patch.position = partial.position;
  if ('status' in partial) patch.status = partial.status;
  const { error } = await supabase.from('participants').update(patch).eq('id', id);
  if (error) throw error;
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
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function apiFetchParticipantByEmail(email: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('email', email)
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

// 레거시 참가자에 user_id 연결
export async function apiLinkParticipant(participantId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .update({ user_id: userId })
    .eq('id', participantId);
  if (error) throw error;
}
