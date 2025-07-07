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

// Other event handlers
client.on(Events.ThreadCreate, async (thread) => { /* ... (no changes here) ... */ });
client.on(Events.ChannelCreate, async (channel) => { /* ... (no changes here) ... */ });
client.on(Events.MessageUpdate, (oldMessage, newMessage) => processTicketEmbed(newMessage)); // Still need this for edits


// ============================ THE FIX IS HERE ============================
// A single, unified handler for all message-based events
const processTicketEmbed = async (message) => {
    // This function remains the same, but we will call it from inside the main handler
    if (!ticketsToWatch.has(message.channel.id)) return;
    if (message.author.id === ticketsBotId && message.embeds.length > 0) {
        for (const embed of message.embeds) {
            if (!embed.fields || embed.fields.length === 0) continue;
            const mediaNameField = embed.fields.find(field =>
                field.name.toLowerCase().includes('movie name') ||
                field.name.toLowerCase().includes('series name')
            );
            if (mediaNameField?.value) {
                const movieName = mediaNameField.value;
                log(`SUCCESS: Found media name in #${message.channel.name}: "${movieName}". Processing...`);
                ticketsToWatch.delete(message.channel.id);
                const result = await fetchMediaInfo(movieName);
                const content = result.error ? `> **Auto-Info:** ${result.error}` : `> **Auto-Info for "${movieName}":**`;
                await message.channel.send({ content, ...result });
                return;
            }
        }
        log(`INFO: Saw embed from tickets.bot in #${message.channel.name}, but couldn't find media field.`);
    }
};

client.on(Events.MessageCreate, async (message) => {
  if (!settings || !message.guild) return;

  // --- 1. Ticket Processing Logic ---
  // We call the ticket processor for EVERY message, and it will internally
  // check if the message is relevant (from the right bot in the right channel).
  await processTicketEmbed(message);

  // --- 2. Auto-Reaction Logic ---
  const isOurOwnBot = message.author.id === client.user.id;
  if (
    settings.enabled &&
    message.channel.id === settings.channelId &&
    (!message.author.bot || message.webhookId || isOurOwnBot)
  ) {
    for (const emoji of settings.emojis) {
      try { await message.react(emoji); }
      catch (err) { log(`❌ Failed to react with ${emoji}. Error: ${err.message}`); }
    }
  }

  // --- 3. Command Logic ---
  // This guard now only affects command processing.
  if (message.author.bot || !message.content.startsWith('!!')) return;
  
  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

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
