# Discord-Top-Chart-Bot
This bot instantly lists the Google Play Store and App Store Top Chart Top 100 games and notifies you of their daily changes periodically on the discord channel you specify.

This bot sends the first 100 games on the instant Top chart to the relevant discord channel in txt format with the command "/top_gp" and "/top_ios".

This bot will also show the changes in the Top chart list in txt format at certain intervals to the channel you specify.

When it runs for the first time, it creates json files for two markets and sends instant top chart data to json files after 24 hours (default time setting is 24 hours, you can change it according to your needs) once again and compares the data collected in the second query and sends the ranking changes in txt format.

By default, US markets are selected in the index.js file. You can access different market data by entering the country code of that market.

You can use the bot's time setting, top chart sorting interval, the category you want to see and use it according to your needs via index.js.


## Installation
1- npm install

2- Modify .env file

DISCORD_TOKEN = Your discord bot token You can get it from discord developer portal
CHANNEL_ID=  Your discord channel id
GUILD_ID=  Your discord guild id

## Usage
1- node index.js 

