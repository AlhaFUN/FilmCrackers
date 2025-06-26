// /commands/status.js
const { EmbedBuilder } = require('discord.js');
const { log } = require('../utils/logger');

// We now export the function directly.
module.exports = async (message, settings, client) => {
  const ping = client.ws.ping;
  const autoreactStatus = settings.enabled
    ? `✅ Enabled in <#${settings.channelId}>`
    : '❌ Disabled';

  const statusEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🤖 Bot Status & Health')
    .addFields(
      { name: 'Ping', value: `**${ping}ms**`, inline: true },
      { name: 'Auto-Reactions', value: autoreactStatus, inline: true },
      { name: 'Current Emojis', value: settings.emojis.join(' '), inline: true }
    )
    .setFooter({ text: 'FilmCrackers Bot | All systems operational.' })
    .setTimestamp();

  await message.reply({ embeds: [statusEmbed] });
  log(`[COMMAND] ${message.author.tag} used !status.`);
};