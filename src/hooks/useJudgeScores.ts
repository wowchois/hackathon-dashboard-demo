import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchScoresByJudge } from '../api/scores';
import { apiFetchTeams } from '../api/teams';
import type { JudgeScore } from '../data/scoreStore';

function mapJudgeScores(
  rows: Awaited<ReturnType<typeof apiFetchScoresByJudge>>,
  teams: Awaited<ReturnType<typeof apiFetchTeams>>,
  judgeId: string,
  judgeName: string
): JudgeScore[] {
  return teams.map((team) => {
    const existing = rows.find((r) => r.team_id === team.id);
    if (existing) {
      return {
        judgeId: existing.judge_id,
        judgeName: existing.judge_name || judgeName,
        teamId: existing.team_id,
        creativity: existing.creativity,
        practicality: existing.practicality,
        completion: existing.completion,
        presentation: existing.presentation,
      };
    }
    return { judgeId, judgeName, teamId: team.id, creativity: 0, practicality: 0, completion: 0, presentation: 0 };
  });
}

export function useJudgeScores(judgeId: string, judgeName = '') {
  const [data, setData] = useState<JudgeScore[]>([]);

  const fetchScores = useCallback(async () => {
    if (!judgeId) return [];

    const [rows, teams] = await Promise.all([
      apiFetchScoresByJudge(judgeId),
      apiFetchTeams(),
    ]);
    return mapJudgeScores(rows, teams, judgeId, judgeName);
  }, [judgeId, judgeName]);

  const load = useCallback(async () => {
    const next = await fetchScores();
    setData(next);
    return next;
  }, [fetchScores]);

  useEffect(() => {
    if (!judgeId) return;

    let cancelled = false;
    async function initialLoad() {
      try {
        const next = await fetchScores();
        if (!cancelled) setData(next);
      } catch (error) {
        console.error(error);
      }
    }

    initialLoad();

    const channel = supabase
      .channel(`hook-judge-scores-${judgeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `judge_id=eq.${judgeId}` },
        () => load().catch(console.error)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchScores, judgeId, load]);

  return { data, refetch: load };
}
