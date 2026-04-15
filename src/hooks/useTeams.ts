import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiFetchTeams } from '../api/teams';
import { apiFetchParticipants } from '../api/participants';
import type { Team } from '../data/hackathonStore';

async function loadTeams(): Promise<Team[]> {
  const [teamRows, participants] = await Promise.all([
    apiFetchTeams(),
    apiFetchParticipants(),
  ]);
  return teamRows.map((t) => ({
    id: t.id,
    name: t.name,
    idea: t.idea ?? '',
    submitStatus: t.submit_status ?? 'not-submitted',
    score: null,
    locked: t.locked ?? false,
    members: participants.filter((p) => p.team === t.id).map((p) => p.id),
  }));
}

export function useTeams(): Team[] {
  const [data, setData] = useState<Team[]>([]);

  useEffect(() => {
    loadTeams().then(setData).catch(console.error);

    const channel = supabase
      .channel('hook-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadTeams().then(setData).catch(console.error);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        loadTeams().then(setData).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return data;
}
