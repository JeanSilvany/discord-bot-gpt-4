import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { API_KEY_GEMINI, DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID } from './config.js';


const MODEL_NAME = "gemini-1.0-pro";

async function runChat(message) {
  const genAI = new GoogleGenerativeAI(API_KEY_GEMINI);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: [
    ],
  });

  const result = await chat.sendMessage(message);

  if (result.response.promptFeedback.blockReason) {
    return "Pergunta uma coisa mais normal, por favor!"
  }
  const response = result.response;

  return response.text()
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,]
});


async function sendInChunks(message, channel, limit = 2000) {
  if (message.length <= limit) {
    await channel.reply(message);
    return;
  }

  let parts = [];
  let currentPart = '';

  message.split(' ').forEach(word => {
    if (currentPart.length + word.length + 1 > limit) {
      parts.push(currentPart);
      currentPart = '';
    }
    currentPart += `${word} `;
  });

  if (currentPart.length) {
    parts.push(currentPart.trim());
  }

  for (const part of parts) {
    await channel.reply(part);
  }
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


client.on('messageCreate', async message => {
  if (message.author.bot || !message.content) return;

  if (message.content && message.channelId === DISCORD_CHANNEL_ID) {
    await runChat(message.content).then(response => {
      sendInChunks(response, message);
    })
  }
});

client.login(DISCORD_BOT_TOKEN);
