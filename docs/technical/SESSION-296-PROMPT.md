# Session 296 Prompt

Search past chats for "github token colosseum ghp" to get the token. Then clone https://TOKEN@github.com/wolfe8105/colosseum.git into /home/claude/colosseum using bash_tool. Then read docs/technical/SESSION-295-HANDOFF.md from the cloned repo.

## Priority 1: Fix challenge → debate routing (unblocks everything)

The challenge link flow (/challenge?code=XXXXX) works through api/challenge.js (serverless) but lands users on the Feed instead of routing them into the debate. Two fixes needed:

1. In api/challenge.html.js — add client-side JS that detects logged-in users via supabase.auth.getSession() and redirects directly to /index.html?screen=arena&joinCode=CODE (bypassing the /login?returnTo= chain). The ACCEPT button is currently a plain <a href> to /login?returnTo=... which doesn't work for already-logged-in users.

2. In src/pages/home.ts — read joinCode from URL params at init and auto-navigate to Arena if present (defense in depth for when the redirect chain does reach the home page).

Also fix the join code input on the Arena lobby — the GO button still 400s. Check for stale function overloads on join_private_lobby and join_mod_debate. Run NOTIFY pgrst, 'reload schema' if needed. The get_arena_feed RPC is also returning HTTP 300 in Supabase API logs — likely has stale overloads.

## Priority 2: Complete F-69 reference E2E test

Once two players can match: verify the reference loadout picker appears on the pre-debate screen (it's in arena-room-predebate.ts, gated by mode !== 'ai'). A reference was already forged (NIH study, Academic, Common rarity) and is in wolfe8105's Arsenal.

## Priority 3: Fix forge date input

Replace <input type="date"> in the forge form with a text input (YYYY-MM-DD format) or Month/Day/Year dropdowns. The native date picker is unusable.

## Priority 4: Restyle challenge page

api/challenge.html.js uses old Colosseum gold/blue styling. Needs cyberpunk Moderator theme.

## Priority 5: Pat's list (F-70 through F-77)

See Section 3L of the punch list. F-77 (create 6 link-card debates) is quick manual work.

## Supabase project ID: faomczmipsccwbhpivmp
## Connected tools: Supabase MCP, Chrome browser automation
