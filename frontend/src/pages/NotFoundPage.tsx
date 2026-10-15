import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { EmptyState } from "@/components/ui/Feedback";

export function NotFoundPage() {
  useDocumentTitle("Not found");

  return (
    <div className="Box">
      <EmptyState icon="search" title="404 — page not found" action={<Link className="btn btn-primary" to="/">Back to dashboard</Link>}>
        The page you’re looking for doesn’t exist or was moved.
      </EmptyState>
    </div>
  );
}
