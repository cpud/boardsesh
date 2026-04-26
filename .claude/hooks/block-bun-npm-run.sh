#!/usr/bin/env bash
# PreToolUse hook: block `bun run` and `npm run` in this repo.
# This repo's toolchain is Vite+ (`vp`); using bun/npm script runners
# bypasses the unified config and can mutate bun.lock. See CLAUDE.md.
#
# Exit code 2 + stderr is fed back to Claude as a blocking error.
# Exits 0 (allow) on parse failure so the hook is never a hard dep.

set -uo pipefail

input=$(cat)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

[[ -z "$command" ]] && exit 0

# Token boundary: start-of-string OR whitespace OR shell separator (& | ; ( `)
boundary='(^|[[:space:]&|;()`])'

# --- bun run ---
# Allowed exception: `bun run backend:start` (production backend, no vp wrapper).
# Walk every occurrence so chained commands (`bun run check && bun run test`) are checked.
remaining="$command"
while [[ "$remaining" =~ ${boundary}bun[[:space:]]+run([[:space:]]+([^[:space:]&|;()\`]+))?(.*) ]]; do
  target="${BASH_REMATCH[3]}"
  remaining="${BASH_REMATCH[4]}"
  if [[ "$target" != "backend:start" ]]; then
    cat >&2 <<EOF
Blocked: \`bun run${target:+ $target}\` is forbidden in this repo.

This monorepo's toolchain is Vite+ (\`vp\`). Use the vp equivalent:
  bun run check       -> vp check
  bun run lint        -> vp lint
  bun run test        -> vp test
  bun run --filter=X typecheck -> vp run typecheck:<pkg>  (or vp check)
  bun run dev         -> vp run dev

Allowed exceptions (no vp wrapper exists):
  bun run backend:start   (production backend)
  bunx drizzle-kit generate   (migration generation)

Full command was: $command
EOF
    exit 2
  fi
done

# --- npm run ---
# Same loop shape as bun run for consistency (catches every chained occurrence).
remaining="$command"
while [[ "$remaining" =~ ${boundary}npm[[:space:]]+run([[:space:]]+([^[:space:]&|;()\`]+))?(.*) ]]; do
  target="${BASH_REMATCH[3]}"
  remaining="${BASH_REMATCH[4]}"
  cat >&2 <<EOF
Blocked: \`npm run${target:+ $target}\` is forbidden in this repo.

This monorepo uses Vite+ (\`vp\`) and Bun, not npm. Use:
  vp check        # lint + format + typecheck
  vp test         # tests
  vp run <task>   # tasks defined in vite.config.ts

Full command was: $command
EOF
  exit 2
done

exit 0
