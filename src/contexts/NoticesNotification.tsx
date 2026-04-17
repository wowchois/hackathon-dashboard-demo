import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotices } from '../hooks/useNotices';
import { useAuth } from './useAuth';
import type { Notice } from '../data/mockData';

const NOTICES_PATH = '/participant/notices';

interface NoticesNotificationCtx {
  hasNew: boolean;
}

const NoticesNotificationContext = createContext<NoticesNotificationCtx>({
  hasNew: false,
});

function computeFingerprint(notices: Notice[]): string {
  return notices.map((n) => `${n.id}:${n.title}:${n.date}`).join('|');
}

export function NoticesNotificationProvider({ children }: { children: ReactNode }) {
  const { data: notices } = useNotices();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const storageKey = `notices_seen_${user?.id ?? ''}`;
  const [hasNew, setHasNew] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (notices.length === 0 && !loadedRef.current) return;
    loadedRef.current = true;
    const current = computeFingerprint(notices);
    const seen = localStorage.getItem(storageKey) ?? '';
    setHasNew(current !== seen);
  }, [notices, storageKey]);

  useEffect(() => {
    if (!pathname.startsWith(NOTICES_PATH)) return;
    if (notices.length === 0) return;
    const current = computeFingerprint(notices);
    localStorage.setItem(storageKey, current);
    setHasNew(false);
  }, [pathname, notices, storageKey]);

  return (
    <NoticesNotificationContext.Provider value={{ hasNew }}>
      {children}
    </NoticesNotificationContext.Provider>
  );
}

export function useNoticesNotification() {
  return useContext(NoticesNotificationContext);
}
