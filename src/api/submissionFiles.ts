import { supabase } from '../lib/supabase';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submission-files`;

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

export interface SubmissionFile {
  id: string;
  teamId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface DBSubmissionFile {
  id: string;
  team_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

function fromDB(row: DBSubmissionFile): SubmissionFile {
  return {
    id: row.id,
    teamId: row.team_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    uploadedAt: row.uploaded_at,
  };
}

export async function apiFetchSubmissionFile(teamId: string): Promise<SubmissionFile | null> {
  const { data, error } = await supabase
    .from('submission_files')
    .select('*')
    .eq('team_id', teamId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return fromDB(data as DBSubmissionFile);
}

export async function apiFetchAllSubmissionFiles(): Promise<SubmissionFile[]> {
  const { data, error } = await supabase
    .from('submission_files')
    .select('*');
  if (error) return [];
  return ((data ?? []) as DBSubmissionFile[]).map(fromDB);
}

export async function apiGetSubmissionUploadUrl(
  teamId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
): Promise<{ uploadUrl: string; fileId: string }> {
  const data = await call('upload-url', {
    team_id: teamId,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
  });
  return { uploadUrl: data.upload_url, fileId: data.file_id };
}

export async function apiUploadSubmissionToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('S3 업로드에 실패했습니다.');
}

export async function apiGetSubmissionDownloadUrl(fileId: string): Promise<string> {
  const data = await call('download-url', { file_id: fileId });
  return data.download_url as string;
}

export async function apiDeleteSubmissionFile(fileId: string): Promise<void> {
  await call('delete-file', { file_id: fileId });
}

export async function apiDeleteSubmissionFileRecord(fileId: string): Promise<void> {
  await call('delete-record', { file_id: fileId });
}
