# THE MODERATOR — SECURITY & IDENTITY ROADMAP
### Created: Session 196 (March 30, 2026)

> **What this is:** A phased implementation plan for hardening admin infrastructure and rolling out hardware-backed identity features to users. Organized by user count milestones. Each phase builds on the previous one.
>
> **Source:** Research session covering AI cybersecurity threats (2026), YubiKey capabilities, WebAuthn/FIDO2 standards, passkey implementations, time-lock cryptography, and real-world breach case studies (Cloudflare vs. Twilio, Moltbook/Supabase).
>
> **Guiding principle:** Admin security comes before user features. You can't protect users if your own front door is open.

---

## PRE-LAUNCH: 0 USERS (DO NOW)

### Priority: Protect the founder. Everything else is downstream of this.

**These items have zero dependency on user count. They protect the infrastructure that everything else runs on.**

#### A. YubiKey Admin Lockdown

Execute the YubiKey Implementation Plan (THE-MODERATOR-YUBIKEY-PLAN.md) with corrections identified in Session 196 research:

- Register hardware keys on all admin dashboards that support FIDO2: GitHub, Vercel, Cloudflare, Stripe, email provider, domain registrar
- For services that only support TOTP (Supabase, DigitalOcean): store TOTP seeds on YubiKey via Yubico Authenticator — seeds never live on a phone app
- Lock VPS SSH behind YubiKey-backed ed25519-sk keys (Phase 2 of YubiKey plan)
- Stand up KeePassXC vault with YubiKey challenge-response (Phase 3 of YubiKey plan)
- Change default YubiKey PIN (123456) and admin PIN (12345678) before registering anywhere
- Note: YubiKey 5.7 NFC is disabled by default out of the box — must USB-plug for 3 seconds first

**Corrections to YubiKey plan identified by research:**
- DigitalOcean: no FIDO2 support. TOTP only via Yubico Authenticator.
- Supabase dashboard: no FIDO2 support. TOTP only via Yubico Authenticator.
- Stripe: only ONE security key allowed. Must set up SMS or TOTP before security key option appears.
- Price: $58/key ($116 total), not $50-55.
- YubiKey firmware cannot be updated — must buy keys manufactured after May 2024 (firmware 5.7+).
- GPG keytocard (Phase 4) is destructive — must backup .gnupg before each YubiKey transfer, restore, repeat.
- KeePassDX and KeePassXC challenge-response implementations are not cross-compatible. Test both before migrating credentials.
- Phase 1 service order should be: email first (highest blast radius), then GitHub, Supabase, Vercel, DigitalOcean, Cloudflare, Stripe, domain registrar.

**STATUS: COMPLETE (Sessions 3-4).** 7/8 services locked down. Stripe skipped (no payments live). Both keys have FIDO2 PINs set. Supabase and Vercel TOTP seeds on primary YubiKey via Yubico Authenticator. Second YubiKey TOTP seeds still deferred.

#### B. Service Hardening

- Rotate Supabase service role key on VPS — ensure old legacy JWT key is not stored anywhere except inside Supabase's own Edge Function runtime
- Enable Supabase leaked password protection (HaveIBeenPwned integration in Auth settings) — requires Pro plan
- Enable "Secure password change" and "Require current password when updating" in Supabase Auth settings
- Set billing alerts on Supabase (N/A on free plan — Supabase just throttles)
- Confirm RLS is enabled on every table including anything added since last audit

**STATUS: COMPLETE (Sessions 3-4).** Service role key rotated. Leaked password protection enabled (Pro plan activated). Password hardening enabled. RLS audit: 55/55 tables covered.

#### C. Negative Testing Protocol

After YubiKey setup is complete, verify it actually blocks unauthorized access:

- Try logging into each locked service WITHOUT the YubiKey — confirm it's blocked
- Try SSH to VPS with password — confirm it's rejected
- Query tables with anon key — confirm RLS blocks appropriately
- Attempt direct INSERT bypassing RPCs — confirm it fails

**STATUS: DEFERRED.** Not yet performed.

---

## PHASE 1: 100+ USERS

### Priority: Build the passkey infrastructure. Ship the Verified Gladiator badge.

#### A. WebAuthn Edge Function + User Passkey Table

- Create `user_passkeys` table: user_id (FK to auth.users), credential_id, public_key, sign_count, created_at
- Build Supabase Edge Function for WebAuthn registration (navigator.credentials.create) and assertion (navigator.credentials.get)
- Edge Function validates attestation, stores credential, returns success
- Client-side: browser-native WebAuthn API — no SDK, no library. Phone biometrics (fingerprint, face scan) work as passkeys through the browser's built-in WebAuthn. No hardware purchase required for users.
- `check_user_passkey(user_id)` RPC — returns boolean, used by other systems to gate features

#### B. Verified Gladiator Badge

- Users who complete WebAuthn registration get the Verified Gladiator badge on their profile
- Badge is visible in debate rooms, leaderboards, profile pages
- No gameplay advantage — pure status signal
- Creates organic demand: "How do I get that badge?"
- Gentle prompt after 7+ days of activity: "Verify your identity to earn the Verified Gladiator badge"

---

## PHASE 2: 1,000+ USERS

### Priority: Use passkeys to protect competitive integrity and create B2B value.

#### A. Ranked Passkey Gate

- User tries to enter Ranked → system checks `check_user_passkey(user_id)`
- If no passkey → prompt: "Ranked debates require identity verification. Tap to verify." → WebAuthn flow
- If passkey exists → proceed normally
- Casual remains completely open — no verification needed

**Why this matters:** At 1,000+ users, bot accounts and alt accounts become a real problem for competitive integrity. Passkey verification means every Ranked debater is a cryptographically verified human. No bot farm can fake a fingerprint scan. This is a stronger anti-cheat than any CAPTCHA or phone verification.

#### B. Moderator Presence Verification

F-47 Moderator Marketplace is already built. Add physical presence proof:

- Claiming a moderation slot requires a passkey tap (WebAuthn assertion)
- During active moderation, periodic presence checks every 120 seconds: "Still watching? Tap to confirm."
- If presence check fails → moderator status pauses, debaters notified, mod_dropout timer starts
- Integrates with existing `record_mod_dropout` and cooldown system
- Prevents ghost moderators who claim slots but don't actually watch

#### C. Verified Prediction Sealing

Predictions from passkey-verified users get an additional integrity layer:

- Prediction vote is hashed with the user's credential ID at submission time
- Hash stored alongside the vote
- When debate ends and predictions resolve, the hash chain is verifiable: this specific verified user made this specific prediction at this specific time
- Not full time-lock encryption (premature at this scale) — just tamper-evident hashing
- B2B value: "Our prediction data is hardware-signed by verified humans"

#### D. Challenge Link Identity Proof (F-39 Enhancement)

Embeddable challenge links (`moderator.app/challenge?topic=X&user=Y`) gain identity verification:

- Challenger creates link → link includes their credential reference
- Opponent clicks link → if they have a passkey, prompted to verify → both parties are confirmed real
- If opponent doesn't have a passkey → standard flow, no verification
- Verified challenges get a special badge in the feed: "Verified Challenge"
- Creates organic demand for passkey enrollment ("I want the verified badge on my challenges")

#### E. Orange Dot for Passkey (F-35.3 Enhancement)

The Orange Dot indicator (already specced for unclaimed token opportunities) adds a signal for unverified users:

- If user has no passkey and has been active for 7+ days → Orange Dot on profile with "Verify your identity to unlock Ranked"
- Gentle nudge, not aggressive — respects the nudge.ts suppression rules (once per session, 24h cooldown, 3/session cap)

---

## PHASE 3: 10,000+ USERS

### Priority: Monetize trust. Hardware-backed data integrity becomes a B2B selling point.

#### A. B2B Verified Data Feed

The War Chest B2B strategy gains a verification dimension:

- Verified user debates are flagged in the data feed
- B2B buyers can filter for verified-only data
- Alt-data buyers know their data is polluted. The Moderator can say: "Our competitive debate data is cryptographically verified at the source." No competitor can claim this.

#### B. Verified Group Leadership

Groups (already built) add verification requirements for leadership roles:

- Group Leader must be passkey-verified
- Co-Leader must be passkey-verified
- Regular members: no requirement
- This prevents bot-created groups from gaming the GvG system
- Existing leaders who haven't verified get a grace period (30 days) before requirement kicks in

#### C. Tournament Anti-Cheat (F-08 Prerequisite)

If/when tournaments are built, passkey verification is mandatory for entry:

- Every tournament participant must have a registered passkey
- Every match result is signed with participant credential references
- Tournament brackets are tamper-evident: the full chain of results can be verified
- This is the competitive integrity foundation that makes tournaments credible

#### D. Source Meta Report Enhancement (F-29)

The public Source Meta Report (already specced — weekly/monthly marketing content) adds a verification dimension:

- "Most cited source by verified debaters"
- "Highest win rate source among verified users"
- Separates signal from noise — bot-cited sources don't pollute the rankings
- Drives organic SEO and positions the platform as a serious source-quality arbiter

#### E. Time-Lock Sealed Predictions (Advanced)

If prediction volume justifies it, upgrade from tamper-evident hashing (Phase 2C) to true time-lock encryption:

- Prediction votes encrypted using drand/tlock — genuinely unreadable by anyone (including the platform) until the debate ends
- On debate completion, the drand network releases the decryption key at the scheduled time
- All predictions revealed simultaneously — no possibility of tampering, peeking, or selective disclosure
- B2B value: provably fair prediction market data
- This is complex and depends on the drand League of Entropy network — evaluate stability before committing

#### F. Passkey-Gated Subscription Perks

If/when subscription tiers go live (currently shelved):

- Verified users get a discount or bonus on subscription ($14.99 → $12.99 for verified)
- Or: certain subscription features (extended debate recordings, advanced analytics) only available to verified accounts
- Creates economic incentive for passkey adoption beyond just badge/access gating

---

## WHAT'S EXPLICITLY NOT IN THIS PLAN

- **Requiring passkeys for basic app access** — never. Guest access is default. Casual is king. The app must work for everyone without any verification.
- **Requiring users to buy hardware keys** — never. Phone biometrics (fingerprint, face scan) work as passkeys through the browser's built-in WebAuthn. Hardware keys are for Pat's admin accounts, not for users.
- **Full disk encryption, desktop login, auto-lock** — personal device features for Pat, not product features.
- **Git commit signing** — Pat uses GitHub web UI. Not applicable.
- **Physical door locks** — no physical space.
- **Native app passkey integration** — PWA first. Capacitor/TWA later. WebAuthn works in the browser.

---

## IMPLEMENTATION DEPENDENCIES

| Feature | Depends On | Phase |
|---------|-----------|-------|
| Verified Gladiator badge | WebAuthn Edge Function + user_passkeys table | Phase 1 |
| Ranked passkey gate | Verified Gladiator badge deployed + user adoption | Phase 2 |
| Moderator presence checks | F-47 complete (done) + passkey infrastructure | Phase 2 |
| Sealed predictions | Prediction system (done) + passkey infrastructure | Phase 2 |
| Challenge link verification | F-39 + F-46 (done) + passkey infrastructure | Phase 2 |
| B2B verified data feed | F-42 + passkey adoption >50% of active users | Phase 3 |
| Tournament anti-cheat | F-08 (not started) + passkey infrastructure | Phase 3 |
| Time-lock predictions | drand integration + prediction volume justification | Phase 3 |

---

## COST SUMMARY

| Phase | Item | Cost |
|-------|------|------|
| Pre-Launch | 2x YubiKey 5C NFC | $116 one-time |
| Pre-Launch | Supabase (existing plan) | $0 incremental |
| Phase 1 | WebAuthn Edge Function | $0 (Supabase free tier) |
| Phase 2 | No new costs | $0 |
| Phase 3 | drand integration (if pursued) | $0 (open source, free network) |

Total incremental cost across all phases: **$116**.

---

## RESEARCH FINDINGS THAT INFORMED THIS PLAN

**AI Threat Landscape (2026):**
- CrowdStrike 2026 Global Threat Report: AI-enabled adversary operations up 89% YoY. Average breakout time: 29 minutes. Fastest: 27 seconds.
- Moody's 2026 cyber outlook: adaptive malware, autonomous AI threats, model poisoning becoming prevalent.
- Phishing-as-a-Service kits (Starkiller, Tycoon 2FA) now run real-time reverse proxies that capture session tokens — TOTP and SMS 2FA are defeated. Only FIDO2/WebAuthn survives.

**Proof Points:**
- Google: zero successful phishing attacks across 85,000 employees after mandating hardware keys.
- Cloudflare: blocked the 0ktapus attack that breached Twilio and 130+ other companies — because employees had FIDO2 keys. Three employees entered passwords on the phishing site. Keys refused to authenticate on the wrong domain.
- CISA: MFA makes users 99% less likely to be hacked. NIST SP 800-63-4 (2025) now requires phishing-resistant MFA option.
- Moltbook (Jan 2026): Supabase app breached via missing RLS — 1.5M API keys exposed. Same stack as The Moderator. Our RLS is hardened; theirs wasn't.

**YubiKey Capabilities Used:**
- FIDO2/WebAuthn: admin dashboard login (Phase 1 of YubiKey plan), user-facing passkey verification (this roadmap)
- HMAC-SHA1 Challenge-Response: KeePassXC vault protection (Phase 3 of YubiKey plan)
- ed25519-sk: SSH key backed by hardware (Phase 2 of YubiKey plan)
- OpenPGP: encrypted backups for The Keep (Phase 4 of YubiKey plan)
- OATH-TOTP via Yubico Authenticator: fallback for services without FIDO2 (Supabase, DigitalOcean)

**Industry Consensus (Cisco, Google, Cloudflare, NIST, WEF):**
"Eat your cyber veggies" — phishing-proof MFA, least privilege, RLS/segmentation, key rotation, backup discipline. No silver bullet exists, but these basics stop the vast majority of attacks including AI-assisted ones.

---

*This plan was created in Session 196 based on web research into 2026 AI cybersecurity threats, YubiKey/FIDO2 capabilities, WebAuthn browser standards, time-lock cryptography, and company defense strategies. All user-facing features use browser-native WebAuthn — no hardware purchase required for users.*

*Pre-Launch Section A status updated Session 229 to reflect completion in Sessions 3-4.*
*Pre-Launch Section B status updated Session 229 to reflect completion in Sessions 3-4.*
*Pre-Launch Section C remains deferred.*
