export function validateName(value: string) {
  const name = value.trim();
  if (!name) return "Please enter your full name.";
  if (name.length > 80) return "Use no more than 80 characters for your name.";
  if (/[\u0000-\u001f\u007f]/.test(name)) return "Please enter a valid name.";
  return undefined;
}

export function validateAuth(data: FormData, mode: "login" | "signup") {
  const errors: Record<string, string> = {};
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  if (mode === "signup") {
    const nameError = validateName(String(data.get("name") ?? ""));
    if (nameError) errors.name = nameError;
    if (password.length < 8) errors.password = "Use at least 8 characters.";
    if (password !== data.get("confirmPassword"))
      errors.confirmPassword = "Your passwords don’t match.";
  }
  return errors;
}

export function authErrorMessage(
  error: { code?: string; status?: number },
  operation: "login" | "signup" | "profile" | "logout",
) {
  if (error.code === "invalid_credentials")
    return "Email or password is incorrect.";
  if (error.code === "email_not_confirmed")
    return "Please confirm your email before signing in.";
  if (error.code === "weak_password")
    return "Choose a stronger password that meets this project's password requirements.";
  if (error.code === "user_already_exists" || error.code === "email_exists")
    return "Unable to create this account. Try signing in instead.";
  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  )
    return "Too many attempts. Please wait a little before trying again.";
  if (error.code === "email_address_not_authorized")
    return "Email delivery is limited for this project. Please ask the project owner to check the Auth email settings.";
  if (operation === "signup")
    return "We couldn't create your account right now. Please try again.";
  if (operation === "profile")
    return "We couldn't update your profile right now. Please try again.";
  if (operation === "logout")
    return "We couldn't sign you out right now. Please try again.";
  return "We couldn't sign you in right now. Please try again.";
}
