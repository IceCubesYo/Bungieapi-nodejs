# Discord Bot for Destiny 2

This is a Discord bot that provides various functions related to Destiny 2. The bot is built with [discord.js](https://discord.js.org/) and uses the [Bungie.net API](https://bungie-net.github.io/) to retrieve Destiny 2 player information.

## Installation

1. Clone this repository.
2. Install dependencies with `npm install`.
3. Set the `DISCORD_TOKEN` and `BUNGIE_API_KEY` environment variables.
4. Set the `MongoLink` environment variable to the MongoDB connection string.
5. Run the bot with `npm start`.

## Usage

The bot supports the following commands:

- `!addprofile <profile name>`: Adds a Destiny 2 profile to the user's profile.
- `!profile`: Displays the user's stored Destiny 2 profile.
- `!emblem`: Displays the user's current emblem on their equipped guardian.
- `!raid`: Displays the user's latest completed raid.

Note that the `BUNGIE_API_KEY` environment variable must be set to a valid Bungie.net API key. Additionally, the `MongoLink` environment variable must be set to the MongoDB connection string.

## Dependencies

- [discord.js](https://discord.js.org/): A powerful JavaScript library for interacting with the Discord API.
- [axios](https://github.com/axios/axios): A promise-based HTTP client for the browser and node.js.
- [mongodb](https://www.mongodb.com/): A general purpose, document-based, distributed database.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
