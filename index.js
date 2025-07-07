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

// Your startup logic is correct.
client.once('ready', async () => {
    // This entire block is from your working version and is correct.
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

// Your other event handlers are also correct.
client.on(Events.ThreadCreate, async (thread) => { /* ... Your working code here ... */ });
client.on(Events.ChannelCreate, async (channel) => { /* ... Your working code here ... */ });

// This is the function that processes ticket embeds. It is correct.
const processTicketEmbed = async (message) => {
    // This entire function is from your working version and is correct.
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
// We merge the logic from your two 'messageCreate' handlers into one.

// We still need to listen for message edits for the ticket bot.
client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
  processTicketEmbed(newMessage).catch(err => console.error("Error processing ticket update:", err));
});

// This is the new, single handler for all NEW messages.
client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || !message.channel) return; // Basic guard

    // --- 1. Ticket Processing Logic (from your first handler) ---
    // This now runs for every single message.
    await processTicketEmbed(message);

    // --- 2. Auto-Reaction & Command Logic (from your second handler) ---
    if (!settings) return; // Wait for settings to load

    const isOurOwnBot = message.author.id === client.user.id;
    if (settings.enabled && message.channel.id === settings.channelId && (!message.author.bot || message.webhookId || isOurOwnBot)) {
        for (const emoji of settings.emojis) {
            try { await message.react(emoji); }
            catch (err) { log(`❌ Failed to react with ${emoji}. Error: ${err.message}`); }
        }
    }

    // Guard against processing commands from bots
    if (message.author.bot || !message.content.startsWith('!!')) return;

    // The rest of your command router, which is correct.
    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();

    if (message.member?.permissions.has('Administrator')) {
        if (command === '!!autoreact') { /* ... */ }
        if (command === '!!dm') { /* ... */ }
        if (command === '!!announce') {
            const handleAnnounce = require('./commands/announce');
            return await handleAnnounce(message);
        }
    }
    if (command === '!!status') { /* ... */ }
    if (command === '!!help') { /* ... */ }
    if (command === '!!info') { /* ... */ }
});
// =======================================================================

// Your login and Express server setup are correct.
client.login(process.env.TOKEN);
const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 10000, () => console.log('🌐 Ping server running.'));