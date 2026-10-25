import { createFileRoute, redirect } from "@tanstack/react-router";

// Retain the old URL solely as a harmless redirect for saved links.
export const Route = createFileRoute("/jarvis-auth")({
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
});
