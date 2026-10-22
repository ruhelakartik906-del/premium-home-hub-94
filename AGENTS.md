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

- Use the existing Lovable Cloud backend for real registration, OTP and payment workflows; never describe simulated verification or provider acceptance as completed delivery or payment.
- Organize public content and the three distinct workspaces through dedicated route families with shared visual primitives, so future service integration does not collapse role boundaries.
- Keep text contrast surface-aware in shared CSS and enforce Button variant foreground tokens against inherited page colors, so links rendered as buttons stay readable in alerts and dark sections.
- Use a shared PasswordInput for masked fields; registration role selection is URL-backed and its draft lives only in a per-app React provider, so Back/Forward preserves unsent inputs without storing credentials on disk.
- Let TanStack Router own destination scroll resets and history restoration with instant behavior and no route view transitions; never scroll the outgoing page in link handlers.
- Serve the existing typography from Fontsource packages and use modern responsive bundled photography, keeping above-fold hero preloads aligned with the displayed image to avoid duplicate transfers.
- Keep uploaded availability-report drafts in isolated frontend-only modules and Master Admin preview sections, never feeding live listing mutations, so unconfirmed source records cannot accidentally be published.
- Implement APITXT delivery through TanStack server functions with server-only credentials and atomic database challenge checks, so concurrent resend or verification cannot bypass limits or registration proof.
- Keep security-sensitive payment checks in shared pure predicates: only matching captured payments activate ordinary accounts, test bypass requires a server-verified administrator, and credential status never returns credential fragments.
- Initialize the first administrator through a service-only atomic database function; fail closed on lookup errors and roll back failed account creation to prevent competing setup requests granting extra administrators.
