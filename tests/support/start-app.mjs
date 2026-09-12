import { spawn } from "node:child_process";

const next = "node_modules/next/dist/bin/next";
const build = spawn(process.execPath, [next, "build"], {
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});
build.on("exit", (code) => {
  if (code) process.exit(code);
  const app = spawn(
    process.execPath,
    [next, "start", "--hostname", "127.0.0.1", "--port", "3002"],
    { stdio: "inherit", env: process.env, windowsHide: true },
  );
  app.on("exit", (status) => process.exit(status ?? 0));
  process.on("SIGTERM", () => app.kill());
});
process.on("SIGTERM", () => build.kill());
