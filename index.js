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
  // ... (Your startup logic is correct and remains unchanged) ...
});

client.on(Events.ThreadCreate, async (thread) => {
  // ... (This logic is correct and remains unchanged) ...
});

client.on(Events.ChannelCreate, async (channel) => {
  // ... (This logic is correct and remains unchanged) ...
});

const processTicketEmbed = async (message) => {
  // ... (This logic is correct and remains unchanged) ...
};

// First messageCreate handler for tickets
client.on('messageCreate', (message) => processTicketEmbed(message));
client.on('messageUpdate', (oldMessage, newMessage) => processTicketEmbed(newMessage));

// Second messageCreate handler for reactions and commands
client.on('messageCreate', async (message) => {
  if (!settings || !message.guild) return;

  // ============================ THE FIX IS HERE ============================
  // We add a check to see if the message is from our own bot.
  const isOurOwnBot = message.author.id === client.user.id;

  // We update the if condition to include our bot.
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
  // =======================================================================

  // This is the command guard from your working code. It is untouched.
  if (message.author.bot || !message.content.startsWith('!!')) return;
  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  // The command router remains the same.
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
  if (command === '!!help') {
    const handleHelp = require('./commands/help');
    return await handleHelp(message);
  }
  if (command === '!!info') {
    const handleInfo = require('./commands/info');
    return await handleInfo(message, args);
  }
});

// Login and server code remains the same.
client.login(process.env.TOKEN);
const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 10000, () => console.log('🌐 Ping server running.'));