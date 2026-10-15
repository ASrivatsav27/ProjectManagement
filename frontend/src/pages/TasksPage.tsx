import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TASK_STATUSES, type TaskStatus, type UserSummary } from "@/api/types";
import { projectsApi } from "@/api/services";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { useUsers } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { canCreateProject } from "@/lib/permissions";
import { Icon } from "@/components/ui/Icon";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";

export function TasksPage() {
  useDocumentTitle("Tasks");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [creating, setCreating] = useState(false);

  const { data: projects } = useAsync(async (signal) => (await projectsApi.list({ pageSize: 100 }, signal)).data, []);
  const { data: users } = useUsers();
  const assignees = useMemo<UserSummary[]>(() => (users ?? []).map(({ id, username }) => ({ id, username })), [users]);

  const statusParam = params.get("status");
  const initialStatus = TASK_STATUSES.includes(statusParam as TaskStatus) ? (statusParam as TaskStatus) : undefined;

  return (
    <div>
      <div className="page-header">
        <h1>Tasks</h1>
        {canCreateProject(user) && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" /> New task
          </button>
        )}
      </div>

      <TaskListView projects={projects ?? []} assignees={assignees} initialAssignee={params.get("assignee") === "me" ? "me" : undefined} initialStatus={initialStatus} />

      {creating && (
        <TaskFormModal
          onClose={() => setCreating(false)}
          onSaved={(task) => {
            setCreating(false);
            navigate(`/tasks/${task.id}`);
          }}
        />
      )}
    </div>
  );
}
