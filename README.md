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

## Tech Stack

- **Node.js** – Server-side JavaScript runtime.
- **Express** – (Optional) For potential REST APIs or webhooks integration.
- **Telegraf** – Framework for building Telegram bots.
- **MongoDB** – Database for storing user events and settings.
- **Google Generative AI (Gemini API)** – For generating creative social media posts.
- **dotenv** – For environment variable management.

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/daily-echo-bot.git

 **Go to the project directory**

```bash
  cd daily-echo-bot
```

**Install dependencies**

```bash
  npm install
```
**Set Up Your Environment Variables**
```bash
Create a .env file in the root directory with the following content:

BOT_TOKEN=your_telegram_bot_token
MONGO_CONNECT_STRING=mongodb://localhost:27017/socioy
GEMINI_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

Note: Make sure .env is added to your .gitignore to keep your sensitive keys safe.

```
**Start the Bot**
```bash
  npm run dev
```



