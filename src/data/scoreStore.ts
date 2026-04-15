import { apiUpsertScore } from '../api/scores';

// ── 평가 기준 ─────────────────────────────────────────────────
export const SCORE_CRITERIA = [
  { key: 'creativity'   as const, label: '창의성', max: 40 },
  { key: 'completion'   as const, label: '완성도', max: 35 },
  { key: 'presentation' as const, label: '발표력', max: 25 },
] as const;

// ── 타입 정의 ─────────────────────────────────────────────────

export interface Judge {
  id: string;
  name: string;
}

export interface JudgeScore {
  judgeId: string;
  judgeName: string;
  teamId: string;
  creativity: number;
  completion: number;
  presentation: number;
}

export interface AggregatedScore {
  teamId: string;
  creativity: number;
  completion: number;
  presentation: number;
  total: number;
  judgeCount: number;
}

// ── updateScore (Supabase upsert) ─────────────────────────────
export async function updateScore(
  judgeId: string,
  judgeName: string,
  teamId: string,
  partial: { creativity: number; completion: number; presentation: number }
): Promise<void> {
  await apiUpsertScore(judgeId, judgeName, teamId, partial);
}
