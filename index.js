require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { getSettings, saveSettings } = require('./utils/settings');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let settings = null;

client.once('ready', async () => {
  settings = await getSettings();
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!settings || message.author.bot) return;

  const args = message.content.trim().split(/\s+/);

  if (message.member?.permissions.has('Administrator')) {
    if (args[0] === '!autoreact') {
      const handleAutoreact = require('./commands/autoreact');
      return await handleAutoreact(message, args, settings, saveSettings);
    }

    if (args[0] === '!dm') {
      const handleDM = require('./commands/dm');
      return await handleDM(message, args, client);
    }

    if (args[0] === '!autoreact' && args[1] === 'status') {
      const handleStatus = require('./commands/status');
      return handleStatus(message, settings);
    }
  }

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

client.login(process.env.TOKEN);

// Keep alive
const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 10000, () => console.log('🌐 Ping server running'));
