// /commands/autoreact.js
const { EmbedBuilder } = require('discord.js');
const { log } = require('../utils/logger');

// The function now returns the settings object after modifying it.
module.exports = async (message, args, settings, saveSettings) => {
  const sub = args[1]?.toLowerCase() || 'status';

  log(`[COMMAND] ${message.author.tag} used !!autoreact with subcommand: ${sub}`);

  if (sub === 'enable') {
    settings.enabled = true;
    settings.channelId = message.channel.id;
    await saveSettings(settings);
    await message.reply(`✅ Auto-react has been **enabled** for this channel.`);
    return settings; // Return the updated settings
  }

  if (sub === 'disable') {
    settings.enabled = false;
    await saveSettings(settings);
    await message.reply(`❌ Auto-react has been **disabled**.`);
    return settings; // Return the updated settings
  }

  if (sub === 'setemojis') {
    if (args.length < 4) return message.reply('⚠️ Usage: `!!autoreact setemojis 😄 👎`');
    settings.emojis = [args[2], args[3]];
    await saveSettings(settings);
    await message.reply(`✅ Emojis have been updated to ${args[2]} and ${args[3]}`);
    return settings; // Return the updated settings
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
    await message.reply({ embeds: [statusEmbed] });
    return settings; // Return the unchanged settings
  }

  // If the subcommand is invalid, show help
  await message.reply(
    'ℹ️ Invalid subcommand. Use `!!autoreact enable|disable|setemojis|status`.'
  );
  return settings; // Return the unchanged settings
};