// ── Migration (Phase 1 scores 테이블에 judge_name 컬럼 추가) ──
// Supabase SQL Editor에서 실행:
//   ALTER TABLE scores ADD COLUMN IF NOT EXISTS judge_name TEXT NOT NULL DEFAULT '';
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import type { JudgeScore } from '../data/scoreStore';

export interface DBScore {
  id: string;
  judge_id: string;
  judge_name: string;
  team_id: string;
  creativity: number;
  completion: number;
  presentation: number;
  updated_at: string;
}

function fromDB(row: DBScore): JudgeScore {
  return {
    judgeId: row.judge_id,
    judgeName: row.judge_name ?? '',
    teamId: row.team_id,
    creativity: row.creativity ?? 0,
    completion: row.completion ?? 0,
    presentation: row.presentation ?? 0,
  };
}

/** 특정 심사위원의 원본 점수 행 (팀 fill-in은 호출자가 처리) */
export async function apiFetchScoresByJudge(judgeId: string): Promise<DBScore[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('judge_id', judgeId);
  if (error) throw error;
  return (data ?? []) as DBScore[];
}

/** 전체 심사위원 점수 */
export async function apiFetchAllScores(): Promise<JudgeScore[]> {
  const { data, error } = await supabase.from('scores').select('*');
  if (error) throw error;
  return ((data ?? []) as DBScore[]).map(fromDB);
}

/** 점수 저장 (신규 insert / 기존 update) */
export async function apiUpsertScore(
  judgeId: string,
  judgeName: string,
  teamId: string,
  scores: { creativity: number; completion: number; presentation: number }
): Promise<void> {
  const { error } = await supabase.from('scores').upsert(
    {
      judge_id: judgeId,
      judge_name: judgeName,
      team_id: teamId,
      ...scores,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'judge_id,team_id' }
  );
  if (error) throw error;
}
