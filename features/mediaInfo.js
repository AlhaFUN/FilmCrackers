const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { log } = require('../utils/logger');

// --- Helper Functions ---
function formatCurrency(number) { if (number === 0 || !number) return 'N/A'; return `$${new Intl.NumberFormat('en-US').format(number)}`; }
function formatRuntime(minutes) { if (!minutes) return 'N/A'; const h = Math.floor(minutes / 60); const m = minutes % 60; return `${h}h ${m}m`; }
function formatReleaseDate(dateString) { if (!dateString) return 'N/A'; const d = new Date(dateString); const y = new Date().getFullYear() - d.getFullYear(); return `${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (${y} years ago)`; }

// This is the core logic, now reusable. It returns an object with either an embed or an error message.
async function fetchMediaInfo(query) {
  try {
    let result = null;
    const imdbIdMatch = query.match(/^tt\d+$/);

    if (imdbIdMatch) {
      const findUrl = `https://api.themoviedb.org/3/find/${query}?api_key=${process.env.TMDB_API_KEY}&external_source=imdb_id`;
      const findResponse = await fetch(findUrl);
      const findData = await findResponse.json();
      if (findData.movie_results?.length > 0) {
        result = findData.movie_results[0];
        result.media_type = 'movie';
      } else if (findData.tv_results?.length > 0) {
        result = findData.tv_results[0];
        result.media_type = 'tv';
      }
    } else {
      let cleanQuery = query;
      let year = null;
      const yearMatch = query.match(/\((\d{4})\)/);
      if (yearMatch) {
        year = yearMatch[1];
        cleanQuery = query.replace(/\s*\(\d{4}\)\s*/, '').trim();
      }
      let searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(cleanQuery)}`;
      if (year) { searchUrl += `&year=${year}`; }
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      if (searchData.results?.length > 0) { result = searchData.results[0]; }
    }

    if (!result) {
      return { error: `I couldn't find any results for "${query}". Please check the title.` };
    }

    const detailsUrl = `https://api.themoviedb.org/3/${result.media_type}/${result.id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits,external_ids`;
    const detailsResponse = await fetch(detailsUrl);
    const details = await detailsResponse.json();

    const isMovie = result.media_type === 'movie';
    const title = isMovie ? details.title : details.name;
    const releaseYear = details.release_date || details.first_air_date ? new Date(details.release_date || details.first_air_date).getFullYear() : 'N/A';
    const imdbId = details.external_ids?.imdb_id;
    const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : `https://www.themoviedb.org/${result.media_type}/${details.id}`;
    const director = details.credits?.crew.find(p => p.job === 'Director')?.name || 'N/A';

    const infoEmbed = new EmbedBuilder()
      .setColor('#5f0005')
      .setTitle(`${title} (${releaseYear})`).setURL(imdbUrl)
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
        { name: '🗓️ Release Date', value: formatReleaseDate(details.release_date || details.first_air_date), inline: false },
      )
      .setImage(details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null)
      .setFooter({ text: 'Powered by The Movie Database (TMDB)', iconURL: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded9042015820c37f6af27cfd725480174cf28f2679d9e2fb42a.svg' });

    return { embeds: [infoEmbed] }; // Return the embed in an object
  } catch (error) {
    console.error('Error in fetchMediaInfo:', error);
    return { error: 'Sorry, an unexpected error occurred while fetching data.' };
  }
}

module.exports = { fetchMediaInfo };