import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui/Feedback";
import { EmptyState } from "@/components/ui/Feedback";

/** Wraps every page that needs a signed-in user; remembers where the user was going. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <Spinner label="Checking your session…" />;
  if (status === "guest") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  return <Outlet />;
}

/** Keeps signed-in users away from the login / register screens. */
export function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <Spinner label="Checking your session…" />;
  if (status === "authenticated") return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/"} replace />;

  return <Outlet />;
}

/** Role guard (UI only - the API enforces the same rule). */
export function RoleRoute({ roles }: { roles: Role[] }) {
  const { hasRole } = useAuth();

  if (!hasRole(...roles)) {
    return <EmptyState icon="shield" title="You don’t have access to this page">Ask an administrator if you need permission.</EmptyState>;
  }

  return <Outlet />;
}
