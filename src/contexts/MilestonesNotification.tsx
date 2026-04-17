import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useMilestones } from '../hooks/useMilestones';
import { useAuth } from './useAuth';
import type { Milestone } from '../data/mockData';

const SCHEDULE_PATH = '/participant/schedule';

interface MilestonesNotificationCtx {
  hasNew: boolean;
}

const MilestonesNotificationContext = createContext<MilestonesNotificationCtx>({
  hasNew: false,
});

function computeFingerprint(ms: Milestone[]): string {
  return ms
    .filter((m) => m.isPublic)
    .map((m) => `${m.id}:${m.title}:${m.date}:${m.description ?? ''}`)
    .join('|');
}

export function MilestonesNotificationProvider({ children }: { children: ReactNode }) {
  const { data: milestones } = useMilestones();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const storageKey = `milestones_seen_${user?.id ?? ''}`;
  const [hasNew, setHasNew] = useState(false);
  const loadedRef = useRef(false);

  // 마일스톤 변경 시 hasNew 재계산
  useEffect(() => {
    if (milestones.length === 0 && !loadedRef.current) return;
    loadedRef.current = true;
    const current = computeFingerprint(milestones);
    const seen = localStorage.getItem(storageKey) ?? '';
    setHasNew(current !== seen);
  }, [milestones, storageKey]);

  // 일정 페이지 방문 시 자동 읽음 처리
  useEffect(() => {
    if (!pathname.startsWith(SCHEDULE_PATH)) return;
    if (milestones.length === 0) return;
    const current = computeFingerprint(milestones);
    localStorage.setItem(storageKey, current);
    setHasNew(false);
  }, [pathname, milestones, storageKey]);

  return (
    <MilestonesNotificationContext.Provider value={{ hasNew }}>
      {children}
    </MilestonesNotificationContext.Provider>
  );
}

export function useMilestonesNotification() {
  return useContext(MilestonesNotificationContext);
}
