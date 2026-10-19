require('dotenv').config();

const mineflayer = require('mineflayer');

const SERVER_COUNT = 3;
const BOTS_PER_SERVER = 2;
const TOTAL_BOTS = SERVER_COUNT * BOTS_PER_SERVER;

const autoReconnect = process.env.AUTO_RECONNECT === 'true';
const maxAttempts = Number(process.env.MAX_RECONNECT_ATTEMPTS);
const reconnectDelay = Number(process.env.RECONNECT_DELAY_SECONDS);

if (
  autoReconnect &&
  (!Number.isInteger(maxAttempts) || maxAttempts < 0 ||
   !Number.isFinite(reconnectDelay) || reconnectDelay < 5)
) {
  console.error('❌ تحقق من إعدادات إعادة الاتصال في .env.');
  process.exit(1);
}

const configs = [];

for (let serverNo = 1; serverNo <= SERVER_COUNT; serverNo++) {
  const host = process.env[`SERVER_${serverNo}_HOST`]?.trim();
  const port = Number(process.env[`SERVER_${serverNo}_PORT`]);

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`❌ تحقق من SERVER_${serverNo}_HOST وSERVER_${serverNo}_PORT.`);
    process.exit(1);
  }

  for (let slot = 1; slot <= BOTS_PER_SERVER; slot++) {
    const botNo = (serverNo - 1) * BOTS_PER_SERVER + slot;
    const username = process.env[`BOT_NAME_${botNo}`]?.trim();

    if (!username) {
      console.error(`❌ أضف BOT_NAME_${botNo} إلى .env.`);
      process.exit(1);
    }

    configs.push({ username, host, port });
  }
}

if (new Set(configs.map(c => c.username)).size !== TOTAL_BOTS) {
  console.error('❌ لازم أسماء الروبوتات الستة تكون مختلفة.');
  process.exit(1);
}

configs.forEach(({ username, host, port }, index) => {
  let attempts = 0;
  let movementTimer = null;
  let reconnectTimer = null;
  let stopped = false;
  let generation = 0;

  const directions = ['forward', 'left', 'back', 'right'];
  let directionIndex = 0;

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;

    if (!autoReconnect || attempts >= maxAttempts) {
      stopped = true;
      console.error(`⛔ ${username}: توقفت إعادة الاتصال.`);
      return;
    }

    attempts++;
    console.log(`🔄 ${username}: المحاولة ${attempts}/${maxAttempts} بعد ${reconnectDelay} ثانية`);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelay * 1000);
  }

  function connect() {
    if (stopped) return;

    const currentGeneration = ++generation;
    let bot;

    console.log(`🤖 ${username}: الاتصال بـ ${host}:${port}`);

    try {
      bot = mineflayer.createBot({
        host,
        port,
        username,
        auth: 'offline'
      });
    } catch (error) {
      console.error(`❌ ${username}: ${error.message}`);
      scheduleReconnect();
      return;
    }

    let spawned = false;
    let ended = false;

    bot.once('spawn', () => {
      if (ended || currentGeneration !== generation) return;

      spawned = true;
      attempts = 0;
      console.log(`✅ ${username}: دخل ${host}:${port} بنجاح!`);

      clearInterval(movementTimer);
      movementTimer = setInterval(() => {
        if (ended || !bot.entity) return;

        bot.clearControlStates();
        bot.setControlState(directions[directionIndex], true);
        directionIndex = (directionIndex + 1) % directions.length;
      }, 3000);
    });

    bot.on('kicked', reason => {
      console.error(`❌ ${username}: طُرد من السيرفر:`, reason);
    });

    bot.on('error', error => {
      console.error(`❌ ${username}: خطأ اتصال:`, error.message);
    });

    bot.once('end', reason => {
      ended = true;
      clearInterval(movementTimer);
      movementTimer = null;

      console.log(
        spawned
          ? `⚠️ ${username}: انقطع الاتصال بـ ${host}:${port}`
          : `❌ ${username}: فشل الدخول إلى ${host}:${port}`
      );

      if (reason) console.log('السبب:', reason);

      scheduleReconnect();
    });
  }

  setTimeout(connect, index * 2000);
});

console.log('🚀 تم إعداد 6 روبوتات: روبوتان لكل سيرفر.');
