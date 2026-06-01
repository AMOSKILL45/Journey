import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listNotifications, markAllRead, markRead } from '../api/notifications';

export const notificationsKey = ['notifications'] as const;

export function useNotifications() {
  return useQuery({ queryKey: notificationsKey, queryFn: listNotifications });
}

export function useUnreadCount(): number {
  const { data = [] } = useNotifications();
  return data.filter((n) => n.read_at === null).length;
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const inv = () => void qc.invalidateQueries({ queryKey: notificationsKey });
  return {
    markRead: useMutation({ mutationFn: (id: string) => markRead(id), onSuccess: inv }),
    markAllRead: useMutation({ mutationFn: () => markAllRead(), onSuccess: inv }),
  };
}
