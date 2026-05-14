import { http } from "./http";

export type UserNotificationRow = {
  id: number;
  kind: string;
  title: string;
  body: string;
  linkPath: string;
  readAt: string | null;
  createdAt: string;
};

export async function fetchNotifications(limit = 40): Promise<UserNotificationRow[]> {
  const { data } = await http.get<UserNotificationRow[]>(`/api/notifications?limit=${limit}`);
  return data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await http.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.patch("/api/notifications/read-all");
}
