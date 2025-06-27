const { EmbedBuilder } = require('discord.js');
const { log } = require('../utils/logger');

module.exports = async (message) => {
  log(`[COMMAND] ${message.author.tag} used !!help.`);
  const helpEmbed = new EmbedBuilder()
    .setColor('#f1c40f')
    .setTitle('❓ Help & Commands')
    .setDescription('Here are all the commands you can use with the bot.')
    .addFields(
      {
        name: '👑 Admin Commands',
        value:
          '`!!autoreact enable` - Activates auto-reactions in this channel.\n' +
          '`!!autoreact disable` - Deactivates auto-reactions.\n' +
          '`!!autoreact setemojis 😀 😡` - Sets the two emojis for reactions.\n' +
          '`!!dm <userID> <message>` - Sends a direct message to a user.',
      },
      {
        name: '🌍 Global Commands',
        value:
          '`!!info <movie/tv name>` - Fetches detailed info about a movie or show. *Tip: Add the year for better accuracy!* \n' +
          '`!!status` - Shows the current status of the bot and its systems.\n' +
          '`!!help` - Displays this help message.',
      }
    );

  await message.reply({ embeds: [helpEmbed] });
};