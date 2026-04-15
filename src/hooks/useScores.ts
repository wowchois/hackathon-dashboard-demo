import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchAllScores } from '../api/scores';
import { apiFetchTeams } from '../api/teams';
import type { AggregatedScore } from '../data/scoreStore';

async function loadAggregated(): Promise<AggregatedScore[]> {
  const [allScores, teams] = await Promise.all([
    apiFetchAllScores(),
    apiFetchTeams(),
  ]);

  return teams.map((team) => {
    const entered = allScores.filter(
      (s) => s.teamId === team.id && (s.creativity > 0 || s.completion > 0 || s.presentation > 0)
    );
    if (entered.length === 0) {
      return { teamId: team.id, creativity: 0, completion: 0, presentation: 0, total: 0, judgeCount: 0 };
    }
    const avg = (key: 'creativity' | 'completion' | 'presentation') =>
      Math.round(entered.reduce((sum, s) => sum + s[key], 0) / entered.length);

    const creativity = avg('creativity');
    const completion = avg('completion');
    const presentation = avg('presentation');
    return {
      teamId: team.id,
      creativity,
      completion,
      presentation,
      total: creativity + completion + presentation,
      judgeCount: entered.length,
    };
  });
}

export function useScores(): AggregatedScore[] {
  const [data, setData] = useState<AggregatedScore[]>([]);

  useEffect(() => {
    loadAggregated().then(setData).catch(console.error);

    const channel = supabase
      .channel('hook-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
        loadAggregated().then(setData).catch(console.error);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadAggregated().then(setData).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return data;
}
