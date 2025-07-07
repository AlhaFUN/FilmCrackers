const { EmbedBuilder } = require('discord.js');
const { log } = require('../utils/logger');
const { fetchMediaInfo } = require('../features/mediaInfo');

// Helper function to ask a question and wait for a reply
async function askQuestion(message, question) {
  await message.reply(question);
  const filter = m => m.author.id === message.author.id;
  try {
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 300_000, errors: ['time'] });
    return collected.first().content;
  } catch (error) {
    await message.reply('You took too long to respond. Announcement canceled.');
    return null;
  }
}

module.exports = async (message) => {
  try {
    // Step 1: Get the movie/TV show name
    const titleQuery = await askQuestion(message, '📝 **First, what is the title of the movie or TV show?** (For best results, include the year, e.g., `Suits (2011)`)');
    if (titleQuery === null) return;

    await message.reply('⏳ Got it. Searching for media info...');

    // Step 2: Fetch all the automatic data from TMDB
    const mediaInfoResult = await fetchMediaInfo(titleQuery);
    if (mediaInfoResult.error) {
      return message.reply(`❌ **Search Failed:** ${mediaInfoResult.error} Please try the command again.`);
    }

    const fetchedEmbedData = mediaInfoResult.embeds[0].data;
    const imdbUrl = fetchedEmbedData.url; // Get the IMDb URL from the fetched data

    // Step 3: Ask for the manual, upload-specific details
    const uploadDetails = {};
    const manualQuestions = [
      { key: 'size', prompt: '📦 **What is the upload size?** (e.g., `8.01 GB`)' },
      { key: 'quality', prompt: '📺 **What is the video quality?** (e.g., `720p`)' },
      { key: 'downloadType', prompt: '📥 **What is the download type?** (e.g., `Torrent`, `Direct`)' },
      { key: 'link', prompt: '🔗 **What is the download link?** (e.g., a magnet link)' },
      { key: 'requester', prompt: '🙋 **Who requested this?** (e.g., `@mention` or `N/A`)' },
      { key: 'extras', prompt: '✨ **Any extras?** (e.g., `Super Fast Download ⚡` or `N/A`)' },
    ];

    for (const question of manualQuestions) {
      const answer = await askQuestion(message, question.prompt);
      if (answer === null) return;
      uploadDetails[question.key] = answer;
    }

    // Step 4: Build the final, combined embed
    const linkText = fetchedEmbedData.title.split(' (')[0];

    const finalEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🎬 ${fetchedEmbedData.title}`)
      .setURL(imdbUrl) // FIX: Link the title to the IMDb URL
      .setDescription(fetchedEmbedData.description)
      .setThumbnail(fetchedEmbedData.thumbnail.url)
      .addFields(
          { name: '🎭 Genre', value: fetchedEmbedData.fields.find(f => f.name === '🎭 Genres').value, inline: true },
          { name: '📦 Upload Size', value: uploadDetails.size, inline: true },
          { name: '📥 Download Type', value: uploadDetails.downloadType, inline: true }, // FIX: Use the asked value
          { name: '📺 Video Quality', value: uploadDetails.quality, inline: true },
          { name: '🙋 Requested By', value: uploadDetails.requester, inline: true },
          { name: '✨ Extras', value: uploadDetails.extras, inline: false }, // FIX: Set inline to false
          { name: '🔗 Cracked Link', value: `**[${linkText}](${uploadDetails.link})**`, inline: false } // FIX: Bold the link text
      )
      .setImage(fetchedEmbedData.image.url)
      .setFooter({ text: 'Uploaded by FilmCrackers', iconURL: 'https://i.imgur.com/aQ0UWXm.png' })
      .setTimestamp();

    // Step 5: Post the announcement
    const channelId = process.env.ANNOUNCEMENT_CHANNEL_ID;
    const channel = await message.guild.channels.fetch(channelId);
    
    if (channel && channel.isTextBased()) {
        const newReleaseRoleId = process.env.NEW_RELEASE_ROLE_ID;
        // FIX: Use the role ID to create a proper ping
        const content = newReleaseRoleId ? `<@&${newReleaseRoleId}>` : '@New (Role not configured)';
        
        await channel.send({ content, embeds: [finalEmbed] });
        await message.reply('✅ Announcement posted successfully!');
        log(`[COMMAND] ${message.author.tag} posted a new announcement: ${fetchedEmbedData.title}`);
    } else {
        await message.reply('❌ Could not find the announcement channel. Please check the `ANNOUNCEMENT_CHANNEL_ID` environment variable.');
    }
  } catch (error) {
    console.error('Error in !!announce command:', error);
    await message.reply('An unexpected error occurred. Please check the logs.');
  }
};