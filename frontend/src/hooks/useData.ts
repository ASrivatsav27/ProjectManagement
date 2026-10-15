import { dashboardApi, projectsApi, tasksApi, usersApi } from "@/api/services";
import type { ProjectQuery, TaskQuery } from "@/api/types";
import { ApiError } from "@/api/client";
import { useAsync } from "./useAsync";

// Thin, named wrappers so pages read declaratively and share the same fetching behaviour.

export const useDashboard = () => useAsync((signal) => dashboardApi.summary(signal), [], { pollMs: 30000 });

export const useProjects = (query: ProjectQuery) =>
  useAsync((signal) => projectsApi.list(query, signal), [query.page, query.pageSize, query.status, query.search, query.includeArchived], { keepPrevious: true });

export const useProject = (id: number | null) =>
  useAsync((signal) => projectsApi.get(id as number, signal), [id], { enabled: id !== null });

export const useTasks = (query: TaskQuery, options: { pollMs?: number; shouldPoll?: () => boolean; enabled?: boolean } = {}) =>
  useAsync(
    (signal) => tasksApi.list(query, signal),
    [query.page, query.pageSize, query.sortBy, query.sortOrder, query.projectId, query.assigneeId, query.status, query.priority, query.search],
    { keepPrevious: true, ...options },
  );

export const useTask = (id: number | null) =>
  useAsync((signal) => tasksApi.get(id as number, signal), [id], { enabled: id !== null, pollMs: 20000 });

/**
 * The full user directory. Only Admins and Project Managers may call it; for a Team Member the
 * API answers 403, which we treat as "no directory" instead of an error.
 */
export const useUsers = (enabled = true) =>
  useAsync(
    async (signal) => {
      try {
        return await usersApi.list(signal);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) return [];
        throw error;
      }
    },
    [],
    { enabled },
  );
