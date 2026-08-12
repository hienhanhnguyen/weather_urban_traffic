import { apiRequest } from "@/lib/api/client";
import type { AlertSeverity, Pagination } from "@/features/notifications/api";

export type IncidentStatus = "pending" | "acknowledged" | "resolved";

export interface Incident {
  id: number;
  areaId: number;
  areaName: string | null;
  title: string;
  body: string | null;
  severity: AlertSeverity;
  metric: string | null;
  value: number | null;
  status: IncidentStatus;
  handledAt: string | null;
  handledNote: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface IncidentPage {
  incidents: Incident[];
  pagination: Pagination;
}

export interface AreaTally {
  areaId: number;
  name: string;
  total: number;
  pending: number;
  worstSeverity: AlertSeverity | null;
  lastAt: string | null;
}

export interface IncidentSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<IncidentStatus, number>;
  areasAffected: number;
  areas: AreaTally[];
}

export type IncidentQuery = {
  page?: number;
  limit?: number;
  area_id?: number;
  severity?: AlertSeverity;
  status?: IncidentStatus;
  timeframe?: string;
};

export const INCIDENTS_QUERY_KEY = ["gov", "incidents"] as const;

export const INCIDENTS_PAGE_SIZE = 20;

export const incidentsQueryKey = (query: IncidentQuery) =>
  [...INCIDENTS_QUERY_KEY, "list", query] as const;

export const incidentSummaryQueryKey = (query: IncidentQuery) =>
  [...INCIDENTS_QUERY_KEY, "summary", query] as const;

export const listIncidents = (query: IncidentQuery = {}) =>
  apiRequest<IncidentPage>("/gov/incidents", {
    query: { limit: INCIDENTS_PAGE_SIZE, ...query },
  });

export const getIncidentSummary = (query: IncidentQuery = {}) =>
  apiRequest<IncidentSummary>("/gov/incidents/summary", { query });

export const updateIncidentStatus = (
  id: number,
  body: { status: IncidentStatus; note?: string },
) =>
  apiRequest<{ incident: Incident }>(`/gov/incidents/${id}/status`, {
    method: "PATCH",
    body,
  }).then((response) => response.incident);
