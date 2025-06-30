require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js'); // Add Events
const express = require('express');
const { getSettings, saveSettings } = require('./utils/settings');
const { log, initializeLogger } = require('./utils/logger');
const { fetchMediaInfo } = require('./features/mediaInfo'); // Import our new reusable function

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let settings = null;
const monitoredForumChannels = process.env.FORUM_CHANNEL_IDS?.split(',') || [];

client.once('ready', async () => {
  try {
    settings = await getSettings();
    if (!settings) {
      log('⚠️ No settings found in database. Creating default settings.');
      settings = { enabled: false, channelId: null, emojis: ['🔥', '💯'] };
      await saveSettings(settings);
    }
    initializeLogger(client);
    log(`Monitoring ${monitoredForumChannels.length} forum channel(s) for new posts.`);
    log(`✅ Bot logged in as ${client.user.tag}. Ready to go!`);
  } catch (error) {
    console.error('❌ CRITICAL ERROR ON STARTUP:', error);
  }
});

// --- NEW EVENT HANDLER FOR FORUM POSTS ---
client.on(Events.ThreadCreate, async (thread, newlyCreated) => {
  // We only care about newly created posts in our monitored channels
  if (!newlyCreated || !monitoredForumChannels.includes(thread.parentId)) return;
  
  const threadTitle = thread.name;
  log(`New forum post detected in #${thread.parent.name} with title: "${threadTitle}"`);
  
  // Add a small delay to prevent the bot from replying before Discord fully registers the post
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const result = await fetchMediaInfo(threadTitle);

  if (result.error) {
    await thread.send(result.error);
  } else {
    await thread.send(result);
  }
});

client.on('messageCreate', async (message) => {
  if (!settings || !message.guild) return;

  // --- Auto-Reaction Logic ---
  if (
    settings.enabled &&
    message.channel.id === settings.channelId &&
    (!message.author.bot || message.webhookId)
  ) {
    log(`Attempting to react in #${message.channel.name}. User: ${message.author.tag}, Is Webhook: ${!!message.webhookId}`);
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