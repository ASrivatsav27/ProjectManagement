import { useMemo, useState, type FormEvent } from "react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, type Project, type ProjectStatus } from "@/api/types";
import { projectsApi } from "@/api/services";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Flash } from "@/components/ui/Feedback";
import { useCurrentUser } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useUsers } from "@/hooks/useData";
import { toDateInput } from "@/lib/format";

interface Props {
  /** Pass a project to edit it; omit to create a new one. */
  project?: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export function ProjectFormModal({ project, onClose, onSaved }: Props) {
  const user = useCurrentUser();
  const toast = useToast();
  const isEdit = !!project;
  const isAdmin = user.role === "Admin";

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [startDate, setStartDate] = useState(toDateInput(project?.startDate));
  const [deadline, setDeadline] = useState(toDateInput(project?.deadline));
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "Planning");
  const [managerId, setManagerId] = useState<number>(user.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Only an admin picks the manager when creating a project, so only they need the user list.
  const { data: users } = useUsers(isAdmin && !isEdit);
  const managers = useMemo(() => (users ?? []).filter((candidate) => candidate.role === "ProjectManager"), [users]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Project name is required";
    if (name.trim().length > 120) next.name = "Keep the name under 120 characters";
    if (startDate && deadline && startDate > deadline) next.deadline = "Deadline must be on or after the start date";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const common = { name: name.trim(), description: description.trim() || null, startDate: startDate || null, deadline: deadline || null };
      const saved = project
        ? await projectsApi.update(project.id, { ...common, status })
        : await projectsApi.create({ ...common, ...(isAdmin ? { managerId } : {}) });

      toast.success(isEdit ? "Project updated" : "Project created");
      onSaved(saved);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not save the project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit project" : "Create a new project"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="project-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create project"}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} noValidate>
        {serverError && <Flash>{serverError}</Flash>}
        <Field label="Project name" required error={errors.name}>
          {(props) => <input {...props} className="form-control" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />}
        </Field>
        <Field label="Description">
          {(props) => <textarea {...props} className="form-control" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        <div className="form-row">
          <Field label="Start date">{(props) => <input {...props} type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />}</Field>
          <Field label="Deadline" error={errors.deadline}>
            {(props) => <input {...props} type="date" className="form-control" value={deadline} min={startDate || undefined} onChange={(e) => setDeadline(e.target.value)} />}
          </Field>
        </div>
        {isEdit && (
          <Field label="Status">
            {(props) => (
              <select {...props} className="form-control" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                {PROJECT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {PROJECT_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        {isAdmin && !isEdit && (
          <Field label="Project manager" hint="Admins can assign any project manager. Defaults to you.">
            {(props) => (
              <select {...props} className="form-control" value={managerId} onChange={(e) => setManagerId(Number(e.target.value))}>
                <option value={user.id}>{user.username} (me)</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.username}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
      </form>
    </Modal>
  );
}
