# Cliptext

A React + Supabase + Apify YouTube transcript app, designed for Vercel.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. In Supabase, run [`supabase/schema.sql`](./supabase/schema.sql) in SQL Editor. In Authentication → URL Configuration, set your local and production URLs as redirect URLs.
4. Start locally with `npm run dev`.

## Vercel deployment

Import this repository into Vercel and add all variables from `.env.example` under **Settings → Environment Variables**. Deploy. Do **not** add `SUPABASE_SERVICE_ROLE_KEY` or `APIFY_API_TOKEN` with a `VITE_` prefix: only the browser-safe URL and anon key are exposed to the client bundle.

## Apify actor

The default is `automation-lab/youtube-transcript`, selected for its low published price and timestamped structured output. Its input uses `urls` plus `mergeSegments`. If you select another actor later, change `APIFY_ACTOR_ID` and, if necessary, its body in `api/generate-transcript.js`.
