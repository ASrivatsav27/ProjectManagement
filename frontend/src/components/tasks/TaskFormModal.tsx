import { useMemo, useState, type FormEvent } from "react";
import { projectsApi, tasksApi } from "@/api/services";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABEL, type Task, type TaskPriority, type TaskStatus } from "@/api/types";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Flash } from "@/components/ui/Feedback";
import { useCurrentUser } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { useProject } from "@/hooks/useData";
import { canManageProject } from "@/lib/permissions";
import { toDateInput, todayInput } from "@/lib/format";

interface Props {
  /** Pass a task to edit it; omit to create. */
  task?: Task;
  /** Pre-select (and lock) the project when creating from a project page. */
  projectId?: number;
  onClose: () => void;
  onSaved: (task: Task) => void;
}

export function TaskFormModal({ task, projectId: fixedProjectId, onClose, onSaved }: Props) {
  const user = useCurrentUser();
  const toast = useToast();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState<number | null>(task?.projectId ?? fixedProjectId ?? null);
  const [assigneeId, setAssigneeId] = useState<number | null>(task?.assigneeId ?? null);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "Todo");
  const [dueDate, setDueDate] = useState(toDateInput(task?.dueDate));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Projects this user may add tasks to (only when the project is not fixed).
  const needsProjectList = !isEdit && fixedProjectId === undefined;
  const { data: projectList } = useAsync(
    async (signal) => (await projectsApi.list({ pageSize: 100 }, signal)).data.filter((project) => canManageProject(user, project)),
    [],
    { enabled: needsProjectList },
  );

  // Members of the chosen project are the only valid assignees.
  const { data: project, loading: loadingMembers } = useProject(projectId);
  const members = project?.members ?? [];

  const changeProject = (next: number | null) => {
    setProjectId(next);
    setAssigneeId(null); // an assignee from another project is no longer valid
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (title.trim().length > 200) next.title = "Keep the title under 200 characters";
    if (!projectId) next.projectId = "Choose a project";
    // Only reject past dates the user is introducing, so old tasks stay editable.
    if (dueDate && dueDate < todayInput() && dueDate !== toDateInput(task?.dueDate)) next.dueDate = "Due date cannot be in the past";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);
    if (!validate() || !projectId) return;

    setSaving(true);
    try {
      const fields = { title: title.trim(), description: description.trim() || null, assigneeId, priority, status, dueDate: dueDate || null };
      const saved = task ? await tasksApi.update(task.id, fields) : await tasksApi.create({ ...fields, projectId });

      toast.success(isEdit ? "Task updated" : "Task created");
      onSaved(saved);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not save the task");
    } finally {
      setSaving(false);
    }
  };

  const projectOptions = useMemo(() => projectList ?? [], [projectList]);

  return (
    <Modal
      title={isEdit ? "Edit task" : "Create a new task"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create task"}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate>
        {serverError && <Flash>{serverError}</Flash>}
        <Field label="Title" required error={errors.title}>
          {(props) => <input {...props} className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={250} />}
        </Field>
        <Field label="Description">
          {(props) => <textarea {...props} className="form-control" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        {needsProjectList && (
          <Field label="Project" required error={errors.projectId} hint={projectOptions.length === 0 && projectList ? "You don’t manage any projects yet." : undefined}>
            {(props) => (
              <select {...props} className="form-control" value={projectId ?? ""} onChange={(e) => changeProject(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Select a project…</option>
                {projectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <div className="form-row">
          <Field label="Assignee" hint={projectId ? undefined : "Choose a project first"}>
            {(props) => (
              <select {...props} className="form-control" value={assigneeId ?? ""} disabled={!projectId || loadingMembers} onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.username}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Due date" error={errors.dueDate}>
            {(props) => <input {...props} type="date" className="form-control" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
          </Field>
        </div>
        <div className="form-row">
          <Field label="Priority">
            {(props) => (
              <select {...props} className="form-control" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {TASK_PRIORITIES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Status">
            {(props) => (
              <select {...props} className="form-control" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {TASK_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </form>
    </Modal>
  );
}
