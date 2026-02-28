// ============================================================
// COLOSSEUM DISCORD BOT — "Settle It" (Item 16.6.2)
// Intercepts arguments in Discord servers.
// /settle command → rich embed poll + link back to Colosseum.
// PASTE HERE markers = human action required.
//
// DEPLOYMENT: Railway (free) or Render (free)
// See DEPLOYMENT section at bottom of file.
// ============================================================

const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  Events
} = require('discord.js');

// ========== CONFIGURATION ==========
// Human: Go to discord.com/developers/applications → New Application
// → Bot tab → Reset Token → copy token
// Option A: Set as environment variables in Railway/Render (recommended)
// Option B: PASTE values below:
const BOT_TOKEN = process.env.BOT_TOKEN || 'PASTE_YOUR_DISCORD_BOT_TOKEN_HERE';

// Human: From your application page → General Information → copy Application ID
const APPLICATION_ID = process.env.APPLICATION_ID || 'PASTE_YOUR_DISCORD_APPLICATION_ID_HERE';

// Your Colosseum landing page base URL
const COLOSSEUM_URL = process.env.COLOSSEUM_URL || 'https://colosseum-six.vercel.app';

// Branding
const COLOSSEUM_COLOR = 0x1a2d4a; // Navy from design system
const COLOSSEUM_GOLD = 0xd4a726;
const COLOSSEUM_RED = 0xcc3333;

// ========== VOTE TRACKING (in-memory, resets on restart) ==========
// Real persistence happens on The Colosseum website
const debates = new Map();

// ========== HELPERS ==========
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);
}

function buildVoteBar(pct) {
  const filled = Math.round(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function buildDebateEmbed(topic, debate, starter) {
  const total = debate.yes + debate.no;
  const yesPct = total > 0 ? Math.round((debate.yes / total) * 100) : 50;
  const noPct = total > 0 ? 100 - yesPct : 50;
  const slug = slugify(topic);
  const debateUrl = `${COLOSSEUM_URL}/debate?topic=${encodeURIComponent(slug)}&cat=trending&ref=discord`;

  const embed = new EmbedBuilder()
    .setColor(COLOSSEUM_COLOR)
    .setTitle(`⚔️ ${topic}`)
    .setDescription(
      `**Cast your vote below** 👇\n\n` +
      `🟢 **YES** ${buildVoteBar(yesPct)} **${yesPct}%** (${debate.yes})\n` +
      `🔴 **NO** ${buildVoteBar(noPct)} **${noPct}%** (${debate.no})\n\n` +
      `📊 Total votes: **${total}**`
    )
    .setFooter({
      text: `⚔️ Settle YOUR debate → thecolosseum.app${starter ? ` | Started by ${starter}` : ''}`
    })
    .setTimestamp();

  if (total >= 10) {
    const winner = yesPct > noPct ? 'YES' : yesPct < noPct ? 'NO' : 'TIED';
    embed.addFields({
      name: '🏆 Current Leader',
      value: winner === 'TIED' ? "It's a dead heat!" : `**${winner}** by ${Math.abs(yesPct - noPct)} points`,
      inline: true
    });
  }

  return { embed, debateUrl };
}

function buildVoteButtons(debateId, debateUrl) {
  const voteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vote_yes_${debateId}`)
      .setLabel('YES')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🟢'),
    new ButtonBuilder()
      .setCustomId(`vote_no_${debateId}`)
      .setLabel('NO')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔴'),
  );

  const linkRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('⚔️ Full Debate on The Colosseum')
      .setStyle(ButtonStyle.Link)
      .setURL(debateUrl),
  );

  return [voteRow, linkRow];
}

// ========== SLASH COMMANDS ==========
const commands = [
  new SlashCommandBuilder()
    .setName('settle')
    .setDescription('Start a debate and let the server vote')
    .addStringOption(opt =>
      opt.setName('topic')
        .setDescription('The debate topic (e.g., "Is Mahomes the GOAT?")')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('hottake')
    .setDescription('Drop a hot take for reactions')
    .addStringOption(opt =>
      opt.setName('take')
        .setDescription('Your hot take (e.g., "The Lakers are frauds")')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('trending')
    .setDescription('See trending debates on The Colosseum'),

  new SlashCommandBuilder()
    .setName('colosseum')
    .setDescription('Learn about The Colosseum'),
];

// ========== BOT CLIENT ==========
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ========== REGISTER SLASH COMMANDS ON READY ==========
client.once(Events.ClientReady, async (c) => {
  console.log(`⚔️ Colosseum Discord Bot logged in as ${c.user.tag}`);
  console.log(`⚔️ In ${c.guilds.cache.size} servers`);

  // Register slash commands globally
  const rest = new REST().setToken(BOT_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(APPLICATION_ID), {
      body: commands.map(cmd => cmd.toJSON()),
    });
    console.log('⚔️ Slash commands registered globally');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }

  // Set bot status
  c.user.setPresence({
    activities: [{ name: '⚔️ /settle to start a debate', type: 3 }], // "Watching"
    status: 'online',
  });
});

// ========== COMMAND HANDLER ==========
client.on(Events.InteractionCreate, async (interaction) => {

  // ── SLASH COMMANDS ──
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // /settle
    if (commandName === 'settle') {
      const topic = interaction.options.getString('topic');
      const debateId = `${interaction.channelId}_${Date.now()}`;
      const starter = interaction.user.username;

      // Initialize tracking
      debates.set(debateId, {
        topic,
        yes: 0,
        no: 0,
        voters: new Set(),
        starter,
        channelId: interaction.channelId,
        createdAt: Date.now(),
      });

      const { embed, debateUrl } = buildDebateEmbed(topic, { yes: 0, no: 0 }, starter);
      const buttons = buildVoteButtons(debateId, debateUrl);

      await interaction.reply({
        embeds: [embed],
        components: buttons,
      });

      // Auto-cleanup after 24 hours
      setTimeout(() => debates.delete(debateId), 24 * 60 * 60 * 1000);
    }

    // /hottake
    else if (commandName === 'hottake') {
      const take = interaction.options.getString('take');
      const slug = slugify(take);
      const debateUrl = `${COLOSSEUM_URL}/debate?topic=${encodeURIComponent(slug)}&cat=trending&ref=discord`;
      const takeId = `take_${Date.now()}`;

      const embed = new EmbedBuilder()
        .setColor(COLOSSEUM_RED)
        .setTitle('🔥 HOT TAKE')
        .setDescription(
          `"${take}"\n` +
          `— ${interaction.user.username}\n\n` +
          `React below 👇`
        )
        .setFooter({ text: '⚔️ Settle YOUR debate → thecolosseum.app' })
        .setTimestamp();

      const reactRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`react_fire_${takeId}`)
          .setLabel('🔥 FIRE (0)')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`react_trash_${takeId}`)
          .setLabel('🗑️ TRASH (0)')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`react_bet_${takeId}`)
          .setLabel('⚔️ BET. (0)')
          .setStyle(ButtonStyle.Primary),
      );

      const linkRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Debate this on The Colosseum')
          .setStyle(ButtonStyle.Link)
          .setURL(debateUrl),
      );

      // Track reactions
      debates.set(takeId, { fire: 0, trash: 0, bet: 0, reactors: new Set() });

      await interaction.reply({
        embeds: [embed],
        components: [reactRow, linkRow],
      });

      setTimeout(() => debates.delete(takeId), 24 * 60 * 60 * 1000);
    }

    // /trending
    else if (commandName === 'trending') {
      // Placeholder data — will pull from Supabase when real debates exist
      const trending = [
        { topic: 'Is Mahomes better than Josh Allen?', votes: 2847, split: '62/38' },
        { topic: 'Should college athletes get paid more?', votes: 1923, split: '71/29' },
        { topic: 'Are the Lakers a real contender?', votes: 1456, split: '44/56' },
        { topic: 'Trump tariffs: good or bad for economy?', votes: 3102, split: '48/52' },
        { topic: 'Is Beyoncé the greatest performer ever?', votes: 2234, split: '67/33' },
      ];

      let desc = '';
      trending.forEach((d, i) => {
        desc += `**${i + 1}. ${d.topic}**\n`;
        desc += `📊 ${d.votes.toLocaleString()} votes — ${d.split} split\n\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(COLOSSEUM_GOLD)
        .setTitle('📊 TRENDING ON THE COLOSSEUM')
        .setDescription(desc)
        .setFooter({ text: '⚔️ Settle YOUR debate → thecolosseum.app' })
        .setTimestamp();

      const linkRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('⚔️ Vote Now on The Colosseum')
          .setStyle(ButtonStyle.Link)
          .setURL(COLOSSEUM_URL),
      );

      await interaction.reply({ embeds: [embed], components: [linkRow] });
    }

    // /colosseum
    else if (commandName === 'colosseum') {
      const embed = new EmbedBuilder()
        .setColor(COLOSSEUM_COLOR)
        .setTitle('⚔️ The Colosseum — Where Opinions Fight')
        .setDescription(
          `The Colosseum is a live opinion arena where hot takes become real debates.\n\n` +
          `**How it works:**\n` +
          `1️⃣ Someone drops a hot take\n` +
          `2️⃣ People vote and react\n` +
          `3️⃣ Disagreements escalate to live audio debates\n` +
          `4️⃣ The crowd decides who wins\n\n` +
          `**In this server:**\n` +
          `• \`/settle [topic]\` — Start a vote\n` +
          `• \`/hottake [take]\` — Drop a spicy take\n` +
          `• \`/trending\` — See what's hot\n\n` +
          `No signup needed to vote. Arguments settled, friendships tested.`
        )
        .setFooter({ text: '⚔️ Settle YOUR debate → thecolosseum.app' })
        .setTimestamp();

      const linkRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🏛️ Enter The Colosseum')
          .setStyle(ButtonStyle.Link)
          .setURL(COLOSSEUM_URL),
      );

      await interaction.reply({ embeds: [embed], components: [linkRow] });
    }
  }

  // ── BUTTON INTERACTIONS ──
  else if (interaction.isButton()) {
    const customId = interaction.customId;
    const userId = interaction.user.id;

    // VOTE BUTTONS
    const voteYes = customId.match(/^vote_yes_(.+)$/);
    const voteNo = customId.match(/^vote_no_(.+)$/);

    if (voteYes || voteNo) {
      const debateId = voteYes ? voteYes[1] : voteNo[1];
      const side = voteYes ? 'yes' : 'no';
      const debate = debates.get(debateId);

      if (!debate) {
        await interaction.reply({ content: '⚔️ This debate has expired. Start a new one with `/settle`', ephemeral: true });
        return;
      }

      if (debate.voters.has(userId)) {
        await interaction.reply({ content: '⚔️ You already voted! One vote per gladiator.', ephemeral: true });
        return;
      }

      debate.voters.add(userId);
      debate[side]++;

      const { embed, debateUrl } = buildDebateEmbed(debate.topic, debate, debate.starter);
      const buttons = buildVoteButtons(debateId, debateUrl);

      await interaction.update({ embeds: [embed], components: buttons });
    }

    // HOT TAKE REACTIONS
    const fireMatch = customId.match(/^react_fire_(.+)$/);
    const trashMatch = customId.match(/^react_trash_(.+)$/);
    const betMatch = customId.match(/^react_bet_(.+)$/);

    if (fireMatch || trashMatch || betMatch) {
      const takeId = fireMatch ? fireMatch[1] : trashMatch ? trashMatch[1] : betMatch[1];
      const reaction = fireMatch ? 'fire' : trashMatch ? 'trash' : 'bet';
      const take = debates.get(takeId);

      if (!take) {
        await interaction.reply({ content: '🔥 This hot take has expired.', ephemeral: true });
        return;
      }

      if (take.reactors.has(userId)) {
        await interaction.reply({ content: '🔥 You already reacted!', ephemeral: true });
        return;
      }

      take.reactors.add(userId);
      take[reaction]++;

      // Update buttons with new counts
      const reactRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`react_fire_${takeId}`)
          .setLabel(`🔥 FIRE (${take.fire})`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`react_trash_${takeId}`)
          .setLabel(`🗑️ TRASH (${take.trash})`)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`react_bet_${takeId}`)
          .setLabel(`⚔️ BET. (${take.bet})`)
          .setStyle(ButtonStyle.Primary),
      );

      // Keep the existing link button
      const existingComponents = interaction.message.components;
      const linkRow = existingComponents.length > 1 ? existingComponents[1] : null;

      const components = linkRow ? [reactRow, linkRow] : [reactRow];

      await interaction.update({ components });
    }
  }
});

// ========== START BOT ==========
client.login(BOT_TOKEN).catch(err => {
  console.error('⚔️ Failed to login:', err.message);
  console.error('Make sure BOT_TOKEN is set correctly.');
  process.exit(1);
});


// ============================================================
// DEPLOYMENT INSTRUCTIONS
// ============================================================
//
// STEP 1: CREATE YOUR DISCORD APPLICATION
// ────────────────────────
// 1. Go to https://discord.com/developers/applications
// 2. Click "New Application" → name it "The Colosseum"
// 3. General Information tab:
//    - Copy APPLICATION ID → PASTE into APPLICATION_ID above (line 24)
//    - Description: "⚔️ Settle arguments. /settle to start a debate."
//    - Upload your Colosseum logo as the app icon
// 4. Bot tab:
//    - Click "Add Bot" (if not already created)
//    - Click "Reset Token" → copy the token
//    - PASTE token into BOT_TOKEN above (line 20)
//    - Turn ON: "Public Bot" (so others can invite)
//    - Turn ON: "Message Content Intent" (optional, for future features)
// 5. OAuth2 tab → URL Generator:
//    - Scopes: bot, applications.commands
//    - Bot Permissions: Send Messages, Embed Links, Use Slash Commands,
//      Read Message History, Add Reactions
//    - Copy the generated URL — this is your INVITE LINK
//
// STEP 2: DEPLOY TO RAILWAY (FREE)
// ────────────────────────
// 1. Go to railway.com → sign up free (GitHub login)
// 2. New Project → Deploy from GitHub repo (or upload files)
// 3. Upload these 2 files:
//    - colosseum-discord-bot.js
//    - package.json (see below)
// 4. Set environment variables in Railway dashboard:
//    - BOT_TOKEN = your Discord bot token
//    - APPLICATION_ID = your application ID
// 5. Deploy. Bot comes online.
//
// ALTERNATIVE: Render (free)
// 1. Go to render.com → New Web Service
// 2. Build Command: npm install
// 3. Start Command: node colosseum-discord-bot.js
// 4. Set same env vars
//
// STEP 3: INVITE BOT TO SERVERS
// ────────────────────────
// 1. Use the OAuth2 URL from Step 1.5
// 2. Start with YOUR test server
// 3. Then invite to 5-10 sports Discord servers:
//    - Search for: NFL, NBA, Fantasy Football, Sports Betting,
//      College Football Discord servers
//    - Message server admins: "Hey, built a debate bot that creates
//      instant polls with /settle — free, no spam. Want to try it?"
// 4. Target servers with 500+ members and active general/debate channels
//
// STEP 4: TEST
// ────────────────────────
// 1. In your test server, type /settle
// 2. Fill in topic: "Is Mahomes the GOAT?"
// 3. Should see rich embed with YES/NO buttons + Colosseum link
// 4. Click vote buttons — counts should update live
// 5. Test /hottake and /trending too
//
// package.json for this bot:
// {
//   "name": "colosseum-discord-bot",
//   "version": "1.0.0",
//   "main": "colosseum-discord-bot.js",
//   "scripts": {
//     "start": "node colosseum-discord-bot.js"
//   },
//   "dependencies": {
//     "discord.js": "^14.14.1"
//   }
// }
// ============================================================
