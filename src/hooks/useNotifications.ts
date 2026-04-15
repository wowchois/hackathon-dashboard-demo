import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  apiFetchNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
} from '../api/notifications';
import type { Notification } from '../data/mockData';

export function useNotifications() {
  const { user } = useAuth();
  const [list, setList] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await apiFetchNotifications(user.id);
      setList(data);
    } catch (e) {
      console.error(e);
    }
  }, [user?.id]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('hook-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const markRead = async (id: string) => {
    await apiMarkNotificationRead(id);
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    await apiMarkAllNotificationsRead(user.id);
    setList((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return { list, markRead, markAllRead };
}
