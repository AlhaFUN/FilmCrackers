require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// === JSONBin settings handlers ===
const getSettings = async () => {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY }
  });
  const json = await res.json();
  return json.record;
};

const saveSettings = async (data) => {
  await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': process.env.JSONBIN_API_KEY
    },
    body: JSON.stringify(data)
  });
};

// === Bot ready ===
client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// === Handle messages ===
client.on('messageCreate', async (message) => {
  const settings = await getSettings();

  // === ADMIN COMMANDS ===
  if (message.member?.permissions.has('Administrator')) {
    const args = message.content.trim().split(/\s+/);

    // -- !autoreact
    if (args[0] === '!autoreact') {
      const sub = args[1];

      if (sub === 'enable') {
        settings.enabled = true;
        settings.channelId = message.channel.id;
        await saveSettings(settings);
        return message.reply(`✅ Auto-react enabled in this channel!`);
      }

      if (sub === 'disable') {
        settings.enabled = false;
        await saveSettings(settings);
        return message.reply(`❌ Auto-react disabled.`);
      }

      if (sub === 'setemojis') {
        if (args.length < 4)
          return message.reply('⚠️ Usage: `!autoreact setemojis 😄 👎`');
        settings.emojis = [args[2], args[3]];
        await saveSettings(settings);
        return message.reply(`✅ Emojis updated to ${args[2]} and ${args[3]}`);
      }

      if (sub === 'status') {
        const channelMention = settings.channelId ? `<#${settings.channelId}>` : 'None';
        const emojiText = settings.emojis.join(' ');
        const statusText = settings.enabled ? '✅ Enabled' : '❌ Disabled';
        return message.reply(
          `🔧 **AutoReact Status:**\n` +
          `• Status: ${statusText}\n` +
          `• Channel: ${channelMention}\n` +
          `• Emojis: ${emojiText}`
        );
      }

      return message.reply(
        `ℹ️ Commands:
\`!autoreact enable\` – Enable in this channel
\`!autoreact disable\` – Disable
\`!autoreact setemojis 😀 😡\` – Set custom emojis
\`!autoreact status\` – View current status`
      );
    }

    // -- !dm
    if (args[0] === '!dm') {
      const userId = args[1];
      const dmMessage = args.slice(2).join(' ');

      if (!userId || !dmMessage) {
        return message.reply('⚠️ Usage: `!dm <userID> <your message>`');
      }

      try {
        const user = await client.users.fetch(userId);
        await user.send(dmMessage);
        return message.reply(`✅ DM sent to <@${userId}>.`);
      } catch (err) {
        console.error(`❌ Failed to DM ${userId}`, err);
        return message.reply(`❌ Failed to send DM. Make sure the user ID is correct and the user allows DMs.`);
      }
    }
  }

  // === AUTO REACT ===
  if (
    settings.enabled &&
    message.channel.id === settings.channelId &&
    (!message.author.bot || message.webhookId)
  ) {
    for (const emoji of settings.emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        console.error(`❌ Failed to react with ${emoji}`, err);
      }
    }
  }
});

// === Keep alive server ===
const app = express();
app.get('/', (_req, res) => res.send('OK'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🌐 Ping server listening on port ${PORT}`));

// === Login ===
client.login(process.env.TOKEN);
