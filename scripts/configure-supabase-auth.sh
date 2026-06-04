#!/usr/bin/env bash
# Configure Supabase Auth URL settings via Management API.
# Uses Supabase CLI login token from macOS keychain, or SUPABASE_ACCESS_TOKEN.
set -euo pipefail

PROJECT_REF="rqmrqndjbkpkewfpyegv"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  SUPABASE_ACCESS_TOKEN="$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null | sed 's/go-keyring-base64://' | base64 -d || true)"
fi
TOKEN="${SUPABASE_ACCESS_TOKEN:?Log in with supabase login or set SUPABASE_ACCESS_TOKEN}"

python3 - <<'PY' | curl -sf -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d @- | python3 -m json.tool
import json
print(json.dumps({
  "site_url": "https://www.8thstreetconstruction.com",
  "disable_signup": True,
  "uri_allow_list": ",".join([
    "https://www.8thstreetconstruction.com/auth/callback",
    "https://8thstreetconstruction.com/auth/callback",
    "http://localhost:3000/auth/callback",
    "https://8th-street-construction.vercel.app/auth/callback",
    "https://8th-street-construction-*.vercel.app/auth/callback",
  ]),
}))
PY

echo "Supabase auth URLs updated."
