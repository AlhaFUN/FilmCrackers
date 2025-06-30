const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { log } = require('../utils/logger');

// --- Helper Functions (no changes here) ---
function formatCurrency(number) { if (number === 0 || !number) return 'N/A'; return `$${new Intl.NumberFormat('en-US').format(number)}`; }
function formatRuntime(minutes) { if (!minutes) return 'N/A'; const h = Math.floor(minutes / 60); const m = minutes % 60; return `${h}h ${m}m`; }
function formatReleaseDate(dateString) { if (!dateString) return 'N/A'; const d = new Date(dateString); const y = new Date().getFullYear() - d.getFullYear(); return `${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (${y} years ago)`; }

// --- Main Command Logic (Completely Rewritten) ---
module.exports = async (message, args) => {
  const query = args.slice(1).join(' ');
  if (!query) {
    return message.reply('Please provide a movie/TV show name or an IMDb ID. Usage: `!!info <query>`');
  }

  log(`[COMMAND] ${message.author.tag} is searching for info on: "${query}"`);

  try {
    let result = null;
    const imdbIdMatch = query.match(/^tt\d+$/);

    // --- Intelligent Query Processing ---

    // Case 1: The query is an IMDb ID
    if (imdbIdMatch) {
      log(`Detected IMDb ID search: ${query}`);
      const findUrl = `https://api.themoviedb.org/3/find/${query}?api_key=${process.env.TMDB_API_KEY}&external_source=imdb_id`;
      const findResponse = await fetch(findUrl);
      const findData = await findResponse.json();
      // The 'find' endpoint returns results in arrays by type
      if (findData.movie_results?.length > 0) {
        result = findData.movie_results[0];
        result.media_type = 'movie';
      } else if (findData.tv_results?.length > 0) {
        result = findData.tv_results[0];
        result.media_type = 'tv';
      }
    } 
    // Case 2: The query is plain text
    else {
      let cleanQuery = query;
      let year = null;
      const yearMatch = query.match(/\((\d{4})\)/);
      
      // Check for a year like "(2009)" and clean it from the query
      if (yearMatch) {
        year = yearMatch[1];
        cleanQuery = query.replace(/\s*\(\d{4}\)\s*/, '').trim();
        log(`Detected text search for "${cleanQuery}" with year ${year}`);
      } else {
        log(`Detected standard text search for "${query}"`);
      }
      
      let searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(cleanQuery)}`;
      if (year) {
        searchUrl += `&year=${year}`;
      }
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      if (searchData.results?.length > 0) {
        result = searchData.results[0];
      }
    }

    if (!result) {
      return message.reply(`I couldn't find any results for "${query}". Please check your input.`);
    }

    // --- Fetch Full Details and Build Embed ---

    const detailsUrl = `https://api.themoviedb.org/3/${result.media_type}/${result.id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits,external_ids`;
    const detailsResponse = await fetch(detailsUrl);
    const details = await detailsResponse.json();

    const isMovie = result.media_type === 'movie';
    const title = isMovie ? details.title : details.name;
    const releaseDate = isMovie ? details.release_date : details.first_air_date;
    const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
    const imdbId = details.external_ids?.imdb_id;
    const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : `https://www.themoviedb.org/${result.media_type}/${details.id}`;
    const director = details.credits?.crew.find(p => p.job === 'Director')?.name || 'N/A';

    const infoEmbed = new EmbedBuilder()
      .setColor('#E91E63')
      .setTitle(`${title} (${releaseYear})`)
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
    console.error('Error in !!info command:', error);
    message.reply('Sorry, an unexpected error occurred. Please try again later.');
  }
};