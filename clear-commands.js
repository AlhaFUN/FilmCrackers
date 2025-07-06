const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
// If you ever registered commands ONLY to your server (guild), you'd add this.
// For now, we assume they are global.
// const guildId = 'YOUR_SERVER_ID_HERE';

if (!token || !clientId) {
  console.error('TOKEN and CLIENT_ID must be set in your .env file.');
  process.exit(1);
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    console.log('Connecting to Discord to clear application (/) commands.');

    // This tells Discord to overwrite ALL global commands with an empty list.
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] },
    );
    console.log('✅ Successfully deleted all global application (/) commands.');

    // --- Optional: To clear commands from a specific server (guild) ---
    // If you think the commands might be server-specific, uncomment the line below
    // and add your server ID to the guildId variable at the top.
    /*
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: [] },
    );
    console.log('✅ Successfully deleted all guild application (/) commands.');
    */

  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
})();