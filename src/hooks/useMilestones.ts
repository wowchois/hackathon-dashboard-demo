import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchMilestones } from '../api/milestones';
import type { Milestone } from '../data/mockData';

let instanceCounter = 0;

export function useMilestones() {
  const [data, setData] = useState<Milestone[]>([]);
  const channelName = useRef(`hook-milestones-${++instanceCounter}`);

  const load = useCallback(() => {
    apiFetchMilestones().then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(channelName.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { data, refetch: load };
}
