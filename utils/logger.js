let logChannel = null;

const setLogChannel = (channel) => {
  logChannel = channel;
};

const log = (msg) => {
  console.log(`[LOG] ${msg}`);
  if (logChannel) {
    logChannel.send(`📄 ${msg}`).catch(console.error);
  }
};

module.exports = { log, setLogChannel };
