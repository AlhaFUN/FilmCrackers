require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let settings = {
  enabled: false,
  channelId: process.env.CHANNEL_ID,
  emojis: ['🔥', '💯'],
};

// Load settings from file or create file if missing
if (fs.existsSync('settings.json')) {
  settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
} else {
  fs.writeFileSync('settings.json', JSON.stringify(settings, null, 2));
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Commands only for admins
  if (
    message.content.startsWith('!autoreact') &&
    message.member.permissions.has('Administrator')
  ) {
    const args = message.content.trim().split(/\s+/).slice(1);
    const sub = args[0];

    if (sub === 'enable') {
      settings.enabled = true;
      settings.channelId = message.channel.id;
      message.reply(`✅ Auto-react enabled in this channel!`);
    } else if (sub === 'disable') {
      settings.enabled = false;
      message.reply(`❌ Auto-react disabled.`);
    } else if (sub === 'setemojis') {
      if (args.length < 3)
        return message.reply('⚠️ Usage: `!autoreact setemojis 😄 👎`');
      settings.emojis = [args[1], args[2]];
      message.reply(`✅ Emojis updated to ${args[1]} and ${args[2]}`);
    } else {
      message.reply(
        `ℹ️ Commands:
\`!autoreact enable\` – Enable in this channel
\`!autoreact disable\` – Disable
\`!autoreact setemojis 😀 😡\` – Set custom emojis`
      );
    }
    fs.writeFileSync('settings.json', JSON.stringify(settings, null, 2));
    return;
  }

  // React to messages if enabled and in the right channel
  if (
    settings.enabled &&
    message.channel.id === settings.channelId &&
    !message.author.bot
  ) {
    for (const emoji of settings.emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        console.error(`Failed to react with ${emoji}`, err);
      }
    }
  }
});

client.login(process.env.TOKEN);

// Keep-render-alive code
const express = require('express');
const app = express();
app.get('/', (_req, res) => res.send('OK'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Ping server listening on port ${PORT}`));
