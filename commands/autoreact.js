// /commands/autoreact.js
const { EmbedBuilder } = require('discord.js');
const { log } = require('../utils/logger');

module.exports = async (message, args, settings, saveSettings) => {
  const sub = args[1]?.toLowerCase() || 'status'; // Default to status if no subcommand

  if (sub === 'enable') {
    log(`[COMMAND] ${message.author.tag} enabled auto-reactions in #${message.channel.name}.`);
    settings.enabled = true;
    settings.channelId = message.channel.id;
    await saveSettings(settings);
    return message.reply(`✅ Auto-react has been **enabled** for this channel.`);
  }

  if (sub === 'disable') {
    log(`[COMMAND] ${message.author.tag} disabled auto-reactions.`);
    settings.enabled = false;
    await saveSettings(settings);
    return message.reply(`❌ Auto-react has been **disabled**.`);
  }

  if (sub === 'setemojis') {
    if (args.length < 4) return message.reply('⚠️ Usage: `!!autoreact setemojis 😄 👎`');
    settings.emojis = [args[2], args[3]];
    await saveSettings(settings);
    log(`[COMMAND] ${message.author.tag} set auto-reaction emojis to: ${settings.emojis.join(' ')}`);
    return message.reply(`✅ Emojis have been updated to ${args[2]} and ${args[3]}`);
  }

  if (sub === 'status') {
    const statusEmbed = new EmbedBuilder()
      .setColor(settings.enabled ? '#4CAF50' : '#F44336')
      .setTitle('Auto-Reaction System Status')
      .addFields(
        { name: 'Service Status', value: settings.enabled ? '**Enabled**' : '**Disabled**', inline: true },
        { name: 'Target Channel', value: settings.channelId ? `<#${settings.channelId}>` : 'Not Set', inline: true },
        { name: 'Reaction Emojis', value: settings.emojis.join(' '), inline: true }
      );
    return message.reply({ embeds: [statusEmbed] });
  }

  // If the subcommand is invalid, show help
  return message.reply(
    'ℹ️ Invalid subcommand. Use `!!autoreact enable|disable|setemojis|status`.'
  );
};