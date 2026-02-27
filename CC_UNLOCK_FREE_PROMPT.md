# Task: Unlock All Pro Features — Make Everything Free (Temporarily)

## Context
The Overtone Singer app currently has a freemium model with some features gated behind a LemonSqueezy license key purchase (Overtone Singer Pro, $4.99). We want to temporarily make ALL features free and accessible to everyone — no paywalls, no license key checks, no purchase prompts.

This is a temporary change so students on a sound healing course can use the full app right now.

## What to Do

1. **Find all Pro/premium feature gates** — search the codebase for any logic that checks for a license key, Pro status, premium unlock, or LemonSqueezy validation. Look for things like:
   - `isPro`, `isUnlocked`, `isPremium`, `proEnabled` or similar boolean flags
   - LemonSqueezy API calls or license validation logic
   - Any UI elements showing lock icons, "Pro" badges, or purchase/upgrade prompts
   - localStorage checks for stored license keys

2. **Set all Pro flags to `true` by default** — make the app behave as if the user has already purchased Pro. Don't delete the gating code — just bypass it so it's easy to re-enable later.

3. **Hide all purchase/upgrade UI** — remove or hide any "Buy Pro", "Unlock", "Upgrade", price tags, or LemonSqueezy checkout buttons/links from the interface. Again, comment out rather than delete so we can restore it.

4. **Add a comment** wherever you make changes: `// TEMP: All features unlocked — re-enable Pro gating later`

## Important
- Do NOT delete any of the Pro/LemonSqueezy integration code — only bypass it
- Make the changes easy to revert later with a simple search for the TEMP comment
- Commit with message: "temp: unlock all features as free for course demo"
