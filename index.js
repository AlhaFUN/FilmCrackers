require('dotenv').config();
const fetch = require('node-fetch');
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const getSettings = async () => {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': process.env.JSONBIN_API_KEY }
    });
    const json = await res.json();
    return json.record;
  } catch (err) {
    console.error('❌ Failed to load settings from JSONBin:', err);
    return null;
  }
};

const saveSettings = async (data) => {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.JSONBIN_API_KEY
      },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.error('❌ Failed to save settings to JSONBin:', err);
  }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let settings = null;

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  settings = await getSettings();

  if (!settings) {
    settings = {
      enabled: false,
      channelId: process.env.CHANNEL_ID,
      emojis: ['🔥', '💯']
    };
    await saveSettings(settings);
  }
});

client.on('messageCreate', async (message) => {
  if (!settings) return;

  // ADMIN-ONLY COMMANDS
  if (message.member?.permissions.has('Administrator')) {
    const args = message.content.trim().split(/\s+/);
    const cmd = args[0];

    if (cmd === '!autoreact') {
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
        if (args.length < 4) {
          return message.reply('⚠️ Usage: `!autoreact setemojis 😄 👎`');
        }
        settings.emojis = [args[2], args[3]];
        await saveSettings(settings);
        return message.reply(`✅ Emojis updated to ${args[2]} and ${args[3]}`);
      }

      if (sub === 'status') {
        return message.reply(
          `🔧 Status:
Enabled: ${settings.enabled ? '✅' : '❌'}
Channel: <#${settings.channelId}>
Emojis: ${settings.emojis.join(' ')}`
        );
      }

      return message.reply(
        `ℹ️ Commands:
\`!autoreact enable\` – Enable in this channel
\`!autoreact disable\` – Disable
\`!autoreact setemojis 😀 😡\` – Set custom emojis
\`!autoreact status\` – Show current settings`
      );
    }

    // !dm userID message
    if (cmd === '!dm') {
      const userId = args[1];
      const dmMessage = args.slice(2).join(' ');
      if (!userId || !dmMessage) return message.reply('⚠️ Usage: `!dm <userID> <your message>`');

      try {
        const user = await client.users.fetch(userId);
        await user.send(dmMessage);
        message.reply(`✅ DM sent to <@${userId}>.`);
      } catch (err) {
        console.error(`❌ Failed to DM ${userId}`, err);
        message.reply(`❌ Failed to send DM. Make sure the user ID is correct and the user allows DMs.`);
      }
      return;
    }
  }

  // Auto-React Logic
  if (
    settings.enabled &&
    message.channel.id === settings.channelId &&
    (!message.author.bot || message.webhookId)
  ) {
    for (const emoji of settings.emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        console.error(`Failed to react with ${emoji}`, err);
      }
    }
  }
});

// Keep-alive ping server (for Render)
const app = express();
app.get('/', (_req, res) => res.send('OK'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🌐 Ping server listening on port ${PORT}`));

client.login(process.env.TOKEN);
