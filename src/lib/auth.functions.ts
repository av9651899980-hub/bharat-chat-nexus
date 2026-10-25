import { createServerFn } from "@tanstack/react-start";

// Legacy public privileged account-creation endpoints are intentionally disabled.
export const registerUser = createServerFn({ method: "POST" })
  .handler(async () => { throw new Error("Create your account with Google."); });
export const jarvisLogin = createServerFn({ method: "POST" })
  .handler(async () => { throw new Error("Authentication failed"); });
