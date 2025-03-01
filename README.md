# DailyEchoBot

DailyEchoBot is a Telegram bot that helps you log your daily activities and automatically generates engaging social media posts for LinkedIn, Facebook, and Twitter using AI. It’s designed to streamline your content creation process—simply log your thoughts throughout the day, and with a single command, receive ready-to-share posts!

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [Environment Variables](#environment-variables)
- [Development Notes](#development-notes)

## Overview

DailyEchoBot was born from the need to simplify content creation. Initially, I experimented with the OpenAI API; however, due to rapid quota exhaustion and strict limits on free credits, I switched to the Gemini API (Google Generative AI), which proved more sustainable. The bot stores your events in MongoDB and uses these logs to generate creative and engaging posts tailored for various social media platforms.

## Features

- **Daily Logging:** Type in your thoughts or events, and they get saved.
- **AI Post Generation:** Generate engaging social media posts based on your logs.
- **User Statistics:** View your logging activity and the number of posts generated.
- **History & Export:** Check your recent logs and export them as a CSV file.
- **Customization:** Adjust settings such as tone and target social media platforms.
- **Interactive Commands:** Easy-to-use commands for a smooth user experience.

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/daily-echo-bot.git
   cd daily-echo-bot
2. Install Dependencies
bash
Copy
Edit
npm install
3. Set Up Your Environment Variables
Create a .env file in the root directory with the following content:

env
Copy
Edit
BOT_TOKEN=your_telegram_bot_token
MONGO_CONNECT_STRING=mongodb://localhost:27017/socioy
GEMINI_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
Note: Make sure .env is added to your .gitignore to keep your sensitive keys safe.

4. Start the Bot in Development Mode
bash
Copy
Edit
npm run dev
Usage
Once the bot is running, start a chat with it on Telegram. Use the /start command to register and receive a grand welcome message. Then, simply type your events throughout the day and use the provided commands to manage your logs and generate social media posts.

Commands
Here's a list of available commands:

/start
Register and start using the bot. Receive a grand welcome message with details on how to use the bot.

/generate
Generate engaging social media posts based on your logged events.

/clear
Clear all your logged events from the database.

/stats
View your usage statistics, including the number of events logged and posts generated.

/history
Display your most recent logged events (latest 5 entries).

/settings
Update your post settings, such as tone or social media platforms.
Usage:

bash
Copy
Edit
/settings tone <value>
/settings platforms <value>
/export
Export your logs as a CSV file. The bot will generate the CSV and send it as a document.

/info
Get information about the bot, including version, last update, and other details.

/help
Show this help message with the list of available commands.

Environment Variables
The bot requires the following environment variables in your .env file:

BOT_TOKEN: Your Telegram Bot token (provided by BotFather).
MONGO_CONNECT_STRING: Your MongoDB connection string.
GEMINI_KEY: Your API key for the Gemini API (Google Generative AI).
GEMINI_MODEL: The model name to use with Gemini (e.g., gemini-1.5-flash).
Development Notes
Initial Challenges:
Initially, I used the OpenAI API, but rapid quota exhaustion made it impractical. Switching to the Gemini API resolved these issues, allowing for a more stable solution.

Modularization:
The current implementation mostly resides in a single file (server.js). Future improvements could modularize the code into separate modules for API interactions, database operations, and command handling.

Error Handling & Logging:
Extensive error logging is implemented to help diagnose issues during development and in production.
