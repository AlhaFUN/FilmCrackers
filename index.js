require('dotenv').config();
const { Client, GatewayIntentBits, Events, ChannelType } = require('discord.js'); // Add Events and ChannelType
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

client.once('ready', async () => {
  try {
    settings = await getSettings();
    if (!settings) {
      log('⚠️ No settings found in database. Creating default settings.');
      settings = { enabled: false, channelId: null, emojis: ['🔥', '💯'] };
      await saveSettings(settings);
    }
    initializeLogger(client);
    log(`Monitoring ${monitoredForumChannels.length} forum channel(s).`);
    if (ticketCategoryId) {
      log(`Monitoring ticket category ID: ${ticketCategoryId}`);
    }
    log(`✅ Bot logged in as ${client.user.tag}. Ready to go!`);
  } catch (error) {
    console.error('❌ CRITICAL ERROR ON STARTUP:', error);
  }
});

// --- NEW: FORUM POST HANDLER ---
client.on(Events.ThreadCreate, async (thread) => {
  if (!monitoredForumChannels.includes(thread.parentId)) return;
  log(`New forum post detected in #${thread.parent.name} with title: "${thread.name}"`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  const result = await fetchMediaInfo(thread.name);
  if (result.error) { await thread.send(result.error); } 
  else { await thread.send(result); }
});

// --- NEW: TICKET CHANNEL HANDLER ---
client.on(Events.ChannelCreate, async (channel) => {
  // Check if it's a text channel inside our monitored ticket category
  if (!ticketCategoryId || channel.parentId !== ticketCategoryId || channel.type !== ChannelType.GuildText) {
    return;
  }
  
  log(`New ticket channel created: #${channel.name}. Waiting for tickets.bot embed...`);
  
  try {
    // Wait for the message from the ticket bot (max 60 seconds)
    const filter = m => m.author.bot && m.embeds.length > 0 && m.embeds[0]?.footer?.text.includes('tickets.bot');
    const collected = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
    
    const ticketMessage = collected.first();
    const embed = ticketMessage.embeds[0];
    
    // Find the "Movie Name" field in the embed
    const movieNameField = embed.fields.find(field => field.name === 'Movie Name');
    
    if (movieNameField && movieNameField.value) {
      const movieName = movieNameField.value;
      log(`Extracted movie name "${movieName}" from ticket #${channel.name}. Fetching info...`);
      
      const result = await fetchMediaInfo(movieName);
      
      if (result.error) {
        await channel.send(`> **Auto-Info:** ${result.error}`);
      } else {
        await channel.send({ content: `> **Auto-Info for "${movieName}":**`, ...result });
      }
    } else {
      log(`Could not find "Movie Name" field in ticket embed for #${channel.name}.`);
    }
  } catch (err) {
    log(`Did not receive a ticket embed in #${channel.name} within 60 seconds.`);
  }
});

client.on('messageCreate', async (message) => {
  if (!settings || !message.guild) return;

  // Auto-Reaction Logic
  if (settings.enabled && message.channel.id === settings.channelId && (!message.author.bot || message.webhookId)) {
    for (const emoji of settings.emojis) {
      try { await message.react(emoji); }
      catch (err) { log(`❌ Failed to react with ${emoji}. Error: ${err.message}`); }
    }
  }

  // Command Processing
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

client.login(process.env.TOKEN);

const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 10000, () => console.log('🌐 Ping server running.'));