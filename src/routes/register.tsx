import { createFileRoute, Link } from "@tanstack/react-router";
import { GoogleSignIn } from "@/components/google-sign-in";

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
      <h1 className="text-2xl font-bold text-primary">Create Account</h1>
      <div className="mt-8"><GoogleSignIn /></div>
      <Link to="/" className="mt-5 block text-center text-sm font-semibold text-primary">Back to login</Link>
    </div>
  </div>;
}
