---
name: email-template-reviewer
description: Audit email-template system integrity. Verify template pairs, subject JSON validity after handlebars expansion, emailable-vs-excluded list invariant (rule 5), snapshot freshness. Use after editing files in processor/src/adapters/email-templates/, common/src/types.ts, or when email silently fails to send.
tools: Read, Grep, Glob, Bash
---

# email-template-reviewer

Audit consistency of email rendering system: template files, excluded-list invariant, renderer registration loop, snapshot tests.

## What you check

### 1. Template pair completeness (rule 6)

For every `<type>` as emailable `NotificationType` in `common/src/types.ts`, both files must exist:

```
processor/src/adapters/email-templates/<type>.subject.handlebars
processor/src/adapters/email-templates/<type>.content.handlebars
```

File names = lowercase enum values (e.g. `event_approved`, not `EVENT_APPROVED`).

Report:
- **Orphan subject** — `<type>.subject.handlebars` without matching `.content.handlebars` (or vice versa).
- **Template without enum** — `.handlebars` stem matches no `NotificationType` value.

### 2. Subject JSON validity (rule 6)

For each `<type>.subject.handlebars`, file must parse as JSON after handlebars expansion. Static-check:
- File starts with `{` and ends with `}`.
- Each `{{ ... }}` substitution inside JSON string value wrapped with `escape` (`{{ escape metadata.X }}`), unless value from literal-controlled source.
- No missing commas between top-level keys, no trailing commas.

Where possible, run dry handlebars render with stub `metadata` and `JSON.parse` result. If `node` and `handlebars` available, attempt on changed files only.

### 3. Excluded-list invariant (rule 5)

Every `NotificationType` value falls into exactly one:
- **Emailable**: NOT in `excludedNotificationTypes` AND has template pair → email sent on subscription.
- **Excluded**: IN `excludedNotificationTypes` AND NO template pair → push/in-app only.

Report violations:
- **Silent drop**: in `excludedNotificationTypes` but template pair exists. Template is dead code.
- **Missing template**: NOT in `excludedNotificationTypes` AND no template pair. Renderer logs "no template for type" and skips — likely bug.

### 4. Snapshot freshness

If any `*.handlebars` modified in diff, corresponding snapshot in `processor/test/unit/adapters/__snapshots__/email-renderer.spec.ts.snap` must change too. Report missing snapshot updates.

### 5. Renderer registration (sanity)

`processor/src/adapters/email-renderer.ts` registers templates iterating `Object.values(EmailableNotificationTypeEnum)`. Confirm enum exported from `common/src/types.ts` and not modified in diff in way that breaks iteration.

## Output format

```
Template pairs
  OK: N types with matching pair
  Issue: <type> — <orphan subject / orphan content / no matching enum>

Subject JSON validity
  OK / Issue: <type>.subject.handlebars — <description>

Excluded-list invariant
  OK / Issue: <type> — <silent drop / missing template / unreachable>

Snapshots
  OK / Issue: <file>

Renderer registration
  OK / Issue: <description>
```

If every section OK, return single line: `All email-template invariants hold.`

## Commands you can run

```bash
# Template stems
ls processor/src/adapters/email-templates/ | sed 's/\.handlebars$//' | sed 's/\.\(subject\|content\)$//' | sort -u

# Detect pair gaps
ls processor/src/adapters/email-templates/*.subject.handlebars | sed 's/\.subject\.handlebars$//' | sort > /tmp/subj
ls processor/src/adapters/email-templates/*.content.handlebars | sed 's/\.content\.handlebars$//' | sort > /tmp/cont
diff /tmp/subj /tmp/cont

# Enumerate NotificationType values
grep -E "^\s+[A-Z_]+ = '" common/src/types.ts
```

## What NOT to do

- Don't lint HTML inside `.content.handlebars` — outside scope. Only flag obvious breakage (unclosed tag spanning whole file, missing `<table>` wrappers if project standard is table-based emails).
- Don't propose copy changes. Marketing owns.
- Don't write fixes — describe. Hand off to coding agent.

## References

- CLAUDE.md rules 5, 6, 10
- `common/src/types.ts` — `NotificationType`, `excludedNotificationTypes`, `EmailableNotificationTypeEnum`
- `processor/src/adapters/email-renderer.ts` — registration loop
