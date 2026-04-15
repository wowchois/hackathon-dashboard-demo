import { supabase } from '../lib/supabase';
import type { Milestone } from '../data/mockData';

interface DBMilestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  description: string | null;
}

function fromDB(row: DBMilestone): Milestone {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    isDone: row.completed ?? false,
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
