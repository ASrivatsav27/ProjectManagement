import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Field } from "@/components/ui/Field";
import { Flash } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";

function AuthLayout({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="auth-page">
      <Icon name="layers" size={48} style={{ color: "var(--success-btn)" }} />
      <h1 className="auth-title">{title}</h1>
      <div className="Box auth-box">{children}</div>
      <div className="Box auth-footer">{footer}</div>
    </div>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  useDocumentTitle("Sign in");
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!EMAIL.test(email.trim())) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to Project Hub"
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {serverError && <Flash>{serverError}</Flash>}
        <Field label="Email address" error={errors.email}>
          {(props) => <input {...props} className="form-control" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(props) => <input {...props} className="form-control" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  useDocumentTitle("Create account");
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (username.trim().length < 3) next.username = "Username must be at least 3 characters";
    if (!EMAIL.test(email.trim())) next.email = "Enter a valid email address";
    if (password.length < 8) next.password = "Use at least 8 characters";
    if (confirm !== password) next.confirm = "Passwords do not match";
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await register(username.trim(), email.trim(), password);
      toast.success("Welcome to Project Hub!");
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {serverError && <Flash>{serverError}</Flash>}
        <Field label="Username" error={errors.username}>
          {(props) => <input {...props} className="form-control" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />}
        </Field>
        <Field label="Email address" error={errors.email}>
          {(props) => <input {...props} className="form-control" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters.">
          {(props) => <input {...props} className="form-control" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          {(props) => <input {...props} className="form-control" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
