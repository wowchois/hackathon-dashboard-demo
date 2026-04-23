import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import {
  apiFetchParticipantByUserId,
  apiFetchParticipantByEmployeeId,
  apiLinkParticipant,
} from '../api/participants';
import { apiFetchTeamById } from '../api/teams';
import type { Participant } from '../data/mockData';
import type { TeamRow } from '../api/teams';

export interface CurrentParticipant {
  participant: Participant | null;
  team: TeamRow | null;
  loading: boolean;
}

export function useCurrentParticipant(): CurrentParticipant {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const employeeId = user?.employeeId ?? null;
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId || !employeeId) {
      setParticipant(null);
      setTeam(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        let p = await apiFetchParticipantByUserId(userId!);

        if (!cancelled && !p) {
          p = await apiFetchParticipantByEmployeeId(employeeId!);

          if (!cancelled && p && !p.userId) {
            await apiLinkParticipant(p.id, userId!);
          }
        }

        if (cancelled) return;
        setParticipant(p);

        if (p?.team) {
          const t = await apiFetchTeamById(p.team);
          if (!cancelled) setTeam(t);
        } else {
          setTeam(null);
        }
      } catch (error) {
        console.error('Failed to load current participant', error);
        if (!cancelled) {
          setParticipant(null);
          setTeam(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, employeeId]);

  return {
    participant: userId ? participant : null,
    team: userId ? team : null,
    loading: userId ? loading : false,
  };
}
