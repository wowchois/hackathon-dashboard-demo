import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchMilestones } from '../api/milestones';
import type { Milestone } from '../data/mockData';

export function useMilestones(): Milestone[] {
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    apiFetchMilestones().then(setMilestones).catch(console.error);

    const channel = supabase
      .channel('hook-milestones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, () => {
        apiFetchMilestones().then(setMilestones).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return milestones;
}
