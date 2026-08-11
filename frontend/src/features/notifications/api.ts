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

export interface EventQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  severity?: AlertSeverity;
  from?: string;
  to?: string;
}

export const ALERT_EVENTS_QUERY_KEY = ["alerts", "events"] as const;
export const UNREAD_COUNT_QUERY_KEY = ["alerts", "events", "unread"] as const;

export const eventsQueryKey = (query: EventQuery) =>
  [...ALERT_EVENTS_QUERY_KEY, "list", query] as const;

export const EVENTS_PAGE_SIZE = 20;

export const listEvents = ({
  page = 1,
  limit = EVENTS_PAGE_SIZE,
  isRead,
  severity,
  from,
  to,
}: EventQuery = {}) =>
  apiRequest<AlertEventPage>("/alerts/events", {
    query: {
      page,
      limit,
      ...(isRead !== undefined && { is_read: isRead }),
      ...(severity !== undefined && { severity }),
      ...(from !== undefined && { from }),
      ...(to !== undefined && { to }),
    },
  });

export const countUnread = () =>
  listEvents({ isRead: false, page: 1, limit: 1 }).then(
    (response) => response.pagination.total,
  );

export const markEventRead = (id: number) =>
  apiRequest<void>(`/alerts/events/${id}/read`, { method: "PATCH" });

export const markAllEventsRead = () =>
  apiRequest<{ updated: number }>("/alerts/events/read-all", {
    method: "PATCH",
  });
