import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchAllScores } from '../api/scores';
import type { JudgeScore } from '../data/scoreStore';

export function useAllJudgeScores(): JudgeScore[] {
  const [data, setData] = useState<JudgeScore[]>([]);

  useEffect(() => {
    apiFetchAllScores().then(setData).catch(console.error);

    const channel = supabase
      .channel('hook-all-judge-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
        apiFetchAllScores().then(setData).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return data;
}
