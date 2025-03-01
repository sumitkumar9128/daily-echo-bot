import 'dotenv/config'; 
import { Telegraf } from "telegraf";
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import fs from "fs";
import path from "path";
import os from "os";
import userModel from "./src/models/user.js";
import connectDb from "./src/config/db.js";
import { message } from "telegraf/filters";
import eventModel from "./src/models/Event.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

// Connect to MongoDB
try {
  connectDb();
  console.log("Database connected");
} catch (err) {
  console.error("DB connection error:", err);
  process.kill(process.pid, "SIGTERM");
}

// /start command: Register user and greet them
bot.start(async (ctx) => {
  const from = ctx.update.message.from;
  const welcomeMessage = `
🎉 **Welcome to DailyEcho!** 🎉

Hello, ${from.first_name}! We're thrilled to have you onboard. DailyEcho transforms your daily moments into captivating social media posts with a simple command. Whether you're sharing insights on LinkedIn, updates on Facebook, or tweets on Twitter, we've got you covered.

Here's what you can do:
- **Log your thoughts:** Just type your daily events.
- **Generate posts:** Use the /generate command to see magic in action.
- **View your stats and history:** Check /stats and /history for your journey.
- **Customize your experience:** Update your settings with /settings.

Type /help to get started and explore all available commands.

Let's create some engaging content together!
  `;

  try {
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          username: from.username,
          settings: {
            tone: "neutral", 
            platforms: "LinkedIn,Facebook,Twitter" 
          },
          postsGenerated: 0
        },
      },
      { upsert: true, new: true }
    );
    await ctx.reply(welcomeMessage);
  } catch (err) {
    console.error("User DB error:", err);
    await ctx.reply("Facing difficulties while registering you.");
  }
});


// /generate command: Generate social media posts using Gemini API
bot.command("generate", async (ctx) => {
  const from = ctx.update.message.from;

  const { message_id: waitingMessageId } = await ctx.reply(
    `Hey ${from.first_name}, please wait while I curate your post ☺️`
  );

  await ctx.sendChatAction("typing");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch today's events for the user
  const events = await eventModel.find({
    tgId: from.id,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  if (events.length === 0) {
    await ctx.deleteMessage(waitingMessageId);
    await ctx.reply("No events for the day.");
    return;
  }

  console.log("User events:", events);
  try {
    // Compose the prompt using the day's events
    const prompt = `Act as a senior copywriter. Write like a human, for humans. Craft three engaging social media posts tailored for LinkedIn, Facebook, and Twitter audiences, each creatively highlighting the following events: ${events
      .map((e) => e.text)
      .join(", ")}`;

    // Instantiate Gemini API client and get the generative model
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Update posts generated counter in the user model
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      { $inc: { postsGenerated: 1 } }
    );

    await ctx.deleteMessage(waitingMessageId);
    await ctx.reply(responseText || "No response text received from Gemini.");
  } catch (err) {
    console.error("Gemini API error:", err);
    await ctx.reply("There was a problem with the Gemini API.");
  }
});

// /clear command: Clear all logged events for the user
bot.command("clear", async (ctx) => {
  const from = ctx.update.message.from;
  try {
    await eventModel.deleteMany({ tgId: from.id });
    await ctx.reply("Your logs have been cleared.");
  } catch (err) {
    console.error("Error clearing logs:", err);
    await ctx.reply("Sorry, I couldn't clear your logs. Please try again later.");
  }
});

// /stats command: Display usage statistics for the user
bot.command("stats", async (ctx) => {
  const from = ctx.update.message.from;
  try {
    const eventCount = await eventModel.countDocuments({ tgId: from.id });
    const user = await userModel.findOne({ tgId: from.id });
    const postsGenerated = user.postsGenerated || 0;
    await ctx.reply(`You have logged ${eventCount} event(s) and generated ${postsGenerated} post(s).`);
  } catch (err) {
    console.error("Error fetching stats:", err);
    await ctx.reply("Sorry, I couldn't retrieve your stats at the moment.");
  }
});

// /history command: Show the latest 5 events logged by the user
bot.command("history", async (ctx) => {
  const from = ctx.update.message.from;
  try {
    const events = await eventModel.find({ tgId: from.id })
      .sort({ createdAt: -1 })
      .limit(5);
    if (events.length === 0) {
      return ctx.reply("You haven't logged any events yet.");
    }
    const historyText = events
      .map((e, idx) => `${idx + 1}. ${e.text}`)
      .join("\n");
    await ctx.reply(`Your recent events:\n${historyText}`);
  } catch (err) {
    console.error("Error fetching history:", err);
    await ctx.reply("Sorry, I couldn't retrieve your history right now.");
  }
});

// /settings command: Allow users to update their post settings (tone and platforms)
bot.command("settings", async (ctx) => {
  const from = ctx.update.message.from;
  // Expecting commands like: /settings tone professional or /settings platforms LinkedIn,Facebook
  const args = ctx.update.message.text.split(" ").slice(1);
  if (args.length < 2) {
    return ctx.reply("Usage:\n/settings tone <value>\n/settings platforms <value>");
  }
  const field = args[0].toLowerCase();
  const value = args.slice(1).join(" ");
  let update = {};
  if (field === "tone" || field === "platforms") {
    update[`settings.${field}`] = value;
  } else {
    return ctx.reply("You can only update 'tone' or 'platforms'.");
  }

  try {
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      { $set: update }
    );
    await ctx.reply(`Your ${field} has been updated to: ${value}`);
  } catch (err) {
    console.error("Error updating settings:", err);
    await ctx.reply("Sorry, I couldn't update your settings. Please try again later.");
  }
});

// /export command: Export user's logs as a CSV file
bot.command("export", async (ctx) => {
  const from = ctx.update.message.from;
  try {
    const events = await eventModel.find({ tgId: from.id }).sort({ createdAt: 1 });
    if (events.length === 0) {
      return ctx.reply("You have no events to export.");
    }
    // Create CSV content
    let csvContent = "Event,Date\n";
    events.forEach((e) => {
      csvContent += `"${e.text.replace(/"/g, '""')}","${e.createdAt.toISOString()}"\n`;
    });

    // Write to a temporary file
    const tempFilePath = path.join(os.tmpdir(), `events_${from.id}.csv`);
    fs.writeFileSync(tempFilePath, csvContent);

    // Send file to user
    await ctx.replyWithDocument({ source: tempFilePath, filename: "your_events.csv" });
    
    // Optionally, delete the file afterwards
    fs.unlinkSync(tempFilePath);
  } catch (err) {
    console.error("Export error:", err);
    await ctx.reply("Sorry, I couldn't export your events at the moment.");
  }
});

// /help command: List available commands and usage
bot.command("help", async (ctx) => {
  const helpText = `
Available Commands:
/start - Register and start using the bot
/generate - Generate social media posts from your logged events
/clear - Clear your logged events
/stats - View your usage statistics
/history - View your recent logged events
/settings - Update your post settings (e.g., tone, platforms)
/export - Export your logs as a CSV file
/info - Get information about the bot
/help - Show this help message
`;
  await ctx.reply(helpText);
});

// /info command: Provide details about the bot
bot.command("info", async (ctx) => {
  const infoText = `
DailyEcho Bot v1.0
Crafting engaging social media posts from your daily logs.
Last updated: Feb 28, 2025
For support or feedback, contact the developer.
`;
  await ctx.reply(infoText);
});

// Save incoming text as events
bot.on(message("text"), async (ctx) => {
  const from = ctx.update.message.from;
  const text = ctx.update.message.text;
  // Avoid commands from being stored as events
  if (text.startsWith("/")) return;
  
  try {
    await eventModel.create({
      text,
      tgId: from.id,
    });
    await ctx.reply("Noted. Keep sending your thoughts. To generate posts, just enter the command: /generate");
  } catch (err) {
    console.error("Event saving error:", err);
    await ctx.reply("Facing issues, please try again later.");
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));












// import 'dotenv/config'; // Load environment variables
// import { Telegraf } from "telegraf";
// import { GoogleGenerativeAI } from "@google/generative-ai"; // Import the class as per docs
// import userModel from "./src/models/user.js";
// import connectDb from "./src/config/db.js";
// import { message } from "telegraf/filters";
// import eventModel from "./src/models/Event.js";

// // Initialize the Telegram bot
// const bot = new Telegraf(process.env.BOT_TOKEN);

// // Connect to MongoDB
// try {
//   connectDb();
//   console.log("Database connected");
// } catch (err) {
//   console.error("DB connection error:", err);
//   process.kill(process.pid, "SIGTERM");
// }

// bot.start(async (ctx) => {
//   const from = ctx.update.message.from;
//   console.log("User info:", from);
//   try {
//     await userModel.findOneAndUpdate(
//       { tgId: from.id },
//       {
//         $setOnInsert: {
//           firstName: from.first_name,
//           lastName: from.last_name,
//           isBot: from.is_bot,
//           username: from.username,
//         },
//       },
//       { upsert: true, new: true }
//     );
//     await ctx.reply(`Hey ${from.first_name}, I’ll be crafting highly engaging social media posts for you.`);
//   } catch (err) {
//     console.error("User DB error:", err);
//     await ctx.reply("Facing difficulties while registering you.");
//   }
// });

// bot.command("generate", async (ctx) => {
//   const from = ctx.update.message.from;
  
//   // Inform the user that processing is in progress
//   const { message_id: waitingMessageId } = await ctx.reply(
//     `Hey ${from.first_name}, please wait while I curate your post ☺️`
//   );
  
//   // Define today's date range
//   const startOfDay = new Date();
//   startOfDay.setHours(0, 0, 0, 0);
//   const endOfDay = new Date();
//   endOfDay.setHours(23, 59, 59, 999);
  
//   // Fetch today's events for the user
//   const events = await eventModel.find({
//     tgId: from.id,
//     createdAt: { $gte: startOfDay, $lte: endOfDay },
//   });
  
//   if (events.length === 0) {
//     await ctx.deleteMessage(waitingMessageId);
//     await ctx.reply("No events for the day.");
//     return;
//   }
  
//   console.log("User events:", events);
  
//   try {
//     // Compose the prompt from the events
//     const prompt = `Act as a senior copywriter. Write like a human, for humans. Craft three engaging social media posts tailored for LinkedIn, Facebook, and Twitter audiences, each creatively highlighting the following events: ${events
//       .map((e) => e.text)
//       .join(", ")}`;
    
//     // Instantiate the Gemini API client using GoogleGenerativeAI
//     const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    
//     // Get the generative model
//     const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
    
//     // Generate content using the model
//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();
    
//     console.log("Gemini response:", result);
    
//     // Optionally update token usage if Gemini returns such data
//     await userModel.findOneAndUpdate(
//       { tgId: from.id },
//       { $inc: { prompTokens: 0, completionToken: 0 } }
//     );
    
//     await ctx.deleteMessage(waitingMessageId);
//     await ctx.reply(responseText || "No response text received from Gemini.");
//   } catch (err) {
//     console.error("Gemini API error:", err);
//     await ctx.reply("There was a problem with the Gemini API.");
//   }
// });

// bot.command("clear", async (ctx) => {
//   const from = ctx.update.message.from;
//   try {
//     // Delete all events associated with the user
//     await eventModel.deleteMany({ tgId: from.id });
//     await ctx.reply("Your logs have been cleared.");
//   } catch (err) {
//     console.error("Error clearing logs:", err);
//     await ctx.reply("Sorry, I couldn't clear your logs. Please try again later.");
//   }
// });


// // Save incoming text as events
// bot.on(message("text"), async (ctx) => {
//   const from = ctx.update.message.from;
//   const text = ctx.update.message.text;
  
//   try {
//     await eventModel.create({
//       text,
//       tgId: from.id,
//     });
//     await ctx.reply("Noted. Keep sending your thoughts. To generate posts, just enter the command: /generate");
//   } catch (err) {
//     console.error("Event saving error:", err);
//     await ctx.reply("Facing issues, please try again later.");
//   }
// });

// bot.launch();

// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));



