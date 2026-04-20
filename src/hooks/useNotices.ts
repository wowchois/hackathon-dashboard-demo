import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchNotices } from '../api/notices';
import type { Notice } from '../data/mockData';

let instanceCounter = 0;

export function useNotices() {
  const [data, setData] = useState<Notice[]>([]);
  const channelName = useRef(`hook-notices-${++instanceCounter}`);

  const load = useCallback(() => {
    apiFetchNotices().then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(channelName.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { data, refetch: load };
}
