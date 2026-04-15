import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchScoresByJudge } from '../api/scores';
import { apiFetchTeams } from '../api/teams';
import type { JudgeScore } from '../data/scoreStore';

export function useJudgeScores(judgeId: string, judgeName = ''): JudgeScore[] {
  const [data, setData] = useState<JudgeScore[]>([]);

  useEffect(() => {
    if (!judgeId) return;

    async function load() {
      const [rows, teams] = await Promise.all([
        apiFetchScoresByJudge(judgeId),
        apiFetchTeams(),
      ]);
      setData(
        teams.map((team) => {
          const existing = rows.find((r) => r.team_id === team.id);
          if (existing) {
            return {
              judgeId: existing.judge_id,
              judgeName: existing.judge_name || judgeName,
              teamId: existing.team_id,
              creativity: existing.creativity,
              completion: existing.completion,
              presentation: existing.presentation,
            };
          }
          return { judgeId, judgeName, teamId: team.id, creativity: 0, completion: 0, presentation: 0 };
        })
      );
    }

    load().catch(console.error);

    const channel = supabase
      .channel(`hook-judge-scores-${judgeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `judge_id=eq.${judgeId}` },
        () => load().catch(console.error)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [judgeId, judgeName]);

  return data;
}
