const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { log } = require('../utils/logger');

// --- Helper Functions ---

// Formats a number into a currency string (e.g., 1000000 -> $1,000,000)
function formatCurrency(number) {
  if (number === 0 || !number) return 'N/A';
  return `$${new Intl.NumberFormat('en-US').format(number)}`;
}

// Formats minutes into a string like "2h 15m"
function formatRuntime(minutes) {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Formats a date string and calculates how many years ago it was
function formatReleaseDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const yearsAgo = new Date().getFullYear() - date.getFullYear();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return `${date.toLocaleDateString('en-US', dateOptions)} (${yearsAgo} years ago)`;
}

// --- Main Command Logic ---

module.exports = async (message, args) => {
  const query = args.slice(1).join(' ');
  if (!query) {
    return message.reply('Please provide a movie or TV show to search for. Usage: `!!info <name>`');
  }

  log(`[COMMAND] ${message.author.tag} is searching for info on: "${query}"`);

  try {
    // 1. First API Call: Search for the media to get its ID
    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      return message.reply(`I couldn't find any results for "${query}". Please check the spelling.`);
    }
    const searchResult = searchData.results[0];
    const mediaType = searchResult.media_type;

    if (mediaType !== 'movie' && mediaType !== 'tv') {
        return message.reply(`I found a result for "${query}", but it's not a movie or TV show.`)
    }

    // 2. Second API Call: Get detailed information using the ID
    const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${searchResult.id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits,external_ids`;
    const detailsResponse = await fetch(detailsUrl);
    const details = await detailsResponse.json();

    // 3. Extract and Format Data
    const isMovie = mediaType === 'movie';
    const title = isMovie ? details.title : details.name;
    const releaseDate = isMovie ? details.release_date : details.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
    const imdbId = details.external_ids?.imdb_id;
    const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : `https://www.themoviedb.org/${mediaType}/${details.id}`;
    
    // Find the director from the credits
    const director = details.credits?.crew.find(person => person.job === 'Director')?.name || 'N/A';

    // 4. Build the Rich Embed
    const infoEmbed = new EmbedBuilder()
      .setColor('#E91E63') // A nice pink/magenta color similar to the example
      .setTitle(`${title} (${year})`)
      .setURL(imdbUrl)
      .setDescription(details.overview || 'No synopsis available.')
      .setThumbnail(details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null)
      .addFields(
        { name: '⭐ Rating', value: `${details.vote_average.toFixed(1)}/10`, inline: true },
        { name: '🏆 Popularity', value: `#${Math.round(details.popularity)}`, inline: true },
        { name: '🗣️ Language', value: details.original_language.toUpperCase(), inline: true },
        { name: '💰 Budget', value: formatCurrency(details.budget), inline: true },
        { name: '📈 Box Office', value: formatCurrency(details.revenue), inline: true },
        { name: '🎬 Director', value: director, inline: true },
        { name: '⏳ Runtime', value: isMovie ? formatRuntime(details.runtime) : `${details.number_of_seasons} Seasons`, inline: true },
        { name: '🎭 Genres', value: details.genres.map(g => g.name).join(', ') || 'N/A', inline: false },
        { name: '🗓️ Release Date', value: formatReleaseDate(releaseDate), inline: false },
      )
      .setImage(details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null)
      .setFooter({ text: 'Powered by The Movie Database (TMDB)', iconURL: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded9042015820c37f6af27cfd725480174cf28f2679d9e2fb42a.svg' });

    await message.reply({ embeds: [infoEmbed] });

  } catch (error) {
    console.error('Error fetching data from TMDB:', error);
    message.reply('Sorry, something went wrong while trying to fetch information from TMDB.');
  }
};