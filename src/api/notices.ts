import { supabase } from '../lib/supabase';
import type { Notice } from '../data/mockData';

interface DBNotice {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
}

function fromDB(row: DBNotice): Notice {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author ?? '관리자',
    date: row.created_at.split('T')[0],
  };
}

export async function apiFetchNotices(): Promise<Notice[]> {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DBNotice[]).map(fromDB);
}

export async function apiAddNotice(notice: Pick<Notice, 'title' | 'content'>): Promise<Notice> {
  const { data, error } = await supabase
    .from('notices')
    .insert({ title: notice.title, content: notice.content, author: '관리자' })
    .select()
    .single();
  if (error) throw error;
  return fromDB(data as DBNotice);
}

export async function apiUpdateNotice(id: string, notice: Pick<Notice, 'title' | 'content'>): Promise<void> {
  const { error } = await supabase
    .from('notices')
    .update({ title: notice.title, content: notice.content })
    .eq('id', id);
  if (error) throw error;
}

export async function apiDeleteNotice(id: string): Promise<void> {
  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (error) throw error;
}
