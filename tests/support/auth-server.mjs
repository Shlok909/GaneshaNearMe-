// Isolated HTTP Auth contract double. Never imported by the application.
// It signs real ES256 JWTs so the unmodified SDK verifies claims via JWKS.
import { createServer } from "node:http";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";

const origin = "http://127.0.0.1:54329";
const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "gnm-test-key",
  alg: "ES256",
  use: "sig",
};
let users,
  sessions,
  refreshTokens,
  confirmationTokens,
  confirmEmail,
  refreshCount;
function reset() {
  users = new Map();
  sessions = new Map();
  refreshTokens = new Map();
  confirmationTokens = new Map();
  confirmEmail = true;
  refreshCount = 0;
  addUser("explorer@example.com", "festival123", "Test Explorer", true);
}
function addUser(email, password, fullName, confirmed) {
  const user = {
    id: randomUUID(),
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: confirmed ? "2026-09-01T12:00:00Z" : null,
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-09-01T12:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: fullName },
    identities: [],
  };
  users.set(email, { user, password });
  return user;
}
function sessionFor(user, lifetime = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", typ: "JWT", kid: jwk.kid }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      iss: `${origin}/auth/v1`,
      iat: now - 120,
      exp: now + lifetime,
      session_id: randomUUID(),
      user_metadata: user.user_metadata,
    }),
  ).toString("base64url");
  const input = `${header}.${payload}`;
  const token = `${input}.${sign("sha256", Buffer.from(input), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
  const refresh = randomUUID();
  sessions.set(token, user);
  refreshTokens.set(refresh, user);
  return {
    access_token: token,
    refresh_token: refresh,
    token_type: "bearer",
    expires_in: lifetime,
    expires_at: now + lifetime,
    user,
  };
}
reset();
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3002");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Supabase-Api-Version", "2024-01-01");
  res.setHeader("Cache-Control", "no-store");
  const send = (status, data) => {
    res.statusCode = status;
    res.end(data === undefined ? undefined : JSON.stringify(data));
  };
  const fail = (code, status = 400) => send(status, { code, msg: code });
  if (req.method === "OPTIONS") return send(204);
  const url = new URL(req.url, origin);
  let body = {};
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (raw) body = JSON.parse(raw);
  } catch {
    return fail("bad_json");
  }
  if (url.pathname === "/__test/reset" && req.method === "POST") {
    reset();
    return send(200, { ok: true });
  }
  if (url.pathname === "/__test/settings" && req.method === "POST") {
    confirmEmail = body.confirmEmail;
    return send(200, { ok: true });
  }
  if (url.pathname === "/__test/state")
    return send(200, {
      users: [...users.values()].map(({ user }) => user),
      confirmations: [...confirmationTokens].map(([token_hash, user]) => ({
        token_hash,
        email: user.email,
      })),
      refreshCount,
    });
  if (url.pathname === "/__test/expired-session" && req.method === "POST")
    return send(200, sessionFor(users.get("explorer@example.com").user, -60));
  if (url.pathname === "/auth/v1/.well-known/jwks.json")
    return send(200, { keys: [jwk] });
  if (url.pathname === "/auth/v1/signup" && req.method === "POST") {
    if (body.email === "limited@example.com")
      return fail("over_email_send_rate_limit", 429);
    if (users.has(body.email)) return fail("user_already_exists", 422);
    const user = addUser(
      body.email,
      body.password,
      body.data?.full_name,
      !confirmEmail,
    );
    if (!confirmEmail) return send(200, sessionFor(user));
    confirmationTokens.set(randomUUID(), user);
    return send(200, user);
  }
  if (url.pathname === "/auth/v1/verify" && req.method === "POST") {
    const user = confirmationTokens.get(body.token_hash);
    if (!user) return fail("otp_expired", 403);
    confirmationTokens.delete(body.token_hash);
    user.email_confirmed_at = new Date().toISOString();
    return send(200, sessionFor(user));
  }
  if (url.pathname === "/auth/v1/token" && req.method === "POST") {
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const user = refreshTokens.get(body.refresh_token);
      if (!user) return fail("refresh_token_not_found");
      refreshTokens.delete(body.refresh_token);
      refreshCount++;
      return send(200, sessionFor(user));
    }
    const account = users.get(body.email);
    if (!account || account.password !== body.password)
      return fail("invalid_credentials");
    if (!account.user.email_confirmed_at) return fail("email_not_confirmed");
    return send(200, sessionFor(account.user));
  }
  const user = sessions.get(req.headers.authorization?.replace(/^Bearer /, ""));
  if (url.pathname === "/auth/v1/user") {
    if (!user) return fail("bad_jwt", 401);
    if (req.method === "PUT") {
      Object.assign(user.user_metadata, body.data);
      user.updated_at = new Date().toISOString();
    }
    return send(200, user);
  }
  if (url.pathname === "/auth/v1/logout" && req.method === "POST") {
    if (user) {
      for (const [key, value] of sessions)
        if (value.id === user.id) sessions.delete(key);
      for (const [key, value] of refreshTokens)
        if (value.id === user.id) refreshTokens.delete(key);
    }
    return send(204);
  }
  return fail("not_found", 404);
});
server.listen(54329, "127.0.0.1", () =>
  console.log("Isolated Auth test service ready"),
);
