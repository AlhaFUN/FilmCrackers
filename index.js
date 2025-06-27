require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { getSettings, saveSettings } = require('./utils/settings');
const { log, initializeLogger } = require('./utils/logger');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// This is where the settings are stored in memory. It starts as null.
let settings = null;

// Bot startup
client.once('ready', async () => {
  try {
    // This is the first thing we do: load settings from the database.
    settings = await getSettings();
    
    // If the database is empty or new, create default settings.
    if (!settings) {
      log('⚠️ No settings found in database. Creating default settings.');
      settings = { enabled: false, channelId: null, emojis: ['🔥', '💯'] };
      await saveSettings(settings);
    }

    initializeLogger(client);
    log(`✅ Bot logged in as ${client.user.tag}. Ready to go!`);
  } catch (error) {
    console.error('❌ CRITICAL ERROR ON STARTUP:', error);
  }
});

// Message handler
client.on('messageCreate', async (message) => {
  // ============================ THE FIX IS HERE ============================
  // This line prevents the bot from doing ANYTHING until the `settings`
  // variable has been loaded during the 'ready' event. This solves the race condition.
  if (!settings || !message.guild || message.author.bot) return;
  // =======================================================================

  if (!message.content.startsWith('!!')) return;

  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  // --- Command Router ---
  // Admin Commands
  if (message.member?.permissions.has('Administrator')) {
    if (command === '!!autoreact') {
      const handleAutoreact = require('./commands/autoreact');
      return await handleAutoreact(message, args, settings, saveSettings);
    }
    if (command === '!!dm') {
      const handleDM = require('./commands/dm');
      return await handleDM(message, args, client);
    }
  }

  // Global Commands
  if (command === '!!status') {
    const handleStatus = require('./commands/status');
    return await handleStatus(message, settings, client);
  }
  if (command === '!!help') {
    const handleHelp = require('./commands/help');
    return await handleHelp(message);
  }
  if (command === '!!info') {
    const handleInfo = require('./commands/info');
    return await handleInfo(message, args);
  }

  // --- Auto-Reaction Logic ---
  if (
    settings.enabled &&
    message.channel.id === settings.channelId &&
    (!message.author.bot || message.webhookId)
  ) {
    for (const emoji of settings.emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        log(`❌ Failed to react with ${emoji} in #${message.channel.name}. Error: ${err.message}`);
      }
    }
  }
});

// Login to Discord
client.login(process.env.TOKEN);

// Keep-alive server for Render
const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 10000, () => console.log('🌐 Ping server running.'));