# General Ginger Flight

A 3D side-scrolling flying game for the General Ginger ($GNG) arcade, with server-checked scores.

General Ginger flies his biplane over Naija Market. The Ginger King's pest army fires from the ground:

- **Shoot-Borer caterpillars** run trebuchets that lob rot bombs where you're heading.
- **White grubs** pop out of the soil and throw shears.
- **Root-knot nematodes** spit sticky nets that slow you down for 2.5 seconds.

**Boss fights and levels (version 2).** About every 40 seconds of flying, the **Ginger King** arrives in his royal airship. Your spice cannon fires on its own; stay level with the airship to hit it, while dodging his three attacks: aimed spice bombs, a fan of five, and falling jars. Beat him for a big bonus and a heart, and the next level starts: pests fire faster, grubs throw two shears from level 2, and nematodes spit two nets from level 3.

Power-ups: spice jar (+250), pepper (6-second shield), ginger root (+1 heart), spice cannon (8 seconds of shooting that knocks enemy fire out of the air). You have 3 hearts.

## Going live

Follow the **General Ginger Launch Guide** doc step by step. In short: set up Supabase (run `supabase.sql`), create the Cloudflare Worker (paste `dist/worker-bundle.js`), fill in `site.config.json`, run `node build-site.mjs`, and upload the `site` folder to Cloudflare Pages.

## Files

| File | What it is |
| --- | --- |
| `general-ginger-flight.html` | The whole game in one file. Open it in a browser to play. |
| `sim.js` | The game rules. Shared by the game and the server so scores can be replayed. |
| `worker.js` | Cloudflare Worker that hands out game seeds and checks scores. |
| `wrangler.toml` | Settings for deploying the Worker. |
| `test.mjs` | Automatic checks. Run `node test.mjs`. |
| `build.mjs` | Copies `sim.js` into the HTML. Run `node build.mjs` after editing `sim.js`. |
| `build-site.mjs` | Builds the `site` folder (landing page + `play/` game) and `dist/worker-bundle.js` from `site.config.json`. |
| `site.config.json` | Your Worker address and Supabase public settings. |
| `supabase.sql` | Database setup: profiles, points ledger, daily cap, leaderboard. Paste into Supabase's SQL Editor. |

## Play now (practice mode)

Open `general-ginger-flight.html` in Chrome. It needs internet the first time, to load the 3D engine. Points show on screen but are not saved.

## Turn on saved, checked points

1. Install Node.js, then in this folder run `npx wrangler login`.
2. Run `npx wrangler kv namespace create SESSIONS` and paste the id into `wrangler.toml`.
3. Run `npx wrangler deploy`. It prints your Worker's address.
4. In `general-ginger-flight.html`, set `const GG_API = 'https://…your address…';`

After a game, the screen shows "points verified and saved" or the reason they were refused.

Sign-in and saved points now use Supabase (email code login, profiles, points ledger with a daily cap); see the Launch Guide. Privy wallets get added when the token is ready (build plan, Phase 6).

## Points rule

Points follow the architecture spec's sigmoid curve over distance flown (half of 300 at 400 m, levelling off near 300), cut 15% for every hit, and capped at 100 per minute and 300 per game. Saved points are also capped per player per day (`DAILY_POINTS_CAP`, default 1,500).

## Changing the game

Change rules and difficulty only in `sim.js`, then run `node build.mjs` and `node test.mjs`. If you change the rules after launch, raise `VERSION` in `sim.js` so old games in progress are refused cleanly instead of failing the check.

## $GNG landing page and waitlist

`landing/index.html` and `landing/king.webp` are the token landing page: the story, how play-to-airdrop works, tokenomics, roadmap, FAQ and a waitlist form.

1. Deploy the Worker (above). It now also has a `/waitlist` address that stores sign-ups in the same KV store, one per email or phone number, with a limit of 5 sign-ups per network every 10 minutes.
2. In `landing/page.html`, set `const WAITLIST_API = 'https://…your Worker address…';` then run `node build-landing.mjs`.
3. Upload the `landing` folder to Cloudflare Pages (drag and drop it in the Cloudflare dashboard under Workers & Pages > Create > Pages > Upload assets).

To see sign-ups: `npx wrangler kv key list --binding SESSIONS --prefix wl:`

Before you publish the page:
- Add a privacy policy page and link it in the footer (Nigeria Data Protection Act 2023).
- Get a lawyer to read the FAQ and footer wording.
- The King artwork shows Nigeria's coat of arms. Using it on a commercial brand generally needs government permission, so ask your lawyer or swap it for an original emblem.
