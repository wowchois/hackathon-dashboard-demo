import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchMyAttendances } from '../api/attendances';

let instanceCounter = 0;

export function useMyAttendances(participantId: string | undefined): Map<string, boolean> {
  const [attendanceMap, setAttendanceMap] = useState<Map<string, boolean>>(new Map());
  const channelName = useRef(`hook-my-attendances-${++instanceCounter}`);

  const load = useCallback(() => {
    if (!participantId) return;
    apiFetchMyAttendances(participantId)
      .then((list) => setAttendanceMap(new Map(list.map((a) => [a.milestoneId, a.attending]))))
      .catch(console.error);
  }, [participantId]);

  useEffect(() => {
    if (!participantId) return;
    load();
    const channel = supabase
      .channel(channelName.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'milestone_attendances', filter: `participant_id=eq.${participantId}` },
        load
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [participantId, load]);

  return attendanceMap;
}
