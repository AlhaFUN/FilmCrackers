module.exports = async (message) => {
  const helpMessage = `
**🛠️ Available Commands:**

**Admin Only:**
\`!autoreact enable\` — Enable auto-react in this channel  
\`!autoreact disable\` — Disable auto-react  
\`!autoreact setemojis 😀 😡\` — Set custom emojis  
\`!dm <userId> <message>\` — Send a DM to a user

**Everyone:**
\`!status\` — Check the status of auto-react system and bot  
\`!help\` — Display this help message
  `;
  await message.channel.send(helpMessage);
};
