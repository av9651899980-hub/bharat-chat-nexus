<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Preserve the existing TanStack routes, managed authentication and permission hierarchy; extend existing surfaces rather than duplicating them.
- Group creation uses an authenticated atomic database function; membership and message identity/owner/send restrictions are enforced by database triggers so browser writes cannot bypass them.
- JARVIS summaries use member-scoped reads and server-only AI SDK Responses helpers, never privileged transcript reads; summaries are on-demand results without AI chat-history storage.
- Shared presentation uses global semantic tokens and the existing design components to keep messaging, staff tools and owner administration cohesive.
- Mount the CSS-only launch intro once at the root and start it after hydration using root-lifetime state rather than persistent seen storage; fresh documents replay while route navigation preserves the completed state without affecting auth or adding Android video/GPU dependencies.
