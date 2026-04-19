# THE MODERATOR — USER GUIDE
### Every screen. Every button. What it does and why.

---

# Screen A — /go Setup (Guest AI Sparring)

This is the first screen a new user sees when they land on themoderator.app/go. No account needed. No login. The entire purpose of this screen is to get someone debating within 10 seconds of arriving. This is the top of the funnel — every Reddit link, every Discord post, every share card points here.

---

## A1. Logo link

**Short:** Tapping the logo takes you to the main app homepage.

**Long:** This is the escape hatch. If someone lands on /go but already has an account, or wants to explore the full app first, the logo gets them to the main site. For a brand-new visitor, they'll almost never tap this — the setup screen is designed to pull them straight into a debate. But it's there so nobody feels trapped on a single page with no way out. It links to themoderator.app (the authenticated app), not back to /go.

---

## A2. Topic text input

**Short:** Type what you want to debate about.

**Long:** This is the single most important element on the screen. The entire /go experience starts here. The user types any topic — political, sports, personal opinion, anything. There's a 200-character limit, but most topics are much shorter. The input has a placeholder example to show the kind of thing that works. Nothing happens on the rest of the screen until this field has at least 3 characters — the Start Debating button stays locked until then. There's no topic validation, no category picker, no restrictions. Whatever the user types becomes the debate topic sent to the AI opponent.

---

## A3. 👍 For button

**Short:** Pick the "For" side of whatever topic you typed.

**Long:** The debate is structured as For vs. Against. This button means "I'm arguing in favor of the topic I typed." You have to pick a side before the debate can start — the app needs to know which position you're defending so it can assign the AI to argue the opposite. Only one side can be active at a time. If you tap For then change your mind and tap Against, For deselects automatically. The AI will always take the opposite side of whatever you pick.

---

## A4. 👎 Against button

**Short:** Pick the "Against" side of whatever topic you typed.

**Long:** Same as the For button, but for the opposing position. If the topic is "US airstrikes on Iran are justified" and you tap Against, you're arguing that the airstrikes are NOT justified. The AI takes the For side. Same rules apply: only one side active at a time, and you must pick one before starting.

---

## A5. Start Debating button

**Short:** Launches the debate — takes you to the debate room (Screen B).

**Long:** This button is locked until two conditions are met: the topic field has at least 3 characters, AND either For or Against is selected. Tapping it transitions you to Screen B (the debate room) where the first round begins immediately. The AI reads your topic and your chosen side, then opens with its first argument for the opposite position. From this point forward, you're in a 3-round debate — there's no going back to change your topic or side without starting over. This is a one-way door.

---

# Screen B — /go Debate Room

This is where the actual AI debate happens. Three rounds, alternating turns between the user and the AI. The user can type arguments or use speech-to-text via the mic button. After each round, the AI scores the user's performance. After all 3 rounds, the screen transitions to the Verdict (Screen C).

---

## B1. Chat area

**Short:** Scrollable conversation feed showing your arguments and the AI's responses.

**Long:** This is a read-only display. As you and the AI exchange arguments, they appear here as chat bubbles — your arguments on one side, the AI's on the other. The round number is shown between exchanges. You can scroll up to re-read earlier rounds. The chat area also shows the AI's scoring commentary after each round. Nothing here is tappable — it's purely for reading.

---

## B2. Text input textarea

**Short:** Type your argument for the current round.

**Long:** This is where you write your response to the AI. There's no character limit, but shorter, focused arguments tend to score better. The Send button activates as soon as you start typing. You can also use the mic button (B3) instead of typing — speech-to-text will fill this field for you. Once you send, the AI processes your argument, scores it, and delivers its counter-argument. You get one submission per round.

---

## B3. 🎙️ Mic button

**Short:** Tap to start speech recognition — your voice becomes text in the input field.

**Long:** This uses your device's built-in speech recognition to convert your spoken words into text. Tap once to start listening, tap again to stop. The transcribed text appears in the text input field (B2) and you can edit it before sending. This exists because debating out loud feels more natural than typing, especially on mobile. If your device doesn't support speech recognition, the button still appears but won't do anything.

---

## B4. ➤ Send button

**Short:** Submit your argument for this round.

**Long:** Disabled until you've typed something in the text input. Once you tap Send, your argument goes to the AI via the Groq API. The AI scores your argument on 4 criteria (Logic, Evidence, Delivery, Rebuttal), then crafts its counter-argument for the next round. There's no undo — once sent, you can't take it back. After the final round, sending triggers the transition to the Verdict screen (Screen C).

---

## B5. ⚡ Sign Up Free — Debate Real People link

**Short:** Call-to-action link that appears after your first round — leads to the signup page.

**Long:** This is the conversion funnel. After you complete round 1, this link appears as a persistent banner. It's designed to plant the idea: "This AI debate is fun, but imagine doing this against a real person." It doesn't interrupt the debate — the user can ignore it and keep debating. It links to the Plinko signup flow. This is one of three signup CTAs across the /go experience (B5, C2, C4), each appearing at a natural pause point.

---

# Screen C — /go Verdict

The final scorecard after a 3-round AI debate. Shows how the user performed across all criteria, their overall score, and provides clear paths to either try again or join the full app.

---

## C1. Score grid

**Short:** Your final scores across Logic, Evidence, Delivery, and Rebuttal.

**Long:** This is a 2x2 grid showing your score in each of the four debate criteria. Each score is based on the AI's evaluation of your arguments across all 3 rounds. This is display-only — you can't interact with it. The scores are generated by Groq in real time at the end of the debate. The overall score shown above the grid is the average. The purpose is to give the user something concrete to screenshot and share, and to make them want to try again to beat their score.

---

## C2. ⚡ Sign Up — Debate Real People link

**Short:** Large call-to-action button linking to the signup page.

**Long:** This is the most prominent signup CTA in the entire /go flow. It appears right after the user has had a complete debate experience and is most engaged. The button is large, orange, and pulsing. It leads to the Plinko signup flow. The positioning is deliberate — right after the dopamine hit of getting your score, you're most likely to take the next step.

---

## C3. ↻ Debate Another Topic button

**Short:** Start over with a new topic — goes back to Screen A.

**Long:** Resets the entire /go experience. The previous debate is gone — there's no history, no saved transcripts, no persistence. The user lands back on the setup screen with an empty topic field and no side selected. This exists for users who aren't ready to sign up but want to keep debating. Every additional debate increases the chance they eventually convert.

---

## C4. The Moderator footer link

**Short:** Small footer link to the main app homepage.

**Long:** Same destination as the logo link (A1). A secondary, low-pressure way to explore the full app without committing to signup. Most users will either hit the big signup button or try another topic. This is for the curious ones who want to browse first.

---

# Screen D — /verdict Auto-Debate (AI vs AI)

A public landing page showing a completed AI vs AI debate. These are auto-generated debates the bot army creates and shares across social media. Visitors can vote on who won, share the debate, and get funneled toward signup. No login required to vote.

---

## D1. Logo link

**Short:** Takes you to the app homepage.

**Long:** For unauthenticated visitors, this goes to the main site where they'll be prompted to log in or sign up. For authenticated users, it goes straight to their home feed.

---

## D2. JOIN FREE link

**Short:** Signup CTA — leads to the Plinko registration flow.

**Long:** Prominent link in the top navigation. Anyone viewing an auto-debate who doesn't have an account sees this. The goal is converting spectators into participants — "you just watched two AIs debate, now come do it yourself."

---

## D3. Category pill link

**Short:** Tapping the category label takes you to the home feed filtered by that category.

**Long:** Every auto-debate is tagged with a category (Politics, Sports, Entertainment, etc.). Tapping the category pill navigates to the main app's home feed, pre-filtered to show content from that category. For unauthenticated users, this means they'll hit the login page first. The category carries through so after login they land on the right content.

---

## D4. Side A label link

**Short:** Tapping the Side A position text navigates to home filtered by category.

**Long:** Same navigation as the category pill (D3). This is a secondary tap target — the side labels are large and prominent, so making them tappable gives users another path into the app.

---

## D5. Side B label link

**Short:** Same as D4 but for Side B.

**Long:** Identical behavior. Both side labels are tap targets that lead into the app filtered by the debate's category.

---

## D6. Vote button Side A

**Short:** Cast your vote for Side A (no login required).

**Long:** This is the core engagement mechanic for ungated landing pages. Anyone — logged in or not — can vote on who they think won the debate. Voting is intentionally ungated because it's the hook: the act of picking a side and seeing results is what makes someone want to come back. The vote is recorded and the percentage bar updates in real time. One vote per debate per visitor, tracked by localStorage.

---

## D7. Vote button Side B

**Short:** Cast your vote for Side B.

**Long:** Same as D6. The two vote buttons work as a pair — tapping one casts your vote and shows the results split. You can't vote for both sides or change your vote once cast.

---

## D8. ENTER THE ARENA link

**Short:** Another signup CTA — leads to Plinko registration.

**Long:** Positioned below the voting section, after the user has already engaged by voting. The language "Enter the Arena" frames signup as joining the action, not filling out a form. Links to the Plinko onboarding flow.

---

## D9. 📋 Copy Link share button

**Short:** Copies the debate URL to your clipboard.

**Long:** One-tap sharing. The URL copied is the public verdict page URL, which works for anyone — no login needed to view it. This is the primary share mechanism for people who want to paste the link into a chat, text message, or social post.

---

## D10. 𝕏 Share button

**Short:** Opens a pre-filled tweet/post for X (Twitter) with the debate link.

**Long:** Opens X's share intent with a pre-composed message containing the debate topic and the URL. The user can edit the text before posting. This drives organic reach — every share is free distribution.

---

## D11. ↗ Share button (native share)

**Short:** Opens your device's native share sheet (SMS, WhatsApp, email, etc.).

**Long:** Uses the Web Share API to open whatever share options your device supports. On mobile this is especially powerful — it lets users share via text message, WhatsApp, Telegram, email, or any app they have installed. On desktop, it may show a simpler dialog or fall back to clipboard copy.

---

## D12. More Debates cards

**Short:** Links to other AI vs AI debates below the current one.

**Long:** After the share buttons, the page shows cards for other auto-debates. These keep users on the platform by offering more content to consume and vote on. Each card links to another /verdict page. The algorithm for which debates appear here is based on recency and category.

---

## D13. Privacy Policy footer link

**Short:** Links to the Privacy Policy page.

**Long:** Standard legal footer link. Required for compliance. Links to /privacy.

---

## D14. Terms of Service footer link

**Short:** Links to the Terms of Service page.

**Long:** Standard legal footer link. Required for compliance. Links to /terms.

---

# Screen E — /debate Debate Landing

A public landing page for a specific human debate. Similar to Screen D but for real user debates instead of AI-generated ones. Visitors can vote, share, and get funneled to signup.

---

## E1. Logo link

**Short:** Takes you to the app homepage.

**Long:** Same behavior as D1. Navigates to home, which will route to login if unauthenticated.

---

## E2. JOIN FREE link

**Short:** Signup CTA — leads to Plinko.

**Long:** Same as D2. Visible to unauthenticated visitors only.

---

## E3. Category pill link

**Short:** Tapping the category navigates to home filtered by that category.

**Long:** Same as D3. Every debate has a category tag. Tapping it takes you into the app's home feed filtered to that category.

---

## E4. Vote button Side A

**Short:** Cast your vote for Side A.

**Long:** Same ungated voting mechanic as D6. Uses localStorage to prevent double-voting on the same debate. Anyone can vote without an account.

---

## E5. Vote button Side B

**Short:** Cast your vote for Side B.

**Long:** Same as E4. One vote per visitor per debate.

---

## E6. 📋 Copy Link share button

**Short:** Copies the debate URL to clipboard.

**Long:** Same as D9.

---

## E7. 𝕏 Share button

**Short:** Share to X with pre-filled text.

**Long:** Same as D10.

---

## E8. ↗ Share button (native share)

**Short:** Opens device native share sheet.

**Long:** Same as D11.

---

## E9. Settle YOUR debate link

**Short:** CTA encouraging visitors to start their own debate.

**Long:** Unlike the "JOIN FREE" link which is about creating an account, this CTA frames the action as "you've just watched someone else's debate, now settle YOUR disagreement." It leads to the main app home page. Positioned after the vote and share sections.

---

## E10. Privacy Policy footer link

**Short:** Links to Privacy Policy.

**Long:** Standard legal compliance link.

---

## E11. Terms of Service footer link

**Short:** Links to Terms of Service.

**Long:** Standard legal compliance link.

---

# Screen F — /login Login Page

The full authentication page. Handles both login and signup via tabs at the top. Supports Google OAuth, email/password, and password reset. This page serves all users who arrive at the app without an active session.

---

## F1. LOG IN tab

**Short:** Switches the form to login mode.

**Long:** The login page has two modes — LOG IN and SIGN UP — toggled by these tabs at the top. The LOG IN tab shows the email/password login form plus the Google OAuth button. If you already have an account, this is your path. The tab state persists until you manually switch.

---

## F2. SIGN UP tab

**Short:** Switches the form to signup mode.

**Long:** Shows the full registration form: username, email, password, date of birth, and terms checkbox. Use this if you don't have an account yet. Note that the Plinko flow (Screens G-K) is the preferred signup path — it's more guided and includes the moderator opt-in step. This tab exists as a fallback for users who navigate directly to /login.

---

## F3. Google OAuth button (login)

**Short:** Sign in with your Google account.

**Long:** One-tap Google login. If you've previously created an account with Google OAuth, this logs you straight in. If you haven't, it will create a new account using your Google profile info. This is the fastest path into the app — no password to remember, no email to verify. Google OAuth is confirmed working as of Session 204.

---

## F4. Apple OAuth button (login)

**Short:** Sign in with your Apple ID.

**Long:** Apple's equivalent of Google OAuth. Currently visible on the login page. Apple OAuth requires additional configuration that may not be fully wired yet — Google is the primary OAuth provider.

---

## F5. "Use email instead" toggle (login)

**Short:** Reveals the email and password fields for manual login.

**Long:** By default, the login form leads with the OAuth buttons because they're faster. Tapping "Use email instead" expands the form to show email and password fields. This is for users who signed up with email/password instead of Google.

---

## F6. Email input (login)

**Short:** Enter the email address you registered with.

**Long:** Must match an existing account. If you type an email that doesn't exist in the system, login will fail. This is a standard text input — no validation beyond basic email format.

---

## F7. Password input (login)

**Short:** Enter your password.

**Long:** Password field with hidden characters. If you've forgotten your password, use the "Forgot password?" link (F8) instead.

---

## F8. Forgot password? link

**Short:** Opens the password reset flow.

**Long:** Tapping this shows a modal where you enter your email address. The app sends a password reset email via Resend (confirmed working, Session 204). You'll receive a link that brings you back to the app with a password reset modal where you set a new password. The email comes from noreply@themoderator.app.

---

## F9. ENTER THE ARENA submit button (login)

**Short:** Submit your login credentials.

**Long:** Sends your email and password to Supabase Auth. If the credentials match, you're logged in and redirected to the home feed. If they don't match, you'll see an error message. The button is always active — validation happens server-side.

---

## F10. Google OAuth button (signup)

**Short:** Create an account using your Google profile.

**Long:** Same as F3 but in the signup context. Google provides your name and email. The app creates your account and you'll still need to complete some profile steps (username, etc.) on first login.

---

## F11. Apple OAuth button (signup)

**Short:** Create an account using your Apple ID.

**Long:** Same as F4 but in signup context.

---

## F12. "Use email instead" toggle (signup)

**Short:** Reveals the manual signup form fields.

**Long:** Expands the form to show username, email, password, date of birth, and terms checkbox. Same toggle pattern as F5.

---

## F13. Username input (signup)

**Short:** Choose your username (3-20 characters).

**Long:** Your username is how other users find and identify you in the app. It's used in challenge links, leaderboards, profile URLs (/u/username), and anywhere your name appears. Must be unique — if someone already has that username, you'll need to pick another. 3-20 characters, no special requirements on character types.

---

## F14. Email input (signup)

**Short:** Enter your email address for account creation.

**Long:** This becomes your login credential and where password reset emails go. Must be a valid email format. SMTP is confirmed working via Resend, so you'll get a confirmation email.

---

## F15. Password input (signup)

**Short:** Create a password for your account.

**Long:** Standard password field. Supabase enforces minimum password requirements. Leaked password protection is enabled (checks against HaveIBeenPwned database).

---

## F16. DOB month select

**Short:** Select your birth month.

**Long:** Part of the age gate. The app requires date of birth to verify users are old enough. DOB is stripped from JWT metadata by a database trigger for privacy — it's only used for age verification at signup, then the raw date is not exposed in the user's session token.

---

## F17. DOB day select

**Short:** Select your birth day.

**Long:** Part of the DOB age gate. Works with F16 and F18.

---

## F18. DOB year select

**Short:** Select your birth year.

**Long:** Completes the age verification. If the calculated age is below the minimum, account creation is blocked.

---

## F19. Terms of Service checkbox + link

**Short:** You must agree to the Terms of Service to create an account.

**Long:** Mandatory checkbox. The CREATE ACCOUNT button won't work until this is checked. The link next to the checkbox opens the Terms of Service page (/terms) so you can read them first. Standard legal requirement.

---

## F20. CREATE ACCOUNT submit button

**Short:** Submit the signup form to create your account.

**Long:** Requires all fields filled and the Terms checkbox checked. Sends the data to Supabase Auth which creates the user record, fires the handle_new_user trigger (which sets up the profile, strips DOB from metadata, etc.), and logs you in. On success, you're redirected to the home feed.

---

## F21. Terms footer link

**Short:** Links to Terms of Service page.

**Long:** Standard legal footer link to /terms.

---

## F22. Privacy footer link

**Short:** Links to Privacy Policy page.

**Long:** Standard legal footer link to /privacy.

---

## F23. Reset password email input (modal)

**Short:** Enter your email to receive a password reset link.

**Long:** This appears in a modal after tapping "Forgot password?" (F8). Enter the email address associated with your account. A reset email is sent via Resend from noreply@themoderator.app. If the email isn't associated with an account, the system still shows a success message to prevent email enumeration attacks.

---

## F24. Reset password cancel button (modal)

**Short:** Close the password reset modal without sending an email.

**Long:** Dismisses the modal and returns you to the login form. No email is sent.

---

## F25. New password input (modal)

**Short:** Enter your new password after clicking the reset link in your email.

**Long:** This modal appears when you arrive at the app via a password reset link from your email. Type your new password here. Must meet Supabase's password requirements.

---

## F26. Confirm password input (modal)

**Short:** Re-type your new password to confirm it matches.

**Long:** Standard password confirmation field. Must match F25 exactly. Prevents typos from locking you out of your account.

---

## F27. Privacy Policy footer link

**Short:** Links to the Privacy Policy page.

**Long:** Duplicate of F22 — appears in a different section of the page.

---

## F28. Terms of Service footer link

**Short:** Links to the Terms of Service page.

**Long:** Duplicate of F21 — appears in a different section of the page.

---

# Screen G — Plinko Step 1: OAuth/Email

The first step of the Plinko registration funnel. This is the preferred signup path — more guided than the /login page, with progress bar and step-by-step flow. Starts with authentication.

---

## G1. Google OAuth button

**Short:** Create an account or sign in with Google.

**Long:** Same as F3/F10. Google OAuth is the fastest path. If you already have an account via Google, it logs you in and skips to the main app. If you're new, it creates your account and moves you to Step 2 (Age Gate).

---

## G2. Apple OAuth button (hidden)

**Short:** Apple sign-in button — currently hidden from users.

**Long:** The button exists in the HTML but is hidden with display:none. Apple OAuth is not currently offered in the Plinko flow. When Apple OAuth is fully configured, this can be shown by removing the display:none style.

---

## G3. "Use email instead" toggle

**Short:** Show the email/password fields for manual signup.

**Long:** Same pattern as the login page. Expands the form to show email and password inputs for users who prefer not to use Google.

---

## G4. Email input

**Short:** Enter your email address.

**Long:** Used for account creation. Same as F14.

---

## G5. Password input

**Short:** Create a password.

**Long:** Same as F15.

---

## G6. Progress bar (display only)

**Short:** Shows which step of the 5-step Plinko process you're on.

**Long:** Not interactive — purely visual. Shows 5 dots or segments, with the current step highlighted. Helps users understand how much is left in the signup process.

---

# Screen H — Plinko Step 2: Age Gate

Date of birth collection and terms acceptance. Required before the account can be created.

---

## H1. DOB month select

**Short:** Select your birth month.

**Long:** Same purpose as F16. Part of the age verification gate.

---

## H2. DOB day select

**Short:** Select your birth day.

**Long:** Part of age verification.

---

## H3. DOB year select

**Short:** Select your birth year.

**Long:** Completes the age check. Users below the minimum age cannot proceed.

---

## H4. Terms of Service checkbox + link

**Short:** Agree to the Terms of Service before continuing.

**Long:** Same as F19. Mandatory. The CONTINUE button won't activate without this checked.

---

## H5. CONTINUE button

**Short:** Proceed to Step 3 (Username).

**Long:** Requires DOB filled and Terms checked. Validates age, then advances to the username selection step.

---

# Screen I — Plinko Step 3: Username

Choose your identity in the app. This is where you become a real user with a name other people will see.

---

## I1. Username input (3-20 chars)

**Short:** Pick your unique username.

**Long:** This is your identity on the platform. It shows up on leaderboards, in debate rooms, on challenge links, and on your public profile. Must be unique across all users. 3-20 characters. Choose carefully — there's no easy rename from the signup flow (though you can change your display name later in settings).

---

## I2. Display name input (max 40 chars)

**Short:** Set your display name (the name shown to other users).

**Long:** Different from username. Your username is your permanent identifier (used in URLs, @mentions). Your display name is what appears in the UI — debate rooms, leaderboards, hot takes. You can change your display name later in settings. 40 character max.

---

## I3. CREATE ACCOUNT button

**Short:** Create your account and proceed to Step 4.

**Long:** This is the point of no return for account creation. Submits your username and display name along with the auth credentials from Step 1 and the DOB from Step 2. The account is created in Supabase, the handle_new_user trigger fires, your profile is initialized, and you move to Step 4.

---

# Screen J — Plinko Step 4: Moderator Opt-In

The app is called The Moderator — this step introduces users to the moderator role. Completely optional, can be skipped.

---

## J1. ENABLE MODERATOR MODE button

**Short:** Opt in to be a moderator for other people's debates.

**Long:** Moderators are users who volunteer to judge live debates between other people. Enabling this sets is_moderator=true on your profile, which makes you visible in the Mod Queue (Screen AR) where debaters can request you to moderate. You can always turn this on or off later in Settings. Enabling it here saves a trip to settings. The role comes with its own scoring system — debaters rate your fairness after each debate, which builds your mod approval percentage.

---

## J2. SKIP FOR NOW button

**Short:** Skip moderator opt-in and proceed to the final step.

**Long:** No penalty for skipping. You can enable moderator mode later from Settings (U10). The app will also nudge you about it later through in-app prompts if you haven't opted in.

---

# Screen K — Plinko Step 5: Done

Registration complete. One button to enter the app.

---

## K1. ENTER THE MODERATOR button

**Short:** Enter the app — takes you to the home feed.

**Long:** Navigates to index.html which loads the main single-page app. From here, you land on your home feed (Screen N) with the full app available — arena, profile, leaderboards, groups, everything. Your account is live. Welcome to The Moderator.

---

# Screen L — /terms Terms of Service

Legal page with tabbed content. Updated in Session 231 to have proper interactive elements.

---

## L1. ← Back link

**Short:** Go back to the previous page.

**Long:** Uses browser history to navigate back. If you came from Settings, it takes you back to Settings. If you came from the signup flow, back to signup. It adapts to wherever you came from.

---

## L2. TERMS OF SERVICE tab button

**Short:** Show the Terms of Service content.

**Long:** This page has three content tabs. This one shows the main Terms of Service — the legal agreement between users and The Moderator. Active by default when you land on the page.

---

## L3. PRIVACY POLICY tab button

**Short:** Switch to the Privacy Policy content.

**Long:** Shows the privacy policy without navigating to a separate page. Allows users to read all legal documents in one place.

---

## L4. COMMUNITY GUIDELINES tab button

**Short:** Switch to the Community Guidelines content.

**Long:** Shows community rules and behavior expectations. Separate from the legal terms — these are the social contract for how users should behave on the platform.

---

# Screen M — /privacy Privacy Policy

Static legal page. No interactive elements beyond browser navigation.

---

(No elements to document — this is a read-only page.)

---

# Screen N — Home Feed

The main screen of the app. This is where users spend most of their time. Hot takes, predictions, live debates, and the composer for creating new content. The global header and bottom nav are persistent across all main screens (N through S).

---

## Global Header (persistent across N, O, P, Q, R, S)

### N1. 🪙 Token display

**Short:** Shows your current token balance. Tap to see details.

**Long:** Tokens are the in-app currency. You earn them by completing profile sections, winning debates, claiming milestones, daily logins, and other activities. Tokens are spent on power-ups, staking on debates, and predictions. The orange dot indicator appears when you have unclaimed token-earning opportunities (daily login bonus, completed milestone, etc.). Tapping the display shows your balance details.

---

### N2. 🔔 Notification bell button

**Short:** Opens the Notification Panel (Screen AV).

**Long:** Shows a badge count of unread notifications. Notifications include challenge invitations, debate results, follower activity, reactions to your hot takes, and token rewards. The bell polls every 30 seconds for new notifications. Tapping opens the full notification panel as an overlay.

---

### N3. Avatar button

**Short:** Opens the User Dropdown menu (Screen AW).

**Long:** Shows your avatar in the header. Tapping it opens a dropdown with quick links to Groups, Settings, Complete Profile, and Log Out. This is the fastest path to settings and logout from any screen.

---

## Bottom Nav (persistent across N, O, P, Q, R, S)

### N4. ☰ Feed tab

**Short:** Go to the Home Feed (this screen).

**Long:** The main content feed. Shows hot takes from all users, live debate cards, and prediction markets. This is the default landing screen after login.

---

### N5. ⚔ Arena tab

**Short:** Go to the Arena Lobby (Screen O).

**Long:** Where debates happen. The arena lobby shows options for entering matchmaking, creating private debates, browsing spectator feeds, and accessing the power-up shop.

---

### N6. ★ Ranks tab

**Short:** Go to the Leaderboard (Screen R).

**Long:** Global rankings by Elo rating, win count, and streak. See where you stack up against every other user on the platform.

---

### N7. ◉ Groups tab

**Short:** Go to the Groups page.

**Long:** Unlike the other tabs which load screens within index.html, this navigates to a separate page (moderator-groups.html). That page has its own bottom tab bar that mirrors this one.

---

### N8. ● Profile tab

**Short:** Go to your Profile (Screen P).

**Long:** View and edit your profile, bio, avatar. Access settings, power-ups, reference arsenal, and cosmetics from here.

---

## Feed Content

### N9. Hot take cards

**Short:** Tap to expand and read the full hot take.

**Long:** Hot takes are short-form opinion posts from users. They appear as cards in the feed showing the author's name, avatar, the take text (truncated if long), and action buttons. Tapping the text area expands the full content if it was truncated. Hot takes are the seed of debates — disagreements on hot takes lead to challenges.

---

### N10. 🔥 React button

**Short:** Toggle your reaction on a hot take.

**Long:** One-tap reaction. Functions as a "this is fire" or "I agree" signal. Tapping it once reacts, tapping again unreacts. The reaction count is visible to the author and other users. Reactions contribute to the hot take's visibility in the feed.

---

### N11. ⚔️ BET. button

**Short:** Challenge the author of this hot take to a debate.

**Long:** Opens the Challenge Modal (Screen AZ). You can write a response to their hot take and issue a formal challenge. If they accept, you enter the arena for a live debate on the topic. This is the primary way debates emerge organically from content — the "emergence engine" in action.

---

### N12. ↗ Share button

**Short:** Share this hot take externally.

**Long:** Opens the share options for this specific hot take. You can copy the link, share to X, or use the native share sheet. Each shared link is a potential new user funnel.

---

### N13. 🧑‍⚖️ Become a Moderator / Already a Moderator button

**Short:** Toggle moderator opt-in or indicate you're already a moderator.

**Long:** If you're not a moderator, this appears as "Become a Moderator" and lets you opt in with one tap. If you already are one, it shows your moderator status. This is one of 5 moderator discovery touchpoints throughout the app — the role is central to the platform identity.

---

### N14. Author name/avatar

**Short:** Tap to view the author's profile.

**Long:** Every hot take shows who posted it. Tapping their name or avatar navigates to their public profile where you can see their stats, follow them, or challenge them to a debate.

---

### N15. Live debate cards — Watch Live button

**Short:** Jump into a live debate as a spectator.

**Long:** When live debates are happening, they appear as cards in the feed. The "Watch Live" button takes you to the Spectator View (Screen X) where you can watch the debate in real time, chat with other spectators, and vote on who's winning.

---

### N16. Pull-to-refresh

**Short:** Swipe down from the top to refresh the feed.

**Long:** Standard mobile gesture. Refreshes the hot takes feed, prediction cards, and live debate listings. New content appears at the top.

---

## Predictions Section

### N17. Prediction cards — Side A pick button

**Short:** Predict that Side A will win this debate.

**Long:** Predictions are wagering markets on upcoming or active debates. You pick a side and wager tokens. If your side wins, you get a payout based on the odds. Tapping Side A opens the wager picker where you choose how many tokens to bet.

---

### N18. Prediction cards — Side B pick button

**Short:** Predict that Side B will win.

**Long:** Same as N17 but for the other side. Predictions use a text value ('a' or 'b'), not UUIDs. Wagers range from 1-500 tokens. If you change your prediction, you get a refund on your previous wager and only pay the net difference.

---

### N19. ➕ CREATE PREDICTION button

**Short:** Create a new prediction market for others to wager on.

**Long:** Opens the Prediction Creation Modal (Screen BA). You define the topic, the two sides, and the prediction goes live in the feed. Other users can then wager tokens on which side will win.

---

### N20. Wager amount input

**Short:** Enter how many tokens you want to wager.

**Long:** Part of the wager picker that appears after selecting a side. Type a specific number of tokens (1-500) or use the quick amount buttons (N21). Your current balance is checked before the wager is submitted — if you don't have enough tokens, you'll see an "Insufficient balance" error instantly without wasting a network call.

---

### N21. Quick amount buttons

**Short:** Preset wager amounts for fast betting.

**Long:** Buttons with common wager values so you don't have to type. Tap one to set the wager amount. Faster than manual input for common bet sizes.

---

### N22. CONFIRM WAGER button

**Short:** Submit your prediction and lock in your token wager.

**Long:** Finalizes your prediction. Tokens are deducted from your balance immediately. If the debate hasn't started yet, you can change your prediction — you'll get a refund on the original wager and only pay the net difference for the new one. Once the debate completes, winning predictions get paid out.

---

### N23. ✕ Cancel wager button

**Short:** Close the wager picker without placing a bet.

**Long:** Dismisses the wager interface. No tokens are deducted. You can come back and bet later as long as the prediction market is still open.

---

## Overlay (Hot Takes Composer)

### N24. Overlay tabs (HOT TAKES / PREDICTIONS)

**Short:** Switch between posting a hot take or creating a prediction.

**Long:** The composer overlay has two modes. HOT TAKES mode lets you post a short opinion. PREDICTIONS mode lets you create a wager market. Toggle between them with these tabs.

---

### N25. Hot take text input

**Short:** Write your hot take.

**Long:** Type your opinion here. Keep it punchy — hot takes are meant to be provocative, not essays. The best hot takes generate reactions and challenges from other users.

---

### N26. POST button

**Short:** Publish your hot take to the feed.

**Long:** Submits your hot take. It appears in the feed immediately for all users. Other users can react to it, challenge you on it, or share it. Once posted, it can't be edited or deleted from the client (yet).

---

### N27. Close/swipe-down to dismiss

**Short:** Close the composer without posting.

**Long:** Swipe the overlay down or tap the background to dismiss. Any text you've typed is lost — there's no draft save.

---

# Screen O — Arena Lobby

The gateway to all debate formats. From here you can enter matchmaking, create private debates, browse the power-up shop, join the mod queue, or watch live debates via the spectator feed.

---

## O1. ENTER THE ARENA button

**Short:** Start the matchmaking flow to find a debate opponent.

**Long:** This is the primary action on the lobby screen. Tapping it opens the Ranked Picker (Screen AA) where you choose Ranked or Casual, then you select a mode, category, and enter the matchmaking queue. This is the main path to live debates against real people.

---

## O2. ⚔️ PRIVATE DEBATE button

**Short:** Create a private debate with a specific person or group.

**Long:** Opens the Private Lobby Picker (Screen AO). Three options: challenge a specific user by username, restrict the debate to your group members, or generate a join code that you share with whoever you want to debate. Private debates don't go through the public matchmaking queue.

---

## O3. ⚡ POWER-UPS button

**Short:** Open the Power-Up Shop (Screen AN).

**Long:** Power-ups are single-use items you buy with tokens and activate during debates. Examples include extra time, score multipliers, and other competitive advantages. The shop shows what's available, the cost in tokens, and your current balance.

---

## O4. 🧑‍⚖️ MOD QUEUE button

**Short:** View debates requesting a moderator (moderators only).

**Long:** Only visible if you've enabled moderator mode. Shows a list of upcoming debates that need a moderator. You can volunteer to moderate any of them. Also has a CREATE DEBATE button that lets moderators set up debates and generate join codes for debaters.

---

## O5. 🧑‍⚖️ BECOME A MODERATOR button

**Short:** Enable moderator mode (non-moderators only).

**Long:** Visible only if is_moderator is false. One-tap opt-in. Sets is_moderator=true on your profile and makes the MOD QUEUE button appear instead. Same as the moderator discovery touchpoints elsewhere in the app.

---

## O6. Join code text input

**Short:** Enter a 6-character code to join a specific debate.

**Long:** Private lobbies and mod-initiated debates generate join codes. If someone shares a code with you (via text, Discord, etc.), enter it here and tap GO to join their debate. Codes are 6 uppercase characters.

---

## O7. GO button

**Short:** Submit the join code and enter the debate.

**Long:** Validates the code against the database. If the code matches an active private lobby or mod-initiated debate, you join it. If the code is invalid or expired, you'll see an error.

---

## O8. Spectator feed cards — VIEW / WATCH LIVE button

**Short:** Watch an active debate as a spectator.

**Long:** The lobby shows cards for debates currently in progress. Tapping WATCH LIVE takes you to the Spectator View (Screen X) where you can watch, chat, and vote. This is how the arena feels alive even when you're not debating.

---

## O9. Challenge CTA

**Short:** Challenge notification when a rival is online.

**Long:** If one of your declared rivals is currently in the arena, this CTA appears prominently. It's designed to provoke — "that no good SOB [username] is looking for a debate." Tapping it initiates a direct challenge to your rival.

---

# Screen P — Profile

Your personal page. View and edit your bio, avatar, see your stats, and access settings, power-ups, arsenal, and cosmetics. Other users see a read-only version of this.

---

## P1. Avatar

**Short:** Tap to change your profile picture.

**Long:** Opens the Avatar Selection Sheet (Screen AX). You pick from a grid of available avatars. The selected avatar appears everywhere — header, debate rooms, leaderboards, hot takes, profile cards. There's no custom upload — you choose from the provided set.

---

## P2. Bio display

**Short:** Tap to edit your bio.

**Long:** Your bio is a free-text description visible on your profile. Tapping it switches to edit mode, revealing the text area (P3) and save/cancel buttons.

---

## P3. Bio textarea (500 char max)

**Short:** Write or edit your bio.

**Long:** 500-character bio. Visible to anyone who views your profile. Say whatever you want — debate philosophy, political stance, trash talk, whatever represents you. Has a character counter (P4) so you know how much space is left.

---

## P4. Bio character count

**Short:** Shows how many characters you've used out of 500.

**Long:** Display only. Updates as you type. Helps you stay within the limit.

---

## P5. CANCEL bio button

**Short:** Discard bio changes and return to display mode.

**Long:** Reverts to whatever the bio was before you started editing. No changes saved.

---

## P6. SAVE bio button

**Short:** Save your updated bio.

**Long:** Saves the bio text to your profile via RPC. Other users will see the update immediately. Has a double-tap guard — tapping multiple times won't send multiple save requests.

---

## P7. Followers count

**Short:** Tap to see who follows you.

**Long:** Opens the Follow List (Screen AY) showing all users who follow you. From there you can tap any follower to view their profile or follow them back.

---

## P8. Following count

**Short:** Tap to see who you follow.

**Long:** Opens the Follow List (Screen AY) showing everyone you're following. You can unfollow users from this list.

---

## P9. Profile depth bar

**Short:** Shows how much of your profile questionnaire you've completed.

**Long:** The profile questionnaire has 20 sections with 100 total questions. The depth bar shows your progress as a percentage. Completing sections earns tokens and unlocks tier rewards. Tapping the bar navigates to the Profile Questionnaire page (Screen T).

---

## P10. 📊 Complete Your Profile link

**Short:** Go to the Profile Questionnaire page (Screen T).

**Long:** Same destination as tapping the depth bar (P9). Takes you to the full questionnaire where you answer questions across 20 categories. Profile completion is tied to the tier system — higher completion unlocks higher tiers and more features.

---

## P11. ⚙️ Settings link

**Short:** Go to the Settings page (Screen U).

**Long:** Navigates to moderator-settings.html where you can change your display name, notification preferences, moderator settings, dark mode, and account management (logout, password reset, delete account).

---

## P12. ⚡ Power-Up Shop link

**Short:** Go to the Power-Up Shop.

**Long:** Same destination as O3. Browse and buy power-ups with tokens.

---

## P13. ⚔️ Reference Arsenal link

**Short:** Go to your Reference Arsenal (Screen S).

**Long:** Your library of saved references (articles, studies, facts) that you can cite during debates. The arsenal is where you prepare your ammunition before a debate.

---

## P14. 🛡️ Armory link

**Short:** Go to the Cosmetics page (Screen Y).

**Long:** Browse and equip cosmetic items — avatars, debate room themes, effects. Cosmetics are visual-only, no competitive advantage.

---

## P15. 🔗 Share Profile action

**Short:** Share your public profile link.

**Long:** Generates a shareable URL to your public profile page (/u/username). Uses the share mechanism to copy the link or send it via social media.

---

## P16. 📨 Invite a Friend action

**Short:** Send an invitation link to someone.

**Long:** Generates an invite link that leads to the signup flow. Sharing this with friends brings them into the app.

---

## P17. Rivals feed section

**Short:** See your declared rivals and their recent activity.

**Long:** Shows up to 5 rivals you've declared from post-debate screens. Tapping a rival's name takes you to their profile. Rivals are a social mechanic — when your rival is online, you get a notification encouraging you to challenge them.

---

# Screen Q — Shop / The Vault

The subscription tier page. Currently showing COMING SOON for all tiers — the payment system is not yet live.

---

## Q1. CONTENDER tier — COMING SOON button (disabled)

**Short:** First subscription tier — not yet available.

**Long:** Will be the entry-level paid tier when Stripe is integrated. Ad-free experience, custom themes, 30 tokens/day, priority matchmaking. Button is disabled and non-functional until the payment stack goes live.

---

## Q2. CHAMPION tier — COMING SOON button (disabled)

**Short:** Second subscription tier — not yet available.

**Long:** Mid-tier subscription. Everything in Contender plus exclusive cosmetics, private room creation, and detailed analytics.

---

## Q3. CREATOR tier — COMING SOON button (disabled)

**Short:** Top subscription tier — not yet available.

**Long:** Premium tier. Everything in Champion plus creator tools, overlays, revenue share on moderation bookings, and early access to features.

---

# Screen R — Leaderboard

Global rankings. See the best debaters on the platform ranked by different metrics.

---

## R1. ELO tab

**Short:** Rank players by Elo rating.

**Long:** Elo is a skill-based rating system. You gain Elo by winning Ranked debates and lose it by losing. The Elo leaderboard shows who the best debaters are overall. Only Ranked debate results affect Elo — Casual, AI, and private debates don't count.

---

## R2. WINS tab

**Short:** Rank players by total win count.

**Long:** Pure volume metric. Shows who has won the most debates regardless of skill rating. A player with many wins but low Elo beats a lot of easy opponents. A player with high Elo and moderate wins is beating tough opponents.

---

## R3. 🔥 STREAK tab

**Short:** Rank players by current win streak.

**Long:** Shows who's on the hottest run right now. Streaks reset on any loss. Streak freezes (an item you can earn or buy) protect your streak from a single loss.

---

## R4. Leaderboard rows

**Short:** Tap any player's row to view their profile.

**Long:** Each row shows rank, username, avatar, and the relevant stat (Elo, wins, or streak). Tapping navigates to that player's public profile where you can follow them, challenge them, or check their debate history.

---

## R5. LOAD MORE button

**Short:** Load the next batch of leaderboard entries.

**Long:** The leaderboard loads in pages to keep performance fast. Tap LOAD MORE to fetch the next chunk of players. You can keep tapping to go deeper into the rankings.

---

## R6. ELO explainer close button (✕)

**Short:** Dismiss the Elo rating explanation tooltip.

**Long:** When you first visit the Elo tab, an explainer card may appear explaining how Elo works. This button closes it. Informational only.

---

# Screen S — Arsenal / Reference Library

Your debate preparation toolkit. Forge new references from real sources, organize them by category, and deploy them during live debates to strengthen your arguments.

---

## S1. ← Back button

**Short:** Return to the previous screen.

**Long:** Navigates back, typically to the Profile screen where you clicked the Arsenal link.

---

## S2. My Arsenal tab

**Short:** View references you've created.

**Long:** Shows all the references you've forged. Each reference is a fact or claim backed by a source URL. You use these during debates to cite evidence.

---

## S3. Library tab

**Short:** Browse references shared by all users.

**Long:** A public library of references created by the entire user base. You can browse by category, find references other people have created, and add them to your own arsenal for use in debates.

---

## S4. Forge new reference button

**Short:** Start creating a new reference.

**Long:** Opens the 5-step forge form. Creating a reference is called "forging" — you're building a piece of verified evidence. This process forces you to be precise about what the source says and what it proves.

---

## S5. Forge Step 1 — Claim textarea (120 char max)

**Short:** Write a one-sentence claim that your source proves.

**Long:** This is the core of the reference — a crisp, 120-character statement of what this evidence demonstrates. Not the article title, not a summary, but YOUR claim. Example: "Global temperatures rose 1.1°C since pre-industrial era." This claim is what gets cited in the debate room.

---

## S6. Forge Step 2 — Source URL input

**Short:** Paste the URL of your source.

**Long:** The URL of the article, study, report, or page that backs up your claim. The domain is extracted automatically and displayed — this helps other users evaluate the credibility of your source at a glance.

---

## S7. Forge Step 3 — Author input, Year input, Source type buttons

**Short:** Add metadata about who wrote the source and what kind it is.

**Long:** Author or organization name, publication year, and source type (academic, news, government, etc.). This metadata helps both you and other users assess the reference's credibility. Source type buttons let you categorize the kind of evidence it is.

---

## S8. Forge Step 4 — Category buttons

**Short:** Tag your reference with a debate category.

**Long:** Select which category this reference belongs to — Politics, Sports, Entertainment, Couples, Trending, Music, etc. This determines where it appears in the Library and which debates it's most relevant for.

---

## S9. Forge Step 5 — Review card + FORGE IT submit button

**Short:** Review your reference and submit it.

**Long:** Shows a preview card with your claim, URL, author, year, source type, and category. FORGE IT submits the reference to the database. Once forged, it appears in your arsenal and the public library. Other users can view it and use it in their own debates.

---

## S10. Individual reference cards

**Short:** Tap a reference card to expand or edit it.

**Long:** Each reference in your arsenal appears as a card showing the claim and source domain. Tap to see full details. You can edit or delete references you've created.

---

## S11. Library search/browse

**Short:** Search or browse public references in the Library tab.

**Long:** Find references created by other users. Filter by category or search by keywords. Useful when preparing for a debate in a specific topic area.

---

# Screen T — /profile-depth Profile Questionnaire

The 100-question profile depth system spread across 20 sections. Completing sections earns tokens and unlocks tiers. This data becomes part of the B2B data product.

---

## T1. ← Back link

**Short:** Go back to the main app.

**Long:** Navigates to index.html. Any unsaved progress in a section is lost — always save before leaving.

---

## T2. Section tiles (20 sections)

**Short:** Tap a section to open its questions.

**Long:** The questionnaire is organized into 20 themed sections (Politics, Sports, Personal Values, etc.). Each tile shows the section name and how many questions are answered. Tapping opens that section's questions. Sections can be completed in any order.

---

## T3. Text inputs (per question)

**Short:** Type your answer to a text-based question.

**Long:** Free-text answers up to 500 characters. These are open-ended opinion questions. Your answers contribute to your profile depth score and the B2B data product.

---

## T4. Slider inputs (per question)

**Short:** Drag the slider to indicate your position on a spectrum.

**Long:** Some questions use a slider between two positions (e.g., "Very Liberal" to "Very Conservative"). Drag to wherever you fall. More nuanced than a yes/no choice.

---

## T5. Select dropdowns (per question)

**Short:** Choose an answer from a dropdown list.

**Long:** Multiple-choice questions with predefined options. Pick the one that best fits your view.

---

## T6. Chip/pill multi-select buttons (per question)

**Short:** Tap one or more pills to select your answers.

**Long:** Some questions let you select multiple options from a set of pill-shaped buttons. For example, "Which sports do you follow?" might show NFL, NBA, NHL, MLB, MLS as chips you can toggle on or off.

---

## T7. SAVE & UNLOCK REWARD button

**Short:** Save your answers for this section and claim your token reward.

**Long:** Once you've answered the questions in a section, tap this to save. The server records your answers, updates your profile depth percentage, increments questions_answered, and awards tokens. Each section completion is a milestone that can only be claimed once. The guard_profile_columns trigger protects these values from client-side manipulation.

---

## T8. Privacy Policy footer link

**Short:** Links to the Privacy Policy.

**Long:** Standard legal footer.

---

## T9. Terms of Service footer link

**Short:** Links to the Terms of Service.

**Long:** Standard legal footer.

---

# Screen U — /settings Settings Page

All account, notification, moderator, and privacy settings. Also where you log out, reset your password, or delete your account.

---

## U1. ← Back link

**Short:** Go back to the main app.

**Long:** Navigates to index.html. Unsaved changes are not persisted — use the SAVE CHANGES button first.

---

## U2. Display name input (max 30 chars)

**Short:** Change the name that other users see.

**Long:** Your display name shows up in debate rooms, leaderboards, hot takes, and everywhere your identity appears. Different from your username (which is permanent and used in URLs). You can change this anytime. 30 character max.

---

## U3. Challenge notifications toggle

**Short:** Turn challenge notifications on or off.

**Long:** When someone challenges you to a debate, you get a notification. Turn this off if you don't want to be notified about challenges. The challenges still arrive — you just won't be alerted.

---

## U4. Debate notifications toggle

**Short:** Turn debate result notifications on or off.

**Long:** Notifications about debate outcomes, scoring, and related activity.

---

## U5. Follow notifications toggle

**Short:** Turn follow notifications on or off.

**Long:** Get notified when someone follows you. Turn off if the volume gets noisy.

---

## U6. Reaction notifications toggle

**Short:** Turn reaction notifications on or off.

**Long:** Get notified when someone reacts to your hot takes. High-engagement users may want this off to avoid notification overload.

---

## U7. Sound effects toggle

**Short:** Turn in-app sound effects on or off.

**Long:** The app has audio cues — beeps for navigation, sounds for events. Toggle off for silent operation.

---

## U8. Mute all audio toggle

**Short:** Mute everything — sounds, effects, all audio.

**Long:** Master mute. Overrides individual sound settings. The app is designed to work fully muted (mute-first design), so nothing breaks when this is on.

---

## U9. Dark mode toggle

**Short:** Switch between dark and light themes.

**Long:** Takes effect immediately. The theme preference is saved to localStorage and persists across sessions. Dark mode is the default and recommended mode — the entire UI is designed dark-first.

---

## U10. Moderator enabled toggle

**Short:** Turn moderator mode on or off.

**Long:** Saves instantly via RPC (no need to hit SAVE CHANGES). When enabled, you appear in the Mod Queue for debaters to request you as a moderator. When disabled, you're invisible to the mod queue. Your mod stats and approval rating are preserved either way.

---

## U11. Moderator available toggle

**Short:** Signal whether you're currently available to moderate.

**Long:** Saves instantly via RPC. Even with moderator mode enabled, you can set yourself as unavailable (e.g., you're about to go to bed). This is a finer-grained control than the enable toggle.

---

## U12-U17. Moderator category chips (Politics, Sports, Entertainment, Couples, Trending, Music)

**Short:** Select which debate categories you're willing to moderate.

**Long:** Each chip is a toggle. Select the categories where you have expertise or interest. When debaters browse the mod queue, they see moderators filtered by the debate's category. If you only select Politics and Sports, you won't appear in the queue for Entertainment debates. Has a double-tap guard to prevent rapid-fire toggles.

---

## U18. Public profile toggle

**Short:** Make your profile visible or hidden to other users.

**Long:** When enabled, your profile is publicly accessible at /u/username and visible in search results. When disabled, your profile is hidden from public view.

---

## U19. Show online status toggle

**Short:** Let other users see when you're online.

**Long:** When enabled, your online/offline status is visible to other users, especially rivals. When disabled, you appear offline to everyone. Rivals won't get "is online" notifications.

---

## U20. Allow challenges toggle

**Short:** Allow or block incoming challenge invitations.

**Long:** When enabled, other users can challenge you to debates via hot takes or direct challenge. When disabled, the challenge button on your profile is hidden.

---

## U21. 💾 SAVE CHANGES button

**Short:** Save all your settings changes.

**Long:** Persists everything — display name, notification preferences, privacy toggles. Note: moderator toggles (U10, U11) and category chips (U12-U17) save instantly on change, they don't wait for this button. This button covers everything else. Has a double-tap guard.

---

## U22. ← BACK TO APP button

**Short:** Return to the main app.

**Long:** Same as U1 — navigates back to index.html. This is a separate button in the body of the page (U1 is the header back link).

---

## U23. 🚪 LOG OUT button

**Short:** Sign out of your account.

**Long:** Clears your session, stops all polling (notifications, match acceptance), clears broadcast channels, and redirects you to the login page. All in-memory state is destroyed. You'll need to log in again to use the app.

---

## U24. 🔑 RESET PASSWORD button

**Short:** Send yourself a password reset email.

**Long:** Triggers the same password reset flow as F8/F23. An email is sent to your account's email address with a reset link. Has a double-tap guard to prevent sending multiple emails.

---

## U25. 🗑️ DELETE ACCOUNT button

**Short:** Permanently delete your account.

**Long:** Opens the Delete Account Modal (Screen BG). This is destructive and irreversible. You have to type "DELETE" to confirm. Once confirmed, your account and all associated data are removed.

---

## U26. Privacy Policy footer link

**Short:** Links to Privacy Policy.

**Long:** Standard legal footer.

---

## U27. Terms of Service footer link

**Short:** Links to Terms of Service.

**Long:** Standard legal footer.

---

# Screen V — /groups Lobby View

The groups home page. Discover groups, view your groups, see rankings, and create new groups. This is a separate HTML page with its own bottom tab bar.

---

## V1. + CREATE button

**Short:** Create a new group.

**Long:** Opens the Create Group Modal (Screen BH). You name the group, write a description, pick a category, and the group is live. You automatically become the Leader of any group you create.

---

## V2. Discover tab

**Short:** Browse all public groups.

**Long:** Shows a feed of groups you can join. Filter by category using the pills (V5). Each group card shows the group name, member count, and activity level.

---

## V3. My Groups tab

**Short:** View groups you're a member of.

**Long:** Shows only the groups where you have membership. Quick access to groups you've already joined.

---

## V4. Rankings tab

**Short:** See group rankings.

**Long:** Groups ranked by aggregate performance — average member win rate, total wins, Elo, etc.

---

## V5. Category filter pills

**Short:** Filter groups by debate category.

**Long:** Tap a category to show only groups focused on that topic. Tap again to clear the filter.

---

## V6. Group cards

**Short:** Tap a group to open its detail page (Screen W).

**Long:** Each card shows the group's name, description preview, member count, and category. Tapping takes you to the full group detail view.

---

## V7-V11. Bottom tab bar (Feed, Arena, Ranks, Groups, Profile)

**Short:** Navigation tabs identical to the main app.

**Long:** Because /groups is a separate HTML page, it has its own tab bar. Groups tab is highlighted as active. Other tabs navigate back to index.html with the appropriate screen parameter.

---

# Screen W — /groups Group Detail View

Inside a specific group. See hot takes from group members, active challenges, the member list, and manage GvG battles.

---

## W1. Group banner/header

**Short:** Display-only group name and banner image.

**Long:** Shows the group's identity. If the group has earned a custom banner (through the three-tier banner progression), it appears here.

---

## W2. JOIN GROUP / LEAVE GROUP button

**Short:** Join or leave this group.

**Long:** If you're not a member, this shows JOIN GROUP. If you are, it shows LEAVE GROUP. Joining is instant for open groups. For groups with entry requirements (minimum Elo, tier level, or audition), you may need to meet those first.

---

## W3. ⚔️ CHALLENGE ANOTHER GROUP button

**Short:** Start a Group vs Group battle.

**Long:** Only visible if you're a member. Opens the GvG Challenge Modal (Screen BI) where you pick an opponent group, set a topic, and choose the format (1v1, 3v3, or 5v5). GvG is how groups compete against each other.

---

## W4. Hot Takes tab

**Short:** View hot takes posted by group members.

**Long:** A feed of hot takes scoped to this group. Only members can post. Same format as the main feed but limited to group content.

---

## W5. Challenges tab

**Short:** View active challenges against this group.

**Long:** Shows incoming and outgoing GvG challenges. Members with appropriate roles can accept or decline.

---

## W6. Members tab

**Short:** View all group members and their roles.

**Long:** Shows every member with their role (Leader, Co-Leader, Elder, Member). If you have the right role, you can promote, demote, or kick members from here.

---

## W7. Group hot take text input

**Short:** Write a hot take for this group's feed.

**Long:** Same as the main hot take composer but posts to the group feed instead of the public feed. Only visible to group members.

---

## W8. POST button (group hot take)

**Short:** Publish your hot take to the group feed.

**Long:** Posts your hot take to this group's Hot Takes tab. Only group members can see it.

---

## W9. Challenge cards — ACCEPT button

**Short:** Accept an incoming GvG challenge.

**Long:** Only visible to group Leaders and Co-Leaders. Accepting locks in the challenge and notifies the opposing group.

---

## W10. Challenge cards — DECLINE button

**Short:** Decline an incoming GvG challenge.

**Long:** Only visible to Leaders and Co-Leaders. Declining removes the challenge.

---

## W11. Member rows — role actions (Promote/Demote/Kick)

**Short:** Manage member roles and membership.

**Long:** Only visible based on your role in the group. Leaders can promote/demote anyone. Co-Leaders can manage Elders and Members. Elders can manage Members only. The role hierarchy enforces permissions — you can't promote someone to your own rank or higher.

---

# Screen X — /spectate Spectator View

Watch a live debate in progress. Chat with other spectators, vote on who's winning, and share the debate.

---

## X1. ← Back button

**Short:** Leave the spectator view.

**Long:** Returns to wherever you came from — typically the arena lobby or home feed.

---

## X2. Logo link

**Short:** Go to the app homepage.

**Long:** Standard logo navigation.

---

## X3. JOIN link

**Short:** Sign up for an account (hidden if already logged in).

**Long:** Visible only to unauthenticated spectators. Links to the Plinko signup flow. Spectating is ungated, but joining the debate requires an account.

---

## X4. Debate content

**Short:** Scrollable feed of the live debate.

**Long:** Shows the debate as it unfolds — each argument from both debaters, moderator rulings, score updates. Read-only for spectators.

---

## X5. Spectator chat header toggle

**Short:** Expand or collapse the spectator chat panel.

**Long:** The spectator chat is a separate discussion area where spectators can talk to each other during the debate. Toggle it open to chat, collapse it to focus on the debate.

---

## X6. Chat input text field (280 char max)

**Short:** Type a message in the spectator chat.

**Long:** 280-character limit. Your message appears in the spectator chat feed alongside messages from other viewers. This is where the audience discusses the debate in real time.

---

## X7. SEND chat button

**Short:** Post your message to spectator chat.

**Long:** Sends your message. Visible to all spectators currently watching.

---

## X8. Vote button Side A

**Short:** Vote for Side A (shows debater's name).

**Long:** Spectator vote. Not the same as predictions (which involve tokens). This is a live sentiment poll — who does the audience think is winning? Results update in real time as votes come in.

---

## X9. Vote button Side B

**Short:** Vote for Side B.

**Long:** Same as X8 for the other debater.

---

## X10. 📋 Copy Link share button

**Short:** Copy the spectator link to clipboard.

**Long:** Copies a link that lets others join as spectators. More spectators = more audience = more data.

---

## X11. 𝕏 Share button

**Short:** Share the live debate on X.

**Long:** Pre-filled tweet with the debate topic and spectator link.

---

## X12. 💬 WhatsApp share button

**Short:** Share via WhatsApp.

**Long:** Opens WhatsApp with a pre-filled message containing the debate link.

---

## X13. ↗ Share button (native share)

**Short:** Open device native share sheet.

**Long:** Same as D11 — uses Web Share API.

---

# Screen Y — /cosmetics Armory

Browse and equip cosmetic items. Visual customization only — no competitive advantage.

---

## Y1. ← Back link

**Short:** Go back to home/profile.

**Long:** Returns to the previous screen.

---

## Y2. Cosmetic item tiles

**Short:** Tap an item to see its details.

**Long:** Each tile shows a cosmetic item — its visual, name, and status (owned, equipped, or purchasable). Tapping selects the item and shows its purchase/equip options.

---

## Y3. Purchase button

**Short:** Buy this cosmetic item with tokens.

**Long:** Appears on items you don't own yet. Shows the token cost. Tapping opens a confirmation modal (Y6/Y7) before deducting tokens. Your balance is checked client-side first — if you can't afford it, you'll see an error immediately.

---

## Y4. Equip button

**Short:** Equip this item — replaces any previously equipped item in the same category.

**Long:** Appears on items you own but haven't equipped. Each cosmetic category (avatar frame, debate room theme, etc.) has one active slot. Equipping a new item automatically unequips the old one in that category. There's no separate unequip action.

---

## Y5. Equipped label (display only)

**Short:** Shows that this item is currently equipped.

**Long:** Not a button — just a disabled label indicating this item is active. To unequip, equip a different item in the same category.

---

## Y6. Purchase confirm modal — Cancel button

**Short:** Cancel the purchase.

**Long:** Dismisses the confirmation modal without spending tokens.

---

## Y7. Purchase confirm modal — Purchase button

**Short:** Confirm the purchase and spend tokens.

**Long:** Deducts tokens from your balance and adds the cosmetic to your inventory. The item is immediately available to equip.

---

## Y8. Info modal — Got it button

**Short:** Dismiss the information popup.

**Long:** Closes any informational tooltip or help popup about cosmetics.

---

# Screen Z — Arena Mode Select (overlay)

Choose your debate format. This overlay appears after the Ranked Picker when entering matchmaking.

---

## Z1. 🎙️ Live Audio mode card

**Short:** Real-time voice debate using WebRTC.

**Long:** The flagship debate format. Both debaters speak live through their microphones. Uses WebRTC with a Cloudflare TURN server for NAT traversal and ICE restart for connection recovery. Requires microphone access. This is the most intense format — no hiding behind text.

---

## Z2. 🎤 Voice Memo mode card

**Short:** Asynchronous debate via recorded voice messages.

**Long:** Take turns recording voice memos. No real-time pressure — you can think, record, re-record, then send. Good for users who want the voice experience without the live performance anxiety. Each player records their argument, then waits for the opponent to respond.

---

## Z3. ⌨️ Text Battle mode card

**Short:** Real-time text-based debate.

**Long:** Type your arguments back and forth. Both debaters are in the room simultaneously, but communication is text-only. No microphone required. The most accessible format — works in any environment, any device.

---

## Z4. 🤖 AI Sparring mode card

**Short:** Practice debate against an AI opponent.

**Long:** Debate against Claude (Anthropic's AI). No matchmaking queue, no waiting — the AI is always available. Good for warming up, practicing arguments, or when no human opponents are in the queue. Uses the ai-sparring Edge Function. Your performance doesn't affect Elo in Casual mode, but does in Ranked.

---

## Z5. Cancel button

**Short:** Close the mode select and go back to the lobby.

**Long:** Dismisses the overlay. You're still in the arena lobby.

---

## Z6. Backdrop tap to close

**Short:** Tap outside the overlay to dismiss it.

**Long:** Same as Z5 — alternative dismissal via tapping the darkened background area.

---

# Screen AA — Arena Ranked Picker (overlay)

Choose whether this debate affects your ranking.

---

## AA1. Ranked card

**Short:** Enter Ranked matchmaking — this debate counts toward your Elo.

**Long:** Ranked debates affect your Elo rating, appear on leaderboards, and carry competitive stakes. Only Ranked results change your global ranking. Pick this when you want to compete for real.

---

## AA2. Casual card

**Short:** Enter Casual matchmaking — no Elo impact.

**Long:** Casual debates are consequence-free. Win or lose, your Elo doesn't change. Good for practicing, trying new arguments, or debating friends without risking your rank. Protected lobbies keep casual players separate from ranked sharks.

---

## AA3. Cancel button

**Short:** Close the picker.

**Long:** Returns to the lobby.

---

## AA4. Backdrop tap to close

**Short:** Tap outside to dismiss.

**Long:** Same as AA3.

---

# Screen AB — Arena Ruleset Picker (overlay)

Choose the debate ruleset and round count.

---

## AB1. ⚡ Amplified card

**Short:** Amplified ruleset — power-ups, staking, and special mechanics enabled.

**Long:** The full-featured ruleset. Power-ups can be used during the debate, tokens can be staked on the outcome, and special mechanics like reference citing are fully active. This is the "everything on" mode.

---

## AB2. 🎸 Unplugged card

**Short:** Unplugged ruleset — pure debate, no power-ups or staking.

**Long:** Stripped-down rules. No power-ups, no staking, no mechanics — just two debaters and their arguments. For purists who want the debate to stand on its own merit.

---

## AB3. Round count buttons

**Short:** Select how many rounds the debate will have.

**Long:** Choose from available round counts. More rounds mean a longer debate and more opportunities to build and counter arguments.

---

## AB4. Cancel button

**Short:** Close the picker.

**Long:** Returns to the previous screen.

---

## AB5. Backdrop tap to close

**Short:** Tap outside to dismiss.

**Long:** Same as AB4.

---

# Screen AC — Arena Category Picker

Choose what topic area you want to debate in.

---

## AC1. Category buttons

**Short:** Pick a debate category.

**Long:** Select from Politics, Sports, Entertainment, Couples, Trending, Music, etc. The matchmaking queue only pairs you with opponents who selected the same category. This ensures both debaters are interested in the same topic area.

---

## AC2. "Any Category" button

**Short:** Match with any category — you'll debate whatever comes up.

**Long:** Fastest path to a match. You'll accept whatever category the next available opponent selected. Good when you don't care about the topic and just want to debate.

---

## AC3. Topic text input

**Short:** Suggest a specific topic within the category.

**Long:** Optional. If provided, this becomes the debate topic. If left empty, a topic is randomly selected or agreed upon with the opponent.

---

# Screen AD — Arena Queue

Waiting for an opponent. You've entered matchmaking and the system is looking for someone to pair you with.

---

## AD1. ✕ CANCEL button

**Short:** Leave the queue and go back to the lobby.

**Long:** Removes you from matchmaking. No penalty for canceling.

---

## AD2. Queue status animation

**Short:** Visual indicator that matchmaking is searching.

**Long:** Display only. Shows that the system is actively looking for an opponent. Animations keep the screen from feeling dead during the wait.

---

## AD3. Queue population count

**Short:** How many people are currently in the queue.

**Long:** Display only. Shows whether there are other people searching. If the count is 0, you might be waiting a while. If it's high, a match should come fast.

---

## AD4. Spectator feed

**Short:** Watch active debates while you wait.

**Long:** While in the queue, you can scroll through and watch live debates happening right now. Keeps you engaged instead of staring at a loading spinner.

---

# Screen AE — Arena AI Fallback Prompt (after 60s)

If no human opponent is found after 60 seconds, the app offers an AI alternative.

---

## AE1. SPAR WITH AI button

**Short:** Stop waiting and debate an AI instead.

**Long:** Exits the human matchmaking queue and starts an AI debate immediately. The queue continues searching in the background — if a human match is found while you're debating the AI, the system handles it.

---

## AE2. Continues searching in background

**Short:** The queue keeps looking for a human opponent even after the prompt appears.

**Long:** This isn't a button — it's a behavior note. The AI prompt doesn't kill your queue position. If a human match appears, you'll be notified.

---

# Screen AF — Arena Timeout / No Match (after 180s)

After 3 minutes with no match, the queue gives up and offers alternatives.

---

## AF1. 🤖 SPAR WITH AI INSTEAD button

**Short:** Start an AI debate.

**Long:** Same as AE1 but after the full timeout. The queue is done — no more background searching.

---

## AF2. 🔄 TRY AGAIN button

**Short:** Re-enter the matchmaking queue.

**Long:** Puts you back in the queue from scratch. A fresh 180-second timer starts.

---

## AF3. ← BACK TO LOBBY button

**Short:** Return to the arena lobby.

**Long:** Exits the queue entirely and goes back to the lobby screen (Screen O).

---

# Screen AG — Arena Match Found

A human opponent has been found. Both players must accept within 12 seconds.

---

## AG1. ACCEPT button

**Short:** Accept the match and proceed to the debate.

**Long:** You have 12 seconds to accept. If both players accept, you move to the Pre-Debate Setup (Screen AH). If you don't accept in time, the match is forfeited and you're returned to the queue.

---

## AG2. DECLINE button

**Short:** Decline the match.

**Long:** Rejects this specific opponent and puts you back in the queue. No penalty for declining.

---

## AG3. 12-second countdown

**Short:** Timer showing how long you have to accept or decline.

**Long:** Display only. When it hits zero, the match is automatically declined. The countdown creates urgency — no sitting on the decision.

---

## AG4. Opponent info

**Short:** Shows your opponent's username, avatar, Elo, and win record.

**Long:** Display only. Gives you a quick read on who you're about to debate. In Ranked mode, this matters — you can see if you're matched against someone at your level or significantly above/below.

---

# Screen AH — Arena Pre-Debate Setup (Staking)

The lobby before the debate starts. Stake tokens on the outcome if you want extra stakes.

---

## AH1. Side A stake button

**Short:** Stake tokens on Side A winning.

**Long:** Select which side you're betting on. Shows the current multiplier based on existing stakes. If you're debating, you'd typically stake on yourself.

---

## AH2. Side B stake button

**Short:** Stake tokens on Side B winning.

**Long:** Same as AH1 for the other side.

---

## AH3. Stake amount number input

**Short:** Enter how many tokens to stake.

**Long:** Type a specific amount. Your balance is checked client-side before the RPC fires. If you don't have enough, you get an instant error.

---

## AH4. Quick amount buttons

**Short:** Preset stake amounts.

**Long:** Tap a preset value instead of typing. Same as N21 for predictions.

---

## AH5. CONFIRM stake button

**Short:** Lock in your stake.

**Long:** Disabled until you've selected a side and entered an amount. Submitting deducts tokens from your balance. If your side wins, you get a payout based on the multiplier.

---

## AH6. ENTER DEBATE button

**Short:** Enter the debate room.

**Long:** Proceeds to the actual debate (Screens AI-AL depending on mode). Staking is optional — you can enter without staking anything.

---

# Screen AI — Arena Debate Room (Text mode)

The live text debate. Type your arguments, cite references, and use power-ups.

---

## AI1. Text argument textarea

**Short:** Type your argument for this turn.

**Long:** Main input for text debates. Write your argument here and send it. Character limit applies.

---

## AI2. → Send button

**Short:** Submit your argument.

**Long:** Disabled until you've typed something. Sends your argument to the debate feed visible to your opponent, the moderator, and spectators.

---

## AI3. 📎 Reference button

**Short:** Cite a reference from your arsenal during the debate.

**Long:** Opens the Reference Form (Screen BD). You can pull in a pre-forged reference to back up your argument with a real source. References appear in the debate feed and can be challenged by the opponent.

---

## AI4. Chat/message feed

**Short:** Scrollable feed of the debate so far.

**Long:** All arguments, references, moderator rulings, and scoring events appear here in chronological order. Scroll up to re-read earlier exchanges.

---

## AI5. Power-up activation buttons

**Short:** Use a power-up during the debate.

**Long:** If you bought power-ups before the debate and the ruleset is Amplified, these buttons appear. Each power-up is single-use. Tap to activate during your turn.

---

## AI6. Moderator scoring interface

**Short:** Moderator's scoring tools (only visible to the moderator).

**Long:** If a human moderator is assigned, they see scoring controls. Debaters and spectators see the scored results but not the controls. See Screen BC for the scoring panel details.

---

# Screen AJ — Arena Debate Room (Live Audio mode)

The real-time voice debate room. WebRTC-powered, with live audio and text chat.

---

## AJ1. 🎙️ Mic button

**Short:** Mute or unmute your microphone.

**Long:** Toggle your mic on/off. When muted, your opponent can't hear you. The button state is visible to others so they know if you're speaking or muted.

---

## AJ2. Audio waveform visualization

**Short:** Visual indicator of who's speaking.

**Long:** Display only. Shows a live waveform for the active speaker. Helps both debaters and spectators see who's talking, especially useful when there's crosstalk.

---

## AJ3. 📎 Reference button

**Short:** Cite a reference during the voice debate.

**Long:** Same as AI3. Opens the Reference Form.

---

## AJ4. Chat/message feed

**Short:** Text feed alongside the voice debate.

**Long:** References, moderator rulings, and scoring events appear here even though the debate is voice-based.

---

## AJ5. Power-up activation buttons

**Short:** Use a power-up.

**Long:** Same as AI5.

---

# Screen AK — Arena Debate Room (Voice Memo mode)

Asynchronous voice debate. Record your argument, review it, then send.

---

## AK1. ⏺ Record button

**Short:** Start recording your voice memo argument.

**Long:** Tap to begin recording. Your device's microphone captures your argument. You can take your time — this isn't live.

---

## AK2. ⏹ Stop button

**Short:** Stop recording.

**Long:** Appears while recording is active. Tap to stop. Your recording is ready to review before sending.

---

## AK3. RETAKE button

**Short:** Discard the current recording and try again.

**Long:** Delete the recording and start fresh. No limit on retakes. Take as many attempts as you need to get your argument right.

---

## AK4. SEND voice memo button

**Short:** Submit your recorded argument.

**Long:** Sends the voice memo to the debate. Your opponent will hear it and record their response. Once sent, you can't take it back.

---

## AK5. Recording status indicator

**Short:** Shows recording time and status.

**Long:** Display only. Shows how long you've been recording.

---

## AK6. 📎 Reference button

**Short:** Cite a reference.

**Long:** Same as AI3.

---

# Screen AL — Arena Debate Room (AI Sparring)

Practice debate against Claude. Same text interface but your opponent is an AI.

---

## AL1. Text argument textarea

**Short:** Type your argument against the AI.

**Long:** Same input as AI1. The AI responds after you send each argument.

---

## AL2. → Send button

**Short:** Submit your argument to the AI.

**Long:** Same as AI2. The AI processes your argument and responds via the ai-sparring Edge Function.

---

## AL3. Chat feed with AI responses

**Short:** Scrollable debate feed showing your exchange with the AI.

**Long:** Same as AI4 but the opponent is always AI. The AI's arguments are generated by Claude and appear in the feed like any other opponent.

---

## AL4. Round indicator

**Short:** Shows which round you're in.

**Long:** Display only. AI Sparring follows the same round structure as human debates.

---

# Screen AM — Arena Post-Debate End Screen

The debate is over. See results, declare a rival, request a rematch, or share.

---

## AM1. ⚔️ ADD RIVAL button

**Short:** Declare your opponent as a rival.

**Long:** Adds this person to your rival list (up to 5 slots). Rivals get special notifications when you're online, and your encounters are tracked. This is the competitive social layer — you're saying "I want to debate this person again."

---

## AM2. ⚔️ REMATCH button

**Short:** Challenge your opponent to another debate immediately.

**Long:** Sends a rematch request. If the opponent accepts, you go right back into a new debate. Same mode, same category.

---

## AM3. 🔗 SHARE button

**Short:** Share the debate results.

**Long:** Share the outcome with a link others can view. Opens share options (copy link, X, native share).

---

## AM4. 📝 TRANSCRIPT button

**Short:** View the full debate transcript.

**Long:** Opens the Transcript Overlay (Screen BF). Shows every argument from both sides in order. Available for text and voice memo debates (voice memos may show transcriptions).

---

## AM5. ← LOBBY button

**Short:** Return to the arena lobby.

**Long:** Goes back to Screen O. The debate is done.

---

## AM6. Opponent name

**Short:** Tap to view your opponent's profile.

**Long:** Navigates to their public profile page.

---

## AM7. Score display

**Short:** Final score breakdown.

**Long:** Display only. Shows the final score for both debaters across all rounds.

---

## AM8. Token claim summary

**Short:** Tokens earned from this debate.

**Long:** Display only. Shows tokens earned from participation, winning, streak bonuses, and stake payouts. Tokens are credited to your balance automatically.

---

# Screen AN — Arena Power-Up Shop (overlay)

Buy power-ups with tokens before entering a debate.

---

## AN1. ← BACK button

**Short:** Close the shop and return to the lobby.

**Long:** Dismisses the power-up shop overlay.

---

## AN2. Power-up cards — BUY button

**Short:** Purchase a power-up with tokens.

**Long:** Each card shows the power-up name, description, effect, and cost in tokens. Tapping BUY deducts tokens and adds the power-up to your inventory. Balance is checked client-side first. Power-ups are single-use — once activated in a debate, they're consumed.

---

## AN3. Token balance display

**Short:** Your current token balance.

**Long:** Display only. Shows how many tokens you have available to spend. Updates immediately after a purchase.

---

# Screen AO — Arena Private Lobby Picker (overlay)

Choose how to set up a private debate.

---

## AO1. Username Challenge option

**Short:** Challenge a specific user by their username.

**Long:** Opens the User Search screen (Screen AP). Type a username to find the person you want to debate. Once found, a direct challenge is sent.

---

## AO2. Group Members Only option

**Short:** Create a debate open only to your group members.

**Long:** Opens the Group Lobby Picker (Screen AQ). Select which group, and only members of that group can join the debate.

---

## AO3. Join Code option

**Short:** Generate a 6-character code to share.

**Long:** Creates a private lobby with a join code. Share the code with whoever you want to debate — they enter it in the lobby's code input (O6) to join.

---

## AO4. Cancel button

**Short:** Close the picker.

**Long:** Returns to the lobby.

---

## AO5. Backdrop tap to close

**Short:** Tap outside to dismiss.

**Long:** Same as AO4.

---

# Screen AP — Arena User Search

Find a specific user to challenge.

---

## AP1. Search username text input

**Short:** Type the username of the person you want to challenge.

**Long:** Live search — results appear as you type. Searches against all registered usernames.

---

## AP2. User result rows

**Short:** Tap a user to challenge them.

**Long:** Each row shows username, avatar, and basic stats. Tapping sends a challenge to that user.

---

## AP3. Cancel button

**Short:** Close the search.

**Long:** Returns to the Private Lobby Picker.

---

## AP4. Backdrop tap to close

**Short:** Tap outside to dismiss.

**Long:** Same as AP3.

---

# Screen AQ — Arena Group Lobby Picker

Select which group's members can join the private debate.

---

## AQ1. Group list

**Short:** Tap a group to restrict the debate to its members.

**Long:** Shows all groups you're a member of. Selecting one creates a private lobby that only members of that group can join.

---

## AQ2. Cancel button

**Short:** Close the picker.

**Long:** Returns to the Private Lobby Picker.

---

## AQ3. Backdrop tap to close

**Short:** Tap outside to dismiss.

**Long:** Same as AQ2.

---

# Screen AR — Arena Mod Queue

Browse debates that need a moderator. Moderators only.

---

## AR1. ← BACK button

**Short:** Return to the arena lobby.

**Long:** Goes back to Screen O.

---

## AR2. ⚔️ CREATE DEBATE button

**Short:** Create a mod-initiated debate.

**Long:** Opens the Mod-Initiated Debate Picker (Screen AS). As a moderator, you can set up a debate — choose mode, category, topic — and generate a join code. Debaters join your debate using the code.

---

## AR3. Debate request cards — REQUEST TO MOD button

**Short:** Volunteer to moderate this debate.

**Long:** Each card represents a debate that needs a moderator. Tapping REQUEST TO MOD puts you forward as the moderator. The system checks your cooldown status first — if you've recently dropped out of a moderation, you may be on cooldown (10 min → 60 min → 24 hours for repeat offenses).

---

# Screen AS — Arena Mod-Initiated Debate Picker

Set up a debate as a moderator.

---

## AS1. ← BACK button

**Short:** Return to the Mod Queue.

**Long:** Goes back to Screen AR.

---

## AS2. Mode cards

**Short:** Choose the debate format.

**Long:** Same options as Screen Z — Live Audio, Voice Memo, Text. The moderator decides the format.

---

## AS3. Category cards

**Short:** Choose the debate category.

**Long:** Pick the topic area. This determines what kind of debaters will be interested.

---

## AS4. Topic text input

**Short:** Set a specific debate topic (optional).

**Long:** 200-character max. If provided, this becomes the debate topic. If left empty, debaters choose when they arrive.

---

## AS5. Ranked checkbox

**Short:** Make this a Ranked debate.

**Long:** If checked, the debate affects both debaters' Elo ratings.

---

## AS6. Ruleset picker

**Short:** Choose Amplified or Unplugged.

**Long:** Same choice as Screen AB.

---

## AS7. ⚔️ CREATE & GET CODE button

**Short:** Create the debate and get a join code.

**Long:** Creates the debate in the database via create_mod_debate RPC. Returns a 6-character join code. You share this code with two debaters who enter it in the lobby (O6) to join.

---

# Screen AT — Arena Mod Waiting Room (Mod side)

You've created a mod-initiated debate. Waiting for debaters to join.

---

## AT1. Join code display

**Short:** The code debaters need to enter to join your debate.

**Long:** Displayed prominently. Copy and share this code with the two people you want to debate. The code is unique to this specific debate.

---

## AT2. Debater slot status

**Short:** Shows whether Debater A and Debater B have joined yet.

**Long:** Display only. Updates in real time as debaters join. The debate starts when both slots are filled.

---

## AT3. CANCEL button

**Short:** Cancel the debate and close the lobby.

**Long:** Calls cancel_mod_debate RPC. The join code becomes invalid. Any debater who already joined is removed.

---

# Screen AU — Arena Mod Waiting Room (Debater side)

You've joined a mod-initiated debate via join code. Waiting for the other debater.

---

## AU1. Waiting status display

**Short:** Shows that you've joined and are waiting for the other debater.

**Long:** Display only. Shows the moderator's name, the debate topic (if set), and the status of the other debater slot.

---

## AU2. LEAVE button

**Short:** Leave the debate before it starts.

**Long:** Removes you from the debate. Your slot opens up for someone else.

---

# Screen AV — Notification Panel (overlay)

All your notifications in one panel, with category filters.

---

## AV1. Mark all read button

**Short:** Mark every notification as read.

**Long:** Clears the unread count on the bell icon. The notifications stay in the list — they're just no longer highlighted as unread.

---

## AV2. ✕ Close button

**Short:** Close the notification panel.

**Long:** Returns to whatever screen you were on.

---

## AV3. All filter pill

**Short:** Show all notifications.

**Long:** Default view. Shows everything regardless of category.

---

## AV4. ⚔️ Challenges filter pill

**Short:** Show only challenge-related notifications.

**Long:** Filters to show incoming challenges, challenge acceptances/declines, and challenge results.

---

## AV5. 🏆 Results filter pill

**Short:** Show only debate result notifications.

**Long:** Filters to show debate outcomes, scores, and Elo changes.

---

## AV6. 🔥 Reactions filter pill

**Short:** Show only reaction notifications.

**Long:** Filters to show when people react to your hot takes.

---

## AV7. 🪙 Economy filter pill

**Short:** Show only token-related notifications.

**Long:** Filters to show token earnings, stake payouts, milestone completions, and other economy activity.

---

## AV8. Individual notification rows

**Short:** Tap a notification to navigate to the related content.

**Long:** Each notification is tappable and navigates to the relevant screen — a challenge takes you to the arena, a reaction takes you to the hot take, a result takes you to the post-debate screen, etc.

---

## AV9. Backdrop tap to close

**Short:** Tap outside the panel to dismiss it.

**Long:** Same as AV2.

---

# Screen AW — User Avatar Dropdown (overlay)

Quick-access menu from the header avatar.

---

## AW1. 👥 Groups link

**Short:** Go to the Groups page.

**Long:** Navigates to moderator-groups.html.

---

## AW2. ⚙️ Settings link

**Short:** Go to Settings.

**Long:** Navigates to moderator-settings.html.

---

## AW3. 📊 Complete Profile link

**Short:** Go to the Profile Questionnaire.

**Long:** Navigates to moderator-profile-depth.html.

---

## AW4. 🚪 Log Out button

**Short:** Sign out.

**Long:** Same as U23. Clears session, stops all polling, redirects to login.

---

# Screen AX — Avatar Selection Sheet (overlay)

Choose your avatar from a grid of options.

---

## AX1. Avatar grid

**Short:** Tap an avatar to select it as your profile picture.

**Long:** Grid of available avatars. Tapping one immediately sets it as your avatar across the entire app — profile, header, debate rooms, leaderboards.

---

## AX2. Tap backdrop to close

**Short:** Dismiss the avatar picker.

**Long:** Closes without changing your avatar.

---

# Screen AY — Follow/Following List (overlay)

See who follows you or who you follow.

---

## AY1. User rows

**Short:** Tap a user to view their profile.

**Long:** Each row shows username, avatar, and a follow/unfollow button. Tapping the name/avatar navigates to their profile.

---

## AY2. Follow/Unfollow button

**Short:** Follow or unfollow this user.

**Long:** Toggle. Following a user means you get notifications about their activity (if follow notifications are enabled in settings). Mutual follows have no special mechanic currently.

---

## AY3. Tap backdrop to close

**Short:** Dismiss the list.

**Long:** Returns to the profile screen.

---

# Screen AZ — Challenge Modal (from hot takes feed)

Issue a debate challenge in response to someone's hot take.

---

## AZ1. Challenge response textarea

**Short:** Write your challenge message — your counter-argument to their hot take.

**Long:** This is your opening salvo. Write why you disagree with their hot take. This text is sent as the challenge invitation. If they accept, this becomes the framing for the debate.

---

## AZ2. CANCEL button

**Short:** Cancel the challenge.

**Long:** Dismisses the modal without sending anything.

---

## AZ3. ⚔️ BET. submit button

**Short:** Send the challenge.

**Long:** Sends a challenge notification to the hot take author. They can accept or decline. If accepted, both of you enter the arena for a debate on the topic.

---

## AZ4. Tap backdrop to close

**Short:** Dismiss without sending.

**Long:** Same as AZ2.

---

# Screen BA — Prediction Creation Modal

Create a new prediction market for others to wager on.

---

## BA1. Topic textarea (200 char max)

**Short:** What's the prediction about?

**Long:** Define the question or event people will predict. Example: "Who will win the presidential debate tonight?" or "Will the Lakers beat the Celtics on Friday?"

---

## BA2. Side A text input (50 char max)

**Short:** Name the first option.

**Long:** Label for Side A of the prediction. Example: "Biden wins" or "Lakers."

---

## BA3. Side B text input (50 char max)

**Short:** Name the second option.

**Long:** Label for Side B. Example: "Trump wins" or "Celtics."

---

## BA4. CANCEL button

**Short:** Cancel without creating.

**Long:** Dismisses the modal.

---

## BA5. POST button

**Short:** Create the prediction and post it to the feed.

**Long:** The prediction goes live immediately. Other users can see it in the feed and start wagering tokens on Side A or Side B.

---

# Screen BB — Mod Request Modal (debater requests a moderator)

A moderator has been assigned to your debate and is being asked to confirm.

---

## BB1. ACCEPT button

**Short:** Accept the moderation assignment.

**Long:** Confirms you'll moderate this debate. You enter the debate room in moderator mode with scoring controls.

---

## BB2. DECLINE button

**Short:** Decline the moderation request.

**Long:** Passes on this debate. Another moderator will be sought.

---

## BB3. 30-second countdown

**Short:** Time remaining to accept or decline.

**Long:** Display only. If the timer hits zero, the request is automatically declined and the system moves to the next available moderator.

---

# Screen BC — Mod Scoring Panel (within debate room)

The interface for rating debaters and moderators during and after debates.

---

## BC1. 👍 FAIR button (debater view)

**Short:** Rate the moderator as fair.

**Long:** After the debate, debaters rate the moderator's performance. This affects the moderator's approval percentage (mod_approval_pct). Fair ratings increase it, unfair ratings decrease it.

---

## BC2. 👎 UNFAIR button (debater view)

**Short:** Rate the moderator as unfair.

**Long:** Negative feedback on the moderator. The moderator's approval percentage is recalculated. Consistently unfair moderators will have low approval and be less visible in the Mod Queue.

---

## BC3. Score slider 1-50 (spectator view)

**Short:** Rate the moderator's performance on a 1-50 scale.

**Long:** Spectators get a more granular scoring tool than debaters. The slider lets you rate the moderator's objectivity, timing, and overall moderation quality.

---

## BC4. SUBMIT SCORE button

**Short:** Submit your moderator rating.

**Long:** Sends your score to the score_moderator RPC. Each user can only rate once per debate.

---

# Screen BD — Reference Form (within debate room)

Cite evidence during a debate to strengthen your argument.

---

## BD1. Reference URL input

**Short:** Paste the URL of your evidence source.

**Long:** If you have a reference in your arsenal, the URL auto-fills. Otherwise, paste any URL here. The source is visible to your opponent, the moderator, and spectators.

---

## BD2. Reference description textarea (500 char max)

**Short:** Explain what this source proves.

**Long:** Describe how this reference supports your argument. 500 character max. This appears alongside the URL in the debate feed.

---

## BD3. Supports Side A button

**Short:** This reference supports Side A's position.

**Long:** Tags the reference with the side it supports. The moderator and spectators can see which side each reference is intended to back.

---

## BD4. Supports Side B button

**Short:** This reference supports Side B's position.

**Long:** Same as BD3 for the other side.

---

## BD5. SUBMIT EVIDENCE button

**Short:** Add this reference to the debate.

**Long:** Submits the reference. It appears in the debate feed as a cited source. The opponent can challenge it, and the moderator can rule on its validity.

---

## BD6. ✕ Cancel button

**Short:** Close the reference form without submitting.

**Long:** Returns to the debate room.

---

# Screen BE — Ruling Panel (moderator rules on a reference)

Moderator-only overlay for judging submitted references. Details are in arena-mod-refs.ts.

---

(Internal moderator tool — details documented in code.)

---

# Screen BF — Transcript Overlay (post-debate)

Full record of the debate.

---

## BF1. Full transcript display

**Short:** Scrollable text of the entire debate.

**Long:** Every argument from both sides, in order, with round markers. For text debates, this is the raw text. For voice memo debates, this may include transcriptions. Useful for reviewing what was said and learning from the exchange.

---

## BF2. Tap backdrop to close

**Short:** Dismiss the transcript.

**Long:** Returns to the post-debate screen.

---

# Screen BG — Delete Account Modal (from Settings)

Permanent account deletion. This is destructive and irreversible.

---

## BG1. Type DELETE text input

**Short:** Type the word "DELETE" to confirm you want to delete your account.

**Long:** Safety measure. The delete button won't activate until you type exactly "DELETE" in this field. Prevents accidental account deletion.

---

## BG2. CANCEL button

**Short:** Cancel — keep your account.

**Long:** Dismisses the modal. Nothing happens.

---

## BG3. DELETE confirm button

**Short:** Permanently delete your account.

**Long:** Disabled until "DELETE" is typed in BG1. Once confirmed, your account and all associated data are removed. This cannot be undone. Tokens, cosmetics, debate history, profile — all gone.

---

## BG4. Tap backdrop to close

**Short:** Dismiss without deleting.

**Long:** Same as BG2.

---

# Screen BH — Create Group Modal (from Groups lobby)

Create a new group.

---

## BH1. Group name input (50 char max)

**Short:** Name your group.

**Long:** The group name is visible in the Groups lobby, rankings, and search. 50 character max. Must be unique (the system may reject duplicate names).

---

## BH2. Group description textarea

**Short:** Describe what your group is about.

**Long:** Free text description. Visible to anyone browsing groups in the Discover tab. Explain the group's focus, rules, or vibe.

---

## BH3. Group category select dropdown

**Short:** Pick the primary category for your group.

**Long:** Determines where the group appears in category-filtered views. Should match the group's main debate focus area.

---

## BH4. CREATE GROUP button

**Short:** Create the group.

**Long:** Submits the group to the database. You automatically become the group's Leader. The group is immediately visible in the Discover tab for other users to find and join.

---

# Screen BI — GvG Challenge Modal (from Group detail)

Challenge another group to a Group vs Group battle.

---

## BI1. Opponent search input (100 char max)

**Short:** Search for a group to challenge.

**Long:** Type the name of the group you want to challenge. Live search results appear below.

---

## BI2. Opponent search results

**Short:** Tap a group to select them as your opponent.

**Long:** Shows matching groups as you type. Tapping selects the group as your opponent for this challenge.

---

## BI3. Clear selected opponent button (✕)

**Short:** Deselect the chosen opponent group.

**Long:** Clears the selection so you can search for a different group.

---

## BI4. Selected opponent display

**Short:** Shows which group you've selected to challenge.

**Long:** Display only. Confirms the opponent group name and basic info.

---

## BI5. Topic text input (200 char max)

**Short:** Set the debate topic for this GvG battle.

**Long:** Define what the groups will debate about. Both groups see this topic before accepting.

---

## BI6. Category select dropdown

**Short:** Pick the category for this GvG debate.

**Long:** Should match the topic. Determines scoring and categorization.

---

## BI7. Format pills — 1v1 / 3v3 / 5v5

**Short:** Choose how many members debate from each group.

**Long:** 1v1 means one debater from each group. 3v3 means three from each. 5v5 means five. The group leader selects which members participate after the challenge is accepted.

---

## BI8. SEND CHALLENGE ⚔️ button

**Short:** Send the GvG challenge to the opponent group.

**Long:** The challenge notification goes to the opponent group's Leaders and Co-Leaders. They can accept or decline (Screen W9/W10). If accepted, the GvG battle is on.

---

## BI9. ✕ Close button

**Short:** Close the modal without sending a challenge.

**Long:** Dismisses the modal. Nothing is sent.

---

## BI10. Backdrop tap to close

**Short:** Tap outside to dismiss.

**Long:** Same as BI9.

---

**End of User Guide — 61 screens, ~340 elements documented.**
