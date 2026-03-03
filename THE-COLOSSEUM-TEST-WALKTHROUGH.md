# THE COLOSSEUM — TEST WALKTHROUGH
### Every Scenario. Every Step. What Should Happen.
### Created: Session 27 (March 2, 2026)

> This is the QA bible. Walk through each scenario step by step. If any step doesn't match what's written here, that's a bug. If a scenario is missing, add it.

---

# SCENARIO 1: BRAND NEW VISITOR (Guest From Bot Link)

## 1A: User taps a Reddit rage-bait link to an auto-debate verdict

1. User is on Reddit mobile, sees bot post with Colosseum link
2. User taps link
3. Mobile browser opens colosseum-six.vercel.app/verdict?id=XXXX (or equivalent route)
4. Page loads in under 3 seconds
5. Auto-debate verdict page displays: topic, both sides' arguments, score, winner declared
6. No login wall. No popup. No cookie banner blocking content.
7. User sees the "wrong" winner and the lopsided score
8. User sees "Do you agree?" or voting CTA
9. User taps vote button
10. Auth prompt appears: "Sign up to vote" with Google/Apple OAuth prominent, email collapsed
11. If user dismisses prompt → stays on page, can keep reading, voting is not recorded
12. If user signs up → see Scenario 2 (Signup Flow), then return here at step 13
13. After signup, user is returned to this exact verdict page (not home screen)
14. User's vote is now recorded
15. Vote count updates visually
16. User can browse further (home, categories, arena)

**Edge cases:**
- Link is broken / debate ID doesn't exist → friendly "debate not found" page, not a 500 error
- Link loads but Supabase is down → page still loads (auth timeout → guest), but vote submission fails → friendly error "couldn't record your vote, try again"
- User is on a slow connection → loading state visible, not a white screen

## 1B: User taps a Reddit link to a category page

1. User taps link to colosseum-six.vercel.app/?screen=category&cat=sports (or equivalent)
2. Page loads, spoke carousel appears
3. Category overlay for Sports opens automatically (or user is on the Sports view)
4. Hot takes tab shows existing hot takes (bot-seeded + auto-debate verdicts)
5. Predictions tab shows active prediction questions
6. User can scroll both tabs freely
7. User taps a hot take reaction button → auth prompt appears
8. User taps "Post a take" → auth prompt appears
9. User taps a username → profile modal opens (no auth needed)
10. User can browse back to home, other categories, arena — all without auth

**Edge cases:**
- Category has zero hot takes → should not happen if bots are running, but if it does → show "Be the first to post a take" message, not an empty white space
- Category parameter is invalid → fall back to home screen with spoke carousel

## 1C: User visits the home page directly (no specific link)

1. User types colosseum-six.vercel.app or finds it via search
2. Loading screen appears briefly (under 3 seconds due to auth timeout)
3. Spoke carousel loads with 6 categories visible
4. Categories show activity indicators (debate count, hot take count) if implemented
5. User can spin/tap categories
6. User taps a category → overlay opens
7. User can navigate to arena, leaderboard, etc. from navigation
8. Everything is viewable. Nothing requires login to see.

**Edge cases:**
- First visit ever, no cookies, no session → guest mode, everything works
- User previously had an account, cookies expired → guest mode, can re-login from any auth prompt
- Vercel is slow → loading screen stays up, but auth timeout ensures it resolves within 4 seconds max

---

# SCENARIO 2: SIGNUP FLOWS

## 2A: Signup with Google OAuth

1. User hits an auth-gated action (post, vote, follow, etc.)
2. Auth prompt appears inline
3. Google OAuth button is prominent (top option)
4. User taps Google button
5. Google OAuth popup/redirect opens
6. User selects their Google account
7. Google returns auth token to Supabase
8. Supabase creates account (profiles row auto-created via trigger)
9. User is now logged in
10. Auth prompt closes
11. User is back exactly where they were (not redirected to home)
12. The gated action they originally tried is now available
13. User's display name defaults to Google account name
14. User's profile shows default stats (Level 1, 0 wins, 0 losses, 50 token balance)

**Edge cases:**
- Google popup blocked by browser → user sees nothing happen → need fallback message "popup was blocked, try again or use email"
- Google auth fails (network error) → friendly error, option to retry or use email
- User already has an account with this Google email → logs in to existing account (not duplicate)
- Google returns no display name → default to email prefix or "Gladiator_XXXX"

## 2B: Signup with Apple OAuth

1. Same flow as 2A but with Apple
2. Apple may provide "Hide My Email" → Supabase receives relay address
3. Account works normally with relay email
4. Apple may not return a display name → default to "Gladiator_XXXX"

**Edge cases:**
- Apple relay email → password reset emails must work through relay
- User signs up with Apple on one device, tries to log in on another without Apple → needs fallback (email login with Apple relay address won't be intuitive)

## 2C: Signup with Email

1. User taps "Use email instead" (collapsed behind toggle, not default)
2. Email input field appears
3. User enters email
4. Password input field appears (minimum requirements shown)
5. User enters password
6. User taps "Sign up"
7. Supabase creates account
8. Verification email sent
9. User sees "Check your email for verification link"
10. User opens email, taps verification link
11. Link opens browser, confirms email
12. User returns to app → now verified and logged in
13. Returned to where they were before signup

**Edge cases:**
- Email already exists → "Account already exists. Log in instead?" with login link
- Weak password → inline error with requirements listed
- Verification email never arrives → "Resend verification" button available
- User enters email with typo → no way to catch this except if bounce comes back
- User closes app before verifying → next visit shows "verify your email" banner, can still browse as guest
- User clears browser data between signup and verification → verification link still works, but they'll need to log in after verifying

## 2D: Signup during specific actions

Each of these should return the user to the exact action after signup:

- Signing up to vote → after signup, vote is automatically cast (or prompt reappears)
- Signing up to post a hot take → after signup, hot take input area is ready with cursor
- Signing up to follow someone → after signup, follow is automatically executed (or button is ready)
- Signing up to enter arena queue → after signup, mode select screen appears
- Signing up to place a prediction → after signup, prediction UI reappears

**Edge cases:**
- User was writing a hot take, hit auth prompt, signed up → was the draft preserved? Should be.
- User was deep in a category overlay, signed up → overlay should still be open after signup

---

# SCENARIO 3: LOGIN FLOWS

## 3A: Returning user — Login with Google OAuth

1. User opens app (or hits auth prompt)
2. Taps Google login
3. Google OAuth popup/redirect
4. Selects account
5. Supabase finds existing account
6. User is logged in with full profile (stats, follows, rivals, cosmetics restored)
7. Last screen restored (if saved in localStorage)

**Edge cases:**
- User's Google account was deleted/deactivated → Supabase auth fails → friendly error
- User logged in with Google on Chrome, now on Safari → Google OAuth still works (it's account-based, not browser-based)

## 3B: Returning user — Login with email

1. User taps email login option
2. Enters email
3. Enters password
4. Taps "Log in"
5. Supabase authenticates
6. User is logged in with full profile restored
7. Last screen restored

**Edge cases:**
- Wrong password → "Incorrect password. Forgot password?" link
- Email not found → "No account with this email. Sign up?"
- Account exists but was created via OAuth → "This email is linked to a Google account. Log in with Google."
- Too many failed attempts → rate limited (Defense Layer 2) → "Too many attempts. Try again in X minutes."

## 3C: Forgot password

1. User taps "Forgot password?" on login screen
2. Email input field appears
3. User enters their email
4. Taps "Send reset link"
5. Supabase sends password reset email
6. User opens email, taps reset link
7. Link opens browser with password reset form
8. User enters new password (minimum requirements shown)
9. User confirms new password
10. Password updated
11. User is logged in automatically (or redirected to login with success message)
12. All existing sessions on other devices are invalidated

**Edge cases:**
- Email doesn't exist in system → still show "If an account exists, we sent a reset link" (don't reveal whether email exists — security)
- Reset link expired (typical 1-hour window) → "Link expired. Request a new one."
- User requests multiple reset links → only the latest one works
- User tries to reuse old reset link → "Link already used or expired"
- Reset email goes to spam → no technical fix, but "check your spam folder" note in UI
- User created account via OAuth, tries password reset → depends on whether they ever set a password. May need to handle "You signed up with Google — use Google login" message.

## 3D: Session expiry / token refresh

1. User is logged in, using the app
2. Access token expires (typically 1 hour)
3. Supabase client automatically refreshes using refresh token
4. User doesn't notice — session continues seamlessly
5. If refresh token also expired (typically 7 days) → user is silently logged out
6. Next auth-gated action shows login prompt
7. User logs back in
8. Returns to where they were

**Edge cases:**
- User leaves tab open for days → refresh token expires → next interaction shows auth prompt, not a crash
- Network drops during token refresh → app continues in read-only guest mode until network returns
- User has multiple tabs open → one tab refreshes token, others should pick up the new token

---

# SCENARIO 4: HOT TAKES

## 4A: Post a hot take

1. User is logged in
2. Opens a category overlay (e.g., Sports)
3. Hot takes tab is active
4. User taps "Post a take" input area
5. Keyboard opens (mobile) or input is focused (desktop)
6. User types their hot take
7. User taps submit/post button
8. post_hot_take() RPC called
9. Input sanitized (sanitize_text)
10. Rate limit checked
11. Hot take appears at top of feed
12. Input area clears
13. Take shows: user's display name, text, timestamp, reaction buttons with 0 counts

**Edge cases:**
- Empty submission → button disabled or "Write something first" message
- Over character limit (if one exists) → counter shows remaining, submit disabled at limit
- Rate limited → "You're posting too fast. Wait X seconds."
- Network error on submit → "Couldn't post. Tap to retry." (draft preserved)
- Offensive content → currently no automated filter (Gap: Defense Layer 10). Posts regardless. Rely on report system.
- User is banned → should RPC reject? Currently unclear. Needs definition.

## 4B: React to a hot take

1. User sees a hot take in the feed
2. Four reaction buttons visible: agree, disagree, laugh, rage
3. User taps one (e.g., "disagree")
4. react_hot_take() RPC called (toggle function)
5. Button highlights / changes state
6. Reaction count increments by 1
7. User taps same button again → reaction removed, count decrements
8. User taps a different reaction → previous removed, new one applied (or both allowed — verify which)

**Edge cases:**
- User taps rapidly → rate limited, only first tap registers
- User is a guest → auth prompt instead of reaction
- Network error → visual state reverts, "Couldn't save reaction"
- Hot take was deleted between seeing it and reacting → RPC returns error → take disappears from feed

## 4C: Delete own hot take

1. User sees their own hot take in the feed
2. Delete option visible (trash icon, "..." menu, or swipe — verify which)
3. User taps delete
4. Confirmation prompt: "Delete this take?"
5. User confirms
6. delete_hot_take() RPC called (verifies ownership)
7. Hot take removed from feed
8. Reactions on that take are also removed (cascade or orphaned — verify which)

**Edge cases:**
- User tries to delete someone else's take → delete option should not be visible. If RPC is called directly, ownership check rejects.
- Network error on delete → "Couldn't delete. Try again."
- Take has many reactions → all reactions removed with it (verify cascade behavior)

---

# SCENARIO 5: ARENA & DEBATES

## 5A: Browse the arena lobby

1. User navigates to arena (from nav bar or spoke carousel)
2. Arena lobby loads showing a mix of:
   - Active live debates (if any)
   - Active auto-debates with voting open
   - AI Sparring invitation card
   - Async debates in progress (text battles, voice memos)
3. Each card shows: topic, participants, mode, status (live/voting/waiting)
4. User can tap any card to view or join

**Edge cases:**
- No active debates of any kind → should never happen if auto-debates are running. If it does → "No debates right now. Start one!" with mode select.
- Lobby is slow to load → loading skeleton/spinner, not white space

## 5B: Start an AI Sparring debate

1. User taps AI Sparring card in lobby (or selects AI Sparring mode)
2. Topic selection appears (or auto-assigned based on category — verify which)
3. User selects or confirms topic
4. Debate room opens immediately (no queue wait)
5. AI opponent introduced (name, personality displayed)
6. Round 1 begins
7. User types their argument (or speaks — verify which modes are available)
8. User submits argument
9. AI responds (Groq Llama 3.1 70B via ai-sparring Edge Function)
10. AI response appears with delay (feels like "thinking")
11. Response is 2-4 sentences, populist tone, pushes back with real-world examples
12. AI has full context of conversation history (round-aware)
13. Next round begins
14. Repeat until final round
15. Post-debate stats displayed
16. Elo adjusted (if applicable — verify if AI sparring affects Elo)

**Edge cases:**
- Groq API fails → fallback to canned responses (built in Session 25)
- Groq rate limit hit → fallback to canned responses
- User submits empty argument → "Say something!" prompt
- User abandons mid-debate (closes browser) → debate marked as forfeit? Or left in limbo? Verify behavior.
- AI generates inappropriate content → currently no filter on AI output (Gap: Defense Layer 10)
- Network drops mid-debate → user returns, can they resume? Or is the debate lost?

## 5C: Enter matchmaking queue for live debate

1. User selects a debate mode (Live Audio, Text Battle, Voice Memo)
2. User selects or confirms topic/category
3. User taps "Find Opponent"
4. join_debate_queue() RPC called
5. Queue screen appears with timer/animation
6. System searches for matching opponent (same category, similar Elo if implemented)
7a. **Match found** → both users enter debate room → debate starts
7b. **Queue timeout (no match found)** → prompt appears with options:
   - "Try AI Sparring instead"
   - "Retry queue"
   - "Back to lobby"
8. User picks an option

**Edge cases:**
- User enters queue, then closes browser → leave_debate_queue() should fire on unload (or server-side timeout cleans up)
- Two users queue at exact same time for different categories → no match (correct)
- User enters queue, gets matched, opponent disconnects immediately → return to queue? Or count as forfeit?
- User queues multiple times rapidly → rate limit prevents queue spam
- Only one user online → queue always times out → AI Sparring alternative is critical here

## 5D: Live audio debate (WebRTC)

1. Both users matched and in debate room
2. WebRTC peer connection established via signaling server
3. Audio check / permission prompt (browser asks for microphone)
4. Both users grant mic access
5. Debate starts — Round 1
6. Timer visible
7. Active speaker indicated
8. Turn-based or open-floor (verify which format)
9. Spectators can join to watch (if implemented)
10. Rounds progress with timer
11. Final round ends
12. Voting period (spectators vote, or system scores — verify which)
13. Winner declared
14. Elo adjusted for both users
15. Post-debate stats displayed
16. Option to rematch, return to lobby, or share result

**Edge cases:**
- User denies microphone permission → "Microphone required for live audio. Try Text Battle instead."
- One user's mic doesn't work (no audio detected) → timeout or prompt "Your opponent can't hear you"
- User disconnects mid-debate (network drop) → opponent wins by forfeit? Or pause and wait?
- WebRTC connection fails (firewall, NAT issues) → fallback? Error message?
- Both users have very different connection quality → audio lag, choppy → no technical fix, but might need a "connection quality" indicator
- Signaling server is down → WebRTC can't connect → "Live audio unavailable. Try Text Battle."
- Spectator joins mid-debate → they see current state, not replay of previous rounds

## 5E: Text battle debate

1. Both users in debate room (matched or async)
2. Topic displayed
3. Round indicator shown
4. Active user prompted to type argument
5. User types argument in text input
6. User taps submit
7. send_debate_message() RPC called (sanitized, rate limited)
8. Message appears in debate feed
9. Opponent's turn (if synchronous) or opponent notified (if async)
10. Opponent responds
11. Rounds continue until complete
12. Winner determined (by votes, scoring, or system — verify which)
13. Post-debate stats displayed

**Edge cases:**
- One user never responds (async) → timeout after X hours/days → forfeit
- User submits extremely long message → character limit enforced
- User submits empty message → prevented at UI level
- User sends multiple messages in same turn → only first counts? Or all allowed? Verify.

## 5F: Voice memo debate

1. Both users in debate room (always async)
2. Topic displayed
3. Round indicator shown
4. Active user prompted to record
5. User taps record button → microphone permission prompt (first time)
6. User records voice memo
7. Recording indicator visible with timer
8. User taps stop → recording ends
9. Playback option available before submitting
10. User taps submit → voice memo uploaded and stored
11. Opponent notified "Your turn to respond"
12. Opponent records their response (could be hours/days later)
13. Rounds continue until complete
14. Winner determined
15. Post-debate stats displayed

**Edge cases:**
- Microphone permission denied → "Microphone required. Try Text Battle instead."
- Recording is too short (under 3 seconds?) → "Record at least X seconds"
- Recording is too long → max recording time enforced (cut off at limit)
- Upload fails (large file, network drop) → "Upload failed. Recording saved locally. Tap to retry."
- Storage limit on voice memos → need a retention/deletion policy
- Opponent never responds → timeout after X days → forfeit
- Audio quality is terrible → no technical fix, but maybe a "re-record" option before submit

---

# SCENARIO 6: VOTING & PREDICTIONS

## 6A: Vote on an auto-debate (guest)

1. Guest user lands on auto-debate verdict page
2. Both sides' arguments displayed
3. Winner and score displayed (the "wrong" winner)
4. Two vote buttons visible: "Side A was right" / "Side B was right"
5. Guest taps a vote button
6. Auth prompt appears (voting requires account)
7. Guest signs up (Scenario 2)
8. After signup, vote is recorded
9. Vote count updates
10. User can't vote again on this debate (one vote per user enforced)

**Edge cases:**
- Guest votes, dismisses auth prompt → vote not recorded, buttons still active for next attempt
- Auto-debate doesn't exist (bad URL) → "Debate not found" page
- User already voted (returns to same page) → their vote is shown, buttons disabled or show selected state

## 6B: Vote on a live debate (as spectator)

1. User is watching a live debate
2. Voting prompt appears (during or after debate — verify when)
3. User taps their vote for who won
4. vote_arena_debate() RPC called
5. Vote recorded (one per user per debate)
6. Result tallied with other spectator votes
7. Displayed as part of post-debate stats

**Edge cases:**
- User tries to vote for themselves (they're a participant) → should be blocked
- Voting window closes → buttons disabled, result shown
- Only 1 vote cast → still shows result (even if 100-0)

## 6C: Place a prediction

1. User opens a category overlay
2. Taps Predictions tab
3. Active prediction questions shown (e.g., "Will the Chiefs win Sunday?")
4. User taps a prediction
5. Prediction detail view opens: question, options, current vote split
6. User selects their prediction
7. place_prediction() RPC called
8. Prediction recorded
9. User's selection shown in UI
10. When event resolves, correct predictors get credit
11. Prediction leaderboard updates

**Edge cases:**
- Prediction already placed → show user's existing prediction, option to change? Or locked in?
- Prediction question expired (event already happened) → "Predictions closed" message
- No active predictions in this category → "No predictions right now. Check back soon."
- Prediction resolves while user is viewing it → UI updates to show result

---

# SCENARIO 7: SOCIAL FEATURES

## 7A: Follow a user

1. User sees another user (in leaderboard, hot take, debate, profile modal)
2. User taps follow button
3. follow_user() RPC called
4. Button changes to "Following" state
5. Follower count on target user increments
6. Following count on current user increments
7. Target user's activity now appears in current user's follow feed

**Edge cases:**
- User tries to follow themselves → RPC rejects (self-follow prevention)
- User follows someone, then immediately unfollows → toggle works, counts adjust
- Target user deletes their account → follow relationship orphaned? Clean up needed.
- User follows 1,000 people → any cap on follows? If not, follow feed could be overwhelming.

## 7B: Unfollow a user

1. User sees a user they follow (button shows "Following")
2. User taps the button
3. unfollow_user() RPC called
4. Button changes back to "Follow" state
5. Counts adjust
6. Target user's activity no longer in follow feed

## 7C: Declare a hated rival

1. User sees another user they want to rival
2. Rival button visible (where? Profile modal? Post-debate? Verify.)
3. User taps rival button
4. declare_rival() RPC called
5. RPC checks: user has fewer than 5 active rivals
6a. **Under cap** → rival declared, button changes state
6b. **At cap (5 rivals)** → "You already have 5 rivals. Remove one first."
7. Rival's activity now appears in rivals feed
8. Both users can see the rivalry on their profiles

**Edge cases:**
- User rivals themselves → RPC rejects
- User rivals someone who rivaled them → mutual rivalry, any special treatment?
- User removes a rival and immediately re-declares → allowed (no cooldown currently)
- Rival deletes their account → rivalry orphaned, clean up needed

## 7D: View a user's profile modal

1. User taps any username anywhere in the app
2. Bottom-sheet modal slides up
3. Profile shows: display name, level, Elo, win/loss, streak, equipped cosmetics, achievements
4. Follow button visible
5. Rival button visible
6. User's recent hot takes shown (if applicable)
7. User's debate history shown (if applicable)
8. Tapping outside the modal or swipe-down closes it

**Edge cases:**
- User's own profile modal → should show different options (edit profile, not follow/rival)
- Deleted user → "User not found" in modal
- User with completely empty profile (just signed up) → default values shown, not blank fields
- Modal loads slowly → loading skeleton inside modal, not empty modal

---

# SCENARIO 8: LEADERBOARD

## 8A: Browse the leaderboard

1. User navigates to leaderboard
2. Three tabs visible: Elo, Wins, Streak
3. Default tab loads (Elo)
4. Top users listed with rank, name, stat value
5. User can switch tabs
6. Time filter available (all time, this month, this week — verify which)
7. "My Rank" indicator shows where current user falls
8. Tapping any username opens profile modal

**Edge cases:**
- User is not on leaderboard (no debates completed) → "Complete your first debate to be ranked"
- Leaderboard is empty (no users have debated) → should not happen with auto-debates, but if so → show auto-debate stats or "Be the first"
- Tie in ranking → how are ties handled? Same rank? Alphabetical?
- Time filter with no activity in window → "No activity this week"

---

# SCENARIO 9: PURCHASES & PAYMENTS

## 9A: Purchase a subscription

1. User taps upgrade/subscribe (from paywall, settings, or profile)
2. Subscription tiers displayed: Contender $9.99, Champion $19.99, Creator $29.99
3. User selects a tier
4. Stripe Checkout session created via Edge Function (server-side)
5. User redirected to Stripe Checkout page
6. User enters payment info on Stripe (not on our site)
7. Payment processed
8. Stripe webhook fires → subscription.created event
9. Edge Function processes webhook → updates user's profile (subscription_tier column)
10. User redirected back to app
11. Premium features now unlocked
12. Ad-free experience activated (if applicable)

**Edge cases:**
- Payment fails (declined card) → Stripe shows error, user returns to app with no subscription
- User closes Stripe Checkout without paying → no subscription created, user returns to free tier
- Webhook fails to fire → subscription paid but app doesn't know → need webhook retry logic or periodic sync
- User already has a subscription and tries to buy another → upgrade flow? Or block?
- Stripe is down → "Payments temporarily unavailable. Try again later."
- User wants to cancel subscription → where? In-app settings? Or must go to Stripe customer portal?
- Subscription renewal fails (card expired) → Stripe sends invoice.payment_failed → what happens in-app? Grace period?

## 9B: Purchase a cosmetic

1. User browses cosmetics shop
2. User taps an item (border, badge, effect, title belt)
3. Item detail shows: preview, price, requirements (if any — e.g., Profile Depth section needed)
4a. **Requirements not met** → "Complete [section] to unlock this item" (reciprocal gate)
4b. **Requirements met** → "Purchase for X" button active
5. User taps purchase
6. If token-based → tokens deducted server-side
7. If real-money → Stripe Checkout flow (same as 9A)
8. Item added to user's inventory
9. Option to equip immediately
10. Item visible on profile

**Edge cases:**
- Insufficient tokens → "Not enough tokens. Buy more?" with link to token purchase
- Item already owned → purchase button disabled, "Owned" shown
- Limited-time item expires before purchase completes → "This item is no longer available"
- Network error during purchase → tokens NOT deducted (server-side ensures atomicity)

## 9C: Tip a debater

1. User is watching or has watched a debate
2. Tip button visible (during live debate or on post-debate screen)
3. User taps tip
4. Tip options shown: $1, $5, $10, $25
5. User selects amount
6. Stripe payment flow (quick charge, not full Checkout — or Checkout for each? Verify.)
7. Payment processed
8. Platform takes 20-30%
9. Remaining amount credited to debater's payout balance
10. Tip notification sent to debater
11. Tip visible in debate activity feed (if applicable)

**Edge cases:**
- User tries to tip themselves → blocked
- User tips but debater deleted their account → tip still processed? Refund?
- Rapid-fire tipping (accidental double-tap) → rate limited, confirmation on amounts over $5?
- Stripe Connect not set up for recipient → tips held in platform account until payout is configured

---

# SCENARIO 10: PROFILE & SETTINGS

## 10A: Edit profile

1. User navigates to their profile
2. Taps "Edit" button
3. Edit mode: display name, bio, avatar fields become editable
4. User changes display name
5. sanitize_text() runs on all text fields
6. User taps save
7. Profile updated via RPC
8. Changes reflected immediately across the app (hot takes, leaderboard, etc.)

**Edge cases:**
- Display name already taken → "Name already in use. Try another."
- Display name contains profanity → currently no filter (Gap: Defense Layer 10). Saved as-is.
- Display name empty → rejected, minimum 1 character (or 3? Verify requirement)
- Bio exceeds character limit → truncated or rejected at input
- User changes name 10 times in a day → rate limited? Currently unclear.

## 10B: Complete Profile Depth section

1. User navigates to Profile Depth page (colosseum-profile-depth.html)
2. 12 sections displayed with completion status
3. User selects a section
4. Questions appear (varying types: multiple choice, slider, open-ended)
5. User answers questions
6. Open-ended answers sanitized (sanitize_text)
7. User taps "Complete section"
8. Answers saved to profile_depth_answers table (private to user, RLS)
9. Completion percentage updates
10. Reward unlocked: could be cosmetic, badge, icon, feature unlock, or subscription discount
11. Reward shown to user with celebration animation (if implemented)
12. If subscription discount → new price shown, updated server-side

**Edge cases:**
- User partially completes a section and leaves → progress saved? Or lost? Verify.
- User wants to change answers later → allowed? Or locked after completion?
- All 12 sections complete → maximum discount applied, "You've completed everything" state
- B2B data note: these answers may eventually be aggregated/anonymized for B2B — consent mechanism needed (future)

## 10C: View and change settings

1. User navigates to settings
2. Settings page shows: Notifications, Privacy, Audio, Account, Subscription, Danger Zone
3. User toggles notification preferences (which types to receive)
4. User adjusts privacy settings (profile visibility, etc.)
5. User adjusts audio settings (mic input, volume — for live debates)
6. Changes saved per-setting via user_settings table

**Edge cases:**
- Settings fail to load → show default values with "Couldn't load your settings" message
- Setting save fails → revert toggle to previous state, show error

## 10D: Delete account

1. User navigates to settings → Danger Zone
2. "Delete Account" button visible (red, bottom of page)
3. User taps delete
4. Confirmation dialog: "This cannot be undone. All your data will be permanently removed."
5. Second confirmation: "Type DELETE to confirm"
6. User types DELETE
7. Account soft-deleted (is_deleted flag set)
8. PII scrambled (display name → "Deleted User", email hashed, bio cleared)
9. User logged out
10. Redirected to home as guest

**Edge cases:**
- User has active subscription → cancel subscription first? Or auto-cancel on delete?
- User has unpaid-out tip balance → forfeit? Or payout before delete?
- User has active debates in progress → forfeit all? Or complete first?
- User changes mind after deletion → recovery window? Or truly permanent?
- User's hot takes remain but shown as "Deleted User"? Or removed entirely?
- User's debates remain in others' history? Or scrubbed?

---

# SCENARIO 11: NOTIFICATIONS

## 11A: Receive and view notifications

1. User is on the app
2. An event triggers a notification:
   - Rival posted a hot take
   - Followed user is in a debate
   - Prediction result came in
   - Challenge received
   - Tip received
   - Achievement unlocked
3. Notification badge appears on nav icon
4. User taps notifications
5. Notification list displays: icon, message, timestamp, read/unread state
6. User taps a notification
7. Navigated to the relevant content (the debate, the hot take, the achievement)
8. Notification marked as read

**Edge cases:**
- 100+ unread notifications → paginated? Or all loaded? Performance concern.
- Notification for deleted content (hot take deleted, debate cancelled) → notification still appears but links to "Content no longer available"
- User has notifications disabled → no badges, no list items for disabled types
- Push notifications → not implemented (web push future feature). Currently in-app only.

---

# SCENARIO 12: SHARING

## 12A: Share a debate result

1. User is on post-debate screen or auto-debate verdict
2. Taps share button
3. Share card generated (canvas → image, ESPN-style layout)
4. 4 size options (if chooseable, or auto-selected for platform)
5a. **Mobile** → Web Share API fires → native share sheet opens (iMessage, WhatsApp, Twitter, etc.)
5b. **Desktop** → "Copy link" button, link copied to clipboard
6. Shared link includes OG tags for rich preview
7. Recipient taps link → lands on debate verdict page (guest accessible, Scenario 1A)

**Edge cases:**
- Web Share API not supported (older browsers) → fallback to "Copy link"
- Share card generation fails → fallback to text-only share with link
- OG image not loading in preview → check that og:image URL is absolute and accessible
- Shared debate gets deleted before recipient views it → "Debate not found" page

---

# SCENARIO 13: ERRORS & EDGE CASES (Cross-Cutting)

## 13A: Network drops mid-use

1. User is using the app, network drops
2. Current page stays visible (no immediate crash)
3. Next action that requires network (post, vote, navigate to new data) → error
4. Error shown: "No connection. Check your internet and try again."
5. App does not redirect or crash
6. Network returns → user retries action → works normally

## 13B: Supabase goes down

1. Auth timeout fires (3 seconds) → user becomes guest
2. All RPC calls fail → actions show "Something went wrong" messages
3. App still loads (static HTML/JS is on Vercel, separate from Supabase)
4. User can browse cached/static content (spoke carousel, navigation)
5. No data loads (hot takes, debates, leaderboard all empty)
6. When Supabase recovers → next action works, data loads on refresh

## 13C: Vercel goes down

1. Nothing loads → browser shows error page
2. No mitigation currently (no CDN fallback, no static backup)
3. This is total outage

## 13D: Groq goes down (AI features)

1. AI Sparring attempts to call Edge Function
2. Edge Function calls Groq → fails
3. Fallback to canned responses activates (built Session 25)
4. User experience degrades but doesn't break
5. Auto-debate generation pauses until Groq recovers

## 13E: Stripe goes down

1. User attempts purchase
2. Stripe Checkout fails to load
3. "Payments temporarily unavailable" message shown
4. No money is charged
5. User can continue using app (free features)
6. When Stripe recovers → purchases work again

## 13F: User hits rate limit

1. User performs an action too frequently
2. RPC returns rate limit error
3. UI shows "You're doing that too fast. Wait X seconds."
4. Timer visible (if implemented) or just a static message
5. After cooldown → action works normally

## 13G: Concurrent sessions (multiple devices)

1. User logged in on phone and laptop simultaneously
2. Both sessions are valid
3. Action on phone (follow someone) → reflected on laptop on next data fetch
4. If user logs out on one device → other device remains logged in until token expires
5. If user changes password → all sessions invalidated → re-login required everywhere

## 13H: Browser back button

1. User is deep in the app (category → hot take → profile modal → back)
2. Browser back button should navigate through app history logically
3. Back from profile modal → closes modal (stays in category)
4. Back from category overlay → returns to spoke carousel
5. Back from arena lobby → returns to home

**Edge cases:**
- SPA navigation may not play well with browser history → verify pushState usage
- Back button from auth redirect (OAuth return) → should not go back to Google/Apple
- Back button after signup → should not re-show signup form

---

# SCENARIO 14: BOT ARMY SCENARIOS (Backend/Monitoring)

## 14A: Bot army normal operation

1. PM2 starts bot-orchestrator.js on VPS
2. Leg 1 scans Reddit/Twitter for arguments → finds matches → posts comment with Colosseum link
3. Leg 2 generates original hot takes → posts to targeted subreddits
4. Leg 3 generates auto-debates → stores in auto_debates table → creates landing pages
5. Activity logged to bot_activity table
6. bot_stats_24h view shows: posts made, links dropped, auto-debates generated
7. Runs 24/7 without intervention

## 14B: Bot account gets banned on Reddit

1. Reddit bans the bot account
2. Leg 1 and Leg 2 Reddit posts start failing
3. Error logged in bot activity
4. Leg 3 (auto-debates) continues unaffected (doesn't use Reddit)
5. Discord and Twitter bots continue unaffected
6. Founder notices in bot_stats_24h (Reddit metrics drop to 0)
7. Founder creates new Reddit account
8. Updates .env with new credentials
9. Restarts bot via PM2

**What should exist but doesn't:**
- ⏳ Alert/notification when a bot account stops working
- ⏳ Automatic account rotation

## 14C: VPS crashes or restarts

1. VPS reboots (DigitalOcean maintenance, crash, etc.)
2. PM2 startup script automatically restarts bot-orchestrator.js
3. Bot resumes from where it left off (stateless — picks up fresh)
4. Brief gap in bot activity during reboot window

**Edge cases:**
- PM2 startup script not configured → bot doesn't restart → manual SSH needed
- VPS runs out of memory (1 GB) → OOM killer stops bot → PM2 restarts
- VPS disk full → bot logs fill up → need log rotation

## 14D: Groq free tier rate limited

1. Bot tries to generate auto-debate content
2. Groq returns rate limit error
3. Auto-debate generation pauses
4. Leg 1 and Leg 2 continue (they don't use Groq for link-dropping)
5. Groq rate limit resets → auto-debate generation resumes

## 14E: DRY_RUN testing

1. Founder sets DRY_RUN=true in .env
2. All three legs execute logic but don't actually post anywhere
3. Logs show what WOULD have been posted, to where, with what content
4. Database writes still happen to bot_activity table (for stats testing)
5. No external platform accounts are touched
6. Founder reviews logs → adjusts targeting/content → switches to DRY_RUN=false

---

# SCENARIO 15: ACCOUNT SECURITY SCENARIOS

## 15A: Brute force login attempt

1. Attacker tries multiple passwords on a known email
2. After X failed attempts → rate limit kicks in
3. "Too many login attempts. Try again in X minutes."
4. Legitimate user can reset password via email (Scenario 3C) regardless of rate limit

## 15B: Session hijacking attempt

1. Attacker somehow gets a user's access token
2. Token has short expiry (1 hour typically)
3. Attacker uses token to make API calls
4. RLS still enforces — attacker can only access what that user can access
5. Token expires → attacker locked out (unless they also have refresh token)
6. User changes password → all tokens invalidated

## 15C: XSS attempt via hot take

1. Attacker posts a hot take with script tags: `<script>alert('xss')</script>`
2. sanitize_text() strips all HTML/script tags before storage
3. Even if sanitization somehow fails, CSP headers prevent inline script execution
4. Output encoding on render prevents execution even if stored

## 15D: SQL injection attempt via RPC

1. Attacker crafts malicious input in an RPC parameter
2. Supabase uses parameterized queries internally → injection impossible
3. sanitize_text() adds additional layer (strips special characters)
4. RPC function runs with SECURITY DEFINER → attacker can't escalate privileges

## 15E: Unauthorized data access attempt

1. Attacker calls Supabase API directly (bypassing app)
2. Supabase anon key is public (by design)
3. All table access governed by RLS policies
4. Attacker can only read public data (same as any guest)
5. Attacker can't write without auth (RLS rejects)
6. Attacker can't read private data (RLS rejects)

---

# SCENARIO 16: CONTENT MODERATION SCENARIOS

## 16A: User reports offensive content

1. User sees offensive hot take / profile / debate message
2. User taps report button
3. Report form appears: select reason, optional description
4. Report submitted → stored in reports table
5. Confirmation: "Report submitted. We'll review it."
6. Report is logged with: reporter_id, content_id, content_type, reason, timestamp

**What happens next (currently):**
7. Nothing automated. Report sits in table.
8. Founder periodically queries reports table manually.
9. Founder decides: remove content, warn user, ban user, or dismiss.

**What should happen (future):**
7. Notification to moderator dashboard
8. Automated queue for review
9. Threshold: X reports on same content → auto-hide pending review
10. Repeat offenders flagged for ban review

## 16B: User needs to be banned

1. Review shows user violates content policy
2. Ban applied (how? Direct DB update currently. No UI.)
3. Banned user's next request → RPC checks ban status → rejects
4. Banned user sees → what exactly? Currently undefined.

**What should happen:**
5. Banned user sees a message explaining the ban and any appeal process
6. Ban is time-limited (temp) or permanent based on severity
7. Banned user's content hidden or marked
8. Banned user cannot create new account with same email

---

# TEST STATUS TRACKER

Use this to mark each scenario as tested:

| # | Scenario | Tested | Pass/Fail | Notes |
|---|----------|--------|-----------|-------|
| 1A | Guest from bot link to verdict | ⬜ | | |
| 1B | Guest from bot link to category | ⬜ | | |
| 1C | Direct visit to home | ⬜ | | |
| 2A | Signup Google OAuth | ⬜ | | |
| 2B | Signup Apple OAuth | ⬜ | | |
| 2C | Signup email | ⬜ | | |
| 2D | Signup during specific action | ⬜ | | |
| 3A | Login Google OAuth | ⬜ | | |
| 3B | Login email | ⬜ | | |
| 3C | Forgot password | ⬜ | | |
| 3D | Session expiry | ⬜ | | |
| 4A | Post hot take | ⬜ | | |
| 4B | React to hot take | ⬜ | | |
| 4C | Delete hot take | ⬜ | | |
| 5A | Browse arena lobby | ⬜ | | |
| 5B | AI Sparring debate | ⬜ | | |
| 5C | Enter matchmaking queue | ⬜ | | |
| 5D | Live audio debate | ⬜ | | |
| 5E | Text battle | ⬜ | | |
| 5F | Voice memo debate | ⬜ | | |
| 6A | Vote on auto-debate (guest) | ⬜ | | |
| 6B | Vote on live debate | ⬜ | | |
| 6C | Place prediction | ⬜ | | |
| 7A | Follow user | ⬜ | | |
| 7B | Unfollow user | ⬜ | | |
| 7C | Declare rival | ⬜ | | |
| 7D | View profile modal | ⬜ | | |
| 8A | Browse leaderboard | ⬜ | | |
| 9A | Purchase subscription | ⬜ | | |
| 9B | Purchase cosmetic | ⬜ | | |
| 9C | Tip a debater | ⬜ | | |
| 10A | Edit profile | ⬜ | | |
| 10B | Profile Depth section | ⬜ | | |
| 10C | Settings | ⬜ | | |
| 10D | Delete account | ⬜ | | |
| 11A | Notifications | ⬜ | | |
| 12A | Share debate result | ⬜ | | |
| 13A | Network drop | ⬜ | | |
| 13B | Supabase down | ⬜ | | |
| 13C | Vercel down | ⬜ | | |
| 13D | Groq down | ⬜ | | |
| 13E | Stripe down | ⬜ | | |
| 13F | Rate limit hit | ⬜ | | |
| 13G | Multiple devices | ⬜ | | |
| 13H | Browser back button | ⬜ | | |
| 14A | Bot normal operation | ⬜ | | |
| 14B | Bot account banned | ⬜ | | |
| 14C | VPS crash/restart | ⬜ | | |
| 14D | Groq rate limited | ⬜ | | |
| 14E | DRY_RUN test | ⬜ | | |
| 15A | Brute force attempt | ⬜ | | |
| 15B | Session hijacking | ⬜ | | |
| 15C | XSS attempt | ⬜ | | |
| 15D | SQL injection attempt | ⬜ | | |
| 15E | Unauthorized data access | ⬜ | | |
| 16A | Report offensive content | ⬜ | | |
| 16B | Ban a user | ⬜ | | |

---

*54 scenarios. Each one is a road through the app. Walk each road. If you hit a wall, that's a bug. If you hit a fork that's not documented here, that's a missing scenario — add it.*
