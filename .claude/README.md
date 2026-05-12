# `.claude/` — Agent Development Kit for notifications-workers

Project-scoped config for Claude Code. Auto-loaded when repo open.

**Source of truth:** [`CLAUDE.md`](../CLAUDE.md) at repo root. Numbered rules referenced by hooks/skills/agents point there.

## Layout

```
.claude/
├── README.md                        ← this file (index)
├── settings.json                    ← registers hooks
├── hooks/
│   ├── pre-bash-block-destructive.sh
│   ├── pre-write-warn-criticals.sh
│   └── session-start.sh
├── skills/
│   ├── add-notification-type/SKILL.md
│   ├── bump-schemas-dep/SKILL.md
│   └── pre-pr-pipeline/SKILL.md
└── agents/
    ├── code-reviewer.md
    └── email-template-reviewer.md
```

## What each layer does

| Layer | Purpose |
|---|---|
| **Memory** (CLAUDE.md) | Numbered rules, folder map, commands, pitfalls. |
| **Knowledge** (skills) | Step-by-step recipes for recurring flows: add notification type, bump schemas, run pre-PR pipeline. |
| **Guardrails** (hooks) | Deterministic Bash/Edit guards: block destructive ops on hot paths (rule 19), warn before touching migrations / yarn.lock / opt-out tables. |
| **Delegation** (agents) | `code-reviewer` against CLAUDE.md rules; `email-template-reviewer` for handlebars pair + excluded-list integrity. |

## Hooks

Hooks live in `hooks/` as executable `.sh` scripts. Read stdin JSON via `jq`, fail-open if `jq` missing (one-time warning printed). Run manually:

```bash
echo '{"tool_input":{"command":"rm -rf processor/src/migrations"}}' \
  | .claude/hooks/pre-bash-block-destructive.sh
echo $?     # 2 = blocked
```

## Updating

Edit rules in `CLAUDE.md` first, then update refs in skills/agents. Hooks rarely change — they encode `CLAUDE.md` rules deterministically; if re-tuning a hook frequently, underlying rule probably wrong.
