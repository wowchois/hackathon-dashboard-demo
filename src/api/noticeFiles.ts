import { supabase } from '../lib/supabase';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notice-files`;

async function call(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Unauthorized');

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

export async function apiGetUploadUrl(
  noticeId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
): Promise<{ uploadUrl: string; fileId: string }> {
  const data = await call('upload-url', {
    notice_id: noticeId,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
  });
  return { uploadUrl: data.upload_url, fileId: data.file_id };
}

export async function apiUploadToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('S3 업로드에 실패했습니다.');
}

export async function apiGetDownloadUrl(fileId: string): Promise<string> {
  const data = await call('download-url', { file_id: fileId });
  return data.download_url as string;
}

export async function apiDeleteNoticeFile(fileId: string): Promise<void> {
  await call('delete-file', { file_id: fileId });
}

export async function apiDeleteNoticeFileRecord(fileId: string): Promise<void> {
  await call('delete-record', { file_id: fileId });
}
