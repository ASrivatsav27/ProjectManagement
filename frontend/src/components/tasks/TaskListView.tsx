import { useEffect, useState } from "react";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABEL, type ProjectListItem, type TaskPriority, type TaskQuery, type TaskStatus, type UserSummary } from "@/api/types";
import { useCurrentUser } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useTasks } from "@/hooks/useData";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { TaskRow } from "./TaskRow";

const SORTS = [
  { value: "createdAt:desc", label: "Newest" },
  { value: "createdAt:asc", label: "Oldest" },
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "dueDate:asc", label: "Due soonest" },
  { value: "dueDate:desc", label: "Due latest" },
  { value: "priority:desc", label: "Priority: high to low" },
  { value: "priority:asc", label: "Priority: low to high" },
  { value: "title:asc", label: "Title A–Z" },
] as const;

interface Props {
  /** Lock the list to one project (project page); hides the project filter. */
  projectId?: number;
  /** Projects for the project filter (global task page). */
  projects?: ProjectListItem[];
  /** People offered in the assignee filter. */
  assignees: UserSummary[];
  initialAssignee?: "me" | number;
  initialStatus?: TaskStatus;
  pageSize?: number;
}

export function TaskListView({ projectId: lockedProjectId, projects, assignees, initialAssignee, initialStatus, pageSize = 10 }: Props) {
  const user = useCurrentUser();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">(initialStatus ?? "");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [assignee, setAssignee] = useState<string>(initialAssignee === undefined ? "" : String(initialAssignee));
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [sort, setSort] = useState<string>(SORTS[0].value);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search.trim(), 300);
  const [sortBy, sortOrder] = sort.split(":") as [NonNullable<TaskQuery["sortBy"]>, "asc" | "desc"];

  // Any filter change goes back to the first page.
  useEffect(() => setPage(1), [debouncedSearch, status, priority, assignee, projectFilter, sort]);

  const query: TaskQuery = {
    page,
    pageSize,
    sortBy,
    sortOrder,
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    assigneeId: assignee === "" ? undefined : assignee === "me" ? user.id : Number(assignee),
    projectId: lockedProjectId ?? (projectFilter ? Number(projectFilter) : undefined),
  };

  const { data, error, loading, reload } = useTasks(query);
  const hasFilters = !!(debouncedSearch || status || priority || assignee || projectFilter);

  const clear = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    setAssignee("");
    setProjectFilter("");
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-input grow">
          <Icon name="search" />
          <input className="form-control" type="search" placeholder="Search tasks by title…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tasks by title" />
        </div>
        <div className="filters">
          <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | "")} aria-label="Filter by status">
            <option value="">All statuses</option>
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {TASK_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority | "")} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {TASK_PRIORITIES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select className="form-control" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Filter by assignee">
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            {assignees
              .filter((person) => person.id !== user.id)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.username}
                </option>
              ))}
          </select>
          {!lockedProjectId && projects && (
            <select className="form-control" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Filter by project">
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
          <select className="form-control" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks">
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!data && loading ? (
        <Spinner label="Loading tasks…" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.data.length === 0 ? (
        <div className="Box">
          <EmptyState icon="circle-dot" title={hasFilters ? "No tasks match your filters" : "No tasks yet"} action={hasFilters ? <button className="btn" onClick={clear}>Clear filters</button> : undefined}>
            {hasFilters ? "Try a different search or remove a filter." : "Tasks you create or that are assigned to you will show up here."}
          </EmptyState>
        </div>
      ) : data ? (
        <>
          <div className={`Box${loading ? " is-loading" : ""}`}>
            <div className="Box-header">
              <strong>{data.pagination.total}</strong> task{data.pagination.total === 1 ? "" : "s"}
            </div>
            <ul className="Box-list">
              {data.data.map((task) => (
                <TaskRow key={task.id} task={task} showProject={!lockedProjectId} />
              ))}
            </ul>
          </div>
          <Pagination meta={data.pagination} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
