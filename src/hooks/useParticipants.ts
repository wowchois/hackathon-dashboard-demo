import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchParticipants } from '../api/participants';
import type { Participant } from '../data/mockData';

export function useParticipants(): Participant[] {
  const [data, setData] = useState<Participant[]>([]);

  useEffect(() => {
    apiFetchParticipants().then(setData).catch(console.error);

    const channel = supabase
      .channel('hook-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        apiFetchParticipants().then(setData).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return data;
}
