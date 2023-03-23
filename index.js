require('dotenv').config();
const {
  Client,
  Intents
} = require('discord.js');
const axios = require('axios');
const {
  MongoClient
} = require('mongodb');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});

// bot is ready
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await clientDb.connect();
  console.log('Connected to the database!');
});

// Create a new MongoClient
const uri = process.env.MONGODB_URI;
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
const clientDb = new MongoClient(uri, options);

// Get the database instance
const db = clientDb.db(process.env.DB_NAME);

  // Commands
  client.on('messageCreate', async(message) => {
    if (!message.content.startsWith('!')) return;
  
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
  
    if (command === 'addprofile') {
        let displayName = args[0];
        if (args.length > 1 && args[1].startsWith('#')) {
            displayName = displayName + args[1];
        }
        const response = await axios.get(`https://www.bungie.net/Platform/Destiny2/SearchDestinyPlayer/-1/${encodeURIComponent(displayName)}/`, {
            headers: {
                'X-API-Key': process.env.BUNGIE_API_KEY
            }
        });
  
        const player = response.data.Response[0];
        if (player) {
            const membershipId = player.membershipId;
            const membershipType = player.membershipType;
            const platform = getPlatformName(membershipType);
  
            // Save player information to user profile
            const userId = message.author.id;
            const userCollection = clientDb.db().collection('users');
            const updateResult = await userCollection.updateOne({
                _id: userId
            }, {
                $set: {
                    'destiny2.player': player
                }
            }, {
                upsert: true
            });
            if (updateResult.modifiedCount > 0 || updateResult.upsertedCount > 0) {
                message.reply(`Player found: ${player.displayName} (${platform}). Player information has been saved to your profile.`);
            } else {
                message.reply(`Player found: ${player.displayName} (${platform}). Player information could not be saved to your profile.`);
            }
        } else {
            message.reply(`Player not found.`);
        }
    } else if (command === 'profile') {
        // Retrieve user's stored Destiny 2 profile
        const userId = message.author.id;
        const userCollection = clientDb.db().collection('users');
        const result = await userCollection.findOne({
            _id: userId
        });
  
        if (result && result.destiny2 && result.destiny2.player) {
            const player = result.destiny2.player;
            message.reply(`Your Destiny 2 profile: ${player.displayName} (${getPlatformName(player.membershipType)})`);
        } else {
            console.error(`Could not find Destiny 2 profile for user ${message.author.tag} (${message.author.id})`);
            message.reply('You have not stored a Destiny 2 profile. Please store your profile by typing !addprofile <profile name>');
        }
    } else if (command === 'emblem') {
      // Retrieve user's stored Destiny 2 profile
      const userId = message.author.id;
      const userCollection = clientDb.db().collection('users');
      const result = await userCollection.findOne({ _id: userId });
  
      if (result && result.destiny2 && result.destiny2.player) {
          const player = result.destiny2.player;
          const membershipType = player.membershipType;
          const membershipId = player.membershipId;
  
          // Ask user which character to select
          const characterNames = await getCharacterNames(message.author.id);
  
          if (!characterNames || characterNames.length === 0) {
              throw new Error('No character names found');
          }
  
          message.reply(`Please select a character: ${characterNames.join(', ')}`);
  
          // Wait for user to select character
          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const characterName = collected.first().content.trim().toLowerCase();
  
          // Get character ID for selected character
          const characterId = await getCharacterId(message.author.id, characterName);
  
          if (!characterId) {
              return message.reply(`Could not find character "${characterName}"`);
          }
  
          try {
              const emblem = await getEmblem(membershipType, membershipId, characterId);
              message.reply(`Your current emblem on your ${characterName} is: ${emblem.displayProperties.name}\nIcon: https://Bungie.net${emblem.secondaryIcon}`);
          } catch (error) {
              console.error(`Error retrieving emblem for user ${message.author.tag} (${message.author.id}):`, error);
              message.reply('An error occurred while retrieving your emblem. Please try again later.');
          }
      } else {
          console.error(`Could not find Destiny 2 profile for user ${message.author.tag} (${message.author.id})`);
          message.reply('You have not stored a Destiny 2 profile. Please store your profile by typing !addprofile <profile name>');
      }
  }else if (command === 'raid') {
      try {
        // Retrieve user's stored Destiny 2 profile
        const userId = message.author.id;
        const userCollection = clientDb.db().collection('users');
        const result = await userCollection.findOne({ _id: userId });
    
        if (result && result.destiny2 && result.destiny2.player) {
          const player = result.destiny2.player;
          const membershipType = player.membershipType;
          const membershipId = player.membershipId;
    
          // Ask user which character to select
          const characterNames = await getCharacterNames(message.author.id);
    
          if (!characterNames || characterNames.length === 0) {
            throw new Error('No character names found');
          }
    
          message.reply(`Please select a character: ${characterNames.join(', ')}`);
    
          // Wait for user to select character
          const filter = m => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const characterName = collected.first().content.trim().toLowerCase();
    
          // Get character ID for selected character
          const characterId = await getCharacterId(message.author.id, characterName);
    
          if (!characterId) {
            return message.reply(`Could not find character "${characterName}"`);
          }
    
          // Get activity history for selected character
          const latestRaid = await getLatestRaidActivity(player.membershipType, player.membershipId, characterId);
    
          if (!latestRaid) {
            return message.reply(`No recent raids found for character "${characterName}"`);
          }
    
          // Get raid name and time
          const raidName = latestRaid.raidName;
          const raidTime = new Date(latestRaid.activityTimestamp).toLocaleString();
    
          // Get raid stats
          const kills = latestRaid.kills;
          const deaths = latestRaid.deaths;
    
          // Get raid report link
          const raidReportLink = latestRaid.raidReportLink;
    
          // Send raid information to user
          message.reply(`Latest raid for ${characterName}:\nRaid: ${raidName}\nTime: ${latestRaid.duration}\nDate: ${raidTime}\nKills: ${kills}\nDeaths: ${deaths}\nRaid Report: ${raidReportLink}`);
        } else {
          message.reply('You have not stored a Destiny 2 profile. Please store your profile by typing !addprofile <profile name>');
        }
      } catch (error) {
        console.error(error);
        throw new Error('Error processing raid command');
      }
    }       
  });
  
  function getPlatformName(membershipType) {
    switch (membershipType) {
        case 1:
            return 'Xbox';
        case 2:
            return 'PSN';
        case 3:
            return 'Steam';
        case 4:
            return 'Blizzard';
        case 5:
            return 'Stadia';
        case 10:
            return 'Demon';
        default:
            return 'Unknown';
    }
  }
  
  async function getEmblem(membershipType, membershipId, characterId) {
    try {
        const response = await axios.get(`https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=200`, {
            headers: {
                'X-API-Key': process.env.BUNGIE_API_KEY
            }
        });

        const emblemHash = response.data.Response.character.data.emblemHash;

        const manifestResponse = await axios.get(`https://www.bungie.net/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${emblemHash}/`, {
            headers: {
                'X-API-Key': process.env.BUNGIE_API_KEY
            }
        });

        return manifestResponse.data.Response;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

  
// Get character names for a user
async function getCharacterNames(userId) {
  try {
    const characters = await getCharacters(userId);

    if (!characters || characters.length === 0) {
      throw new Error('No characters found');
    }

    const names = characters.map(character => character.name);

    if (!names || names.length === 0) {
      throw new Error('No character names found');
    }

    return names;
  } catch (error) {
    console.error(error);
    throw new Error('Error fetching character names');
  }
}
  
// Get character ID for a character name
async function getCharacterId(userId, characterName) {
  console.log(`Fetching character ID for user ${userId} and character ${characterName}`);
  try {
    const characters = await getCharacters(userId);

    if (!characters || characters.length === 0) {
      throw new Error('No characters found');
    }

    const matchingCharacter = characters.find(character => character.name.toLowerCase() === characterName.toLowerCase());

    if (!matchingCharacter) {
      throw new Error(`No character found with name '${characterName}'`);
    }

    return matchingCharacter.id;
  } catch (error) {
    console.error(error);
    throw new Error('Error fetching character ID');
  }
}
  
// Get all characters for a user
async function getCharacters(userId) {
  try {
    const userCollection = clientDb.db().collection('users');
    const result = await userCollection.findOne({ _id: userId });

    if (!result || !result.destiny2 || !result.destiny2.player) {
      throw new Error('Invalid user or missing Destiny 2 data');
    }

    const player = result.destiny2.player;
    const membershipType = player.membershipType;
    const membershipId = player.membershipId;

    if (!membershipType || !membershipId) {
      throw new Error('Missing membership type or ID');
    }

    const response = await axios.get(`https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=200`, {
      headers: {
        'X-API-Key': process.env.BUNGIE_API_KEY
      }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to retrieve character data: ${response.status}`);
    }

    const characterData = response.data.Response.characters.data;

    if (!characterData || Object.keys(characterData).length === 0) {
      throw new Error('No character data found');
    }

    const characters = [];

    for (const characterId in characterData) {
      const character = characterData[characterId];
      const classHash = character.classHash;

      // Get class name
      const manifestResponse = await axios.get(`https://www.bungie.net/Platform/Destiny2/Manifest/DestinyClassDefinition/${classHash}/`, {
        headers: {
          'X-API-Key': process.env.BUNGIE_API_KEY
        }
      });

      const className = manifestResponse.data.Response.displayProperties.name;

      characters.push({
        id: characterId,
        name: className
      });
    }

    return characters;
  } catch (error) {
    console.error(error);
    throw new Error('Error fetching characters');
  }
}
  
async function getLatestRaidActivity(membershipType, membershipId, characterId) {
  try {
    const activityHistoryUrl = `https://www.bungie.net/Platform/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities/?mode=4`;
    const activityHistoryResponse = await axios.get(activityHistoryUrl, {
      headers: {
        'X-API-Key': process.env.BUNGIE_API_KEY
      },
    });

    const activities = activityHistoryResponse.data.Response.activities;

    // Find latest completed raid activity
    let latestRaidActivity = null;
    for (const activity of activities) {
      if (activity.activityDetails.mode === 4 && activity.values.completed.basic.value === 1) {
        if (!latestRaidActivity || activity.period > latestRaidActivity.period) {
          latestRaidActivity = activity;
        }
      }
    }
  
      if (latestRaidActivity) {
        const activityDetails = latestRaidActivity.activityDetails;
        const directorActivityHash = activityDetails.directorActivityHash;
  
        // Fetch raid definition to get the raid name
        const raidDefinitionUrl = `https://www.bungie.net/Platform/Destiny2/Manifest/DestinyActivityDefinition/${directorActivityHash}/`;
        const raidDefinitionResponse = await axios.get(raidDefinitionUrl, {
          headers: {
            'X-API-Key': process.env.BUNGIE_API_KEY
          },
        });

        const raidName = raidDefinitionResponse.data.Response.displayProperties.name;
        const activityTimestamp = latestRaidActivity.period;
        const kills = latestRaidActivity.values.kills.basic.displayValue;
        const deaths = latestRaidActivity.values.deaths.basic.displayValue;
        const raidReportLink = `https://raid.report/pgcr/${latestRaidActivity.activityDetails.instanceId}`;
        const duration = latestRaidActivity.values.activityDurationSeconds.basic.displayValue;
        return {
          raidName,
          activityTimestamp,
          kills,
          deaths,
          raidReportLink,
          duration
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(error);
      throw new Error('Error fetching activity history');
    }
  }
  
  client.login(process.env.DISCORD_TOKEN);
