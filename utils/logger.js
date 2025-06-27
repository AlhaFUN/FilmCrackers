// /utils/logger.js

let logChannel = null;

/**
 * Finds and sets the channel to be used for logging.
 * @param {import('discord.js').Client} client The Discord client.
 */
function initializeLogger(client) {
  const channel = client.channels.cache.find(
    (ch) => ch.name === 'logs' && ch.isTextBased()
  );
  if (channel) {
    logChannel = channel;
    log(`✅ Logging to Discord channel <#${channel.id}> is enabled.`);
  } else {
    log('⚠️ Could not find a #logs channel. Logging to Discord is disabled.');
  }
}

/**
 * Logs a message to the console and to the designated Discord channel.
 * @param {string} message The message to log.
 */
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (logChannel) {
    // Avoid logging logs about logging
    if (message.startsWith('✅ Logging to Discord channel')) return;
    logChannel.send(`\`[${timestamp}]\` ${message}`).catch(console.error);
  }
}

// THIS IS THE FIX: We export an object containing both functions.
module.exports = { log, initializeLogger };