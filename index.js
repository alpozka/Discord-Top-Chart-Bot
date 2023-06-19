const { Client, GatewayIntentBits } = require('discord.js');
const gplay = require('google-play-scraper');
const appstore = require('app-store-scraper');
const fs = require('fs');
require('dotenv').config();

// const CHANNEL_ID = process.env.CHANNEL_ID; // Your Discord channel ID
const { DISCORD_TOKEN, CHANNEL_ID, GUILD_ID } = process.env;
// Create a new Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const channelId = CHANNEL_ID;
const rankingDataFile = 'ranking_data.json';

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  await Promise.all([
    client.guilds.cache.get(GUILD_ID).commands.create({
      name: 'top_ios',
      description: 'Fetches the top 100 games from the Google Play Store',
    }),
    client.guilds.cache.get(GUILD_ID).commands.create({
      name: 'top_gp',
      description: 'Fetches the top 100 games from the App Store',
    }),
  ]);

  console.log("Slash commands '/top_gp' and '/top_ios' created!");

  // If the ranking file does not exist, fetch the initial rankings and save them to the file
  if (!fs.existsSync(rankingDataFile)) {
    const [googlePlayApps, appStoreApps] = await Promise.all([
      gplay.list({
        category: gplay.category.GAME,
        collection: gplay.collection.TOP_FREE,
        num: 100,
        country: 'us'
      }),
      appstore.list({
        category: appstore.category.GAMES,
        collection: appstore.collection.TOP_FREE,
        num: 100,
        country: 'us'
      })
    ]);

    fs.writeFileSync(rankingDataFile, JSON.stringify({
      googlePlay: googlePlayApps,
      appStore: appStoreApps
    }));
  }

  // Then start the interval for checking ranking changes
  setInterval(checkRankingChanges, 86400000); // 60 minutes interval (in milliseconds)
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try {
    await interaction.deferReply();

    let apps;
    let source = commandName === 'top_gp' ? 'Google Play Store' : 'App Store';

    if (commandName === 'top_gp') {
      apps = await gplay.list({
        category: gplay.category.GAME,
        collection: gplay.collection.TOP_FREE,
        num: 100,
        country: 'us'
      });
    } else if (commandName === 'top_ios') {
      apps = await appstore.list({
        category: appstore.category.GAMES,
        collection: appstore.collection.TOP_FREE,
        num: 100,
        country: 'us'
      });
    }

    let messageText = `Date: ${new Date().toLocaleString()}\nSource: ${source}\n\n`;

    apps.forEach((app, index) => {
      messageText += `${index + 1}. ${app.title} - Score: ${app.scoreText}\n`;
    });

    const date = new Date();
    const dateString = date.getFullYear() +
      ('0' + (date.getMonth()+1)).slice(-2) +
      ('0' + date.getDate()).slice(-2) + '_' +
      ('0' + date.getHours()).slice(-2) +
      ('0' + date.getMinutes()).slice(-2) +
      ('0' + date.getSeconds()).slice(-2);

    const fileName = `${commandName}_${dateString}.txt`;

    fs.writeFileSync(fileName, messageText);
  
//buraya channelİd yaz
    client.channels.fetch(channelId).then(channel => {
      channel.send({
        content: 'Here is the top games:',
        files: [{
            attachment: fileName,
            name: fileName
        }]
      }).then(() => fs.unlinkSync(fileName)); 
    });

  } catch (error) {
    console.error(error);
  }
});

async function checkRankingChanges() {
  try {
    // Fetch the current date
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()}`;

    // Fetch the current rankings from Google Play
    const currentGooglePlayRankings = (await gplay.list({
      category: gplay.category.GAME,
      collection: gplay.collection.TOP_FREE,
      num: 100,
      country: 'us'
    })).map((game, index) => ({ id: game.appId, title: game.title, position: index + 1 })); // Store id, title and position

    // Fetch the current rankings from App Store
    const currentAppStoreRankings = (await appstore.list({
      category: appstore.category.GAMES,
      collection: appstore.collection.TOP_FREE,
      num: 100,
      country: 'us'
    })).map((game, index) => ({ id: game.id, title: game.title, position: index + 1 })); // Store id, title and position

    // Fetch the previous rankings from the files, if they exist
    let previousGooglePlayRankings = [], previousAppStoreRankings = [];
    if (fs.existsSync(`google_play_rankings.json`)) {
      previousGooglePlayRankings = JSON.parse(fs.readFileSync(`google_play_rankings.json`, 'utf8'));
    }
    if (fs.existsSync(`app_store_rankings.json`)) {
      previousAppStoreRankings = JSON.parse(fs.readFileSync(`app_store_rankings.json`, 'utf8'));
    }

    // Save the current rankings back to the JSON files
    fs.writeFileSync(`google_play_rankings.json`, JSON.stringify(currentGooglePlayRankings));
    fs.writeFileSync(`app_store_rankings.json`, JSON.stringify(currentAppStoreRankings));

    // Compare the current rankings with the previous rankings and find changes
    const googlePlayRankingChanges = compareRankings(previousGooglePlayRankings, currentGooglePlayRankings);
    const appStoreRankingChanges = compareRankings(previousAppStoreRankings, currentAppStoreRankings);

     // Change this to your channel ID
    const channel = await client.channels.fetch(channelId);

    // Create a report for the ranking changes
    let report = `Date: ${formattedDate}\n\n`;

    if (googlePlayRankingChanges.length > 0) {
      report += 'Google Play Store:\n';
      googlePlayRankingChanges.forEach(change => report += `${change.title}: ${change.previousPosition} -> ${change.currentPosition}\n`);
      report += '\n';
    } else {
      report += 'No changes in Google Play Store rankings.\n\n';
    }

    if (appStoreRankingChanges.length > 0) {
      report += 'App Store:\n';
      appStoreRankingChanges.forEach(change => report += `${change.title}: ${change.previousPosition} -> ${change.currentPosition}\n`);
    } else {
      report += 'No changes in App Store rankings.\n';
    }

    if (googlePlayRankingChanges.length === 0 && appStoreRankingChanges.length === 0) {
      channel.send(`No ranking changes detected on ${formattedDate}`);
    } else {
      // Save the report to a txt file and send it to the Discord channel
      const fileName = `ranking_changes_${formattedDate.replace(/\./g, '_')}.txt`;
      fs.writeFileSync(fileName, report);
      channel.send({
        content: `Ranking changes detected on ${formattedDate}`,
        files: [{
          attachment: fileName,
          name: fileName
        }]
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function compareRankings(previousRankings, currentRankings) {
  const changes = [];

  currentRankings.forEach((currentGame) => {
    const previousGame = previousRankings.find(game => game.id === currentGame.id);

    // If the game was not in the previous rankings, skip it
    if (!previousGame) return;

    // If the game's position has changed, add it to the changes array
    if (previousGame.position !== currentGame.position) {
      if (currentGame.title && currentGame.position && previousGame.position) {
        changes.push({
          title: currentGame.title,
          previousPosition: previousGame.position,
          currentPosition: currentGame.position
        });
      } else {
        throw new Error(`Missing data for game: ${JSON.stringify(currentGame)}`);
      }
    }
  });

  return changes;
}

client.login(process.env.DISCORD_TOKEN);
