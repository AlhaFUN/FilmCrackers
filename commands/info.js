const { fetchMediaInfo } = require('../features/mediaInfo');
const { log } = require('../utils/logger');

module.exports = async (message, args) => {
  const query = args.slice(1).join(' ');
  if (!query) {
    return message.reply('Please provide a movie/TV show name or an IMDb ID. Usage: `!!info <query>`');
  }

  log(`[COMMAND] ${message.author.tag} is searching for info on: "${query}"`);

  const result = await fetchMediaInfo(query);

  if (result.error) {
    return message.reply(result.error);
  } else {
    return message.reply(result);
  }
};