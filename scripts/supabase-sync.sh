#!/usr/bin/env bash
# Apply pending Supabase config + SQL migrations via Management API.
#
# One-time setup: create a personal access token at
#   https://supabase.com/dashboard/account/tokens
# Then either:
#   export SUPABASE_ACCESS_TOKEN=sbp_...
#   ./scripts/supabase-sync.sh
#
# Or add SUPABASE_ACCESS_TOKEN to .env.local (gitignored).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="rqmrqndjbkpkewfpyegv"

if [[ -f .env.local ]]; then
  # shellcheck disable=SC1091
  set -a
  source <(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | sed 's/^/export /') 2>/dev/null || true
  set +a
fi

TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN."
  echo "Create one: https://supabase.com/dashboard/account/tokens"
  echo "Then: export SUPABASE_ACCESS_TOKEN=sbp_... && ./scripts/supabase-sync.sh"
  exit 1
fi

api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -sf -X "$method" "https://api.supabase.com/v1/projects/${PROJECT_REF}${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -sf -X "$method" "https://api.supabase.com/v1/projects/${PROJECT_REF}${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json"
  fi
}

apply_migration() {
  local name="$1"
  local file="$2"
  echo "→ Migration: ${name}"
  python3 - <<PY
import json, pathlib
query = pathlib.Path("${file}").read_text()
payload = {"name": "${name}", "query": query}
print(json.dumps(payload))
PY
}

echo "=== Supabase sync (${PROJECT_REF}) ==="

echo ""
echo "1. Auth URL configuration…"
api PATCH "/config/auth" '{
  "site_url": "https://www.8thstreetconstruction.com",
  "uri_allow_list": "https://www.8thstreetconstruction.com/auth/callback\nhttps://8thstreetconstruction.com/auth/callback\nhttp://localhost:3000/auth/callback\nhttps://8th-street-construction.vercel.app/auth/callback\nhttps://8th-street-construction-*.vercel.app/auth/callback"
}' | python3 -m json.tool | head -20
echo "   Auth URLs updated."

echo ""
echo "2. SQL migrations…"
for spec in \
  "20260604100000_storage_updates_policies:supabase/migrations/20260604100000_storage_updates_policies.sql" \
  "20260604000000_platform_billing_tasks:supabase/migrations/20260604000000_platform_billing_tasks.sql"
do
  name="${spec%%:*}"
  file="${spec#*:}"
  if [[ ! -f "$file" ]]; then
    echo "   Skip missing $file"
    continue
  fi
  payload=$(apply_migration "$name" "$file")
  if api POST "/database/migrations" "$payload" >/dev/null 2>&1; then
    echo "   ✓ ${name}"
  else
    echo "   ⚠ ${name} — may already be applied (check Supabase SQL Editor if unsure)"
  fi
done

echo ""
echo "Done. Verify:"
echo "  • Dashboard → Authentication → URL Configuration"
echo "  • Dashboard → Database → Migrations"
echo "  • Test login: https://www.8thstreetconstruction.com/login"
