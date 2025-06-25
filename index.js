require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const express = require('express');

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
  // ADMIN-ONLY COMMANDS
  if (message.member?.permissions.has('Administrator')) {
    const args = message.content.trim().split(/\s+/);

    // ===== !autoreact =====
    if (args[0] === '!autoreact') {
      const sub = args[1];
      if (sub === 'enable') {
        settings.enabled = true;
        settings.channelId = message.channel.id;
        message.reply(`✅ Auto-react enabled in this channel!`);
      } else if (sub === 'disable') {
        settings.enabled = false;
        message.reply(`❌ Auto-react disabled.`);
      } else if (sub === 'setemojis') {
        if (args.length < 4)
          return message.reply('⚠️ Usage: `!autoreact setemojis 😄 👎`');
        settings.emojis = [args[2], args[3]];
        message.reply(`✅ Emojis updated to ${args[2]} and ${args[3]}`);
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

    // ===== !dm =====
    if (args[0] === '!dm') {
      const userId = args[1];
      const dmMessage = args.slice(2).join(' ');

      if (!userId || !dmMessage) {
        return message.reply('⚠️ Usage: `!dm <userID> <your message>`');
      }

      try {
        const user = await client.users.fetch(userId);
        await user.send(dmMessage);
        message.reply(`✅ DM sent to <@${userId}>.`);
      } catch (err) {
        console.error(`❌ Failed to DM ${userId}`, err);
        message.reply(`❌ Failed to send DM. Make sure the user ID is correct and the user allows DMs.`);
      }
      return;
    }
  }

  // ===== Auto-Reaction =====
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

// Keep-render-alive server
const app = express();
app.get('/', (_req, res) => res.send('OK'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Ping server listening on port ${PORT}`));
