import type { Pagination as PaginationMeta } from "@/api/types";
import { Icon } from "./Icon";

export function Pagination({ meta, onChange }: { meta: PaginationMeta; onChange: (page: number) => void }) {
  if (meta.pages <= 1) return null;

  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);

  // Show a compact window of page numbers around the current page.
  const numbers: number[] = [];
  for (let page = Math.max(1, meta.page - 2); page <= Math.min(meta.pages, meta.page + 2); page++) numbers.push(page);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted pagination-info">
        {from}–{to} of {meta.total}
      </span>
      <div className="pagination-pages">
        <button className="btn btn-sm" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
          <Icon name="chevron-left" size={14} /> Previous
        </button>
        {numbers.map((page) => (
          <button key={page} className={`btn btn-sm${page === meta.page ? " btn-selected" : ""}`} aria-current={page === meta.page ? "page" : undefined} onClick={() => onChange(page)}>
            {page}
          </button>
        ))}
        <button className="btn btn-sm" disabled={meta.page >= meta.pages} onClick={() => onChange(meta.page + 1)}>
          Next <Icon name="chevron-right" size={14} />
        </button>
      </div>
    </nav>
  );
}
