# Standard House Plans

Copy your six 8th Street standard plan PDFs into this folder before running the seed script.

## Required files

| File name | Model |
|-----------|-------|
| `The Augusta.pdf` | The Augusta |
| `The Broad Street.pdf` | The Broad Street |
| `The Midtown.pdf` | The Midtown |
| `The Riverwalk.pdf` | The Riverwalk |
| `The Savannah.pdf` | The Savannah |
| `The Summerville.pdf` | The Summerville |

## From Google Drive (Mac)

If your PDFs live in Google Drive, copy them here or point the seed script at that folder:

```bash
BASE_PLANS_DIR="/Users/akershousehold/Library/CloudStorage/GoogleDrive-troy.w.akers@gmail.com/My Drive/8th and Exchange/8th Street Construction/Standard Plans" \
  npx tsx scripts/seed-base-plans.ts
```

## Upload to Supabase

**Recommended:** use the admin UI at `/admin/base-plans` → **Add Standard Plan** to drop in PDFs directly.

Or bulk-import via the seed script:

```bash
# from project root, with .env.local configured
npx tsx scripts/seed-base-plans.ts
```

PDFs are stored in the `project-documents` bucket under `base-plans/{plan-number}/` and listed at `/admin/base-plans`.
