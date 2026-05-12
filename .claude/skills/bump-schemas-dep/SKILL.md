---
name: bump-schemas-dep
description: Recipe for bumping @dcl/schemas (or any cross-workspace dep) without leaving stale nested node_modules. Use when the user says "bump schemas", "update dcl schemas", "upgrade @dcl/schemas", or when TS errors mention Events.SubType members that should exist in a newer version.
---

# Bump @dcl/schemas (or any shared dep)

## When to use

- `@dcl/schemas` new release w/ types repo needs.
- TS errors `Property X does not exist on type 'typeof SubType'` or `Property metadata does not exist on type 'Event'` after `yarn install`.
- Producer service (events, comms-gatekeeper) bumped schemas, need new event shape here.

## When NOT to use

- Bumping dep in only one workspace (`processor/`, `inbox/`, etc.) — plain `yarn install` from root enough.

## Why this is special

`@dcl/schemas` declared in **four** `package.json` files (root + 3 workspaces). Transitive deps pin older ranges, so Yarn leaves nested copies under `decentraland-gatsby`, `decentraland-ui`, etc. Hoisted version at `node_modules/@dcl/schemas/` is what code resolves, but stale `common/node_modules/@dcl/schemas/` keeps old types active for anything resolved from inside `common/`. Result: compiles in one workspace, fails in another. (CLAUDE.md rule 2.)

## Steps

### 1. Bump every package.json that pins schemas

```bash
grep -nH '"@dcl/schemas"' package.json common/package.json inbox/package.json processor/package.json
```

Edit all four to same target version (e.g. `26.4.0`). Keep existing `^` if there; else match file convention.

### 2. Nuke stale node_modules

Non-negotiable:

```bash
rm -rf node_modules common/node_modules inbox/node_modules processor/node_modules
yarn install
```

### 3. Verify the install

```bash
grep '"version"' node_modules/@dcl/schemas/package.json
```

Match target. Check symbol lands:

```bash
grep -n "MyNewSymbol" node_modules/@dcl/schemas/dist/platform/events/event.d.ts
```

### 4. Typecheck + tests

```bash
yarn workspaces run build
yarn test
```

`build` fails w/ stale-type errors → skipped step 2. Repeat.

### 5. Commit

```bash
git add package.json common/package.json inbox/package.json processor/package.json yarn.lock
git commit -m "chore: bump @dcl/schemas to X.Y.Z"
```

`yarn.lock` lots of churn from re-resolution — fine, commit all.

## Diagnostic shortcut

Suspect drift, run:

```bash
find node_modules -name "schemas" -path "*/@dcl/*" -type d -exec sh -c '
  v=$(grep "\"version\"" "$1/package.json" | head -1)
  echo "$1: $v"
' _ {} \;
```

Multiple versions normal for transitive deps; matters is `node_modules/@dcl/schemas/` (hoisted root copy) matches target.

## References

- CLAUDE.md rules 1, 2, 3
- Yarn workspaces docs: https://classic.yarnpkg.com/lang/en/docs/workspaces/