#!/bin/bash
# show-token-usage.sh — Stop hook that summarizes input/output/cache token usage
# for the current turn and the cumulative session. Reads the transcript path
# from stdin JSON and parses the JSONL with jq.
set -u

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input_json=$(cat)
transcript=$(printf '%s' "$input_json" | jq -r '.transcript_path // empty')
if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
  exit 0
fi

# Sum usage across (a) the whole session and (b) the messages that landed after
# the most recent user prompt — i.e. this turn.
totals=$(jq -s '
  def add_usage:
    reduce .[] as $m (
      {input:0, output:0, cache_r:0, cache_w:0};
      .input   += ($m.message.usage.input_tokens // 0)
      | .output  += ($m.message.usage.output_tokens // 0)
      | .cache_r += ($m.message.usage.cache_read_input_tokens // 0)
      | .cache_w += ($m.message.usage.cache_creation_input_tokens // 0)
    );

  def total: .input + .output + .cache_r + .cache_w;

  (map(select(.type == "assistant" and .message.usage)) | add_usage) as $session
  | (
      ([.[] | .type] | map(. == "user") | indices(true) | last // -1) as $last_user
      | .[$last_user + 1:]
      | map(select(.type == "assistant" and .message.usage))
      | add_usage
    ) as $turn
  | {
      turn:    ($turn    + {total: ($turn    | total)}),
      session: ($session + {total: ($session | total)})
    }
' < "$transcript" 2>/dev/null) || exit 0

# Pretty-print numbers (1234567 → 1,234,567). Use /usr/bin/printf because
# bash's builtin printf does not honor the locale modifier on macOS.
fmt() { LC_ALL=en_US.UTF-8 /usr/bin/printf "%'d" "$1" 2>/dev/null || printf '%s' "$1"; }

t_total=$(printf '%s' "$totals" | jq -r '.turn.total')
t_in=$(printf '%s' "$totals" | jq -r '.turn.input')
t_out=$(printf '%s' "$totals" | jq -r '.turn.output')
t_cr=$(printf '%s' "$totals" | jq -r '.turn.cache_r')
t_cw=$(printf '%s' "$totals" | jq -r '.turn.cache_w')

s_total=$(printf '%s' "$totals" | jq -r '.session.total')
s_in=$(printf '%s' "$totals" | jq -r '.session.input')
s_out=$(printf '%s' "$totals" | jq -r '.session.output')
s_cr=$(printf '%s' "$totals" | jq -r '.session.cache_r')
s_cw=$(printf '%s' "$totals" | jq -r '.session.cache_w')

# Defensive: avoid empty strings if jq returned null
for v in t_total t_in t_out t_cr t_cw s_total s_in s_out s_cr s_cw; do
  [ -z "${!v}" ] || [ "${!v}" = "null" ] && eval "$v=0"
done

msg=$(printf 'Tokens — turn: %s total (in=%s out=%s cache_r=%s cache_w=%s) · session: %s total (in=%s out=%s cache_r=%s cache_w=%s)' \
  "$(fmt "$t_total")" "$(fmt "$t_in")" "$(fmt "$t_out")" "$(fmt "$t_cr")" "$(fmt "$t_cw")" \
  "$(fmt "$s_total")" "$(fmt "$s_in")" "$(fmt "$s_out")" "$(fmt "$s_cr")" "$(fmt "$s_cw")")

jq -cn --arg m "$msg" '{systemMessage: $m}'
exit 0
