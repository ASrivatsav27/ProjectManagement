import { useMemo, useState } from "react";
import { projectsApi } from "@/api/services";
import type { ProjectDetail } from "@/api/types";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { RoleLabel } from "@/components/ui/Badges";
import { ErrorState, Flash, Spinner } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/context/ToastContext";
import { useUsers } from "@/hooks/useData";

interface Props {
  project: ProjectDetail;
  onClose: () => void;
  onSaved: () => void;
}

export function MembersModal({ project, onClose, onSaved }: Props) {
  const toast = useToast();
  const { data: users, error, loading, reload } = useUsers();
  const [selected, setSelected] = useState<Set<number>>(() => new Set(project.members.map((member) => member.userId)));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (users ?? []).filter((user) => !term || user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term));
  }, [users, query]);

  const toggle = (id: number) => {
    if (id === project.managerId) return; // the backend always keeps the manager on the team
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setServerError(null);
    try {
      await projectsApi.setMembers(project.id, [...selected]);
      toast.success("Team updated");
      onSaved();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not update the team");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Manage team"
      onClose={onClose}
      footer={
        <>
          <span className="muted small footer-note">{selected.size} selected</span>
          <button className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
            {saving ? "Saving…" : "Save team"}
          </button>
        </>
      }
    >
      {serverError && <Flash>{serverError}</Flash>}
      <p className="muted small">Members removed from the project are automatically unassigned from its tasks.</p>
      <div className="search-input">
        <Icon name="search" />
        <input className="form-control" placeholder="Find people…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find people" />
      </div>
      {loading && !users ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <ul className="check-list">
          {visible.map((user) => {
            const isManager = user.id === project.managerId;
            return (
              <li key={user.id}>
                <label className="check-row">
                  <input type="checkbox" checked={selected.has(user.id)} disabled={isManager} onChange={() => toggle(user.id)} />
                  <Avatar name={user.username} size={24} />
                  <span className="grow">
                    <strong>{user.username}</strong> <span className="muted small">{user.email}</span>
                  </span>
                  {isManager && <span className="Label Label-accent">Manager</span>}
                  <RoleLabel role={user.role} />
                </label>
              </li>
            );
          })}
          {visible.length === 0 && <li className="muted pad">No people match “{query}”.</li>}
        </ul>
      )}
    </Modal>
  );
}
