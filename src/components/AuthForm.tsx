"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { signInDemo } from "@/lib/demo-auth";
import { useFeedback } from "./ui/Feedback";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const notify = useFeedback();
  function complete(name?: string, email?: string) {
    setBusy(true);
    const persisted =
      name && email ? signInDemo({ name, email }) : signInDemo();
    if (!persisted)
      notify(
        "Browser storage is unavailable. You can still explore this visit.",
        "info",
      );
    router.push("/home");
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const name = String(data.get("name") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const nextErrors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = "Enter a valid email address.";
    if (password.length < 6) nextErrors.password = "Use at least 6 characters.";
    if (mode === "signup" && name.length < 2)
      nextErrors.name = "Please enter your name.";
    if (mode === "signup" && password !== data.get("confirmPassword"))
      nextErrors.confirmPassword = "Your passwords don’t match.";
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      document.getElementById(`auth-${firstError}`)?.focus();
      return;
    }
    complete(mode === "signup" ? name : "Ganapati Explorer", email);
  }
  return (
    <>
      <div className="auth-tabs" role="group" aria-label="Account access">
        <button
          type="button"
          aria-pressed={mode === "login"}
          onClick={() => {
            setMode("login");
            setErrors({});
          }}
        >
          Login
        </button>
        <button
          type="button"
          aria-pressed={mode === "signup"}
          onClick={() => {
            setMode("signup");
            setErrors({});
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
      <button
        type="button"
        className="button google-button"
        disabled={busy}
        onClick={() => complete()}
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <div className="auth-divider">
        <span>or continue with email</span>
      </div>
      <form onSubmit={submit} noValidate className="auth-form" key={mode}>
        {mode === "signup" && (
          <AuthField
            name="name"
            label="Your name"
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
          placeholder="At least 6 characters"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
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
          {busy ? "Welcome in…" : mode === "login" ? "Login" : "Create Account"}
          <ArrowRight size={18} />
        </button>
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
