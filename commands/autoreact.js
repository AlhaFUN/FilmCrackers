// /commands/autoreact.js
const { log } = require('../utils/logger');

module.exports = async (message, args, settings, saveSettings) => {
  const sub = args[1] || 'help'; // Default to help if no subcommand

  log(`[COMMAND] ${message.author.tag} used !!autoreact with subcommand: ${sub}`);

  if (sub === 'enable') {
    settings.enabled = true;
    settings.channelId = message.channel.id;
    await saveSettings(settings);
    return message.reply(`✅ Auto-react enabled in this channel!`);
  } else if (sub === 'disable') {
    settings.enabled = false;
    await saveSettings(settings);
    return message.reply(`❌ Auto-react disabled.`);
  } else if (sub === 'setemojis') {
    if (args.length < 4) return message.reply('⚠️ Usage: `!!autoreact setemojis 😄 👎`');
    settings.emojis = [args[2], args[3]];
    await saveSettings(settings);
    return message.reply(`✅ Emojis updated to ${args[2]} and ${args[3]}`);
  } else {
    return message.reply(
      'ℹ️ **AutoReact Commands:**\n`!!autoreact enable`\n`!!autoreact disable`\n`!!autoreact setemojis 😀 😡`'
    );
  }
};