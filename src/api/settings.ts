import { supabase } from '../lib/supabase';

export interface Settings {
  submissionDeadline: string | null;
  scoresPublished: boolean;
  creativityMax: number;
  practicalityMax: number;
  completionMax: number;
  presentationMax: number;
}

interface DBSettings {
  id: number;
  submission_deadline: string | null;
  scores_published: boolean;
  creativity_max: number;
  practicality_max: number;
  completion_max: number;
  presentation_max: number;
}

export const DEFAULT_SETTINGS: Settings = {
  submissionDeadline: null,
  scoresPublished: false,
  creativityMax: 25,
  practicalityMax: 25,
  completionMax: 25,
  presentationMax: 25,
};

function fromDB(row: DBSettings): Settings {
  return {
    submissionDeadline: row.submission_deadline,
    scoresPublished: row.scores_published,
    creativityMax: row.creativity_max,
    practicalityMax: row.practicality_max,
    completionMax: row.completion_max,
    presentationMax: row.presentation_max,
  };
}

export async function apiFetchSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) return DEFAULT_SETTINGS;
  return fromDB(data as DBSettings);
}

export async function apiUpsertSettings(patch: Partial<Settings>): Promise<void> {
  const row: Partial<DBSettings> & { id: number } = { id: 1 };
  if (patch.submissionDeadline !== undefined) row.submission_deadline = patch.submissionDeadline;
  if (patch.scoresPublished !== undefined) row.scores_published = patch.scoresPublished;
  if (patch.creativityMax !== undefined) row.creativity_max = patch.creativityMax;
  if (patch.practicalityMax !== undefined) row.practicality_max = patch.practicalityMax;
  if (patch.completionMax !== undefined) row.completion_max = patch.completionMax;
  if (patch.presentationMax !== undefined) row.presentation_max = patch.presentationMax;
  const { error } = await supabase.from('settings').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/** 제출 기간 여부 — deadline 미설정이면 열려있음 */
export function isSubmissionOpen(settings: Settings): boolean {
  if (!settings.submissionDeadline) return true;
  return new Date() < new Date(settings.submissionDeadline);
}

/** 심사 기간 여부 — 제출 마감 후 ~ 결과 공개 전 */
export function isJudgingOpen(settings: Settings): boolean {
  if (!settings.submissionDeadline) return false;
  return new Date() >= new Date(settings.submissionDeadline) && !settings.scoresPublished;
}
