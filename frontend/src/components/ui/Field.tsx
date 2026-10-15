import { useId, type ReactNode } from "react";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Receives the generated id so the label is linked to the control. */
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}

export function Field({ label, error, hint, required, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`form-group${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="required"> *</span>}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="muted field-hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
