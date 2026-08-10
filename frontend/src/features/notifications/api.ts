import { apiRequest } from "@/lib/api/client";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertEvent {
  id: number;
  ruleId: number;
  title: string;
  body: string;
  severity: AlertSeverity;
  metric: string;
  value: number;
  isRead: boolean;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface AlertEventPage {
  events: AlertEvent[];
  pagination: Pagination;
}

export const ALERT_EVENTS_QUERY_KEY = ["alerts", "events"] as const;
export const UNREAD_COUNT_QUERY_KEY = ["alerts", "events", "unread"] as const;

export const eventsPageQueryKey = (page: number) =>
  [...ALERT_EVENTS_QUERY_KEY, "page", page] as const;

export const EVENTS_PAGE_SIZE = 20;

export const listEvents = (page = 1, limit = EVENTS_PAGE_SIZE) =>
  apiRequest<AlertEventPage>("/alerts/events", { query: { page, limit } });

export const countUnread = () =>
  apiRequest<AlertEventPage>("/alerts/events", {
    query: { is_read: false, page: 1, limit: 1 },
  }).then((response) => response.pagination.total);

export const markEventRead = (id: number) =>
  apiRequest<void>(`/alerts/events/${id}/read`, { method: "PATCH" });

export const markAllEventsRead = () =>
  apiRequest<{ updated: number }>("/alerts/events/read-all", {
    method: "PATCH",
  });
