require('dotenv').config();
const { Client, GatewayIntentBits, Events, ChannelType } = require('discord.js');
const express = require('express');
const { getSettings, saveSettings } = require('./utils/settings');
const { log, initializeLogger } = require('./utils/logger');
const { fetchMediaInfo } = require('./features/mediaInfo');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let settings = null;
const monitoredForumChannels = process.env.FORUM_CHANNEL_IDS?.split(',') || [];
const ticketCategoryId = process.env.TICKET_CATEGORY_ID;
const ticketsBotId = '1325579039888511056';
const ticketsToWatch = new Set();

client.once('ready', async () => {
  try {
    settings = await getSettings();
    if (!settings) {
      log('⚠️ No settings found in database. Creating default settings.');
      settings = { enabled: false, channelId: null, emojis: ['🔥', '💯'] };
      await saveSettings(settings);
    }
    initializeLogger(client);
    if (monitoredForumChannels.length > 0) log(`Monitoring ${monitoredForumChannels.length} forum channel(s).`);
    if (ticketCategoryId) log(`Monitoring ticket category ID: ${ticketCategoryId}`);
    log(`✅ Bot logged in as ${client.user.tag}. Ready to go!`);
  } catch (error) {
    console.error('❌ CRITICAL ERROR ON STARTUP:', error);
  }
});

// All automated event handlers for forums and tickets remain the same
client.on(Events.ThreadCreate, async (thread) => { /* ... */ });
client.on(Events.ChannelCreate, async (channel) => { /* ... */ });
client.on(Events.MessageCreate, (message) => { /* process tickets */ });
client.on(Events.MessageUpdate, (oldMessage, newMessage) => { /* process tickets */ });


// ============================ THE FIX IS HERE ============================
// A single, restructured handler for commands and auto-reactions
client.on(Events.MessageCreate, async (message) => {
  if (!settings || !message.guild) return;

  // --- 1. Auto-Reaction Logic (This runs first for every message) ---
  // This condition allows reactions on messages from non-bots OR from webhooks.
  // We will now also allow it for messages from our own bot.
  const isOurOwnBot = message.author.id === client.user.id;

  if (
    settings.enabled &&
    message.channel.id === settings.channelId &&
    (!message.author.bot || message.webhookId || isOurOwnBot)
  ) {
    for (const emoji of settings.emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        log(`❌ Failed to react with ${emoji}. Error: ${err.message}`);
      }
    }
  }

  // --- 2. Command Logic Guard ---
  // Now, if the message was from a bot (any bot), we stop. We don't want to process commands from bots.
  if (message.author.bot || !message.content.startsWith('!!')) return;
  
  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  // --- 3. Command Router ---
  if (message.member?.permissions.has('Administrator')) {
    if (command === '!!autoreact') {
      const handleAutoreact = require('./commands/autoreact');
      settings = await handleAutoreact(message, args, settings, saveSettings);
      return;
    }
    if (command === '!!dm') {
      const handleDM = require('./commands/dm');
      return await handleDM(message, args, client);
    }
    if (command === '!!announce') {
      const handleAnnounce = require('./commands/announce');
      return await handleAnnounce(message);
    }
  }

  // Global Commands
  if (command === '!!status') {
    const handleStatus = require('./commands/status');
    return await handleStatus(message, settings, client);
  }
  if (command === '!!info') {
    const handleInfo = require('./commands/info');
    return await handleInfo(message, args);
  }
});
// =======================================================================

client.login(process.env.TOKEN);

const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 10000, () => console.log('🌐 Ping server running.'));