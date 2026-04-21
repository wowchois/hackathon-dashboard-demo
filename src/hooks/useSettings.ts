import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchSettings, DEFAULT_SETTINGS } from '../api/settings';
import type { Settings } from '../api/settings';

let channelCounter = 0;

export function useSettings(): Settings {
  const [data, setData] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    apiFetchSettings().then(setData).catch(console.error);

    const ch = supabase
      .channel(`hook-settings-${++channelCounter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        apiFetchSettings().then(setData).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  return data;
}
