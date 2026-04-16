// Required SQL migration:
// CREATE TABLE IF NOT EXISTS submissions (
//   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//   team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
//   github_url TEXT NOT NULL DEFAULT '',
//   slides_url TEXT NOT NULL DEFAULT '',
//   description TEXT NOT NULL DEFAULT '',
//   submitted_at TIMESTAMPTZ DEFAULT NOW(),
//   UNIQUE(team_id)
// );

import { supabase } from '../lib/supabase';

function normalizeHttpsUrl(value: string, fieldName: string): string {
  const trimmed = value.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} must be a valid URL.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${fieldName} must use https.`);
  }

  return parsed.toString();
}

export interface Submission {
  id: string;
  teamId: string;
  githubUrl: string;
  slidesUrl: string;
  description: string;
  submittedAt: string;
}

interface DBSubmission {
  id: string;
  team_id: string;
  github_url: string;
  slides_url: string;
  description: string;
  submitted_at: string;
}

function fromDB(row: DBSubmission): Submission {
  const d = new Date(row.submitted_at);
  const pad = (n: number) => String(n).padStart(2, '0');
  const submittedAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    id: row.id,
    teamId: row.team_id,
    githubUrl: row.github_url,
    slidesUrl: row.slides_url,
    description: row.description,
    submittedAt,
  };
}

export async function apiFetchAllSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase.from('submissions').select('*');
  if (error) throw error;
  return ((data ?? []) as DBSubmission[]).map(fromDB);
}

export async function apiFetchSubmission(teamId: string): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('team_id', teamId)
    .single();
  if (error) return null;
  return fromDB(data as DBSubmission);
}

export async function apiUpsertSubmission(
  teamId: string,
  payload: { githubUrl: string; slidesUrl: string; description: string }
): Promise<void> {
  const githubUrl = normalizeHttpsUrl(payload.githubUrl, 'GitHub URL');
  const slidesUrl = normalizeHttpsUrl(payload.slidesUrl, 'Slides URL');

  const { error } = await supabase
    .from('submissions')
    .upsert(
      {
        team_id: teamId,
        github_url: githubUrl,
        slides_url: slidesUrl,
        description: payload.description,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'team_id' }
    );
  if (error) throw error;
}
