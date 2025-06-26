module.exports = (message, settings) => {
  return message.reply(
    `🔧 Auto-react settings:
Enabled: \`${settings.enabled}\`
Channel: <#${settings.channelId || 'not set'}>
Emojis: ${settings.emojis.join(' ')}`
  );
};
