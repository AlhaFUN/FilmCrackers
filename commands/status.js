const { log } = require('../utils/logger');

module.exports = {
  name: 'status',
  description: 'Shows the current status of all bot systems and ping.',
  async execute(message, args, client, settings) {
    const ping = Math.round(client.ws.ping);
    const embed = {
      color: 0x00ff00,
      title: '📊 Bot Status',
      fields: [
        { name: 'AutoReact', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'AutoReact Channel', value: `<#${settings.channelId || 'N/A'}>`, inline: true },
        { name: 'Current Emojis', value: settings.emojis.join(' '), inline: true },
        { name: 'Bot Ping', value: `${ping}ms`, inline: true }
      ]
    };
    await message.reply({ embeds: [embed] });
    log(`${message.author.tag} checked bot status.`);
  }
};
