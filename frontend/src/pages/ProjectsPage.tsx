import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, type ProjectStatus } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { useDashboard, useProjects } from "@/hooks/useData";
import { useDebounce } from "@/hooks/useDebounce";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate } from "@/lib/format";
import { canCreateProject } from "@/lib/permissions";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { ProgressBar } from "@/components/ui/Progress";
import { ArchivedLabel, ProjectStatusLabel } from "@/components/ui/Badges";
import { UserChip } from "@/components/ui/Avatar";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";

export function ProjectsPage() {
  useDocumentTitle("Projects");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initialStatus = params.get("status");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">(PROJECT_STATUSES.includes(initialStatus as ProjectStatus) ? (initialStatus as ProjectStatus) : "");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const debounced = useDebounce(search.trim(), 300);
  useEffect(() => setPage(1), [debounced, status, includeArchived]);

  // Keep the status filter shareable in the URL.
  useEffect(() => {
    setParams(status ? { status } : {}, { replace: true });
  }, [status, setParams]);

  const { data, error, loading, reload } = useProjects({ page, pageSize: 10, search: debounced || undefined, status: status || undefined, includeArchived });
  const { data: summary } = useDashboard(); // completion percentage per project

  const progressById = new Map((summary?.projectProgress ?? []).map((project) => [project.id, project.completionPercentage]));

  return (
    <div>
      <div className="page-header">
        <h1>Projects</h1>
        {canCreateProject(user) && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" /> New project
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-input grow">
          <Icon name="search" />
          <input className="form-control" type="search" placeholder="Find a project…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search projects" />
        </div>
        <div className="filters">
          <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | "")} aria-label="Filter by status">
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PROJECT_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          <label className="check-inline">
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Show archived
          </label>
        </div>
      </div>

      {!data && loading ? (
        <Spinner label="Loading projects…" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.data.length === 0 ? (
        <div className="Box">
          <EmptyState
            title={debounced || status ? "No projects match your search" : "No projects yet"}
            action={canCreateProject(user) && !debounced && !status ? <button className="btn btn-primary" onClick={() => setCreating(true)}>Create your first project</button> : undefined}
          >
            {debounced || status ? "Try a different search or filter." : canCreateProject(user) ? "Projects you create will appear here." : "You’ll see projects here once a manager adds you to one."}
          </EmptyState>
        </div>
      ) : data ? (
        <>
          <ul className={`Box Box-list${loading ? " is-loading" : ""}`}>
            {data.data.map((project) => (
              <li key={project.id} className="Box-row project-row">
                <div className="grow">
                  <div className="task-row-title">
                    <Link to={`/projects/${project.id}`} className="link-title project-name">
                      {project.name}
                    </Link>
                    <ProjectStatusLabel status={project.status} />
                    {project.archivedAt && <ArchivedLabel />}
                  </div>
                  {project.description && <p className="muted project-desc">{project.description}</p>}
                  <div className="meta">
                    <UserChip name={project.manager?.username} />
                    <span>
                      <Icon name="users" size={12} /> {project._count.members}
                    </span>
                    <span>
                      <Icon name="circle-dot" size={12} /> {project._count.tasks} task{project._count.tasks === 1 ? "" : "s"}
                    </span>
                    {project.deadline && (
                      <span>
                        <Icon name="calendar" size={12} /> Due {formatDate(project.deadline)}
                      </span>
                    )}
                  </div>
                </div>
                {progressById.has(project.id) && (
                  <div className="progress-cell">
                    <ProgressBar value={progressById.get(project.id) ?? 0} label={`${project.name} completion`} />
                    <span className="small muted">{progressById.get(project.id)}%</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination meta={data.pagination} onChange={setPage} />
        </>
      ) : null}

      {creating && (
        <ProjectFormModal
          onClose={() => setCreating(false)}
          onSaved={(project) => {
            setCreating(false);
            navigate(`/projects/${project.id}`);
          }}
        />
      )}
    </div>
  );
}
