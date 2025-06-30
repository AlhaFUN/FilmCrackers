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

// -- EVENT: A new forum post is created --
client.on(Events.ThreadCreate, async (thread) => {
  if (!monitoredForumChannels.includes(thread.parentId)) return;
  log(`New forum post in #${thread.parent.name} with title: "${thread.name}"`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  const result = await fetchMediaInfo(thread.name);
  if (result.error) { await thread.send(result.error); }
  else { await thread.send(result); }
});

// ============================ THE REAL FIX IS HERE ============================
// --- EVENT: A new ticket channel is created (REWORKED AGAIN) ---
client.on(Events.ChannelCreate, async (channel) => {
  if (!ticketCategoryId || channel.parentId !== ticketCategoryId || channel.type !== ChannelType.GuildText) {
    return;
  }
  
  log(`New ticket channel #${channel.name} detected. Waiting 3 seconds before searching...`);

  // 1. ADD A DELAY - As you requested, we wait 3 seconds.
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    let embedFound = false;

    for (const message of messages.values()) {
      if (message.author.id === ticketsBotId && message.embeds.length > 0) {
        const embed = message.embeds[0];
        
        // 2. Check for EITHER "Movie Name" or "Series Name".
        const mediaNameField = embed.fields.find(
          field => field.name === 'Movie Name' || field.name === 'Series Name'
        );
        
        if (mediaNameField && mediaNameField.value) {
          embedFound = true;
          const mediaName = mediaNameField.value;
          log(`Found media name in #${channel.name}: "${mediaName}" (Field: "${mediaNameField.name}")`);
          
          const result = await fetchMediaInfo(mediaName);
          if (result.error) {
            await channel.send(`> **Auto-Info:** ${result.error}`);
          } else {
            await channel.send({ content: `> **Auto-Info for "${mediaName}":**`, ...result });
          }
          // Break the loop since we found what we needed.
          break;
        }
      }
    }
    
    if (!embedFound) {
      log(`Could not find a valid ticket embed in the initial messages of #${channel.name} after waiting.`);
    }

  } catch (err) {
    log(`Error fetching message history for #${channel.name}: ${err.message}`);
  }
});
// =======================================================================


client.on('messageCreate', async (message) => {
  if (!settings || !message.guild) return;

  // --- Auto-Reaction Logic ---
  if (settings.enabled && message.channel.id === settings.channelId && (!message.author.bot || message.webhookId)) {
    for (const emoji of settings.emojis) {
      try { await message.react(emoji); }
      catch (err) { log(`❌ Failed to react with ${emoji}. Error: ${err.message}`); }
    }
  }

  // --- Command Processing ---
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