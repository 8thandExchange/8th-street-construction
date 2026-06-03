#!/usr/bin/env bash
# Bootstrap Phase 1 deploy: local env, Supabase migration, Vercel env vars, production deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — copy .env.local.example and fill in Supabase + Resend values first."
  exit 1
fi

# shellcheck disable=SC1091
source .env.local

required=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_SITE_URL
  REVALIDATE_SECRET
)
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: $key"
    exit 1
  fi
done

PROJECT_REF="${NEXT_PUBLIC_SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF%.supabase.co}"

echo "→ Linking Supabase project ($PROJECT_REF)…"
supabase link --project-ref "$PROJECT_REF"

echo "→ Pushing database migration…"
supabase db push

echo "→ Syncing env vars to Vercel (production + preview)…"
push_env() {
  local name="$1"
  local value="$2"
  for env in production preview; do
    vercel env add "$name" "$env" --value "$value" --yes --force 2>/dev/null || \
      vercel env add "$name" "$env" --value "$value" --yes
  done
}

push_env NEXT_PUBLIC_SUPABASE_URL "$NEXT_PUBLIC_SUPABASE_URL"
push_env NEXT_PUBLIC_SUPABASE_ANON_KEY "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
push_env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
push_env NEXT_PUBLIC_SITE_URL "$NEXT_PUBLIC_SITE_URL"
push_env REVALIDATE_SECRET "$REVALIDATE_SECRET"

if [[ -n "${RESEND_API_KEY:-}" ]]; then
  push_env RESEND_API_KEY "$RESEND_API_KEY"
fi
if [[ -n "${EMAIL_FROM:-}" ]]; then
  push_env EMAIL_FROM "$EMAIL_FROM"
fi
if [[ -n "${EMAIL_TO_LEADS:-}" ]]; then
  push_env EMAIL_TO_LEADS "$EMAIL_TO_LEADS"
fi

echo "→ Deploying to Vercel production…"
vercel deploy --prod --yes

echo ""
echo "Done. Next:"
echo "  1. Visit /login on your Vercel URL and sign in with magic link"
echo "  2. Run scripts/promote-admin.sql in Supabase SQL Editor (replace email)"
echo "  3. Point DNS at Vercel when ready (see README Deployment Guide step 10)"
