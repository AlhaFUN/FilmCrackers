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

client.on(Events.ThreadCreate, async (thread) => {
  if (!monitoredForumChannels.includes(thread.parentId)) return;
  log(`New forum post in #${thread.parent.name} with title: "${thread.name}"`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  const result = await fetchMediaInfo(thread.name);
  if (result.error) { await thread.send(result.error); }
  else { await thread.send(result); }
});

client.on(Events.ChannelCreate, async (channel) => {
  if (!ticketCategoryId || channel.parentId !== ticketCategoryId || channel.type !== ChannelType.GuildText) return;
  log(`New ticket channel #${channel.name} created. Adding to watchlist.`);
  ticketsToWatch.add(channel.id);
  setTimeout(() => {
    if (ticketsToWatch.has(channel.id)) {
      log(`Watchlist timeout for #${channel.name}. Removing.`);
      ticketsToWatch.delete(channel.id);
    }
  }, 300000);
});

const processTicketEmbed = async (message) => {
  if (!ticketsToWatch.has(message.channel.id)) return;
  if (message.author.id === ticketsBotId && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      if (!embed.fields || embed.fields.length === 0) {
        continue;
      }
      const mediaNameField = embed.fields.find(field =>
        field.name.toLowerCase().includes('movie name') ||
        field.name.toLowerCase().includes('series name')
      );
      if (mediaNameField && mediaNameField.value) {
        const movieName = mediaNameField.value;
        log(`SUCCESS: Found media name in #${message.channel.name}: "${movieName}". Processing...`);
        ticketsToWatch.delete(message.channel.id);
        const result = await fetchMediaInfo(movieName);
        if (result.error) {
          await message.channel.send(`> **Auto-Info:** ${result.error}`);
        } else {
          await message.channel.send({ content: `> **Auto-Info for "${movieName}":**`, ...result });
        }
        return;
      }
    }
    log(`INFO: Saw embed from tickets.bot in #${message.channel.name}, but couldn't find media field in any of its embeds.`);
  }
};

client.on('messageCreate', (message) => processTicketEmbed(message));
client.on('messageUpdate', (oldMessage, newMessage) => processTicketEmbed(newMessage));

client.on('messageCreate', async (message) => {
  if (!settings || !message.guild) return;

  // Allow reactions from users, webhooks, and bots including itself
  if (settings.enabled && message.channel.id === settings.channelId) {
    for (const emoji of settings.emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        log(`❌ Failed to react with ${emoji}. Error: ${err.message}`);
      }
    }
  }

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
