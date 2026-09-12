"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { authenticate } from "@/app/auth/actions";
import { validateAuth } from "@/lib/auth/validation";

export function AuthForm({
  nextPath = "/home",
  configurationError,
}: {
  nextPath?: string;
  configurationError?: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [message, setMessage] = useState<string>();
  const [checkEmail, setCheckEmail] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || configurationError) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors = validateAuth(data, mode);
    setErrors(nextErrors);
    setMessage(undefined);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      document.getElementById(`auth-${firstError}`)?.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const result = await authenticate(mode, data, nextPath);
      if (result.errors) setErrors(result.errors);
      else if (result.error) setMessage(result.error);
      else {
        form.reset();
        setShowPassword(false);
        if (result.checkEmail) setCheckEmail(true);
        else if (result.redirectTo) window.location.replace(result.redirectTo);
      }
    } catch {
      setMessage("We couldn't reach the server. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  if (checkEmail)
    return (
      <section className="auth-confirmation" role="status">
        <Mail size={32} aria-hidden="true" />
        <h1>Check your email</h1>
        <p>
          We sent a confirmation link to your email address. Confirm your email
          to finish creating your account.
        </p>
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            setCheckEmail(false);
            setMode("login");
            setErrors({});
            setMessage(undefined);
          }}
        >
          Back to Login
        </button>
      </section>
    );
  return (
    <>
      <div className="auth-tabs" role="group" aria-label="Account access">
        <button
          type="button"
          disabled={busy}
          aria-pressed={mode === "login"}
          onClick={() => {
            setMode("login");
            setErrors({});
            setMessage(undefined);
            setShowPassword(false);
          }}
        >
          Login
        </button>
        <button
          type="button"
          disabled={busy}
          aria-pressed={mode === "signup"}
          onClick={() => {
            setMode("signup");
            setErrors({});
            setMessage(undefined);
            setShowPassword(false);
          }}
        >
          Sign Up
        </button>
      </div>
      <div className="auth-heading">
        <h1>
          {mode === "login"
            ? "Welcome to the celebration."
            : "A new journey with Bappa."}
        </h1>
        <p>
          {mode === "login"
            ? "Your next darshan is just around the corner."
            : "Join a community brought together by devotion."}
        </p>
      </div>
      <button type="button" className="button google-button" disabled>
        <GoogleIcon />
        Continue with Google · Coming soon
      </button>
      <div className="auth-divider">
        <span>or continue with email</span>
      </div>
      <form onSubmit={submit} noValidate className="auth-form" key={mode}>
        {(configurationError || message) && (
          <p className="auth-message field-error" role="alert">
            {configurationError || message}
          </p>
        )}
        <fieldset
          className="auth-fields"
          disabled={busy || !!configurationError}
        >
          {mode === "signup" && (
            <AuthField
              name="name"
              label="Full Name"
              maxLength={80}
              placeholder="Full name"
              autoComplete="name"
              icon={<UserRound size={18} />}
              error={errors.name}
            />
          )}
          <AuthField
            name="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            icon={<Mail size={18} />}
            error={errors.email}
          />
          <AuthField
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder={
              mode === "signup" ? "At least 8 characters" : "Your password"
            }
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            icon={<LockKeyhole size={18} />}
            error={errors.password}
            action={
              <button
                type="button"
                className="icon-button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          {mode === "signup" && (
            <AuthField
              name="confirmPassword"
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password again"
              autoComplete="new-password"
              icon={<LockKeyhole size={18} />}
              error={errors.confirmPassword}
            />
          )}
          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={busy}
          >
            {busy
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Login"
                : "Create Account"}
            <ArrowRight size={18} />
          </button>
        </fieldset>
      </form>
      <p className="auth-footnote">
        For the love of Bappa. For the joy of discovering.
      </p>
    </>
  );
}

function AuthField({
  name,
  label,
  error,
  icon,
  action,
  ...props
}: {
  name: string;
  label: string;
  error?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={`auth-${name}`}>
        {label}
      </label>
      <div className="input-with-icon">
        {icon}
        <input
          id={`auth-${name}`}
          name={name}
          required
          aria-invalid={!!error}
          aria-describedby={error ? `error-${name}` : undefined}
          {...props}
        />
        {action}
      </div>
      {error && (
        <p id={`error-${name}`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2.1.9-3.5.9-2.7 0-5-1.8-5.8-4.2H2.9v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.2 13.8a6 6 0 0 1 0-3.6V7.6H2.9a10 10 0 0 0 0 8.8l3.3-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.1 5.6l3.3 2.6C7 7.8 9.3 6 12 6Z"
      />
    </svg>
  );
}
