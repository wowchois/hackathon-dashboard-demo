import { supabase } from '../lib/supabase';
import type { Milestone } from '../data/mockData';

interface DBMilestone {
  id: string;
  title: string;
  date: string;
  description: string | null;
  is_public: boolean;
}

function isDone(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function fromDB(row: DBMilestone): Milestone {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    description: row.description ?? undefined,
    isPublic: row.is_public ?? true,
    isDone: isDone(row.date),
  };
}

export async function apiFetchMilestones(): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .order('date', { ascending: true });
  if (error) throw error;
  return (data as DBMilestone[]).map(fromDB);
}

export async function apiAddMilestone(
  payload: Pick<Milestone, 'title' | 'date'> & { description?: string; isPublic: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('milestones')
    .insert({
      title: payload.title,
      date: payload.date,
      description: payload.description || null,
      is_public: payload.isPublic,
    });
  if (error) throw error;
}

export async function apiUpdateMilestone(
  id: string,
  partial: Partial<Pick<Milestone, 'title' | 'date' | 'description' | 'isPublic'>>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if ('title' in partial) patch.title = partial.title;
  if ('date' in partial) patch.date = partial.date;
  if ('description' in partial) patch.description = partial.description || null;
  if ('isPublic' in partial) patch.is_public = partial.isPublic;
  const { error } = await supabase.from('milestones').update(patch).eq('id', id);
  if (error) throw error;
}

export async function apiDeleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) throw error;
}
