import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotices } from '../hooks/useNotices';
import { useAuth } from './useAuth';

const NOTICES_PATH = '/participant/notices';

interface NoticesNotificationCtx {
  hasNew: boolean;
}

const NoticesNotificationContext = createContext<NoticesNotificationCtx>({
  hasNew: false,
});

function getSeenIds(storageKey: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  } catch {
    return [];
  }
}

export function NoticesNotificationProvider({ children }: { children: ReactNode }) {
  const { data: notices } = useNotices();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const storageKey = `notices_seen_ids_${user?.id ?? ''}`;
  const [hasNew, setHasNew] = useState(false);
  const loadedRef = useRef(false);

  // 새 공지 추가 여부만 감지 (삭제/수정은 무시)
  useEffect(() => {
    if (notices.length === 0 && !loadedRef.current) return;
    loadedRef.current = true;
    const seenIds = getSeenIds(storageKey);
    setHasNew(notices.some((n) => !seenIds.includes(n.id)));
  }, [notices, storageKey]);

  // 공지 페이지 방문 시 현재 ID 목록을 저장
  useEffect(() => {
    if (!pathname.startsWith(NOTICES_PATH)) return;
    if (notices.length === 0) return;
    localStorage.setItem(storageKey, JSON.stringify(notices.map((n) => n.id)));
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
