#!/usr/bin/env bash
# Configure Supabase Auth URL settings via Management API.
# Get a personal access token: https://supabase.com/dashboard/account/tokens
set -euo pipefail

PROJECT_REF="rqmrqndjbkpkewfpyegv"
TOKEN="${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens}"

curl -s -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://www.8thstreetconstruction.com",
    "uri_allow_list": "https://www.8thstreetconstruction.com/auth/callback\nhttps://8thstreetconstruction.com/auth/callback\nhttp://localhost:3000/auth/callback\nhttps://8th-street-construction.vercel.app/auth/callback\nhttps://8th-street-construction-*.vercel.app/auth/callback"
  }' | python3 -m json.tool

echo "Supabase auth URLs updated."
