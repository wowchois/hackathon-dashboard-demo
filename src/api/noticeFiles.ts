import { supabase } from '../lib/supabase';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notice-files`;

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Unauthorized');
  return token;
}

async function call(action: string, payload: Record<string, unknown>) {
  const token = await getToken();
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? '요청에 실패했습니다.');
  return json;
}

export async function apiUploadNoticeFile(noticeId: string, file: File): Promise<string> {
  const token = await getToken();
  const form = new FormData();
  form.append('notice_id', noticeId);
  form.append('file', file);

  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? '업로드에 실패했습니다.');
  return json.file_id as string;
}

export async function apiGetDownloadUrl(fileId: string): Promise<string> {
  const data = await call('download-url', { file_id: fileId });
  return data.download_url as string;
}

export async function apiDeleteNoticeFile(fileId: string): Promise<void> {
  await call('delete-file', { file_id: fileId });
}
