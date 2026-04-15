import { supabase } from '../lib/supabase';
import type { Participant } from '../data/mockData';

interface DBParticipant {
  id: string;
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

export async function apiFetchParticipantByEmail(email: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('email', email)
    .single();
  if (error) return null;
  return fromDB(data as DBParticipant);
}
