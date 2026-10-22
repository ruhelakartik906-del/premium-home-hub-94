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

- Keep Eliteoz as a frontend-only TanStack Start experience with mock records and explicit integration placeholders; no backend is connected and simulated verification/payment must never imply completion.
- Organize public content and the three distinct workspaces through dedicated route families with shared visual primitives, so future service integration does not collapse role boundaries.
- Keep text contrast surface-aware in shared CSS and enforce Button variant foreground tokens against inherited page colors, so links rendered as buttons stay readable in alerts and dark sections.
- Use a shared PasswordInput for masked fields; registration role selection is URL-backed and its draft lives only in a per-app React provider, so Back/Forward preserves unsent inputs without storing credentials on disk.
