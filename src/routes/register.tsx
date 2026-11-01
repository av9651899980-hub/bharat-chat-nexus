import { createFileRoute, Link } from "@tanstack/react-router";
import { GoogleSignIn } from "@/components/google-sign-in";
import { ArcEmblem } from "@/components/arc-emblem";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [
    { title: "Create your BharatChat account" },
    { name: "description", content: "Create your BharatChat account securely with Google." },
    { property: "og:title", content: "Create your BharatChat account" },
    { property: "og:description", content: "Create your BharatChat account securely with Google." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RegisterPage,
});
function RegisterPage() {
  return <div className="min-h-screen bg-background px-6 py-12">
    <div className="mx-auto w-full max-w-md animate-rise">
      <ArcEmblem subtitle="Create your BharatChat account" />
      <div className="mt-10"><GoogleSignIn /></div>
      <Link to="/" className="mt-5 block text-center text-sm font-semibold text-primary">Already have an account? Login</Link>
    </div>
  </div>;
}
