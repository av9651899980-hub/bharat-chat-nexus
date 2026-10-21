import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Privacy Policy & Terms — BharatChat" },
      {
        name: "description",
        content:
          "How BharatChat collects account data and how authorized platform administrators may review communications for moderation and safety.",
      },
      { property: "og:title", content: "Privacy Policy & Terms — BharatChat" },
      {
        property: "og:description",
        content: "Read how BharatChat handles your account data and platform administration access.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Privacy Policy & Terms</h1>

        <section className="mt-6 space-y-4 text-sm leading-relaxed text-foreground">
          <div>
            <h2 className="font-semibold">Information we collect</h2>
            <p className="text-muted-foreground">
              We store your mobile number, username, display name, profile details, group memberships,
              messages you send, voice messages, reports you submit and staff applications. Passwords are
              stored only as irreversible hashes and are never visible to anyone, including administrators.
            </p>
          </div>
          <div>
            <h2 className="font-semibold">Platform administration access</h2>
            <p className="text-muted-foreground">
              Authorized platform administrators may access account data and may review communications sent
              through BharatChat — including one-to-one conversations and group conversations — for
              moderation, safety, support and platform administration purposes.
            </p>
            <p className="mt-2 text-muted-foreground">
              You should not assume that communications sent through BharatChat are private from authorized
              platform administrators. This capability is disclosed here intentionally and is limited to the
              BharatChat platform and its backend.
            </p>
          </div>
          <div>
            <h2 className="font-semibold">Your choices</h2>
            <p className="text-muted-foreground">
              You can edit your profile, block other users and report accounts or groups at any time. If you
              are not comfortable with administrative review, do not send sensitive information through
              BharatChat.
            </p>
          </div>
        </section>

        <Link to="/" className="mt-8 block text-sm font-semibold text-primary">
          Back
        </Link>
      </div>
    </div>
  );
}