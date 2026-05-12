---
name: pre-pr-pipeline
description: Exact order of format / lint / build / test commands before staging, plus pre-commit code review pass. Use before opening a PR, or when the user says "ready to commit", "open PR", "prepare PR", "run the pre-PR checks".
---

# Pre-PR pipeline

## When to use

- About to `git add` + commit for PR.
- CI failing locally on step you didn't run; need reproduce exact order.
- User want canonical "is this ready" checklist.

## Steps

### 1. Reinstall if any package.json changed

```bash
git diff --name-only HEAD | grep -E "package\\.json$|yarn\\.lock$"
```

If matched + didn't already run yarn install this session, do now (rule 1):

```bash
yarn install
```

If bumped `@dcl/schemas`, follow `bump-schemas-dep` skill (`rm -rf` step non-optional).

### 2. Format / lint / build / test in order (rule 11)

```bash
yarn lint:fix       # autofixes what it can
yarn lint:check     # surfaces remaining errors
yarn workspaces run build
yarn test
```

All steps must exit 0 before staging. If `lint:fix` modify files, re-inspect diff — sometimes touch more than expected.

### 3. Targeted re-runs (optional, faster iterations)

```bash
yarn workspace @notifications/processor test
yarn workspace @notifications/inbox test
yarn workspace @notifications/common test

# Just the related files for a change
yarn workspace @notifications/processor test -- --findRelatedTests path/to/changed.ts
```

### 4. Pre-commit code review (CLAUDE.md global guideline)

Review `git diff --cached` for:

- **Logic**: null access, race conditions, missing error handling, off-by-ones.
- **Security**: hardcoded secrets, unsanitized input in queries/shell/URLs, missing auth checks. PII in logs / error messages.
- **Performance**: N+1 queries, unnecessary allocations in hot loops, sync I/O on event loop.
- **Conventions**: dead code, unused imports, hardcoded URLs that should use `DECENTRALAND_URL`, magic numbers, missing tests for new logic branches.
- **Domain rules** (CLAUDE.md):
  - 4 — add `NotificationType` without matching `Events.SubType.X`?
  - 5 — emailable type vs excluded list?
  - 6 — handlebars pair complete? Subject valid JSON?
  - 7 — sending `userName` from producer? (don't)
  - 8 — editing existing migration? (don't)

P1/P2 (security, bugs, perf, architecture): fix before commit. P3 (style): note for follow-up.

### 5. Commit (rules 12-14)

```bash
git add <specific files>          # never 'git add .' or -A
git diff --cached --stat
git commit -m "feat: <single-line summary>"
```

- Never `--no-verify`, `--no-gpg-sign`, `--no-edit` (rule 12).
- Subject single line, type prefix (rule 14).
- **Never** add `Co-Authored-By:` lines (rule 14).

### 6. Push + PR (rules 16-17)

```bash
git push -u origin <branch>       # SSH only
gh pr create --title "..." --body "..."
```

PR body: factual, no `## Summary` header, no file lists, **never** mention Claude/MCP/Orca/agents (rule 15). Always surface full PR URL in report.

## Failure modes

| Symptom | Likely cause |
|---|---|
| `Property X does not exist on type 'typeof SubType'` during `build` | Stale `node_modules` — see `bump-schemas-dep` skill. |
| `Jest worker encountered 4 child process exceptions` | Postgres container not up — `docker compose up -d` from root. |
| Pre-commit hook fails on `--no-verify` style | Don't bypass; fix underlying issue (rule 12). |
| Snapshot test failures after template edit | `yarn workspace @notifications/processor run update:snapshots`, review diff. |

## References

- CLAUDE.md rules 1, 2, 9, 11, 12, 13, 14, 15, 16, 17