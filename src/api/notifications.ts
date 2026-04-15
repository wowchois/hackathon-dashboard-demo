import { supabase } from '../lib/supabase';
import type { Notification } from '../data/mockData';

interface DBNotification {
  id: string;
  title: string | null;
  message: string;
  is_read: boolean;
  user_id: string | null;
  created_at: string;
}

function fromDB(row: DBNotification): Notification {
  const d = new Date(row.created_at);
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    id: row.id,
    message: row.message,
    time,
    isRead: row.is_read ?? false,
  };
}

export async function apiFetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DBNotification[]).map(fromDB);
}

export async function apiMarkNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function apiMarkAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(`user_id.eq.${userId},user_id.is.null`);
  if (error) throw error;
}
