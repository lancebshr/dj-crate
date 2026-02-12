# dj-crate

## What this is
A web app for DJs to filter their Spotify library by BPM, find DJ-ready tracks, and export them to SoundCloud/Beatport. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS.

## Architecture

### Import paths (how tracks get in)
- **CSV upload (primary)**: Users export playlists from Spotify via [Exportify](https://exportify.net), drop the CSV into dj-crate. No Spotify API needed — works for unlimited users.
- **Spotify OAuth (secondary)**: PKCE flow, limited to 5 users in dev mode. Kept as a convenience feature. Apply for extended quota later with a working app to improve approval odds.

### BPM data (dual provider with fallback chain)
- **GetSongBPM** (primary, free, unlimited): Lookup by artist + title. Returns BPM + musical key + open key (Camelot). No batch endpoint — 5 concurrent requests with self-throttling.
- **SoundNet Track Analysis** (fallback, RapidAPI, 500 free/month): Used for GetSongBPM misses. Returns BPM + Camelot key.
- Spotify's `/v1/audio-features` endpoint returns **403 for any app created after Nov 2024**. Do not attempt to use it.

### Genre data (two-layer strategy)
- **Layer 1 — GetSongBPM** (primary, zero extra API calls): Artist genres are extracted from the same BPM lookup response (`song.artist.genres`). Covers ~60-70% of tracks instantly. Genres are normalized through `normalizeSimpleGenres()` and cached to Convex alongside BPM data.
- **Layer 2 — MusicBrainz** (fallback): Recording search + artist tag fallback for tracks Layer 1 missed. Free, no API key — uses User-Agent header (`dj-crate/0.1.0`). Strict 1 req/sec rate limit. Only processes the smaller pool of Layer 1 misses.
- Raw tags from both sources normalize through the curated taxonomy in `genre-taxonomy.ts` (~20 canonical genres) with noise filtering.
- Genre enrichment runs in parallel with BPM enrichment, progressively updating the UI. Layer 1 genres appear with BPM data; Layer 2 may override with richer data later.
- API route: `POST /api/genres` — checks Convex cache (Layer 1 hits), then falls back to MusicBrainz.
- Spotify API requires client credentials that are not currently available. Do not add Spotify as a genre source.

### Vibe tagging
- Derived client-side from BPM + genre context (no API call).
- Returns a single vibe string: aggressive, dark, groovy, melodic, high energy, chill, or null.
- Displayed as an amber pill alongside purple genre pills on track cards.

### Caching (Convex)
- **Convex** deployed at `https://formal-sockeye-882.convex.cloud` (preview deployment).
- `trackCache` table stores BPM, musical key, Camelot key, genres, and source info keyed by normalized `artist:title`.
- Both `/api/bpm` and `/api/genres` check cache before calling external APIs, then write results back.
- `src/lib/convex-client.ts` — HTTP client helper using `makeFunctionReference` (no codegen needed).

### Title normalization
Before BPM/genre lookups, strip Spotify suffixes: "(feat. X)", "- Remastered", "(Deluxe Edition)", "[Bonus Track]", etc. See `src/lib/bpm/normalize.ts`.

### Camelot key conversion
`src/lib/camelot.ts` converts standard key notation (C major, Am, F#m) to Camelot wheel notation (8B, 8A, 11A). Applied automatically in `/api/bpm` route to all provider results.

### Export paths (how tracks get out)
- **CSV download**: Includes track name, artist, album, BPM, key, Camelot key, genres, vibe, Spotify URI. Compatible with Soundiiz for accurate playlist transfer.
- **Copy track list**: Copies "Artist - Track Name" to clipboard for pasting into TuneMyMusic.
- **Beatport links**: `beatport.com/search?q=ARTIST+TRACK` — no API needed.
- **SoundCloud links**: `soundcloud.com/search/sounds?q=ARTIST+TRACK` — no API needed.
- **Playlist transfer flow**: Export CSV from dj-crate → import into TuneMyMusic (500 free tracks/transfer) or Soundiiz (200 free, $4.50/mo unlimited) → creates playlist on SoundCloud.

## Key constraints
- Spotify API dev mode: 5 authorized users max, requires Premium account for the developer
- SoundCloud API: Registration closed to new developers since ~2018. Contact "Otto" chatbot to request access. Do not build core features that depend on it.
- Beatport API: Inaccessible to new developers. Use search URL links instead.
- GetSongBPM: Undocumented rate limits. Self-throttle at 5 concurrent requests. Attribution link required in the app.
- MusicBrainz: Strict 1 req/sec rate limit. No API key needed, just User-Agent header.

## Project structure
```
src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Landing: CSV upload (primary) + Spotify connect (secondary)
│   ├── callback/page.tsx       # Spotify OAuth callback
│   ├── library/page.tsx        # Main app: source picker, BPM filter, track list, export
│   └── api/
│       ├── token/route.ts      # Spotify token exchange + refresh
│       ├── bpm/route.ts        # BPM lookup with Convex cache + Camelot conversion
│       └── genres/route.ts     # Genre lookup via MusicBrainz with Convex cache
├── lib/
│   ├── spotify/                # OAuth helpers, paginated API client, types
│   ├── bpm/                    # BpmProvider interface, GetSongBPM, SoundNet, normalizer
│   ├── csv/parser.ts           # CSV parser (auto-detects Exportify format + generic CSVs)
│   ├── camelot.ts              # Standard key → Camelot wheel conversion
│   ├── musicbrainz.ts          # MusicBrainz genre tag lookups
│   ├── genre-taxonomy.ts       # Raw tag → canonical genre normalization
│   ├── vibe-tagger.ts          # BPM + genre → vibe derivation (client-side)
│   ├── convex-client.ts        # Convex HTTP client (no codegen)
│   └── export.ts               # CSV download, clipboard copy, Beatport/SoundCloud URL builders
├── hooks/
│   ├── use-spotify-auth.ts     # Auth state, PKCE login, token refresh
│   ├── use-library.ts          # Fetch tracks from Spotify (liked songs / playlists)
│   └── use-bpm-filter.ts       # Progressive BPM + genre enrichment + range filtering
├── components/
│   ├── auth/                   # Connect Spotify button
│   ├── upload/                 # CSV drag-and-drop upload
│   ├── library/                # Source picker, track list (virtualized), track card
│   ├── filter/                 # BPM range slider, filter bar with stats
│   └── export/                 # Export bar (CSV download, copy, TuneMyMusic/Soundiiz links)
├── types/index.ts              # Track, TrackWithBpm, Playlist, LibrarySource
convex/
├── schema.ts                   # trackCache table definition
└── tracks.ts                   # getBatch query + upsertBatch mutation
```

## Environment variables
```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID    # Spotify OAuth (optional, for Spotify connect flow)
SPOTIFY_CLIENT_SECRET            # Spotify token refresh (server-side only)
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI # http://localhost:3000/callback
GETSONGBPM_API_KEY               # Primary BPM provider
RAPIDAPI_KEY                     # SoundNet fallback BPM provider
NEXT_PUBLIC_CONVEX_URL           # Convex deployment URL
CONVEX_DEPLOY_KEY                # Convex preview deploy key (for `npx convex deploy`)
```

## Pending
- **Deezer API**: 30-second audio previews. Free, no auth. Search by artist + title, get preview MP3 URL.

## Commands
- `npm run dev` — start dev server on localhost:3000
- `npx next build` — production build (use to verify no TypeScript/build errors)
- Convex deploy: `CONVEX_DEPLOY_KEY="..." npx convex deploy --cmd 'echo "skip"' --preview-create dj-crate`

## Dev notes
- Virtual scrolling via `@tanstack/react-virtual` for large track lists (1000+ tracks)
- BPM + genre enrichment are progressive — tracks show as data arrives, not blocking on full completion
- CSV parser handles quoted fields with commas, auto-detects column names from multiple CSV formats
- Track list has clickable BPM column header to cycle sort: none → ascending → descending
- Beatport/SoundCloud links appear on hover over each track card
- Genre tags display as purple pills, vibe tag as amber pill under track info (max 3 pills total per track)
