module.exports = {
  name: 'help',
  description: 'Shows all available commands and usage.',
  async execute(message) {
    const helpText = `
**🛠 Available Commands**
\`!autoreact enable\` - Enable reactions in current channel
\`!autoreact disable\` - Disable autoreactions
\`!autoreact setemojis 😀 😡\` - Set custom emojis
\`!dm <userID> <message>\` - Send a DM to a user
\`!status\` - View status of bot features and ping
\`!help\` - View this command list
    `.trim();
    await message.reply(helpText);
  }
};
