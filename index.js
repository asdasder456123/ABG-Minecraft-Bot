require('dotenv').config();
const mineflayer = require('mineflayer');

const HOST = process.env.MC_HOST;
const PORT = Number(process.env.MC_PORT);
const USERNAME = process.env.BOT_USERNAME || 'OMmmsobdod';
const PASSWORD = process.env.AUTH_PASSWORD;

let reconnectTimer = null;

function createBot() {
  console.log(`Connecting to ${HOST}:${PORT} as ${USERNAME}...`);

  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    version: '26.1',
    auth: 'offline'
  });

  let authSent = false;

  bot.once('spawn', () => {
    console.log(`✅ ${USERNAME} joined the server.`);

    setTimeout(() => {
      if (authSent) return;

      console.log('🔐 Sending registration...');
      bot.chat(`/register ${PASSWORD} ${PASSWORD}`);
      authSent = true;
    }, 3000);
  });

  bot.on('messagestr', (message) => {
    console.log(`[SERVER] ${message}`);

    const text = message.toLowerCase();

    if (!authSent && (
      text.includes('register') ||
      text.includes('سجل')
    )) {
      console.log('🔐 AuthMe requested registration.');
      bot.chat(`/register ${PASSWORD} ${PASSWORD}`);
      authSent = true;
    }
  });

  bot.on('kicked', (reason) => {
    console.log('⚠️ Kicked:', reason);
  });

  bot.on('error', (err) => {
    console.log('❌ Error:', err.message);
  });

  bot.on('end', () => {
    console.log('🔌 Disconnected.');

    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        createBot();
      }, 10000);
    }
  });
}

if (!HOST || !PORT || !PASSWORD) {
  console.error('❌ Missing configuration in .env');
  process.exit(1);
}

createBot();
