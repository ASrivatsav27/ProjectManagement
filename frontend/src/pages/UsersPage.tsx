import { useMemo, useState } from "react";
import { usersApi } from "@/api/services";
import { ROLES, ROLE_LABEL, type Role } from "@/api/types";
import { useCurrentUser } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useUsers } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { RoleLabel } from "@/components/ui/Badges";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";

export function UsersPage() {
  useDocumentTitle("Users");
  const me = useCurrentUser();
  const toast = useToast();
  const { data: users, error, loading, reload, setData } = useUsers();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [pending, setPending] = useState<number | null>(null);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (users ?? []).filter((user) => (!roleFilter || user.role === roleFilter) && (!term || user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)));
  }, [users, query, roleFilter]);

  const changeRole = async (userId: number, role: Role) => {
    setPending(userId);
    try {
      await usersApi.setRole(userId, role);
      setData((list) => list.map((user) => (user.id === userId ? { ...user, role } : user)));
      toast.success(`Role changed to ${ROLE_LABEL[role]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the role");
      reload(); // re-sync the dropdown with the server
    } finally {
      setPending(null);
    }
  };

  if (!users && loading) return <Spinner label="Loading users…" />;
  if (!users) return <ErrorState error={error ?? new Error("No data")} onRetry={reload} />;

  return (
    <div>
      <div className="page-header">
        <h1>Users &amp; roles</h1>
      </div>

      <div className="toolbar">
        <div className="search-input grow">
          <Icon name="search" />
          <input className="form-control" type="search" placeholder="Find a user…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        </div>
        <div className="filters">
          <select className="form-control" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "")} aria-label="Filter by role">
            <option value="">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="Box">
          <EmptyState icon="users" title="No users found">Try a different search.</EmptyState>
        </div>
      ) : (
        <div className="Box table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const isMe = user.id === me.id;
                return (
                  <tr key={user.id}>
                    <td data-label="User">
                      <span className="user-chip">
                        <Avatar name={user.username} size={24} />
                        <strong>{user.username}</strong>
                        {isMe && <span className="Label Label-neutral">You</span>}
                      </span>
                    </td>
                    <td data-label="Email" className="muted">{user.email}</td>
                    <td data-label="Joined" className="muted">{formatDate(user.createdAt)}</td>
                    <td data-label="Role">
                      {isMe ? (
                        <RoleLabel role={user.role} />
                      ) : (
                        <select className="form-control form-control-sm" value={user.role} disabled={pending === user.id} onChange={(e) => changeRole(user.id, e.target.value as Role)} aria-label={`Role for ${user.username}`}>
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABEL[role]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small pad-top">You can’t change your own role. The last remaining admin can’t be demoted.</p>
    </div>
  );
}
