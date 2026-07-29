<!--
Thanks for contributing to CloakBin. Keep PRs focused: one concern per PR.
-->

## What & why

<!-- One or two sentences. Link the issue, e.g. "Closes #12". -->

## Type of change

- [ ] Bug fix
- [ ] Feature / enhancement
- [ ] CLI
- [ ] Refactor / docs / chore

## Testing

<!-- What you ran and what you clicked through. -->

```
# pnpm check / pnpm lint output
```

## Checklist

- [ ] `pnpm check` and `pnpm lint` pass
- [ ] No real secrets or live paste URLs in the diff, tests, or screenshots
- [ ] **Touches crypto or key handling?** The key stays in the URL fragment and never reaches the server, the network tab proves it, and the change is called out above
- [ ] UI changes tested at desktop width and around 390px
- [ ] No new runtime dependency, or the PR explains why one is needed

---

Stuck on a review comment or want to talk through an approach? [Discord](https://discord.gg/KKvtRhQvRv).
