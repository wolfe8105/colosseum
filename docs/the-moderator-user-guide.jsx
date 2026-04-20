import { useState, useEffect, useRef } from "react";

// ─── ALL 61 SCREENS DATA ───
const SCREENS = [
  {
    id: "A", route: "/go", title: "/go Setup", subtitle: "Guest AI Sparring",
    heroTag: "The first thing you see.",
    heroDesc: "This is the top of the funnel. Every Reddit link, every Discord post, every share card points here. No signup. No login. The whole point is to get someone debating within 10 seconds.",
    intro: "First screen a new user sees at themoderator.app/go. No account needed.",
    emoji: "🚀",
    elements: [
      { id: "A1", name: "Logo link", type: "link", loc: "Top-left corner",
        short: "Tapping the logo takes you to the main app homepage.",
        long: "This is the escape hatch. If someone lands on /go but already has an account, or wants to explore the full app first, the logo gets them to the main site. For a brand-new visitor, they'll almost never tap this — the setup screen is designed to pull them straight into a debate." },
      { id: "A2", name: "Topic text input", type: "input", loc: "First input card",
        short: "Type what you want to debate about.",
        long: "The single most important element on the screen. Type any topic — political, sports, personal opinion, anything. 200-character limit. Nothing happens until this field has at least 3 characters — the Start Debating button stays locked until then. No topic validation, no restrictions." },
      { id: "A3", name: "👍 For button", type: "button", loc: "Second input card (left)",
        short: "Pick the \"For\" side of whatever topic you typed.",
        long: "The debate is structured as For vs. Against. This means \"I'm arguing in favor of the topic I typed.\" You must pick a side before the debate can start. Only one side active at a time — tapping Against deselects For. The AI always takes the opposite side." },
      { id: "A4", name: "👎 Against button", type: "button", loc: "Second input card (right)",
        short: "Pick the \"Against\" side of whatever topic you typed.",
        long: "Same as For but for the opposing position. If the topic is \"US airstrikes on Iran are justified\" and you tap Against, you're arguing they are NOT justified. The AI takes the For side." },
      { id: "A5", name: "Start Debating button", type: "button", loc: "Bottom of screen",
        short: "Launches the debate — takes you to the debate room (Screen B).",
        long: "Locked until two conditions are met: topic has at least 3 characters, AND a side is selected. Tapping transitions to Screen B where round 1 begins immediately. This is a one-way door — no going back to change your topic or side." }
    ]
  },
  {
    id: "B", route: "/go", title: "/go Debate Room", subtitle: "AI Debate",
    heroTag: "Where you fight.",
    heroDesc: "Three rounds. You vs. the AI. Type your argument or speak it — then hit send and see how you scored. The AI judges every response on Logic, Evidence, Delivery, and Rebuttal.",
    intro: "The actual AI debate. Three rounds, alternating turns. After round 3, transition to Verdict (Screen C).",
    emoji: "⚔️",
    elements: [
      { id: "B1", name: "Chat area", type: "display", loc: "Main content area",
        short: "Scrollable conversation feed showing your arguments and the AI's responses.",
        long: "Read-only display. Arguments appear as chat bubbles — yours on one side, AI's on the other. Round numbers shown between exchanges. Includes AI's scoring commentary after each round. Nothing tappable — purely for reading." },
      { id: "B2", name: "Text input textarea", type: "input", loc: "Bottom input bar (left)",
        short: "Type your argument for the current round.",
        long: "Where you write your response to the AI. No character limit, but shorter focused arguments score better. Send button activates when you start typing. You can use the mic button (B3) instead — speech-to-text fills this field. One submission per round." },
      { id: "B3", name: "🎙️ Mic button", type: "button", loc: "Bottom input bar (center)",
        short: "Tap to start speech recognition — your voice becomes text.",
        long: "Uses your device's built-in speech recognition. Tap once to start listening, tap again to stop. Transcribed text appears in the text input (B2) and you can edit before sending. Debating out loud feels more natural than typing, especially on mobile." },
      { id: "B4", name: "➤ Send button", type: "button", loc: "Bottom input bar (right)",
        short: "Submit your argument for this round.",
        long: "Disabled until you've typed something. Your argument goes to the AI via Groq API. The AI scores on 4 criteria (Logic, Evidence, Delivery, Rebuttal), then crafts its counter-argument. No undo. After the final round, triggers transition to Verdict (Screen C)." },
      { id: "B5", name: "⚡ Sign Up Free — Debate Real People", type: "link", loc: "Above input bar",
        short: "CTA link that appears after round 1 — leads to signup page.",
        long: "The conversion funnel. Appears as a persistent banner after round 1. Plants the idea: \"This AI debate is fun, but imagine doing this against a real person.\" Doesn't interrupt the debate. One of three signup CTAs across /go (B5, C2, C4)." }
    ]
  },
  {
    id: "C", route: "/go", title: "/go Verdict", subtitle: "Scorecard",
    heroTag: "The verdict.",
    heroDesc: "You debated. The AI judged. Here's your scorecard — and the fork in the road. Sign up to debate real people, or go again with a new topic.",
    intro: "Final scorecard after a 3-round AI debate. Shows performance and conversion CTAs.",
    emoji: "🏆",
    elements: [
      { id: "C1", name: "Score grid", type: "display", loc: "Center of screen",
        short: "Your final scores across Logic, Evidence, Delivery, and Rebuttal.",
        long: "A 2x2 grid showing your score in each of the four debate criteria. Based on AI evaluation across all 3 rounds. Display-only. Scores generated by Groq in real time. Overall score above the grid is the average. Purpose: something concrete to screenshot and share." },
      { id: "C2", name: "⚡ Sign Up — Debate Real People", type: "button", loc: "Below score grid",
        short: "Large call-to-action button linking to the signup page.",
        long: "The most prominent signup CTA in the entire /go flow. Appears right after the complete debate experience when engagement is highest. Large, orange, pulsing. Leads to Plinko signup. Positioned right after the dopamine hit of getting your score." },
      { id: "C3", name: "↻ Debate Another Topic", type: "button", loc: "Below signup CTA",
        short: "Start over with a new topic — goes back to Screen A.",
        long: "Resets the entire /go experience. No history, no saved transcripts, no persistence. Back to empty topic field, no side selected. For users not ready to sign up but want to keep debating. Every additional debate increases conversion chance." },
      { id: "C4", name: "The Moderator footer link", type: "link", loc: "Bottom of screen",
        short: "Small footer link to the main app homepage.",
        long: "Same destination as the logo link (A1). A secondary, low-pressure way to explore the full app without committing to signup." }
    ]
  },
  {
    id: "D", route: "/verdict", title: "/verdict Auto-Debate", subtitle: "AI vs AI",
    heroTag: "The bait.",
    heroDesc: "AI vs AI. Auto-generated debates shared across social media. Visitors vote, share, and get funneled toward signup. No login required.",
    intro: "Public landing page showing a completed AI vs AI debate. Bot army creates and shares these.",
    emoji: "🎣",
    elements: [
      { id: "D1", name: "Logo link", type: "link", loc: "Top-left", short: "Takes you to the app homepage.", long: "For unauthenticated visitors, goes to main site where they'll be prompted to log in or sign up. For authenticated users, goes straight to home feed." },
      { id: "D2", name: "JOIN FREE link", type: "link", loc: "Top-right", short: "Signup CTA — leads to Plinko registration.", long: "Prominent link in top navigation. Converting spectators into participants — \"you just watched two AIs debate, now come do it yourself.\"" },
      { id: "D3", name: "Category pill link", type: "link", loc: "Below top bar", short: "Tapping the category takes you to home feed filtered by that category.", long: "Every auto-debate tagged with a category. Tapping navigates to main app home feed pre-filtered. For unauthenticated users, hits login page first. Category carries through." },
      { id: "D4", name: "Side A label link", type: "link", loc: "Left side card", short: "Tapping Side A text navigates to home filtered by category.", long: "Same navigation as D3. Secondary tap target — side labels are large and prominent, giving users another path into the app." },
      { id: "D5", name: "Side B label link", type: "link", loc: "Right side card", short: "Same as D4 but for Side B.", long: "Identical behavior. Both side labels are tap targets." },
      { id: "D6", name: "Vote button Side A", type: "button", loc: "Left vote button", short: "Cast your vote for Side A (no login required).", long: "Core engagement mechanic for ungated pages. Anyone can vote. Intentionally ungated because it's the hook. Vote recorded, percentage bar updates real time. One vote per visitor via localStorage." },
      { id: "D7", name: "Vote button Side B", type: "button", loc: "Right vote button", short: "Cast your vote for Side B.", long: "Same as D6. Can't vote both sides or change once cast." },
      { id: "D8", name: "ENTER THE ARENA link", type: "link", loc: "Below voting", short: "Another signup CTA — leads to Plinko.", long: "Positioned after voting engagement. \"Enter the Arena\" frames signup as joining the action, not filling out a form." },
      { id: "D9", name: "📋 Copy Link share button", type: "button", loc: "Share row (left)", short: "Copies the debate URL to clipboard.", long: "One-tap sharing. The URL works for anyone — no login needed to view it." },
      { id: "D10", name: "𝕏 Share button", type: "button", loc: "Share row (center)", short: "Opens pre-filled tweet/post for X.", long: "Opens X's share intent with pre-composed message containing topic and URL. User can edit before posting. Every share is free distribution." },
      { id: "D11", name: "↗ Native share button", type: "button", loc: "Share row (right)", short: "Opens device native share sheet.", long: "Uses Web Share API. On mobile: SMS, WhatsApp, Telegram, email, etc. On desktop: simpler dialog or clipboard fallback." },
      { id: "D12", name: "More Debates cards", type: "link", loc: "Below share buttons", short: "Links to other AI vs AI debates.", long: "Cards for other auto-debates keep users on platform. Each links to another /verdict page. Based on recency and category." },
      { id: "D13", name: "Privacy Policy footer link", type: "link", loc: "Footer (left)", short: "Links to Privacy Policy.", long: "Standard legal compliance link." },
      { id: "D14", name: "Terms of Service footer link", type: "link", loc: "Footer (right)", short: "Links to Terms of Service.", long: "Standard legal compliance link." }
    ]
  },
  {
    id: "E", route: "/debate", title: "/debate Landing", subtitle: "Human Debate",
    heroTag: "Real people, real stakes.",
    heroDesc: "A public landing page for a specific human debate. Similar to auto-debates but for real user debates.",
    intro: "Public page for human debates. Visitors can vote, share, and get funneled to signup.",
    emoji: "🗣️",
    elements: [
      { id: "E1", name: "Logo link", type: "link", loc: "Top-left", short: "Takes you to the app homepage.", long: "Same behavior as D1." },
      { id: "E2", name: "JOIN FREE link", type: "link", loc: "Top-right", short: "Signup CTA — leads to Plinko.", long: "Same as D2. Visible to unauthenticated visitors only." },
      { id: "E3", name: "Category pill link", type: "link", loc: "Below top bar", short: "Tapping the category navigates to home filtered by that category.", long: "Same as D3." },
      { id: "E4", name: "Vote button Side A", type: "button", loc: "Left vote button", short: "Cast your vote for Side A.", long: "Same ungated voting mechanic as D6. Uses localStorage to prevent double-voting." },
      { id: "E5", name: "Vote button Side B", type: "button", loc: "Right vote button", short: "Cast your vote for Side B.", long: "Same as E4. One vote per visitor per debate." },
      { id: "E6", name: "📋 Copy Link share button", type: "button", loc: "Share row (left)", short: "Copies the debate URL to clipboard.", long: "Same as D9." },
      { id: "E7", name: "𝕏 Share button", type: "button", loc: "Share row (center)", short: "Share to X with pre-filled text.", long: "Same as D10." },
      { id: "E8", name: "↗ Share button", type: "button", loc: "Share row (right)", short: "Opens device native share sheet.", long: "Same as D11." },
      { id: "E9", name: "Settle YOUR debate link", type: "link", loc: "Below shares", short: "CTA encouraging visitors to start their own debate.", long: "Frames the action as \"you've just watched someone else's debate, now settle YOUR disagreement.\" Leads to main app home page." },
      { id: "E10", name: "Privacy Policy footer link", type: "link", loc: "Footer (left)", short: "Links to Privacy Policy.", long: "Standard legal compliance." },
      { id: "E11", name: "Terms of Service footer link", type: "link", loc: "Footer (right)", short: "Links to Terms of Service.", long: "Standard legal compliance." }
    ]
  },
  {
    id: "F", route: "/login", title: "/login Page", subtitle: "Authentication",
    heroTag: "The gate.",
    heroDesc: "Full authentication page. Login and signup via tabs. Supports Google OAuth, email/password, and password reset.",
    intro: "Handles both login and signup. Serves all users arriving without an active session.",
    emoji: "🔐",
    elements: [
      { id: "F1", name: "LOG IN tab", type: "button", loc: "Top tabs (left)", short: "Switches the form to login mode.", long: "Two modes — LOG IN and SIGN UP. LOG IN shows email/password plus Google OAuth. Tab state persists until manually switched." },
      { id: "F2", name: "SIGN UP tab", type: "button", loc: "Top tabs (right)", short: "Switches the form to signup mode.", long: "Shows registration form: username, email, password, DOB, and terms checkbox. Plinko flow (G-K) is the preferred signup path — this is a fallback." },
      { id: "F3", name: "Google OAuth button (login)", type: "button", loc: "OAuth section", short: "Sign in with your Google account.", long: "One-tap Google login. If previously created via Google, logs straight in. If new, creates account using Google profile. Fastest path into the app." },
      { id: "F4", name: "Apple OAuth button (login)", type: "button", loc: "OAuth section", short: "Sign in with your Apple ID.", long: "Apple's equivalent of Google OAuth. Visible on login page. May not be fully wired yet — Google is primary." },
      { id: "F5", name: "\"Use email instead\" toggle (login)", type: "toggle", loc: "Below OAuth", short: "Reveals email and password fields.", long: "Login form leads with OAuth buttons. Tapping this expands email/password fields for users who signed up manually." },
      { id: "F6", name: "Email input (login)", type: "input", loc: "Login form", short: "Enter the email you registered with.", long: "Must match an existing account. Basic email format validation." },
      { id: "F7", name: "Password input (login)", type: "input", loc: "Login form", short: "Enter your password.", long: "Hidden characters. Use \"Forgot password?\" (F8) if forgotten." },
      { id: "F8", name: "Forgot password? link", type: "link", loc: "Below password", short: "Opens the password reset flow.", long: "Shows modal for email entry. App sends reset email via Resend from noreply@themoderator.app." },
      { id: "F9", name: "ENTER THE ARENA submit (login)", type: "button", loc: "Bottom of login form", short: "Submit your login credentials.", long: "Sends email/password to Supabase Auth. Success → home feed. Failure → error message." },
      { id: "F10", name: "Google OAuth button (signup)", type: "button", loc: "Signup OAuth section", short: "Create account using Google.", long: "Same as F3 in signup context. Creates account, still needs profile completion on first login." },
      { id: "F11", name: "Apple OAuth button (signup)", type: "button", loc: "Signup OAuth section", short: "Create account using Apple ID.", long: "Same as F4 in signup context." },
      { id: "F12", name: "\"Use email instead\" toggle (signup)", type: "toggle", loc: "Below signup OAuth", short: "Reveals manual signup form fields.", long: "Expands to show username, email, password, DOB, and terms checkbox." },
      { id: "F13", name: "Username input (signup)", type: "input", loc: "Signup form", short: "Choose your username (3-20 chars).", long: "Your identity on the platform. Shows on leaderboards, debate rooms, challenge links, profile URLs. Must be unique." },
      { id: "F14", name: "Email input (signup)", type: "input", loc: "Signup form", short: "Enter your email for account creation.", long: "Login credential and password reset destination. SMTP confirmed via Resend." },
      { id: "F15", name: "Password input (signup)", type: "input", loc: "Signup form", short: "Create a password.", long: "Supabase enforces minimum requirements. Leaked password protection enabled (HaveIBeenPwned)." },
      { id: "F16", name: "DOB month select", type: "input", loc: "DOB section", short: "Select your birth month.", long: "Part of age gate. DOB stripped from JWT metadata by database trigger for privacy." },
      { id: "F17", name: "DOB day select", type: "input", loc: "DOB section", short: "Select your birth day.", long: "Part of DOB age gate." },
      { id: "F18", name: "DOB year select", type: "input", loc: "DOB section", short: "Select your birth year.", long: "Completes age verification. Below minimum age blocks creation." },
      { id: "F19", name: "Terms checkbox + link", type: "toggle", loc: "Below DOB", short: "Must agree to Terms to create account.", long: "Mandatory. CREATE ACCOUNT button won't work until checked. Link opens /terms." },
      { id: "F20", name: "CREATE ACCOUNT submit", type: "button", loc: "Bottom of signup form", short: "Submit signup form to create account.", long: "Requires all fields + Terms checked. Sends to Supabase Auth, fires handle_new_user trigger, logs you in." },
      { id: "F21", name: "Terms footer link", type: "link", loc: "Footer", short: "Links to Terms of Service.", long: "Standard legal footer." },
      { id: "F22", name: "Privacy footer link", type: "link", loc: "Footer", short: "Links to Privacy Policy.", long: "Standard legal footer." },
      { id: "F23", name: "Reset password email input (modal)", type: "input", loc: "Modal", short: "Enter email for password reset link.", long: "Appears after tapping F8. Reset email sent via Resend. System shows success even for unknown emails to prevent enumeration." },
      { id: "F24", name: "Reset password cancel (modal)", type: "button", loc: "Modal", short: "Close reset modal without sending.", long: "Dismisses modal, returns to login form." },
      { id: "F25", name: "New password input (modal)", type: "input", loc: "Reset modal", short: "Enter new password after clicking reset link.", long: "Appears when arriving via password reset link. Must meet Supabase requirements." },
      { id: "F26", name: "Confirm password input (modal)", type: "input", loc: "Reset modal", short: "Re-type new password to confirm.", long: "Must match F25 exactly. Prevents typos." },
      { id: "F27", name: "Privacy Policy footer link", type: "link", loc: "Footer", short: "Links to Privacy Policy.", long: "Duplicate of F22 in different section." },
      { id: "F28", name: "Terms of Service footer link", type: "link", loc: "Footer", short: "Links to Terms of Service.", long: "Duplicate of F21 in different section." }
    ]
  },
  { id: "G", route: "/plinko", title: "Plinko Step 1", subtitle: "OAuth/Email", heroTag: "Step one.", heroDesc: "The preferred signup path — more guided than /login. Starts with authentication.", intro: "First step of Plinko registration funnel.", emoji: "1️⃣",
    elements: [
      { id: "G1", name: "Google OAuth button", type: "button", loc: "Top of form", short: "Create account or sign in with Google.", long: "Fastest path. If existing account, logs in and skips to app. If new, creates account and moves to Step 2." },
      { id: "G2", name: "Apple OAuth button (hidden)", type: "button", loc: "Hidden", short: "Apple sign-in — currently hidden.", long: "Exists in HTML but display:none. Not offered in Plinko flow yet." },
      { id: "G3", name: "\"Use email instead\" toggle", type: "toggle", loc: "Below OAuth", short: "Show email/password fields.", long: "Same pattern as login page. Expands for manual signup." },
      { id: "G4", name: "Email input", type: "input", loc: "Form", short: "Enter your email.", long: "For account creation. Same as F14." },
      { id: "G5", name: "Password input", type: "input", loc: "Form", short: "Create a password.", long: "Same as F15." },
      { id: "G6", name: "Progress bar", type: "display", loc: "Top/bottom", short: "Shows which step of the 5-step process you're on.", long: "Not interactive — purely visual. Shows 5 dots with current step highlighted." }
    ]
  },
  { id: "H", route: "/plinko", title: "Plinko Step 2", subtitle: "Age Gate", heroTag: "How old are you?", heroDesc: "Date of birth collection and terms acceptance. Required before account creation.", intro: "DOB and terms acceptance.", emoji: "2️⃣",
    elements: [
      { id: "H1", name: "DOB month select", type: "input", loc: "DOB section", short: "Select your birth month.", long: "Part of age verification gate." },
      { id: "H2", name: "DOB day select", type: "input", loc: "DOB section", short: "Select your birth day.", long: "Part of age verification." },
      { id: "H3", name: "DOB year select", type: "input", loc: "DOB section", short: "Select your birth year.", long: "Completes age check. Below minimum blocks signup." },
      { id: "H4", name: "Terms checkbox + link", type: "toggle", loc: "Below DOB", short: "Agree to Terms before continuing.", long: "Same as F19. Mandatory. CONTINUE button won't activate without it." },
      { id: "H5", name: "CONTINUE button", type: "button", loc: "Bottom", short: "Proceed to Step 3 (Username).", long: "Requires DOB filled and Terms checked. Validates age, advances." }
    ]
  },
  { id: "I", route: "/plinko", title: "Plinko Step 3", subtitle: "Username", heroTag: "Who are you?", heroDesc: "Choose your identity in the app. This is where you become a real user.", intro: "Username and display name selection.", emoji: "3️⃣",
    elements: [
      { id: "I1", name: "Username input (3-20 chars)", type: "input", loc: "Form", short: "Pick your unique username.", long: "Your identity on the platform. Shows on leaderboards, debate rooms, challenge links, profile URLs. Must be unique. 3-20 characters." },
      { id: "I2", name: "Display name input (40 chars)", type: "input", loc: "Form", short: "Set your display name.", long: "Different from username. Username is permanent (URLs, @mentions). Display name is what appears in the UI. Changeable later in settings." },
      { id: "I3", name: "CREATE ACCOUNT button", type: "button", loc: "Bottom", short: "Create your account and proceed to Step 4.", long: "Point of no return for account creation. Submits username + display name + auth credentials + DOB. Account created in Supabase, handle_new_user trigger fires." }
    ]
  },
  { id: "J", route: "/plinko", title: "Plinko Step 4", subtitle: "Moderator Opt-In", heroTag: "Will you judge?", heroDesc: "Introduces users to the moderator role. Completely optional, can be skipped.", intro: "Moderator opt-in step.", emoji: "4️⃣",
    elements: [
      { id: "J1", name: "ENABLE MODERATOR MODE button", type: "button", loc: "Center", short: "Opt in to be a moderator.", long: "Moderators volunteer to judge live debates. Sets is_moderator=true, makes you visible in Mod Queue. Comes with its own scoring system. Can toggle later in Settings." },
      { id: "J2", name: "SKIP FOR NOW button", type: "button", loc: "Below", short: "Skip moderator opt-in.", long: "No penalty. Enable later from Settings (U10). App nudges you about it later." }
    ]
  },
  { id: "K", route: "/plinko", title: "Plinko Step 5", subtitle: "Done", heroTag: "You're in.", heroDesc: "Registration complete. One button to enter the app.", intro: "Final step. Welcome to The Moderator.", emoji: "5️⃣",
    elements: [
      { id: "K1", name: "ENTER THE MODERATOR button", type: "button", loc: "Center", short: "Enter the app — takes you to the home feed.", long: "Navigates to index.html. You land on the home feed (Screen N) with the full app available. Your account is live." }
    ]
  },
  { id: "L", route: "/terms", title: "/terms", subtitle: "Terms of Service", heroTag: "The fine print.", heroDesc: "Legal page with tabbed content.", intro: "Terms, Privacy Policy, and Community Guidelines in tabs.", emoji: "📜",
    elements: [
      { id: "L1", name: "← Back link", type: "link", loc: "Top-left", short: "Go back to the previous page.", long: "Uses browser history. Adapts to wherever you came from." },
      { id: "L2", name: "TERMS OF SERVICE tab", type: "button", loc: "Tab bar", short: "Show the Terms content.", long: "Active by default. Main legal agreement." },
      { id: "L3", name: "PRIVACY POLICY tab", type: "button", loc: "Tab bar", short: "Switch to Privacy Policy.", long: "Shows privacy policy without navigating to separate page." },
      { id: "L4", name: "COMMUNITY GUIDELINES tab", type: "button", loc: "Tab bar", short: "Switch to Community Guidelines.", long: "Shows community rules and behavior expectations." }
    ]
  },
  { id: "M", route: "/privacy", title: "/privacy", subtitle: "Privacy Policy", heroTag: "Your data.", heroDesc: "Static legal page. No interactive elements.", intro: "Read-only privacy policy page.", emoji: "🔒",
    elements: []
  },
  { id: "N", route: "/home", title: "Home Feed", subtitle: "Main Screen", heroTag: "Home base.", heroDesc: "Where users spend most of their time. Hot takes, predictions, live debates, and the composer for new content.", intro: "Main screen of the app. Global header and bottom nav persist across N through S.", emoji: "🏠",
    elements: [
      { id: "N1", name: "🪙 Token display", type: "display", loc: "Header (left)", short: "Shows your current token balance. Tap for details.", long: "Tokens are in-app currency. Earned by completing profile, winning debates, milestones, daily logins. Spent on power-ups, staking, predictions. Orange dot indicates unclaimed opportunities." },
      { id: "N2", name: "🔔 Notification bell", type: "button", loc: "Header (center-right)", short: "Opens the Notification Panel (Screen AV).", long: "Badge count of unread notifications. Polls every 30 seconds. Challenges, debate results, follower activity, reactions, token rewards." },
      { id: "N3", name: "Avatar button", type: "button", loc: "Header (right)", short: "Opens User Dropdown (Screen AW).", long: "Shows your avatar. Dropdown has quick links to Groups, Settings, Complete Profile, Log Out." },
      { id: "N4", name: "☰ Feed tab", type: "button", loc: "Bottom nav", short: "Go to Home Feed (this screen).", long: "Main content feed. Hot takes, live debate cards, predictions. Default landing after login." },
      { id: "N5", name: "⚔ Arena tab", type: "button", loc: "Bottom nav", short: "Go to Arena Lobby (Screen O).", long: "Where debates happen. Matchmaking, private debates, spectator feeds, power-up shop." },
      { id: "N6", name: "★ Ranks tab", type: "button", loc: "Bottom nav", short: "Go to Leaderboard (Screen R).", long: "Global rankings by Elo, wins, streak." },
      { id: "N7", name: "◉ Groups tab", type: "button", loc: "Bottom nav", short: "Go to Groups page.", long: "Navigates to separate page (moderator-groups.html)." },
      { id: "N8", name: "● Profile tab", type: "button", loc: "Bottom nav", short: "Go to your Profile (Screen P).", long: "View/edit profile, bio, avatar. Access settings, power-ups, arsenal, cosmetics." },
      { id: "N9", name: "Hot take cards", type: "display", loc: "Feed", short: "Tap to expand the full hot take.", long: "Short-form opinion posts. Show author name, avatar, text (truncated if long), action buttons. Seeds of debates — disagreements lead to challenges." },
      { id: "N10", name: "🔥 React button", type: "button", loc: "Hot take card", short: "Toggle your reaction on a hot take.", long: "One-tap reaction. \"This is fire\" / \"I agree\" signal. Tap once to react, again to unreact. Count visible to all. Contributes to feed visibility." },
      { id: "N11", name: "⚔️ BET. button", type: "button", loc: "Hot take card", short: "Challenge the author to a debate.", long: "Opens Challenge Modal (Screen AZ). Write a response and issue a formal challenge. If accepted, enter the arena. Primary way debates emerge organically — the \"emergence engine.\"" },
      { id: "N12", name: "↗ Share button", type: "button", loc: "Hot take card", short: "Share this hot take externally.", long: "Opens share options. Each shared link is a potential new user funnel." },
      { id: "N13", name: "🧑‍⚖️ Become a Moderator button", type: "button", loc: "Feed section", short: "Toggle moderator opt-in.", long: "If not a moderator: shows \"Become a Moderator\" for one-tap opt-in. If already: shows status. One of 5 moderator discovery touchpoints." },
      { id: "N14", name: "Author name/avatar", type: "link", loc: "Hot take card", short: "Tap to view the author's profile.", long: "Every hot take shows who posted it. Navigate to their public profile to follow, challenge, or check stats." },
      { id: "N15", name: "Live debate cards — Watch Live", type: "button", loc: "Feed", short: "Jump into a live debate as a spectator.", long: "Takes you to Spectator View (Screen X). Watch real time, chat with spectators, vote on who's winning." },
      { id: "N16", name: "Pull-to-refresh", type: "gesture", loc: "Top of feed", short: "Swipe down to refresh the feed.", long: "Standard mobile gesture. Refreshes hot takes, predictions, live debate listings." },
      { id: "N17", name: "Prediction — Side A pick", type: "button", loc: "Prediction card", short: "Predict Side A will win.", long: "Predictions are wagering markets. Pick a side and wager tokens. If your side wins, payout based on odds." },
      { id: "N18", name: "Prediction — Side B pick", type: "button", loc: "Prediction card", short: "Predict Side B will win.", long: "Same as N17 for other side. Predictions use text values ('a'/'b'). Wagers 1-500 tokens. Changing prediction refunds previous wager." },
      { id: "N19", name: "➕ CREATE PREDICTION", type: "button", loc: "Predictions section", short: "Create a new prediction market.", long: "Opens Prediction Creation Modal (Screen BA). Define topic, two sides, goes live in feed." },
      { id: "N20", name: "Wager amount input", type: "input", loc: "Wager picker", short: "Enter how many tokens to wager.", long: "Appears after selecting a side. 1-500 tokens. Balance checked client-side before submission." },
      { id: "N21", name: "Quick amount buttons", type: "button", loc: "Wager picker", short: "Preset wager amounts.", long: "Common wager values for fast betting." },
      { id: "N22", name: "CONFIRM WAGER button", type: "button", loc: "Wager picker", short: "Submit prediction and lock in wager.", long: "Tokens deducted immediately. Can change prediction before debate starts — get refund and pay net difference." },
      { id: "N23", name: "✕ Cancel wager", type: "button", loc: "Wager picker", short: "Close wager picker without betting.", long: "No tokens deducted. Can come back later while market is open." },
      { id: "N24", name: "Overlay tabs (HOT TAKES / PREDICTIONS)", type: "button", loc: "Composer overlay", short: "Switch between posting a hot take or creating a prediction.", long: "Composer has two modes. Toggle between them." },
      { id: "N25", name: "Hot take text input", type: "input", loc: "Composer overlay", short: "Write your hot take.", long: "Keep it punchy — best hot takes generate reactions and challenges." },
      { id: "N26", name: "POST button", type: "button", loc: "Composer overlay", short: "Publish your hot take.", long: "Appears in feed immediately. Others can react, challenge, or share. Can't be edited or deleted yet." },
      { id: "N27", name: "Close/swipe-down to dismiss", type: "gesture", loc: "Composer overlay", short: "Close the composer without posting.", long: "Swipe down or tap background. Any typed text is lost — no draft save." }
    ]
  },
  { id: "O", route: "/arena", title: "Arena Lobby", subtitle: "Debate Gateway", heroTag: "Choose your weapon.", heroDesc: "Gateway to all debate formats. Matchmaking, private debates, power-up shop, mod queue, or spectating.", intro: "The arena lobby — start debates, watch live, or shop for power-ups.", emoji: "🏟️",
    elements: [
      { id: "O1", name: "ENTER THE ARENA button", type: "button", loc: "Primary action", short: "Start matchmaking to find an opponent.", long: "Opens Ranked Picker (Screen AA). Choose Ranked/Casual, then mode, category, enter queue. Main path to live debates." },
      { id: "O2", name: "⚔️ PRIVATE DEBATE button", type: "button", loc: "Secondary action", short: "Create a private debate.", long: "Opens Private Lobby Picker (Screen AO). Challenge by username, restrict to group, or generate join code." },
      { id: "O3", name: "⚡ POWER-UPS button", type: "button", loc: "Lobby section", short: "Open Power-Up Shop (Screen AN).", long: "Single-use items bought with tokens. Extra time, score multipliers, etc." },
      { id: "O4", name: "🧑‍⚖️ MOD QUEUE button", type: "button", loc: "Lobby section", short: "View debates needing a moderator.", long: "Only visible if moderator mode enabled. Volunteer to moderate or CREATE DEBATE with join codes." },
      { id: "O5", name: "🧑‍⚖️ BECOME A MODERATOR", type: "button", loc: "Lobby section", short: "Enable moderator mode.", long: "Visible only if is_moderator is false. One-tap opt-in. MOD QUEUE button appears instead." },
      { id: "O6", name: "Join code text input", type: "input", loc: "Code section", short: "Enter a 6-character code to join a debate.", long: "Private lobbies and mod-initiated debates generate codes. 6 uppercase characters." },
      { id: "O7", name: "GO button", type: "button", loc: "Code section", short: "Submit join code and enter debate.", long: "Validates code against database. Invalid/expired → error." },
      { id: "O8", name: "Spectator feed — WATCH LIVE", type: "button", loc: "Feed section", short: "Watch an active debate as a spectator.", long: "Takes you to Spectator View (Screen X). Watch, chat, vote. Keeps arena feeling alive." },
      { id: "O9", name: "Challenge CTA", type: "display", loc: "Feed section", short: "Notification when a rival is online.", long: "If a declared rival is in the arena, this CTA appears: \"that no good SOB [username] is looking for a debate.\"" }
    ]
  },
  { id: "P", route: "/profile", title: "Profile", subtitle: "Your Page", heroTag: "This is you.", heroDesc: "View and edit your bio, avatar, stats. Access settings, power-ups, arsenal, and cosmetics.", intro: "Personal page. Others see a read-only version.", emoji: "👤",
    elements: [
      { id: "P1", name: "Avatar", type: "button", loc: "Top", short: "Tap to change your profile picture.", long: "Opens Avatar Selection Sheet (Screen AX). Pick from available grid. No custom upload." },
      { id: "P2", name: "Bio display", type: "display", loc: "Below avatar", short: "Tap to edit your bio.", long: "Free-text description visible on profile. Tap to switch to edit mode." },
      { id: "P3", name: "Bio textarea (500 chars)", type: "input", loc: "Edit mode", short: "Write or edit your bio.", long: "500-character bio. Visible to anyone. Has character counter (P4)." },
      { id: "P4", name: "Bio character count", type: "display", loc: "Edit mode", short: "Characters used out of 500.", long: "Display only. Updates as you type." },
      { id: "P5", name: "CANCEL bio button", type: "button", loc: "Edit mode", short: "Discard bio changes.", long: "Reverts to previous bio. No changes saved." },
      { id: "P6", name: "SAVE bio button", type: "button", loc: "Edit mode", short: "Save your updated bio.", long: "Saves via RPC. Double-tap guard prevents duplicate requests." },
      { id: "P7", name: "Followers count", type: "link", loc: "Stats row", short: "Tap to see who follows you.", long: "Opens Follow List (Screen AY). View followers, tap to visit profiles." },
      { id: "P8", name: "Following count", type: "link", loc: "Stats row", short: "Tap to see who you follow.", long: "Opens Follow List (Screen AY). Can unfollow from this list." },
      { id: "P9", name: "Profile depth bar", type: "link", loc: "Below stats", short: "Shows questionnaire completion percentage.", long: "20 sections, 100 questions. Completing sections earns tokens and unlocks tiers. Tap navigates to questionnaire (Screen T)." },
      { id: "P10", name: "📊 Complete Your Profile", type: "link", loc: "Below depth bar", short: "Go to Profile Questionnaire (Screen T).", long: "Same destination as P9. Full questionnaire across 20 categories." },
      { id: "P11", name: "⚙️ Settings link", type: "link", loc: "Action links", short: "Go to Settings (Screen U).", long: "Display name, notifications, moderator settings, dark mode, account management." },
      { id: "P12", name: "⚡ Power-Up Shop link", type: "link", loc: "Action links", short: "Go to Power-Up Shop.", long: "Same destination as O3." },
      { id: "P13", name: "⚔️ Reference Arsenal link", type: "link", loc: "Action links", short: "Go to Reference Arsenal (Screen S).", long: "Your library of saved references for citing during debates." },
      { id: "P14", name: "🛡️ Armory link", type: "link", loc: "Action links", short: "Go to Cosmetics (Screen Y).", long: "Browse and equip cosmetic items. Visual-only, no competitive advantage." },
      { id: "P15", name: "🔗 Share Profile", type: "button", loc: "Action links", short: "Share your public profile link.", long: "Generates shareable URL to /u/username." },
      { id: "P16", name: "📨 Invite a Friend", type: "button", loc: "Action links", short: "Send an invitation link.", long: "Generates invite link to signup flow." },
      { id: "P17", name: "Rivals feed section", type: "display", loc: "Bottom", short: "See your declared rivals.", long: "Up to 5 rivals. Tapping a rival's name → their profile. When rival is online, you get challenge notifications." }
    ]
  },
  { id: "Q", route: "/shop", title: "Shop / The Vault", subtitle: "Subscriptions", heroTag: "Coming soon.", heroDesc: "Subscription tier page. Payment system not yet live.", intro: "COMING SOON for all tiers — Stripe not yet integrated.", emoji: "💎",
    elements: [
      { id: "Q1", name: "CONTENDER tier — COMING SOON", type: "button", loc: "Tier 1", short: "First subscription tier — not yet available.", long: "Entry-level paid tier when Stripe goes live. Ad-free, custom themes, 30 tokens/day, priority matchmaking." },
      { id: "Q2", name: "CHAMPION tier — COMING SOON", type: "button", loc: "Tier 2", short: "Second tier — not yet available.", long: "Mid-tier. Everything in Contender plus exclusive cosmetics, private rooms, analytics." },
      { id: "Q3", name: "CREATOR tier — COMING SOON", type: "button", loc: "Tier 3", short: "Top tier — not yet available.", long: "Premium. Everything in Champion plus creator tools, overlays, revenue share, early access." }
    ]
  },
  { id: "R", route: "/leaderboard", title: "Leaderboard", subtitle: "Global Rankings", heroTag: "Who's the best?", heroDesc: "Global rankings by Elo, wins, and streak.", intro: "See the best debaters ranked by different metrics.", emoji: "🏅",
    elements: [
      { id: "R1", name: "ELO tab", type: "button", loc: "Tab bar", short: "Rank players by Elo rating.", long: "Skill-based rating. Only Ranked debate results affect Elo." },
      { id: "R2", name: "WINS tab", type: "button", loc: "Tab bar", short: "Rank by total win count.", long: "Pure volume metric regardless of skill rating." },
      { id: "R3", name: "🔥 STREAK tab", type: "button", loc: "Tab bar", short: "Rank by current win streak.", long: "Hottest run right now. Resets on any loss. Streak freezes protect from one loss." },
      { id: "R4", name: "Leaderboard rows", type: "link", loc: "List", short: "Tap any player to view their profile.", long: "Shows rank, username, avatar, stat. Navigate to public profile." },
      { id: "R5", name: "LOAD MORE button", type: "button", loc: "Bottom", short: "Load next batch of entries.", long: "Leaderboard loads in pages. Keep tapping to go deeper." },
      { id: "R6", name: "ELO explainer close (✕)", type: "button", loc: "Tooltip", short: "Dismiss the Elo explanation.", long: "Informational card about how Elo works. Close it." }
    ]
  },
  { id: "S", route: "/arsenal", title: "Arsenal / Reference Library", subtitle: "Evidence Toolkit", heroTag: "Your ammo.", heroDesc: "Forge references from real sources, organize by category, deploy during live debates.", intro: "Debate preparation toolkit. Forge, organize, and cite evidence.", emoji: "📚",
    elements: [
      { id: "S1", name: "← Back button", type: "link", loc: "Top-left", short: "Return to previous screen.", long: "Navigates back, typically to Profile." },
      { id: "S2", name: "My Arsenal tab", type: "button", loc: "Tab bar", short: "View references you've created.", long: "All your forged references. Each backed by a source URL." },
      { id: "S3", name: "Library tab", type: "button", loc: "Tab bar", short: "Browse references from all users.", long: "Public library of all references. Browse by category, add to your arsenal." },
      { id: "S4", name: "Forge new reference button", type: "button", loc: "Action area", short: "Start creating a new reference.", long: "Opens 5-step forge form. Creating is called \"forging\" — building verified evidence." },
      { id: "S5", name: "Forge Step 1 — Claim textarea (120 chars)", type: "input", loc: "Forge form", short: "Write a one-sentence claim your source proves.", long: "Core of the reference — a crisp 120-character statement. Not article title, not summary, but YOUR claim." },
      { id: "S6", name: "Forge Step 2 — Source URL input", type: "input", loc: "Forge form", short: "Paste the URL of your source.", long: "URL of article, study, report. Domain extracted and displayed for credibility." },
      { id: "S7", name: "Forge Step 3 — Author, Year, Source type", type: "input", loc: "Forge form", short: "Add source metadata.", long: "Author/org name, year, source type (academic, news, gov, etc.). Helps assess credibility." },
      { id: "S8", name: "Forge Step 4 — Category buttons", type: "button", loc: "Forge form", short: "Tag reference with a debate category.", long: "Politics, Sports, Entertainment, etc. Determines Library placement and debate relevance." },
      { id: "S9", name: "Forge Step 5 — Review + FORGE IT", type: "button", loc: "Forge form", short: "Review and submit your reference.", long: "Preview card with all details. FORGE IT submits to database. Appears in arsenal and public library." },
      { id: "S10", name: "Reference cards", type: "display", loc: "Arsenal list", short: "Tap to expand or edit.", long: "Card shows claim and source domain. Tap for full details. Can edit or delete yours." },
      { id: "S11", name: "Library search/browse", type: "input", loc: "Library tab", short: "Search or browse public references.", long: "Filter by category or search keywords. Useful for debate prep." }
    ]
  },
  { id: "T", route: "/profile-depth", title: "Profile Questionnaire", subtitle: "100 Questions", heroTag: "Tell us everything.", heroDesc: "100-question profile across 20 sections. Completing sections earns tokens and unlocks tiers.", intro: "Profile depth system. Feeds the B2B data product.", emoji: "📝",
    elements: [
      { id: "T1", name: "← Back link", type: "link", loc: "Top-left", short: "Go back to main app.", long: "Navigates to index.html. Unsaved progress in a section is lost." },
      { id: "T2", name: "Section tiles (20 sections)", type: "button", loc: "Grid", short: "Tap a section to open its questions.", long: "20 themed sections (Politics, Sports, Values, etc.). Each shows answered count. Complete in any order." },
      { id: "T3", name: "Text inputs (per question)", type: "input", loc: "Section view", short: "Type your answer.", long: "Free-text up to 500 chars. Open-ended opinion questions." },
      { id: "T4", name: "Slider inputs (per question)", type: "input", loc: "Section view", short: "Drag slider to indicate your position.", long: "Spectrum between two positions (e.g., Liberal ↔ Conservative)." },
      { id: "T5", name: "Select dropdowns (per question)", type: "input", loc: "Section view", short: "Choose from a dropdown.", long: "Multiple-choice with predefined options." },
      { id: "T6", name: "Chip/pill multi-select (per question)", type: "button", loc: "Section view", short: "Tap pills to select answers.", long: "Select multiple from pill-shaped buttons (e.g., sports you follow)." },
      { id: "T7", name: "SAVE & UNLOCK REWARD button", type: "button", loc: "Bottom of section", short: "Save answers and claim token reward.", long: "Records answers, updates profile depth, awards tokens. Each section claimable once. guard_profile_columns trigger protects." },
      { id: "T8", name: "Privacy Policy footer link", type: "link", loc: "Footer", short: "Links to Privacy Policy.", long: "Standard legal." },
      { id: "T9", name: "Terms of Service footer link", type: "link", loc: "Footer", short: "Links to Terms of Service.", long: "Standard legal." }
    ]
  },
  { id: "U", route: "/settings", title: "Settings", subtitle: "Account & Preferences", heroTag: "Your controls.", heroDesc: "All account, notification, moderator, and privacy settings. Also logout, password reset, and delete account.", intro: "Everything you can configure.", emoji: "⚙️",
    elements: [
      { id: "U1", name: "← Back link", type: "link", loc: "Top-left", short: "Go back to main app.", long: "Navigates to index.html. Unsaved changes not persisted." },
      { id: "U2", name: "Display name input (30 chars)", type: "input", loc: "Account section", short: "Change the name others see.", long: "Shows in debate rooms, leaderboards, everywhere. Different from permanent username. 30 char max." },
      { id: "U3", name: "Challenge notifications toggle", type: "toggle", loc: "Notifications", short: "Turn challenge notifications on/off.", long: "Challenges still arrive — you just won't be alerted." },
      { id: "U4", name: "Debate notifications toggle", type: "toggle", loc: "Notifications", short: "Turn debate result notifications on/off.", long: "Debate outcomes, scoring, related activity." },
      { id: "U5", name: "Follow notifications toggle", type: "toggle", loc: "Notifications", short: "Turn follow notifications on/off.", long: "Notified when someone follows you." },
      { id: "U6", name: "Reaction notifications toggle", type: "toggle", loc: "Notifications", short: "Turn reaction notifications on/off.", long: "Notified when someone reacts to your hot takes." },
      { id: "U7", name: "Sound effects toggle", type: "toggle", loc: "Audio", short: "Turn sound effects on/off.", long: "Beeps, navigation sounds, event audio." },
      { id: "U8", name: "Mute all audio toggle", type: "toggle", loc: "Audio", short: "Mute everything.", long: "Master mute. App is mute-first design — nothing breaks." },
      { id: "U9", name: "Dark mode toggle", type: "toggle", loc: "Display", short: "Switch dark/light themes.", long: "Immediate effect. Saved to localStorage. Dark is default and recommended." },
      { id: "U10", name: "Moderator enabled toggle", type: "toggle", loc: "Moderator", short: "Turn moderator mode on/off.", long: "Saves instantly via RPC. When enabled, appear in Mod Queue. Stats preserved either way." },
      { id: "U11", name: "Moderator available toggle", type: "toggle", loc: "Moderator", short: "Signal whether currently available to moderate.", long: "Saves instantly via RPC. Finer-grained than enable toggle." },
      { id: "U12", name: "Moderator category chips (U12-U17)", type: "button", loc: "Moderator", short: "Select which categories you'll moderate.", long: "Each chip is a toggle. You only appear in queue for selected categories. Double-tap guard prevents rapid toggles." },
      { id: "U18", name: "Public profile toggle", type: "toggle", loc: "Privacy", short: "Make profile visible or hidden.", long: "When enabled, accessible at /u/username and in search. When disabled, hidden from public." },
      { id: "U19", name: "Show online status toggle", type: "toggle", loc: "Privacy", short: "Let others see when you're online.", long: "When disabled, appear offline to everyone. Rivals won't get notifications." },
      { id: "U20", name: "Allow challenges toggle", type: "toggle", loc: "Privacy", short: "Allow or block incoming challenges.", long: "When disabled, challenge button hidden on your profile." },
      { id: "U21", name: "💾 SAVE CHANGES button", type: "button", loc: "Bottom", short: "Save all settings changes.", long: "Persists everything except mod toggles (which save instantly). Double-tap guard." },
      { id: "U22", name: "← BACK TO APP button", type: "button", loc: "Below save", short: "Return to main app.", long: "Same as U1 — separate button in page body." },
      { id: "U23", name: "🚪 LOG OUT button", type: "button", loc: "Account actions", short: "Sign out.", long: "Clears session, stops polling, clears broadcast channels, redirects to login." },
      { id: "U24", name: "🔑 RESET PASSWORD button", type: "button", loc: "Account actions", short: "Send password reset email.", long: "Same flow as F8/F23. Double-tap guard." },
      { id: "U25", name: "🗑️ DELETE ACCOUNT button", type: "button", loc: "Account actions", short: "Permanently delete your account.", long: "Opens Delete Account Modal (Screen BG). Destructive and irreversible." },
      { id: "U26", name: "Privacy Policy footer link", type: "link", loc: "Footer", short: "Links to Privacy Policy.", long: "Standard legal." },
      { id: "U27", name: "Terms of Service footer link", type: "link", loc: "Footer", short: "Links to Terms of Service.", long: "Standard legal." }
    ]
  },
  { id: "V", route: "/groups", title: "Groups Lobby", subtitle: "Discover & Join", heroTag: "Find your tribe.", heroDesc: "Discover groups, view yours, see rankings, create new ones. Separate HTML page.", intro: "Groups home page with its own bottom tab bar.", emoji: "👥",
    elements: [
      { id: "V1", name: "+ CREATE button", type: "button", loc: "Top-right", short: "Create a new group.", long: "Opens Create Group Modal (Screen BH). You become Leader automatically." },
      { id: "V2", name: "Discover tab", type: "button", loc: "Tab bar", short: "Browse all public groups.", long: "Feed of joinable groups. Filter by category." },
      { id: "V3", name: "My Groups tab", type: "button", loc: "Tab bar", short: "View groups you're in.", long: "Only groups where you have membership." },
      { id: "V4", name: "Rankings tab", type: "button", loc: "Tab bar", short: "See group rankings.", long: "Groups ranked by aggregate performance." },
      { id: "V5", name: "Category filter pills", type: "button", loc: "Below tabs", short: "Filter groups by category.", long: "Tap to filter, tap again to clear." },
      { id: "V6", name: "Group cards", type: "link", loc: "List", short: "Tap to open group detail (Screen W).", long: "Shows name, description, member count, category." },
      { id: "V7", name: "Bottom tab bar (V7-V11)", type: "button", loc: "Bottom", short: "Navigation tabs matching main app.", long: "Groups tab highlighted. Others navigate to index.html." }
    ]
  },
  { id: "W", route: "/groups", title: "Group Detail", subtitle: "Inside a Group", heroTag: "Your crew.", heroDesc: "Hot takes from members, active challenges, member list, and GvG battles.", intro: "Inside a specific group.", emoji: "🏰",
    elements: [
      { id: "W1", name: "Group banner/header", type: "display", loc: "Top", short: "Group name and banner image.", long: "Shows group identity. Custom banner if earned through three-tier progression." },
      { id: "W2", name: "JOIN/LEAVE GROUP button", type: "button", loc: "Header", short: "Join or leave this group.", long: "Instant for open groups. Some have entry requirements (Elo, tier, audition)." },
      { id: "W3", name: "⚔️ CHALLENGE ANOTHER GROUP", type: "button", loc: "Actions", short: "Start a Group vs Group battle.", long: "Opens GvG Challenge Modal (Screen BI). Members only." },
      { id: "W4", name: "Hot Takes tab", type: "button", loc: "Tab bar", short: "View group members' hot takes.", long: "Feed scoped to this group. Members only." },
      { id: "W5", name: "Challenges tab", type: "button", loc: "Tab bar", short: "View active challenges.", long: "Incoming and outgoing GvG challenges." },
      { id: "W6", name: "Members tab", type: "button", loc: "Tab bar", short: "View all members and roles.", long: "Leader, Co-Leader, Elder, Member. Can promote/demote/kick with right role." },
      { id: "W7", name: "Group hot take input", type: "input", loc: "Hot Takes tab", short: "Write a hot take for this group.", long: "Posts to group feed instead of public feed." },
      { id: "W8", name: "POST button", type: "button", loc: "Hot Takes tab", short: "Publish to group feed.", long: "Only group members see it." },
      { id: "W9", name: "ACCEPT challenge button", type: "button", loc: "Challenges tab", short: "Accept incoming GvG challenge.", long: "Leaders and Co-Leaders only. Locks in the challenge." },
      { id: "W10", name: "DECLINE challenge button", type: "button", loc: "Challenges tab", short: "Decline incoming GvG challenge.", long: "Leaders and Co-Leaders only. Removes the challenge." },
      { id: "W11", name: "Member role actions", type: "button", loc: "Members tab", short: "Promote/Demote/Kick members.", long: "Role hierarchy enforces permissions. Can't promote to your own rank or higher." }
    ]
  },
  { id: "X", route: "/spectate", title: "Spectator View", subtitle: "Watch Live", heroTag: "Ringside seat.", heroDesc: "Watch a live debate. Chat with spectators, vote on who's winning, share.", intro: "Live spectator experience with chat and voting.", emoji: "👀",
    elements: [
      { id: "X1", name: "← Back button", type: "link", loc: "Top-left", short: "Leave spectator view.", long: "Returns to wherever you came from." },
      { id: "X2", name: "Logo link", type: "link", loc: "Top-left", short: "Go to app homepage.", long: "Standard logo navigation." },
      { id: "X3", name: "JOIN link", type: "link", loc: "Top-right", short: "Sign up (hidden if logged in).", long: "Visible to unauthenticated spectators only." },
      { id: "X4", name: "Debate content", type: "display", loc: "Main area", short: "Scrollable live debate feed.", long: "Arguments, rulings, scores as they unfold. Read-only for spectators." },
      { id: "X5", name: "Spectator chat toggle", type: "button", loc: "Chat panel", short: "Expand/collapse spectator chat.", long: "Separate discussion area for spectators during the debate." },
      { id: "X6", name: "Chat input (280 chars)", type: "input", loc: "Chat panel", short: "Type a message in spectator chat.", long: "280-character limit. Real-time discussion." },
      { id: "X7", name: "SEND chat button", type: "button", loc: "Chat panel", short: "Post your message.", long: "Visible to all spectators." },
      { id: "X8", name: "Vote button Side A", type: "button", loc: "Vote section", short: "Vote for Side A.", long: "Live sentiment poll — not predictions with tokens. Results update in real time." },
      { id: "X9", name: "Vote button Side B", type: "button", loc: "Vote section", short: "Vote for Side B.", long: "Same as X8." },
      { id: "X10", name: "📋 Copy Link share", type: "button", loc: "Share row", short: "Copy spectator link.", long: "Link lets others join as spectators." },
      { id: "X11", name: "𝕏 Share button", type: "button", loc: "Share row", short: "Share live debate on X.", long: "Pre-filled tweet with topic and spectator link." },
      { id: "X12", name: "💬 WhatsApp share", type: "button", loc: "Share row", short: "Share via WhatsApp.", long: "Opens WhatsApp with pre-filled message." },
      { id: "X13", name: "↗ Share button", type: "button", loc: "Share row", short: "Open device native share.", long: "Uses Web Share API." }
    ]
  },
  { id: "Y", route: "/cosmetics", title: "Armory", subtitle: "Cosmetics", heroTag: "Look good.", heroDesc: "Browse and equip cosmetic items. Visual customization only — no competitive advantage.", intro: "Visual customization shop.", emoji: "🛡️",
    elements: [
      { id: "Y1", name: "← Back link", type: "link", loc: "Top-left", short: "Go back.", long: "Returns to previous screen." },
      { id: "Y2", name: "Cosmetic item tiles", type: "display", loc: "Grid", short: "Tap an item to see details.", long: "Shows visual, name, status (owned/equipped/purchasable)." },
      { id: "Y3", name: "Purchase button", type: "button", loc: "Item detail", short: "Buy this item with tokens.", long: "Shows token cost. Opens confirmation modal (Y6/Y7). Balance checked client-side first." },
      { id: "Y4", name: "Equip button", type: "button", loc: "Item detail", short: "Equip this item.", long: "Replaces previously equipped item in same category. No separate unequip action." },
      { id: "Y5", name: "Equipped label", type: "display", loc: "Item detail", short: "Shows this item is currently equipped.", long: "Not a button. To unequip, equip a different item in same category." },
      { id: "Y6", name: "Cancel purchase modal", type: "button", loc: "Modal", short: "Cancel the purchase.", long: "No tokens spent." },
      { id: "Y7", name: "Confirm purchase modal", type: "button", loc: "Modal", short: "Confirm and spend tokens.", long: "Deducts tokens, adds item to inventory. Immediately equippable." },
      { id: "Y8", name: "Info modal — Got it", type: "button", loc: "Modal", short: "Dismiss info popup.", long: "Closes tooltip or help popup." }
    ]
  },
  { id: "Z", route: "/arena", title: "Mode Select", subtitle: "Overlay", heroTag: "Pick your format.", heroDesc: "Choose your debate format after selecting Ranked/Casual.", intro: "Choose between Live Audio, Voice Memo, Text, or AI Sparring.", emoji: "🎯",
    elements: [
      { id: "Z1", name: "🎙️ Live Audio card", type: "button", loc: "Card 1", short: "Real-time voice debate (WebRTC).", long: "Flagship format. Both speak live. WebRTC with Cloudflare TURN server. Requires mic access. Most intense format." },
      { id: "Z2", name: "🎤 Voice Memo card", type: "button", loc: "Card 2", short: "Async debate via recorded voice.", long: "Take turns recording. No real-time pressure. Good for voice without live anxiety." },
      { id: "Z3", name: "⌨️ Text Battle card", type: "button", loc: "Card 3", short: "Real-time text debate.", long: "Type back and forth simultaneously. No mic required. Most accessible." },
      { id: "Z4", name: "🤖 AI Sparring card", type: "button", loc: "Card 4", short: "Practice against AI.", long: "Debate Claude. No queue, no waiting. Good for warmup or when no humans available." },
      { id: "Z5", name: "Cancel button", type: "button", loc: "Bottom", short: "Close and go back to lobby.", long: "Dismisses overlay." },
      { id: "Z6", name: "Backdrop tap to close", type: "gesture", loc: "Background", short: "Tap outside to dismiss.", long: "Same as Z5." }
    ]
  },
  { id: "AA", route: "/arena", title: "Ranked Picker", subtitle: "Overlay", heroTag: "Stakes or practice?", heroDesc: "Choose whether this debate affects your ranking.", intro: "Ranked or Casual selection.", emoji: "📊",
    elements: [
      { id: "AA1", name: "Ranked card", type: "button", loc: "Top card", short: "Debate counts toward Elo.", long: "Affects Elo rating, appears on leaderboards. Pick this for real competition." },
      { id: "AA2", name: "Casual card", type: "button", loc: "Bottom card", short: "No Elo impact.", long: "Consequence-free. Good for practice. Protected lobbies keep casual players separate." },
      { id: "AA3", name: "Cancel button", type: "button", loc: "Bottom", short: "Close the picker.", long: "Returns to lobby." },
      { id: "AA4", name: "Backdrop tap to close", type: "gesture", loc: "Background", short: "Tap outside to dismiss.", long: "Same as AA3." }
    ]
  },
  { id: "AB", route: "/arena", title: "Ruleset Picker", subtitle: "Overlay", heroTag: "Full power or pure?", heroDesc: "Choose the debate ruleset and round count.", intro: "Amplified (with power-ups) or Unplugged (pure debate).", emoji: "⚡",
    elements: [
      { id: "AB1", name: "⚡ Amplified card", type: "button", loc: "Top card", short: "Power-ups, staking, and special mechanics enabled.", long: "Full-featured ruleset. Everything on." },
      { id: "AB2", name: "🎸 Unplugged card", type: "button", loc: "Bottom card", short: "Pure debate, no power-ups or staking.", long: "Stripped-down. Just two debaters and arguments. For purists." },
      { id: "AB3", name: "Round count buttons", type: "button", loc: "Below cards", short: "Select how many rounds.", long: "More rounds = longer debate, more opportunity." },
      { id: "AB4", name: "Cancel button", type: "button", loc: "Bottom", short: "Close the picker.", long: "Returns to previous screen." },
      { id: "AB5", name: "Backdrop tap to close", type: "gesture", loc: "Background", short: "Tap outside to dismiss.", long: "Same as AB4." }
    ]
  },
  { id: "AC", route: "/arena", title: "Category Picker", subtitle: "Overlay", heroTag: "What's the topic?", heroDesc: "Choose what topic area you want to debate in.", intro: "Category selection for matchmaking.", emoji: "🏷️",
    elements: [
      { id: "AC1", name: "Category buttons", type: "button", loc: "Grid", short: "Pick a debate category.", long: "Queue only pairs you with opponents who selected the same category." },
      { id: "AC2", name: "\"Any Category\" button", type: "button", loc: "Grid", short: "Match with any category.", long: "Fastest path to a match. Accept whatever comes." },
      { id: "AC3", name: "Topic text input", type: "input", loc: "Below grid", short: "Suggest a specific topic.", long: "Optional. If provided, becomes the debate topic." }
    ]
  },
  { id: "AD", route: "/arena", title: "Arena Queue", subtitle: "Waiting", heroTag: "Searching...", heroDesc: "Waiting for an opponent. System is looking for a match.", intro: "Matchmaking queue with spectator feed.", emoji: "⏳",
    elements: [
      { id: "AD1", name: "✕ CANCEL button", type: "button", loc: "Top", short: "Leave the queue.", long: "No penalty for canceling." },
      { id: "AD2", name: "Queue status animation", type: "display", loc: "Center", short: "Visual indicator that matchmaking is searching.", long: "Keeps screen from feeling dead during the wait." },
      { id: "AD3", name: "Queue population count", type: "display", loc: "Below animation", short: "How many people are in the queue.", long: "0 = long wait. High = fast match." },
      { id: "AD4", name: "Spectator feed", type: "display", loc: "Below count", short: "Watch active debates while you wait.", long: "Keeps you engaged instead of staring at a spinner." }
    ]
  },
  { id: "AE", route: "/arena", title: "AI Fallback Prompt", subtitle: "After 60s", heroTag: "No humans around?", heroDesc: "After 60 seconds with no match, app offers an AI alternative.", intro: "AI sparring prompt after queue timeout.", emoji: "🤖",
    elements: [
      { id: "AE1", name: "SPAR WITH AI button", type: "button", loc: "Center", short: "Stop waiting, debate AI instead.", long: "Exits human queue and starts AI debate immediately." },
      { id: "AE2", name: "Continues searching note", type: "display", loc: "Below", short: "Queue keeps looking in background.", long: "Not a button — behavior note. AI prompt doesn't kill queue position." }
    ]
  },
  { id: "AF", route: "/arena", title: "Queue Timeout", subtitle: "After 180s", heroTag: "Nobody home.", heroDesc: "After 3 minutes with no match, queue gives up.", intro: "Full timeout — no more background searching.", emoji: "⌛",
    elements: [
      { id: "AF1", name: "🤖 SPAR WITH AI INSTEAD", type: "button", loc: "Top option", short: "Start an AI debate.", long: "Same as AE1 but queue is done." },
      { id: "AF2", name: "🔄 TRY AGAIN button", type: "button", loc: "Middle option", short: "Re-enter matchmaking queue.", long: "Fresh 180-second timer starts." },
      { id: "AF3", name: "← BACK TO LOBBY button", type: "button", loc: "Bottom option", short: "Return to arena lobby.", long: "Exits queue entirely." }
    ]
  },
  { id: "AG", route: "/arena", title: "Match Found", subtitle: "Accept/Decline", heroTag: "Opponent found!", heroDesc: "Both players must accept within 12 seconds.", intro: "12-second window to accept or decline the match.", emoji: "🎯",
    elements: [
      { id: "AG1", name: "ACCEPT button", type: "button", loc: "Left", short: "Accept the match.", long: "12 seconds to accept. Both accept → Pre-Debate Setup (Screen AH). Timeout → forfeited, back to queue." },
      { id: "AG2", name: "DECLINE button", type: "button", loc: "Right", short: "Decline the match.", long: "Back to queue. No penalty." },
      { id: "AG3", name: "12-second countdown", type: "display", loc: "Center", short: "Timer for accept/decline.", long: "Zero = auto-decline. Creates urgency." },
      { id: "AG4", name: "Opponent info", type: "display", loc: "Center", short: "Opponent's username, avatar, Elo, record.", long: "Quick read on who you're debating." }
    ]
  },
  { id: "AH", route: "/arena", title: "Pre-Debate Setup", subtitle: "Staking", heroTag: "Put your money where your mouth is.", heroDesc: "Stake tokens on the outcome before the debate starts.", intro: "Optional token staking before entering the debate.", emoji: "💰",
    elements: [
      { id: "AH1", name: "Side A stake button", type: "button", loc: "Left", short: "Stake on Side A winning.", long: "Shows current multiplier. Typically stake on yourself." },
      { id: "AH2", name: "Side B stake button", type: "button", loc: "Right", short: "Stake on Side B winning.", long: "Same for other side." },
      { id: "AH3", name: "Stake amount input", type: "input", loc: "Center", short: "Enter tokens to stake.", long: "Balance checked client-side. Instant error if insufficient." },
      { id: "AH4", name: "Quick amount buttons", type: "button", loc: "Below input", short: "Preset stake amounts.", long: "Same as N21." },
      { id: "AH5", name: "CONFIRM stake button", type: "button", loc: "Below amounts", short: "Lock in your stake.", long: "Disabled until side + amount selected. Deducts tokens. Payout on win." },
      { id: "AH6", name: "ENTER DEBATE button", type: "button", loc: "Bottom", short: "Enter the debate room.", long: "Staking is optional — can enter without." }
    ]
  },
  { id: "AI", route: "/arena", title: "Debate Room (Text)", subtitle: "Live Text", heroTag: "Type. Send. Win.", heroDesc: "Live text debate. Type arguments, cite references, use power-ups.", intro: "Text-based debate room.", emoji: "⌨️",
    elements: [
      { id: "AI1", name: "Text argument textarea", type: "input", loc: "Bottom", short: "Type your argument.", long: "Main input for text debates. Character limit applies." },
      { id: "AI2", name: "→ Send button", type: "button", loc: "Bottom-right", short: "Submit your argument.", long: "Visible to opponent, moderator, and spectators." },
      { id: "AI3", name: "📎 Reference button", type: "button", loc: "Bottom bar", short: "Cite a reference during debate.", long: "Opens Reference Form (Screen BD). Pull in pre-forged evidence." },
      { id: "AI4", name: "Chat/message feed", type: "display", loc: "Main area", short: "Scrollable debate feed.", long: "All arguments, references, rulings, scoring events in chronological order." },
      { id: "AI5", name: "Power-up activation buttons", type: "button", loc: "Side panel", short: "Use a power-up.", long: "Only visible in Amplified ruleset. Single-use per debate." },
      { id: "AI6", name: "Moderator scoring interface", type: "display", loc: "Mod view only", short: "Scoring tools for the moderator.", long: "Only visible to assigned moderator. Debaters/spectators see scored results." }
    ]
  },
  { id: "AJ", route: "/arena", title: "Debate Room (Audio)", subtitle: "Live Voice", heroTag: "Speak up.", heroDesc: "Real-time voice debate. WebRTC-powered with live audio and text chat.", intro: "Live audio debate room.", emoji: "🎙️",
    elements: [
      { id: "AJ1", name: "🎙️ Mic button", type: "button", loc: "Center", short: "Mute or unmute your microphone.", long: "Toggle. State visible to others." },
      { id: "AJ2", name: "Audio waveform visualization", type: "display", loc: "Center", short: "Visual indicator of who's speaking.", long: "Live waveform for active speaker." },
      { id: "AJ3", name: "📎 Reference button", type: "button", loc: "Bottom bar", short: "Cite a reference.", long: "Same as AI3." },
      { id: "AJ4", name: "Chat/message feed", type: "display", loc: "Side panel", short: "Text feed alongside voice.", long: "References, rulings, scoring events appear here." },
      { id: "AJ5", name: "Power-up activation buttons", type: "button", loc: "Side panel", short: "Use a power-up.", long: "Same as AI5." }
    ]
  },
  { id: "AK", route: "/arena", title: "Debate Room (Voice Memo)", subtitle: "Async Voice", heroTag: "Take your time.", heroDesc: "Record your argument, review it, then send. No real-time pressure.", intro: "Asynchronous voice debate.", emoji: "🎤",
    elements: [
      { id: "AK1", name: "⏺ Record button", type: "button", loc: "Center", short: "Start recording.", long: "Tap to begin. Not live — take your time." },
      { id: "AK2", name: "⏹ Stop button", type: "button", loc: "Center", short: "Stop recording.", long: "Recording ready to review." },
      { id: "AK3", name: "RETAKE button", type: "button", loc: "Below player", short: "Discard and re-record.", long: "No limit on retakes." },
      { id: "AK4", name: "SEND voice memo", type: "button", loc: "Below player", short: "Submit your recorded argument.", long: "Opponent hears it and records their response. Can't take it back." },
      { id: "AK5", name: "Recording status indicator", type: "display", loc: "Center", short: "Shows recording time.", long: "Display only." },
      { id: "AK6", name: "📎 Reference button", type: "button", loc: "Bottom bar", short: "Cite a reference.", long: "Same as AI3." }
    ]
  },
  { id: "AL", route: "/arena", title: "Debate Room (AI)", subtitle: "AI Sparring", heroTag: "Train against the machine.", heroDesc: "Practice debate against Claude. Same text interface, AI opponent.", intro: "AI sparring room.", emoji: "🤖",
    elements: [
      { id: "AL1", name: "Text argument textarea", type: "input", loc: "Bottom", short: "Type your argument against AI.", long: "Same as AI1." },
      { id: "AL2", name: "→ Send button", type: "button", loc: "Bottom-right", short: "Submit to AI.", long: "AI processes via ai-sparring Edge Function." },
      { id: "AL3", name: "Chat feed with AI", type: "display", loc: "Main area", short: "Scrollable exchange with AI.", long: "AI arguments generated by Claude." },
      { id: "AL4", name: "Round indicator", type: "display", loc: "Top", short: "Shows current round.", long: "Same round structure as human debates." }
    ]
  },
  { id: "AM", route: "/arena", title: "Post-Debate End Screen", subtitle: "Results", heroTag: "It's over.", heroDesc: "See results, declare a rival, rematch, or share.", intro: "Post-debate results and actions.", emoji: "🏁",
    elements: [
      { id: "AM1", name: "⚔️ ADD RIVAL button", type: "button", loc: "Top", short: "Declare opponent as a rival.", long: "Up to 5 slots. Rivals get special notifications when you're online." },
      { id: "AM2", name: "⚔️ REMATCH button", type: "button", loc: "Actions", short: "Challenge to another debate.", long: "If accepted, right back into a new debate." },
      { id: "AM3", name: "🔗 SHARE button", type: "button", loc: "Actions", short: "Share debate results.", long: "Opens share options." },
      { id: "AM4", name: "📝 TRANSCRIPT button", type: "button", loc: "Actions", short: "View full transcript.", long: "Opens Transcript Overlay (Screen BF)." },
      { id: "AM5", name: "← LOBBY button", type: "button", loc: "Actions", short: "Return to arena lobby.", long: "Goes back to Screen O." },
      { id: "AM6", name: "Opponent name", type: "link", loc: "Header", short: "Tap to view opponent's profile.", long: "Navigates to their profile." },
      { id: "AM7", name: "Score display", type: "display", loc: "Center", short: "Final score breakdown.", long: "Scores for both debaters across all rounds." },
      { id: "AM8", name: "Token claim summary", type: "display", loc: "Below scores", short: "Tokens earned from this debate.", long: "Participation, winning, streak bonuses, stake payouts. Credited automatically." }
    ]
  },
  { id: "AN", route: "/arena", title: "Power-Up Shop", subtitle: "Overlay", heroTag: "Gear up.", heroDesc: "Buy power-ups with tokens before entering a debate.", intro: "Single-use competitive items.", emoji: "⚡",
    elements: [
      { id: "AN1", name: "← BACK button", type: "link", loc: "Top-left", short: "Close shop, return to lobby.", long: "Dismisses overlay." },
      { id: "AN2", name: "Power-up cards — BUY", type: "button", loc: "Grid", short: "Purchase a power-up.", long: "Name, description, effect, cost. Balance checked client-side. Single-use — consumed on activation." },
      { id: "AN3", name: "Token balance display", type: "display", loc: "Top", short: "Current token balance.", long: "Updates immediately after purchase." }
    ]
  },
  { id: "AO", route: "/arena", title: "Private Lobby Picker", subtitle: "Overlay", heroTag: "Choose your challenger.", heroDesc: "Set up a private debate.", intro: "Three ways to create a private debate.", emoji: "🔒",
    elements: [
      { id: "AO1", name: "Username Challenge option", type: "button", loc: "Option 1", short: "Challenge a specific user.", long: "Opens User Search (Screen AP)." },
      { id: "AO2", name: "Group Members Only option", type: "button", loc: "Option 2", short: "Debate open only to group members.", long: "Opens Group Lobby Picker (Screen AQ)." },
      { id: "AO3", name: "Join Code option", type: "button", loc: "Option 3", short: "Generate a 6-character code.", long: "Share the code — they enter it in O6 to join." },
      { id: "AO4", name: "Cancel button", type: "button", loc: "Bottom", short: "Close the picker.", long: "Returns to lobby." },
      { id: "AO5", name: "Backdrop tap to close", type: "gesture", loc: "Background", short: "Tap outside to dismiss.", long: "Same as AO4." }
    ]
  },
  { id: "AP", route: "/arena", title: "User Search", subtitle: "Challenge Someone", heroTag: "Find your target.", heroDesc: "Find a specific user to challenge.", intro: "Username search for direct challenges.", emoji: "🔍",
    elements: [
      { id: "AP1", name: "Search username input", type: "input", loc: "Top", short: "Type username to find.", long: "Live search — results appear as you type." },
      { id: "AP2", name: "User result rows", type: "link", loc: "List", short: "Tap a user to challenge them.", long: "Shows username, avatar, basic stats." },
      { id: "AP3", name: "Cancel button", type: "button", loc: "Bottom", short: "Close the search.", long: "Returns to Private Lobby Picker." },
      { id: "AP4", name: "Backdrop tap to close", type: "gesture", loc: "Background", short: "Tap outside to dismiss.", long: "Same as AP3." }
    ]
  },
  { id: "AQ", route: "/arena", title: "Group Lobby Picker", subtitle: "Overlay", heroTag: "Pick a group.", heroDesc: "Select which group's members can join.", intro: "Restrict debate to group members.", emoji: "👥",
    elements: [
      { id: "AQ1", name: "Group list", type: "link", loc: "List", short: "Tap a group to restrict debate.", long: "Shows all groups you're in. Selection creates private lobby for that group." },
      { id: "AQ2", name: "Cancel button", type: "button", loc: "Bottom", short: "Close the picker.", long: "Returns to Private Lobby Picker." },
      { id: "AQ3", name: "Backdrop tap to close", type: "gesture", loc: "Background", short: "Tap outside to dismiss.", long: "Same as AQ2." }
    ]
  },
  { id: "AR", route: "/arena", title: "Mod Queue", subtitle: "Moderators Only", heroTag: "Judge them.", heroDesc: "Browse debates that need a moderator.", intro: "Moderator-only queue of debates requesting a judge.", emoji: "🧑‍⚖️",
    elements: [
      { id: "AR1", name: "← BACK button", type: "link", loc: "Top-left", short: "Return to arena lobby.", long: "Goes to Screen O." },
      { id: "AR2", name: "⚔️ CREATE DEBATE button", type: "button", loc: "Top-right", short: "Create a mod-initiated debate.", long: "Opens Mod-Initiated Debate Picker (Screen AS). Generate join code for debaters." },
      { id: "AR3", name: "REQUEST TO MOD button", type: "button", loc: "Card action", short: "Volunteer to moderate this debate.", long: "Checks cooldown status first. Repeat dropouts escalate cooldown (10min → 60min → 24h)." }
    ]
  },
  { id: "AS", route: "/arena", title: "Mod-Initiated Debate", subtitle: "Overlay", heroTag: "Set the stage.", heroDesc: "Set up a debate as a moderator.", intro: "Moderator creates debate and generates join code.", emoji: "🎬",
    elements: [
      { id: "AS1", name: "← BACK button", type: "link", loc: "Top-left", short: "Return to Mod Queue.", long: "Back to Screen AR." },
      { id: "AS2", name: "Mode cards", type: "button", loc: "Section 1", short: "Choose debate format.", long: "Same options as Screen Z." },
      { id: "AS3", name: "Category cards", type: "button", loc: "Section 2", short: "Choose debate category.", long: "Pick topic area." },
      { id: "AS4", name: "Topic text input", type: "input", loc: "Below categories", short: "Set a specific topic (optional).", long: "200-char max. Optional." },
      { id: "AS5", name: "Ranked checkbox", type: "toggle", loc: "Options", short: "Make this Ranked.", long: "If checked, affects both debaters' Elo." },
      { id: "AS6", name: "Ruleset picker", type: "button", loc: "Options", short: "Amplified or Unplugged.", long: "Same as Screen AB." },
      { id: "AS7", name: "⚔️ CREATE & GET CODE", type: "button", loc: "Bottom", short: "Create debate, get join code.", long: "Creates via create_mod_debate RPC. Returns 6-char code to share." }
    ]
  },
  { id: "AT", route: "/arena", title: "Mod Waiting Room (Mod)", subtitle: "Waiting for Debaters", heroTag: "Waiting for fighters.", heroDesc: "You've created a mod-initiated debate. Waiting for debaters.", intro: "Moderator's view while waiting for debaters to join.", emoji: "⏱️",
    elements: [
      { id: "AT1", name: "Join code display", type: "display", loc: "Center", short: "The code debaters enter to join.", long: "Copy and share with two people." },
      { id: "AT2", name: "Debater slot status", type: "display", loc: "Below code", short: "Shows who has joined.", long: "Updates real time. Debate starts when both slots filled." },
      { id: "AT3", name: "CANCEL button", type: "button", loc: "Bottom", short: "Cancel the debate.", long: "Calls cancel_mod_debate RPC. Code becomes invalid." }
    ]
  },
  { id: "AU", route: "/arena", title: "Mod Waiting Room (Debater)", subtitle: "Waiting for Opponent", heroTag: "Almost there.", heroDesc: "You've joined via code. Waiting for the other debater.", intro: "Debater's view after joining a mod-initiated debate.", emoji: "🕐",
    elements: [
      { id: "AU1", name: "Waiting status display", type: "display", loc: "Center", short: "Shows you've joined, waiting for other debater.", long: "Mod name, topic (if set), other debater slot status." },
      { id: "AU2", name: "LEAVE button", type: "button", loc: "Bottom", short: "Leave before it starts.", long: "Your slot opens for someone else." }
    ]
  },
  { id: "AV", route: "/notifications", title: "Notification Panel", subtitle: "Overlay", heroTag: "What's new.", heroDesc: "All notifications with category filters.", intro: "Notification panel with filter pills.", emoji: "🔔",
    elements: [
      { id: "AV1", name: "Mark all read button", type: "button", loc: "Top-right", short: "Mark every notification as read.", long: "Clears unread count. Notifications stay in list." },
      { id: "AV2", name: "✕ Close button", type: "button", loc: "Top-right", short: "Close the panel.", long: "Returns to current screen." },
      { id: "AV3", name: "All filter pill", type: "button", loc: "Filter bar", short: "Show all notifications.", long: "Default view." },
      { id: "AV4", name: "⚔️ Challenges filter", type: "button", loc: "Filter bar", short: "Show challenge notifications only.", long: "Incoming, acceptances, declines, results." },
      { id: "AV5", name: "🏆 Results filter", type: "button", loc: "Filter bar", short: "Show debate result notifications only.", long: "Outcomes, scores, Elo changes." },
      { id: "AV6", name: "🔥 Reactions filter", type: "button", loc: "Filter bar", short: "Show reaction notifications only.", long: "When people react to your hot takes." },
      { id: "AV7", name: "🪙 Economy filter", type: "button", loc: "Filter bar", short: "Show token notifications only.", long: "Earnings, payouts, milestones." },
      { id: "AV8", name: "Notification rows", type: "link", loc: "List", short: "Tap to navigate to related content.", long: "Challenge → arena. Reaction → hot take. Result → post-debate. Etc." },
      { id: "AV9", name: "Backdrop tap to close", type: "gesture", loc: "Background", short: "Tap outside to dismiss.", long: "Same as AV2." }
    ]
  },
  { id: "AW", route: "/", title: "User Dropdown", subtitle: "Overlay", heroTag: "Quick menu.", heroDesc: "Quick-access menu from header avatar.", intro: "Dropdown with Groups, Settings, Complete Profile, Log Out.", emoji: "👤",
    elements: [
      { id: "AW1", name: "👥 Groups link", type: "link", loc: "Menu item", short: "Go to Groups page.", long: "Navigates to moderator-groups.html." },
      { id: "AW2", name: "⚙️ Settings link", type: "link", loc: "Menu item", short: "Go to Settings.", long: "Navigates to moderator-settings.html." },
      { id: "AW3", name: "📊 Complete Profile link", type: "link", loc: "Menu item", short: "Go to Profile Questionnaire.", long: "Navigates to moderator-profile-depth.html." },
      { id: "AW4", name: "🚪 Log Out button", type: "button", loc: "Menu item", short: "Sign out.", long: "Same as U23." }
    ]
  },
  { id: "AX", route: "/", title: "Avatar Selection", subtitle: "Sheet", heroTag: "Pick a face.", heroDesc: "Choose your avatar from a grid.", intro: "Avatar grid selection overlay.", emoji: "🎭",
    elements: [
      { id: "AX1", name: "Avatar grid", type: "button", loc: "Grid", short: "Tap an avatar to select it.", long: "Immediately sets it everywhere — header, debates, leaderboards. No custom upload." },
      { id: "AX2", name: "Tap backdrop to close", type: "gesture", loc: "Background", short: "Dismiss without changing.", long: "Closes picker." }
    ]
  },
  { id: "AY", route: "/", title: "Follow/Following List", subtitle: "Overlay", heroTag: "Your people.", heroDesc: "See who follows you or who you follow.", intro: "Follower/following list with follow/unfollow actions.", emoji: "👣",
    elements: [
      { id: "AY1", name: "User rows", type: "link", loc: "List", short: "Tap to view their profile.", long: "Shows username, avatar, follow/unfollow button." },
      { id: "AY2", name: "Follow/Unfollow button", type: "button", loc: "Row action", short: "Follow or unfollow.", long: "Toggle. Following = notifications about their activity." },
      { id: "AY3", name: "Tap backdrop to close", type: "gesture", loc: "Background", short: "Dismiss the list.", long: "Returns to profile." }
    ]
  },
  { id: "AZ", route: "/", title: "Challenge Modal", subtitle: "From Hot Takes", heroTag: "You're wrong.", heroDesc: "Issue a debate challenge in response to a hot take.", intro: "Challenge modal from hot takes feed.", emoji: "🥊",
    elements: [
      { id: "AZ1", name: "Challenge response textarea", type: "input", loc: "Form", short: "Write your counter-argument.", long: "Your opening salvo. Sent as the challenge invitation. If accepted, frames the debate." },
      { id: "AZ2", name: "CANCEL button", type: "button", loc: "Bottom", short: "Cancel the challenge.", long: "Dismisses without sending." },
      { id: "AZ3", name: "⚔️ BET. submit button", type: "button", loc: "Bottom", short: "Send the challenge.", long: "Notification goes to hot take author. They accept or decline." },
      { id: "AZ4", name: "Tap backdrop to close", type: "gesture", loc: "Background", short: "Dismiss without sending.", long: "Same as AZ2." }
    ]
  },
  { id: "BA", route: "/", title: "Prediction Creation", subtitle: "Modal", heroTag: "Make a market.", heroDesc: "Create a prediction market for others to wager on.", intro: "Define a prediction with two sides.", emoji: "🎲",
    elements: [
      { id: "BA1", name: "Topic textarea (200 chars)", type: "input", loc: "Form", short: "What's the prediction about?", long: "Define the question or event." },
      { id: "BA2", name: "Side A text input (50 chars)", type: "input", loc: "Form", short: "Name the first option.", long: "Label for Side A." },
      { id: "BA3", name: "Side B text input (50 chars)", type: "input", loc: "Form", short: "Name the second option.", long: "Label for Side B." },
      { id: "BA4", name: "CANCEL button", type: "button", loc: "Bottom", short: "Cancel without creating.", long: "Dismisses modal." },
      { id: "BA5", name: "POST button", type: "button", loc: "Bottom", short: "Create and post the prediction.", long: "Goes live immediately. Others can wager." }
    ]
  },
  { id: "BB", route: "/arena", title: "Mod Request Modal", subtitle: "Confirmation", heroTag: "You've been summoned.", heroDesc: "A moderator assignment — confirm or decline.", intro: "Moderator confirms or declines assignment.", emoji: "📋",
    elements: [
      { id: "BB1", name: "ACCEPT button", type: "button", loc: "Left", short: "Accept moderation assignment.", long: "Enter debate room in moderator mode with scoring controls." },
      { id: "BB2", name: "DECLINE button", type: "button", loc: "Right", short: "Decline the request.", long: "Another moderator will be sought." },
      { id: "BB3", name: "30-second countdown", type: "display", loc: "Center", short: "Time remaining.", long: "Zero = auto-decline. System moves to next available mod." }
    ]
  },
  { id: "BC", route: "/arena", title: "Mod Scoring Panel", subtitle: "In Debate Room", heroTag: "Rate the judge.", heroDesc: "Rating interface for moderators during and after debates.", intro: "Fair/Unfair for debaters, 1-50 slider for spectators.", emoji: "⭐",
    elements: [
      { id: "BC1", name: "👍 FAIR button (debater)", type: "button", loc: "Rating section", short: "Rate moderator as fair.", long: "Affects mod_approval_pct. Fair ratings increase it." },
      { id: "BC2", name: "👎 UNFAIR button (debater)", type: "button", loc: "Rating section", short: "Rate moderator as unfair.", long: "Decreases approval percentage. Low approval = less visible in queue." },
      { id: "BC3", name: "Score slider 1-50 (spectator)", type: "input", loc: "Rating section", short: "Rate moderator performance.", long: "More granular than debater view. Rate objectivity, timing, quality." },
      { id: "BC4", name: "SUBMIT SCORE button", type: "button", loc: "Below slider", short: "Submit your moderator rating.", long: "Sends to score_moderator RPC. One rating per user per debate." }
    ]
  },
  { id: "BD", route: "/arena", title: "Reference Form", subtitle: "In Debate Room", heroTag: "Cite your sources.", heroDesc: "Cite evidence during a debate.", intro: "Submit URL and description to back up your argument.", emoji: "📎",
    elements: [
      { id: "BD1", name: "Reference URL input", type: "input", loc: "Form", short: "Paste source URL.", long: "Auto-fills from arsenal references. Visible to opponent, mod, spectators." },
      { id: "BD2", name: "Reference description (500 chars)", type: "input", loc: "Form", short: "Explain what this source proves.", long: "Appears alongside URL in debate feed." },
      { id: "BD3", name: "Supports Side A button", type: "button", loc: "Form", short: "Reference supports Side A.", long: "Tags the reference with which side it backs." },
      { id: "BD4", name: "Supports Side B button", type: "button", loc: "Form", short: "Reference supports Side B.", long: "Same for other side." },
      { id: "BD5", name: "SUBMIT EVIDENCE button", type: "button", loc: "Bottom", short: "Add reference to the debate.", long: "Appears in feed. Opponent can challenge, mod can rule on validity." },
      { id: "BD6", name: "✕ Cancel button", type: "button", loc: "Top-right", short: "Close without submitting.", long: "Returns to debate room." }
    ]
  },
  { id: "BE", route: "/arena", title: "Ruling Panel", subtitle: "Mod Only", heroTag: "Make the call.", heroDesc: "Moderator-only overlay for judging references.", intro: "Internal moderator tool — details in arena-mod-refs.ts.", emoji: "⚖️",
    elements: []
  },
  { id: "BF", route: "/arena", title: "Transcript Overlay", subtitle: "Post-Debate", heroTag: "The record.", heroDesc: "Full record of the debate.", intro: "Complete debate transcript.", emoji: "📄",
    elements: [
      { id: "BF1", name: "Full transcript display", type: "display", loc: "Main area", short: "Scrollable text of entire debate.", long: "Every argument from both sides, in order, with round markers." },
      { id: "BF2", name: "Tap backdrop to close", type: "gesture", loc: "Background", short: "Dismiss the transcript.", long: "Returns to post-debate screen." }
    ]
  },
  { id: "BG", route: "/settings", title: "Delete Account Modal", subtitle: "From Settings", heroTag: "The nuclear option.", heroDesc: "Permanent account deletion. Destructive and irreversible.", intro: "Type DELETE to confirm. Everything is gone.", emoji: "💀",
    elements: [
      { id: "BG1", name: "Type DELETE text input", type: "input", loc: "Center", short: "Type \"DELETE\" to confirm.", long: "Safety measure. Delete button won't activate until exact match." },
      { id: "BG2", name: "CANCEL button", type: "button", loc: "Left", short: "Cancel — keep your account.", long: "Dismisses modal. Nothing happens." },
      { id: "BG3", name: "DELETE confirm button", type: "button", loc: "Right", short: "Permanently delete account.", long: "Disabled until \"DELETE\" typed. Account + all data removed. Cannot be undone." },
      { id: "BG4", name: "Tap backdrop to close", type: "gesture", loc: "Background", short: "Dismiss without deleting.", long: "Same as BG2." }
    ]
  },
  { id: "BH", route: "/groups", title: "Create Group Modal", subtitle: "From Groups Lobby", heroTag: "Build your crew.", heroDesc: "Create a new group.", intro: "Name, describe, categorize, create.", emoji: "🏗️",
    elements: [
      { id: "BH1", name: "Group name input (50 chars)", type: "input", loc: "Form", short: "Name your group.", long: "Visible in lobby, rankings, search. Must be unique." },
      { id: "BH2", name: "Group description textarea", type: "input", loc: "Form", short: "Describe your group.", long: "Free text. Visible in Discover tab." },
      { id: "BH3", name: "Group category dropdown", type: "input", loc: "Form", short: "Pick primary category.", long: "Determines placement in filtered views." },
      { id: "BH4", name: "CREATE GROUP button", type: "button", loc: "Bottom", short: "Create the group.", long: "You become Leader. Immediately visible in Discover." }
    ]
  },
  { id: "BI", route: "/groups", title: "GvG Challenge Modal", subtitle: "From Group Detail", heroTag: "War.", heroDesc: "Challenge another group to Group vs Group battle.", intro: "Search for opponent, set topic, choose format.", emoji: "⚔️",
    elements: [
      { id: "BI1", name: "Opponent search input (100 chars)", type: "input", loc: "Top", short: "Search for a group to challenge.", long: "Live search results below." },
      { id: "BI2", name: "Opponent search results", type: "link", loc: "Below search", short: "Tap a group to select as opponent.", long: "Shows matching groups as you type." },
      { id: "BI3", name: "Clear selected opponent (✕)", type: "button", loc: "Selection", short: "Deselect chosen group.", long: "Search for a different group." },
      { id: "BI4", name: "Selected opponent display", type: "display", loc: "Selection", short: "Shows selected opponent group.", long: "Confirms name and info." },
      { id: "BI5", name: "Topic text input (200 chars)", type: "input", loc: "Form", short: "Set debate topic for GvG.", long: "Both groups see this before accepting." },
      { id: "BI6", name: "Category select dropdown", type: "input", loc: "Form", short: "Pick category for this GvG.", long: "Should match topic." },
      { id: "BI7", name: "Format pills — 1v1 / 3v3 / 5v5", type: "button", loc: "Form", short: "Choose how many debaters per group.", long: "Leader selects participants after challenge accepted." },
      { id: "BI8", name: "SEND CHALLENGE ⚔️", type: "button", loc: "Bottom", short: "Send the GvG challenge.", long: "Notification goes to opponent group Leaders/Co-Leaders." },
      { id: "BI9", name: "✕ Close button", type: "button", loc: "Top-right", short: "Close without sending.", long: "Nothing sent." },
      { id: "BI10", name: "Backdrop tap to close", type: "gesture", loc: "Background", short: "Tap outside to dismiss.", long: "Same as BI9." }
    ]
  }
];

// ─── TYPE COLORS ───
const TYPE_COLORS = {
  button: { bg: "rgba(255,26,117,0.15)", border: "rgba(255,26,117,0.4)", text: "#ff1a75", label: "BUTTON" },
  input: { bg: "rgba(0,255,238,0.12)", border: "rgba(0,255,238,0.35)", text: "#00ffee", label: "INPUT" },
  link: { bg: "rgba(255,136,0,0.12)", border: "rgba(255,136,0,0.35)", text: "#ff8800", label: "LINK" },
  toggle: { bg: "rgba(160,100,255,0.12)", border: "rgba(160,100,255,0.35)", text: "#a064ff", label: "TOGGLE" },
  display: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.15)", text: "#7a8298", label: "DISPLAY" },
  gesture: { bg: "rgba(80,200,120,0.12)", border: "rgba(80,200,120,0.35)", text: "#50c878", label: "GESTURE" }
};

export default function UserGuide() {
  const [activeScreen, setActiveScreen] = useState(0);
  const [activeElement, setActiveElement] = useState(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const panelRef = useRef(null);

  const screen = SCREENS[activeScreen];
  const totalElements = SCREENS.reduce((sum, s) => sum + s.elements.length, 0);

  const filteredScreens = search
    ? SCREENS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.subtitle.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.elements.some(e => e.name.toLowerCase().includes(search.toLowerCase()))
      )
    : SCREENS;

  useEffect(() => { setActiveElement(null); }, [activeScreen]);

  const goTo = (idx) => { setActiveScreen(idx); window.scrollTo(0, 0); };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#000", fontFamily: "'Antonio', sans-serif", color: "#b8c0d0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ width: 280, minWidth: 280, background: "#111118", borderRight: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize: 14, letterSpacing: 4, color: "#00ffee", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
              <span style={{ color: "#ff1a75" }}>THE</span>MODERATOR
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5060", letterSpacing: "0.15em" }}>
              {SCREENS.length} SCREENS · {totalElements} ELEMENTS
            </div>
          </div>
          <div style={{ padding: "8px 12px" }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search screens or elements..."
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", color: "#e8eaf0", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {filteredScreens.map((s) => {
              const idx = SCREENS.indexOf(s);
              const isActive = idx === activeScreen;
              return (
                <button key={s.id} onClick={() => goTo(idx)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: isActive ? "rgba(0,255,238,0.08)" : "none", border: "none", borderLeft: isActive ? "3px solid #00ffee" : "3px solid transparent", color: isActive ? "#e8eaf0" : "#7a8298", fontFamily: "'Antonio', sans-serif", fontSize: 13, padding: "7px 14px", cursor: "pointer", letterSpacing: "0.5px" }}>
                  <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{s.emoji}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ color: isActive ? "#00ffee" : "#4a5060", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginRight: 6 }}>{s.id}</span>
                    {s.title}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a5060" }}>{s.elements.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* TOP BAR */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "rgba(6,6,8,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#7a8298", cursor: "pointer", fontSize: 14 }}>☰</button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#00ffee", padding: "4px 10px", border: "1px solid #00ffee", borderRadius: 100, background: "rgba(0,255,238,0.05)" }}>
              Screen {screen.id} · {screen.title}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#7a8298" }}>
            <button disabled={activeScreen === 0} onClick={() => goTo(activeScreen - 1)} style={{ background: "none", border: "none", color: activeScreen === 0 ? "#2a2a30" : "#7a8298", cursor: activeScreen === 0 ? "default" : "pointer", fontSize: 12, fontFamily: "inherit" }}>← Prev</button>
            <span style={{ color: "#4a5060" }}>·</span>
            <button disabled={activeScreen === SCREENS.length - 1} onClick={() => goTo(activeScreen + 1)} style={{ background: "none", border: "none", color: activeScreen === SCREENS.length - 1 ? "#2a2a30" : "#7a8298", cursor: activeScreen === SCREENS.length - 1 ? "default" : "pointer", fontSize: 12, fontFamily: "inherit" }}>Next →</button>
          </div>
        </div>

        {/* HERO */}
        <div style={{ padding: "40px 28px 20px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.3em", color: "#ff1a75", textTransform: "uppercase", marginBottom: 10 }}>
            Screen {screen.id} · {screen.route}
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 700, lineHeight: 1, color: "#e8eaf0", textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 12 }}>
            {screen.heroTag.split(/(\s)/).map((w, i) => {
              const keywords = ["see", "fight", "verdict", "bait", "gate", "judge", "in", "everything", "home", "weapon", "you", "ammo", "controls", "tribe", "crew", "seat", "good", "format", "best", "wrong", "market", "sources", "call", "record", "over", "up"];
              return keywords.some(k => w.toLowerCase().includes(k))
                ? <span key={i} style={{ color: "#00ffee" }}>{w}</span>
                : <span key={i}>{w}</span>;
            })}
          </h1>
          <p style={{ fontSize: 16, color: "#7a8298", maxWidth: 640, lineHeight: 1.55 }}>{screen.heroDesc}</p>
        </div>

        {/* ELEMENTS LIST */}
        <div style={{ padding: "0 28px 60px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          {screen.elements.length === 0 ? (
            <div style={{ padding: "40px 32px", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>📄</div>
              <div style={{ fontSize: 18, color: "#e8eaf0", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>No interactive elements</div>
              <div style={{ fontSize: 14, color: "#7a8298" }}>{screen.intro}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4a5060", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
                {screen.elements.length} interactive element{screen.elements.length !== 1 ? "s" : ""}
              </div>
              {screen.elements.map((el) => {
                const tc = TYPE_COLORS[el.type] || TYPE_COLORS.display;
                const isOpen = activeElement === el.id;
                return (
                  <div key={el.id} onClick={() => setActiveElement(isOpen ? null : el.id)}
                    style={{ background: isOpen ? "rgba(22,28,38,0.9)" : "rgba(22,28,38,0.5)", border: `1px solid ${isOpen ? tc.border : "rgba(255,255,255,0.08)"}`, borderRadius: 16, padding: isOpen ? "24px" : "16px 20px", cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#00ffee", color: "#000", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isOpen ? "0 0 20px rgba(0,255,238,0.3)" : "none", flexShrink: 0 }}>
                        {el.id.replace(screen.id, "")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#ff1a75", letterSpacing: "0.2em" }}>{el.id}</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: tc.text, background: tc.bg, border: `1px solid ${tc.border}`, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.1em" }}>{tc.label}</span>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "#e8eaf0", textTransform: "uppercase", letterSpacing: 0 }}>{el.name}</div>
                      </div>
                      <span style={{ color: "#4a5060", fontSize: 18, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#ff8800", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 18, height: 1, background: "#ff8800", display: "inline-block" }}></span>
                            In plain English
                          </div>
                          <div style={{ fontSize: 17, color: "#e8eaf0", lineHeight: 1.5 }}>{el.short}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#ff8800", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 18, height: 1, background: "#ff8800", display: "inline-block" }}></span>
                            Deeper cut
                          </div>
                          <div style={{ fontSize: 14, color: "#b8c0d0", lineHeight: 1.7 }}>{el.long}</div>
                        </div>
                        <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4a5060", letterSpacing: "0.15em" }}>
                          LOCATION: {el.loc}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 28px 40px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4a5060", letterSpacing: "0.1em", textTransform: "uppercase", width: "100%" }}>
          <span>themoderator.app · Interactive User Guide</span>
          <span>Screen {screen.id} of {SCREENS.length} · {totalElements} elements total</span>
        </div>
      </div>
    </div>
  );
}
