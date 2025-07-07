require('dotenv').config();
const { Client, GatewayIntentBits, Events, ChannelType } = require('discord.js');
const express = require('express');
const { getSettings, saveSettings } = require('./utils/settings');
const { log, initializeLogger } = require('./utils/logger');
const { fetchMediaInfo } = require('./features/mediaInfo');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// All your global variables are correct.
let settings = null;
const monitoredForumChannels = process.env.FORUM_CHANNEL_IDS?.split(',') || [];
const ticketCategoryId = process.env.TICKET_CATEGORY_ID;
const ticketsBotId = '1325579039888511056';
const ticketsToWatch = new Set();

// Your startup logic is correct.
client.once('ready', async () => { /* ... (This logic is fine, no changes needed) ... */ });

// Your other event handlers are also correct.
client.on(Events.ThreadCreate, async (thread) => { /* ... (no changes needed) ... */ });
client.on(Events.ChannelCreate, async (channel) => { /* ... (no changes needed) ... */ });

// This is the function that processes ticket embeds. It is correct.
const processTicketEmbed = async (message) => {
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

// ============================ THE REAL FIX IS HERE ============================
// This is the single, unified message handler that combines ALL logic correctly.

// We still need to listen for message updates for the ticket bot.
client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
  // We only run the ticket processor on updates.
  processTicketEmbed(newMessage).catch(err => console.error("Error processing ticket update:", err));
});

// This is the main handler for all NEW messages.
client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || !message.channel) return; // Basic guard clause

  // --- 1. Ticket Processing Logic ---
  // This runs for every message to check if it's a ticket embed.
  await processTicketEmbed(message);

  // --- 2. Auto-Reaction Logic ---
  if (settings) { // Only run if settings have loaded
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
  }

  // --- 3. Command Logic ---
  // This guard ensures we only process commands from human users.
  if (message.author.bot || !message.content.startsWith('!!')) return;
  
  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  // Your command router is correct. No changes needed here.
  if (message.member?.permissions.has('Administrator')) {
    if (command === '!!autoreact') { /* ... */ }
    if (command === '!!dm') { /* ... */ }
    if (command === '!!announce') { /* ... */ }
  }

  if (command === '!!status') { /* ... */ }
  if (command === '!!info') { /* ... */ }
  // We remove the old !!help since it's a slash command now, if you keep it.
  // If you reverted, add it back.
});
// ===========================================================================


// Your login and Express server setup are correct.
client.login(process.env.TOKEN);

const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 10000, () => console.log('🌐 Ping server running.'));