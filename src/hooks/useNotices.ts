import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchNotices } from '../api/notices';
import type { Notice } from '../data/mockData';

export function useNotices() {
  const [data, setData] = useState<Notice[]>([]);

  const load = useCallback(() => {
    apiFetchNotices().then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('hook-notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { data, refetch: load };
}
