require('dotenv').config();

const mineflayer = require('mineflayer');

const host = process.env.MC_HOST;
const port = Number(process.env.MC_PORT);
const username = process.env.BOT_USERNAME;

if (!host || !Number.isInteger(port) || port < 1 ||
    port > 65535 || !username) {
  console.error('❌ الإعدادات ناقصة أو غير صحيحة في ملف .env');
  process.exit(1);
}

console.log(`جاري توصيل الروبوت بالسيرفر ${host}:${port}...`);

let spawned = false;

const bot = mineflayer.createBot({
  host,
  port,
  username,
  auth: 'offline'
});

bot.once('spawn', () => {
  spawned = true;
  console.log('✅ الروبوت دخل العالم بنجاح!');
});

bot.on('kicked', reason => {
  console.error('❌ الروبوت اتطرد من السيرفر:', reason);
});

bot.on('error', error => {
  console.error('❌ الروبوت فشل في الاتصال:', error.message);
});

bot.on('end', reason => {
  if (!spawned) {
    console.error('❌ الروبوت فشل في الدخول.');
  } else {
    console.log('⚠️ اتصال الروبوت انتهى.');
  }

  if (reason) console.log('السبب:', reason);
  console.log('لن تتم إعادة الاتصال تلقائيًا.');
});
