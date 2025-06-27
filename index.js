// index.js (Complete and Corrected)
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { getSettings, saveSettings } = require('./utils/settings');
const { log, initializeLogger } = require('./utils/logger');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let settings = null;

client.once('ready', async () => {
  try {
    settings = await getSettings();
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

client.on('messageCreate', async (message) => {
  if (!settings || !message.guild || message.author.bot) return;

  const isCommand = message.content.startsWith('!!');

  // --- Auto-Reaction Logic ---
  // We check this BEFORE commands to react even if a command is not run.
  if (!isCommand) {
    if (
      settings.enabled &&
      message.channel.id === settings.channelId
    ) {
      // BOMB-PROOF DEBUGGING: This log will tell us if it's even trying to react.
      log(`Attempting to react in #${message.channel.name}. Enabled: ${settings.enabled}, Channel Match: ${message.channel.id === settings.channelId}`);
      for (const emoji of settings.emojis) {
        try {
          await message.react(emoji);
        } catch (err) {
          log(`❌ Failed to react with ${emoji}. Error: ${err.message}`);
        }
      }
    }
    return; // Stop processing if it's not a command
  }

  // --- Command Processing ---
  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  if (message.member?.permissions.has('Administrator')) {
    if (command === '!!autoreact') {
      const handleAutoreact = require('./commands/autoreact');
      // THIS IS THE FIX: We update the local settings with the result from the command.
      settings = await handleAutoreact(message, args, settings, saveSettings);
      return;
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
});

client.login(process.env.TOKEN);

const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 10000, () => console.log('🌐 Ping server running.'));