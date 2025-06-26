module.exports = async (message, args, client) => {
  const userId = args[1];
  const dmMessage = args.slice(2).join(' ');

  if (!userId || !dmMessage) {
    return message.reply('⚠️ Usage: `!dm <userID> <your message>`');
  }

  try {
    const user = await client.users.fetch(userId);
    await user.send(dmMessage);
    return message.reply(`✅ DM sent to <@${userId}>.`);
  } catch (err) {
    console.error(`❌ Failed to DM ${userId}`, err);
    return message.reply(`❌ Failed to send DM. Make sure the user ID is correct and the user allows DMs.`);
  }
};
