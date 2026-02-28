#!/usr/bin/env node
// ============================================================
// THE COLOSSEUM — Discord Slash Command Registration
// ============================================================
// Run ONCE to register the /settle command with Discord:
//   node discord-register.js
// ============================================================

// ── PASTE HERE ──────────────────────────────────────────────
const DISCORD_APP_ID = 'PASTE_DISCORD_APPLICATION_ID_HERE';
const DISCORD_BOT_TOKEN = 'PASTE_DISCORD_BOT_TOKEN_HERE';
// Get both from Discord Developer Portal → Your Application
// ─────────────────────────────────────────────────────────────

const DISCORD_API = 'https://discord.com/api/v10';

const commands = [
  {
    name: 'settle',
    description: 'Start a debate in The Colosseum ⚔️',
    type: 1, // CHAT_INPUT
    options: [
      {
        name: 'topic',
        description: 'What are we debating? (e.g. "Is Mahomes better than Allen?")',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

async function registerCommands() {
  if (DISCORD_APP_ID.includes('PASTE') || DISCORD_BOT_TOKEN.includes('PASTE')) {
    console.error('❌ Paste your Discord Application ID and Bot Token first!');
    console.error('   Open this file and replace the PASTE_HERE values.');
    process.exit(1);
  }

  console.log('⚔️ Registering Colosseum slash commands with Discord...\n');

  const url = `${DISCORD_API}/applications/${DISCORD_APP_ID}/commands`;

  for (const command of commands) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify(command),
    });

    const data = await res.json();

    if (res.ok) {
      console.log(`✅ /${command.name} — registered (ID: ${data.id})`);
    } else {
      console.error(`❌ /${command.name} — failed:`, data);
    }
  }

  console.log('\n⚔️ Done. Commands take up to 1 hour to appear globally.');
  console.log('   (Guild-specific commands appear instantly for testing.)');
}

registerCommands().catch(console.error);
