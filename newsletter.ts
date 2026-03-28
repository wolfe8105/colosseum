/**
 * THE MODERATOR — Weekly Newsletter
 * F-35A: Thursday 8PM EST (01:00 UTC Friday) cron send via Resend
 * Standalone script — NOT managed by PM2, NOT part of bot army
 * Run: node dist/newsletter.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

// ─── Config ────────────────────────────────────────────────────────────────

const RESEND_API_KEY   = process.env.RESEND_API_KEY!;
const SUPABASE_URL     = process.env.SUPABASE_URL!;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FROM_EMAIL       = 'The Moderator <newsletter@themoderator.app>';
const APP_URL          = 'https://colosseum-six.vercel.app';
const SEND_CAP         = 100;   // Resend free tier: 100/day hard limit
const SEND_DELAY_MS    = 200;   // 5 req/sec rate limit safety

// ─── Supabase (service role — bypasses RLS) ────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  debates_completed: number;
  current_streak: number;
  token_balance: number;
  profile_depth_pct: number;
  level: number;
}

interface PlatformStats {
  topCategory: string;
  trendingTopic: string;
  totalDebatesThisWeek: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg: string): void {
  console.log(`[NEWSLETTER] ${new Date().toISOString()} ${msg}`);
}

// ─── Data Fetching ─────────────────────────────────────────────────────────

async function fetchUsers(): Promise<UserRecord[]> {
  const allUsers: UserRecord[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    if (!data.users.length) break;

    for (const u of data.users) {
      if (u.email) allUsers.push({ id: u.id, email: u.email });
    }

    if (data.users.length < 1000) break;
    page++;
  }

  if (allUsers.length > SEND_CAP) {
    log(`⚠️  ${allUsers.length} users found — capped at ${SEND_CAP}. Upgrade Resend plan to send to all.`);
    return allUsers.slice(0, SEND_CAP);
  }

  return allUsers;
}

async function fetchProfiles(userIds: string[]): Promise<Map<string, Profile>> {
  const { data, error } = await supabase
    .from('profiles_private')
    .select('id, username, display_name, elo_rating, wins, losses, debates_completed, current_streak, token_balance, profile_depth_pct, level')
    .in('id', userIds);

  if (error) throw new Error(`profiles_private fetch failed: ${error.message}`);

  const map = new Map<string, Profile>();
  for (const row of (data ?? [])) map.set(row.id, row as Profile);
  return map;
}

async function fetchFollowCounts(userIds: string[]): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .in('follower_id', userIds);

  if (error) throw new Error(`follows fetch failed: ${error.message}`);

  const map = new Map<string, number>();
  for (const row of (data ?? [])) {
    map.set(row.follower_id, (map.get(row.follower_id) ?? 0) + 1);
  }
  return map;
}

async function fetchGroupCounts(userIds: string[]): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id')
    .in('user_id', userIds);

  if (error) throw new Error(`group_members fetch failed: ${error.message}`);

  const map = new Map<string, number>();
  for (const row of (data ?? [])) {
    map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
  }
  return map;
}

async function fetchWeeklyDebateCounts(userIds: string[]): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('arena_debates')
    .select('debater_a, debater_b')
    .in('status', ['completed'])
    .gte('created_at', since)
    .or(`debater_a.in.(${userIds.join(',')}),debater_b.in.(${userIds.join(',')})`);

  if (error) throw new Error(`arena_debates fetch failed: ${error.message}`);

  const map = new Map<string, number>();
  for (const row of (data ?? [])) {
    if (row.debater_a && userIds.includes(row.debater_a)) {
      map.set(row.debater_a, (map.get(row.debater_a) ?? 0) + 1);
    }
    if (row.debater_b && userIds.includes(row.debater_b)) {
      map.set(row.debater_b, (map.get(row.debater_b) ?? 0) + 1);
    }
  }
  return map;
}

async function fetchPlatformStats(): Promise<PlatformStats> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Top category this week
  const { data: catData } = await supabase
    .from('arena_debates')
    .select('category')
    .in('status', ['completed', 'live'])
    .gte('created_at', since);

  const catCounts = new Map<string, number>();
  for (const row of (catData ?? [])) {
    if (row.category) catCounts.set(row.category, (catCounts.get(row.category) ?? 0) + 1);
  }
  const topCategory = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Politics';

  // Total debates this week
  const totalDebatesThisWeek = catData?.length ?? 0;

  // Trending topic from v_topic_sentiment
  const { data: sentData } = await supabase
    .from('v_topic_sentiment')
    .select('topic')
    .limit(1);

  const trendingTopic = sentData?.[0]?.topic ?? 'Hot Takes';

  return { topCategory, trendingTopic, totalDebatesThisWeek };
}

// ─── Engagement Hook ────────────────────────────────────────────────────────

function getEngagementHook(profile: Profile, followCount: number, groupCount: number): string {
  if (profile.profile_depth_pct < 25) {
    return `Your profile is ${Math.round(profile.profile_depth_pct)}% complete. Hit 25% to unlock Ranked mode and start moving your Elo.`;
  }
  if (profile.current_streak === 0) {
    return `Your win streak is at zero. The arena's open right now — go start one.`;
  }
  if (followCount === 0) {
    return `You're not following anyone yet. Find debaters worth watching and get notified when they fight.`;
  }
  if (groupCount === 0) {
    return `You're going solo. Join a group to unlock Group vs Group battles and the shared fate token multiplier.`;
  }
  return `You're on a ${profile.current_streak}-debate win streak. Keep it going before someone takes you down.`;
}

// ─── Email HTML Builder ─────────────────────────────────────────────────────

function buildEmailHtml(
  profile: Profile,
  followCount: number,
  groupCount: number,
  weeklyDebates: number,
  platform: PlatformStats,
): string {
  const name = profile.display_name || profile.username || 'Gladiator';
  const hook = getEngagementHook(profile, followCount, groupCount);
  const winRate = profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
    : 0;

  const followSection = followCount > 0 ? `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <div style="background: rgba(255,255,255,0.05); border-left: 3px solid #c9a84c; border-radius: 4px; padding: 16px 20px;">
          <p style="margin: 0 0 6px 0; font-family: 'Barlow Condensed', Arial, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #c9a84c;">People You Follow</p>
          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 15px; color: #e8eaf0; line-height: 1.5;">
            You're following <strong style="color: #ffffff;">${followCount} ${followCount === 1 ? 'debater' : 'debaters'}</strong>.
            ${weeklyDebates > 0 ? `You debated <strong style="color: #ffffff;">${weeklyDebates}x</strong> yourself this week.` : `Jump in this week — the arena is active.`}
          </p>
        </div>
      </td>
    </tr>` : '';

  const groupSection = groupCount > 0 ? `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <div style="background: rgba(255,255,255,0.05); border-left: 3px solid #c9a84c; border-radius: 4px; padding: 16px 20px;">
          <p style="margin: 0 0 6px 0; font-family: 'Barlow Condensed', Arial, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #c9a84c;">Your Groups</p>
          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 15px; color: #e8eaf0; line-height: 1.5;">
            You're a member of <strong style="color: #ffffff;">${groupCount} ${groupCount === 1 ? 'group' : 'groups'}</strong>. Check your group standings and see if any GvG battles are pending.
          </p>
        </div>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Weekly Arena Report — The Moderator</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d1b2e; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0d1b2e;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a2d4a 0%, #2d5a8e 100%); border-radius: 8px 8px 0 0; padding: 32px 32px 24px 32px; text-align: center; border-bottom: 2px solid #c9a84c;">
              <p style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #c9a84c; letter-spacing: 3px; text-transform: uppercase;">⚔ THE MODERATOR</p>
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 13px; color: #8fa8c8; letter-spacing: 1px; text-transform: uppercase;">Weekly Arena Report</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #111f35; padding: 32px; border-radius: 0 0 8px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Greeting -->
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 16px; color: #e8eaf0; line-height: 1.6;">
                      What's up, <strong style="color: #ffffff;">${name}</strong>. Here's your week in the arena.
                    </p>
                  </td>
                </tr>

                <!-- Your Activity -->
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <p style="margin: 0 0 12px 0; font-family: 'Barlow Condensed', Arial, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #c9a84c;">Your Activity</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="25%" style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 4px; text-align: center; border: 1px solid rgba(201,168,76,0.2);">
                          <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #c9a84c;">${profile.elo_rating}</p>
                          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #8fa8c8; text-transform: uppercase; letter-spacing: 1px;">Elo</p>
                        </td>
                        <td width="4%"></td>
                        <td width="25%" style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 4px; text-align: center; border: 1px solid rgba(201,168,76,0.2);">
                          <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #c9a84c;">${winRate}%</p>
                          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #8fa8c8; text-transform: uppercase; letter-spacing: 1px;">Win Rate</p>
                        </td>
                        <td width="4%"></td>
                        <td width="25%" style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 4px; text-align: center; border: 1px solid rgba(201,168,76,0.2);">
                          <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #c9a84c;">${profile.current_streak}</p>
                          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #8fa8c8; text-transform: uppercase; letter-spacing: 1px;">Streak</p>
                        </td>
                        <td width="4%"></td>
                        <td width="13%" style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 4px; text-align: center; border: 1px solid rgba(201,168,76,0.2);">
                          <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #c9a84c;">${profile.token_balance}</p>
                          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; color: #8fa8c8; text-transform: uppercase; letter-spacing: 1px;">Tokens</p>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                      <tr>
                        <td style="padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 4px;">
                          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 13px; color: #8fa8c8;">
                            Profile depth: <strong style="color: #c9a84c;">${Math.round(profile.profile_depth_pct)}%</strong> &nbsp;·&nbsp;
                            Level: <strong style="color: #c9a84c;">${profile.level}</strong> &nbsp;·&nbsp;
                            Total debates: <strong style="color: #c9a84c;">${profile.debates_completed}</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Follow section (conditional) -->
                ${followSection}

                <!-- Group section (conditional) -->
                ${groupSection}

                <!-- Platform Wide -->
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <div style="background: rgba(255,255,255,0.05); border-left: 3px solid #c0392b; border-radius: 4px; padding: 16px 20px;">
                      <p style="margin: 0 0 6px 0; font-family: 'Barlow Condensed', Arial, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #e74c3c;">Platform This Week</p>
                      <p style="margin: 0; font-family: Arial, sans-serif; font-size: 15px; color: #e8eaf0; line-height: 1.6;">
                        <strong style="color: #ffffff;">${platform.totalDebatesThisWeek} debates</strong> went down this week.
                        Hottest category: <strong style="color: #ffffff;">${platform.topCategory}</strong>.
                        Trending topic: <strong style="color: #ffffff;">${platform.trendingTopic}</strong>.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Engagement Hook -->
                <tr>
                  <td style="padding: 0 0 32px 0;">
                    <div style="background: linear-gradient(135deg, rgba(26,45,74,0.8) 0%, rgba(45,90,142,0.8) 100%); border: 1px solid #c9a84c; border-radius: 6px; padding: 20px 24px;">
                      <p style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 15px; color: #e8eaf0; line-height: 1.6;">${hook}</p>
                      <a href="${APP_URL}" style="display: inline-block; background-color: #c9a84c; color: #0d1b2e; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">Enter the Arena →</a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; text-align: center;">
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #4a6080; line-height: 1.6;">
                      The Moderator · Weekly Arena Report<br />
                      You're receiving this because you have an account at themoderator.app.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Send via Resend ────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    log(`✗ Failed to send to ${to}: ${res.status} ${body}`);
    return false;
  }

  return true;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log('Starting weekly newsletter run...');

  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set in .env');
  if (!SUPABASE_URL)   throw new Error('SUPABASE_URL not set in .env');
  if (!SUPABASE_KEY)   throw new Error('SUPABASE_SERVICE_ROLE_KEY not set in .env');

  // 1. Get users
  const users = await fetchUsers();
  log(`Sending to ${users.length} users`);
  if (!users.length) { log('No users with emails found. Exiting.'); return; }

  const userIds = users.map(u => u.id);

  // 2. Batch fetch all data
  log('Fetching profile data...');
  const [profiles, followCounts, groupCounts, weeklyDebates, platform] = await Promise.all([
    fetchProfiles(userIds),
    fetchFollowCounts(userIds),
    fetchGroupCounts(userIds),
    fetchWeeklyDebateCounts(userIds),
    fetchPlatformStats(),
  ]);

  log(`Platform stats: ${platform.totalDebatesThisWeek} debates, top category: ${platform.topCategory}`);

  // 3. Send emails
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    const profile = profiles.get(user.id);
    if (!profile) {
      log(`⚠ No profile found for ${user.email} — skipping`);
      skipped++;
      continue;
    }

    const followCount  = followCounts.get(user.id)  ?? 0;
    const groupCount   = groupCounts.get(user.id)   ?? 0;
    const debateCount  = weeklyDebates.get(user.id) ?? 0;

    const html    = buildEmailHtml(profile, followCount, groupCount, debateCount, platform);
    const subject = `${profile.display_name || profile.username}, your week in the arena 🏛`;

    const ok = await sendEmail(user.email, subject, html);
    if (ok) {
      log(`✓ Sent to ${user.email}`);
      sent++;
    } else {
      failed++;
    }

    await sleep(SEND_DELAY_MS);
  }

  log(`Done. Sent: ${sent} | Failed: ${failed} | Skipped: ${skipped}`);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
