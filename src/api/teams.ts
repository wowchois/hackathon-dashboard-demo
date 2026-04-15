import { supabase } from '../lib/supabase';

export interface TeamRow {
  id: string;
  name: string;
  idea: string;
  submit_status: 'submitted' | 'not-submitted';
  locked: boolean;
}

export async function apiFetchTeams(): Promise<TeamRow[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

export async function apiAddTeam(data: { name: string; idea: string }): Promise<TeamRow> {
  const { data: row, error } = await supabase
    .from('teams')
    .insert({ name: data.name, idea: data.idea, submit_status: 'not-submitted', locked: false })
    .select()
    .single();
  if (error) throw error;
  return row as TeamRow;
}

export async function apiUpdateTeam(
  id: string,
  patch: Partial<{ name: string; idea: string; submit_status: string; locked: boolean }>
): Promise<void> {
  const { error } = await supabase.from('teams').update(patch).eq('id', id);
  if (error) throw error;
}

export async function apiDeleteTeam(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}

export async function apiFetchTeamById(id: string): Promise<TeamRow | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as TeamRow;
}
