export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, value));

  return (
    <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Completion"}>
      <span className={percent === 100 ? "progress-done" : ""} style={{ width: `${percent}%` }} />
    </div>
  );
}
