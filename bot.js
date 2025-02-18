require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const spellchecker = require('spellchecker');
const fs = require('fs');

// Bot Token from .env file
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const forceSubscribeChannels = process.env.FORCE_SUBSCRIBE.split(',');

// Function to check if user is subscribed
async function checkSubscription(chatId, userId) {
    for (const channel of forceSubscribeChannels) {
        try {
            const res = await bot.getChatMember(channel, userId);
            if (['member', 'administrator', 'creator'].includes(res.status)) {
                continue;
            } else {
                await bot.sendMessage(chatId, `You must join @${channel} to use this bot.`);
                return false;
            }
        } catch (error) {
            console.log("Error checking subscription:", error);
            return false;
        }
    }
    return true;
}

// Handle /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!(await checkSubscription(chatId, userId))) return;
    bot.sendMessage(chatId, `Hello, ${msg.from.first_name}! Send me any URL to shorten.`);
});

// Handle URL shortening
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!(await checkSubscription(chatId, userId))) return;

    const text = msg.text;
    if (!text) return;

    // Check for spelling mistakes
    const words = text.split(" ");
    const correctedWords = words.map(word => spellchecker.isMisspelled(word) ? spellchecker.getCorrectionsForMisspelling(word)[0] || word : word);
    const correctedText = correctedWords.join(" ");

    if (text !== correctedText) {
        bot.sendMessage(chatId, `Did you mean: ${correctedText}?`);
    }

    if (text.startsWith('http://') || text.startsWith('https://')) {
        try {
            const response = await axios.get(`https://your-shortener-api.com?api=${process.env.URL_SHORTENER_API}&url=${text}`);
            bot.sendMessage(chatId, `Shortened URL: ${response.data.shortenedUrl}`);
        } catch (error) {
            bot.sendMessage(chatId, "Error shortening the URL.");
        }
    }
});

console.log("Bot is running...");

