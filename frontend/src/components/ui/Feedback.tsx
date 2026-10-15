import type { ReactNode } from "react";
import { ApiError } from "@/api/client";
import { Icon, type IconName } from "./Icon";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="center-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = "folder", title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="blankslate">
      <Icon name={icon} size={32} />
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  return (
    <div className="blankslate" role="alert">
      <Icon name="alert" size={32} style={{ color: "var(--danger)" }} />
      <h3>Something went wrong</h3>
      <p className="muted">{error.message}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          <Icon name="refresh" /> Try again
        </button>
      )}
    </div>
  );
}

export function Flash({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  return (
    <div className={`flash flash-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon name={kind === "error" ? "alert" : kind === "success" ? "check-circle" : "info"} />
      <div>{children}</div>
    </div>
  );
}
