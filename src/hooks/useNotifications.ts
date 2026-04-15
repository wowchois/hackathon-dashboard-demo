import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import {
  apiFetchNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
} from '../api/notifications';
import type { Notification } from '../data/mockData';

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // 채널 이름을 인스턴스별로 고유하게 유지 (동일 페이지에서 여러 번 호출 시 충돌 방지)
  const channelId = useRef(`hook-notifications-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const currentUserId = userId;

    async function load() {
      try {
        const data = await apiFetchNotifications(currentUserId);
        if (!cancelled) setList(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, channelId]);

  const markRead = async (id: string) => {
    await apiMarkNotificationRead(id);
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    if (!userId) return;
    await apiMarkAllNotificationsRead(userId);
    setList((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return { list, loading, markRead, markAllRead };
}
