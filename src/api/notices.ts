import { supabase } from '../lib/supabase';
import type { Notice, NoticeFile } from '../data/mockData';

interface DBNoticeFile {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

interface DBNotice {
  id: string;
  title: string;
  content: string;
  author: string;
  is_public: boolean;
  created_at: string;
  notice_files: DBNoticeFile[];
}

function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromDB(row: DBNotice): Notice {
  const files: NoticeFile[] = (row.notice_files ?? []).map((f) => ({
    id: f.id,
    fileName: f.file_name,
    fileSize: f.file_size,
    mimeType: f.mime_type,
  }));
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author ?? '관리자',
    date: toLocalDateStr(row.created_at),
    isPublic: row.is_public ?? true,
    files,
  };
}

export async function apiFetchNotices(opts?: { publicOnly?: boolean }): Promise<Notice[]> {
  let q = supabase
    .from('notices')
    .select('*, notice_files(id, file_name, file_size, mime_type)')
    .order('created_at', { ascending: false });
  if (opts?.publicOnly) q = q.eq('is_public', true);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as DBNotice[]).map(fromDB);
}

export async function apiAddNotice(
  notice: Pick<Notice, 'title' | 'content'> & { isPublic?: boolean }
): Promise<Notice> {
  const { data, error } = await supabase
    .from('notices')
    .insert({
      title: notice.title,
      content: notice.content,
      author: '관리자',
      is_public: notice.isPublic ?? true,
    })
    .select('*, notice_files(id, file_name, file_size, mime_type)')
    .single();
  if (error) throw error;
  return fromDB(data as DBNotice);
}

export async function apiUpdateNotice(
  id: string,
  notice: Pick<Notice, 'title' | 'content'> & { isPublic?: boolean }
): Promise<void> {
  const patch: Record<string, unknown> = {
    title: notice.title,
    content: notice.content,
  };
  if ('isPublic' in notice) patch.is_public = notice.isPublic;
  const { error } = await supabase.from('notices').update(patch).eq('id', id);
  if (error) throw error;
}

export async function apiDeleteNotice(id: string): Promise<void> {
  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (error) throw error;
}
