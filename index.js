require('dotenv').config();

const mineflayer = require('mineflayer');

const host = process.env.MC_HOST;
const port = Number(process.env.MC_PORT);
const count = Number(process.env.BOT_COUNT);
const autoReconnect = process.env.AUTO_RECONNECT === 'true';
const maxAttempts = Number(process.env.MAX_RECONNECT_ATTEMPTS);
const reconnectDelay = Number(process.env.RECONNECT_DELAY_SECONDS);

if (
  !host ||
  !Number.isInteger(port) || port < 1 || port > 65535 ||
  !Number.isInteger(count) || count < 1 || count > 3 ||
  (autoReconnect &&
    (!Number.isInteger(maxAttempts) || maxAttempts < 0 ||
     !Number.isFinite(reconnectDelay) || reconnectDelay < 5))
) {
  console.error('❌ تحقق من إعدادات .env. أقل انتظار لإعادة الاتصال هو 5 ثوانٍ.');
  process.exit(1);
}

const names = [];

for (let i = 1; i <= count; i++) {
  const name = process.env[`BOT_NAME_${i}`]?.trim();

  if (!name) {
    console.error(`❌ اسم الروبوت ${i} ناقص في .env`);
    process.exit(1);
  }

  names.push(name);
}

if (new Set(names).size !== names.length) {
  console.error('❌ لازم كل روبوت يكون له اسم مختلف.');
  process.exit(1);
}

console.log(`🚀 تشغيل ${count} روبوتات على ${host}:${port}`);

names.forEach((username, index) => {
  let reconnectAttempts = 0;
  let movementTimer = null;
  let reconnectTimer = null;
  let stopped = false;
  let currentBot = null;

  const directions = ['forward', 'left', 'back', 'right'];
  let directionIndex = 0;

  function connect() {
    if (stopped) return;

    console.log(`🤖 ${username}: جاري الاتصال...`);

    let bot;

    try {
      bot = mineflayer.createBot({
        host,
        port,
        username,
        auth: 'offline'
      });
      currentBot = bot;
    } catch (error) {
      console.error(`❌ ${username}: ${error.message}`);
      scheduleReconnect();
      return;
    }

    let spawned = false;
    let ended = false;

    bot.once('spawn', () => {
      spawned = true;
      reconnectAttempts = 0;
      console.log(`✅ ${username}: دخل العالم بنجاح!`);

      clearInterval(movementTimer);
      movementTimer = setInterval(() => {
        if (!bot.entity || ended) return;

        bot.clearControlStates();
        bot.setControlState(directions[directionIndex], true);
        directionIndex = (directionIndex + 1) % directions.length;
      }, 3000);
    });

    bot.on('kicked', reason => {
      console.error(`❌ ${username}: اتطرد من السيرفر:`, reason);
    });

    bot.on('error', error => {
      console.error(`❌ ${username}: خطأ اتصال:`, error.message);
    });

    bot.once('end', reason => {
      ended = true;
      clearInterval(movementTimer);
      movementTimer = null;

      if (currentBot === bot) currentBot = null;

      if (!spawned) {
        console.error(`❌ ${username}: فشل في الدخول.`);
      } else {
        console.log(`⚠️ ${username}: انقطع الاتصال.`);
      }

      if (reason) console.log('السبب:', reason);

      if (autoReconnect) {
        scheduleReconnect();
      } else {
        stopped = true;
        console.log(`⏹️ ${username}: إعادة الاتصال متوقفة.`);
      }
    });
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;

    if (!autoReconnect || reconnectAttempts >= maxAttempts) {
      stopped = true;
      console.error(`⛔ ${username}: انتهت محاولات إعادة الاتصال.`);
      return;
    }

    reconnectAttempts++;

    console.log(
      `🔄 ${username}: المحاولة ${reconnectAttempts}/${maxAttempts} بعد ${reconnectDelay} ثانية`
    );

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelay * 1000);
  }

  setTimeout(connect, index * 2000);
});
