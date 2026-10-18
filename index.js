require('dotenv').config();

const mineflayer = require('mineflayer');

const host = process.env.MC_HOST;
const port = Number(process.env.MC_PORT);
const count = Number(process.env.BOT_COUNT);

if (
  !host ||
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535 ||
  !Number.isInteger(count) ||
  count < 1 ||
  count > 3
) {
  console.error('❌ تحقق من MC_HOST وMC_PORT وBOT_COUNT في .env');
  process.exit(1);
}

const names = [];

for (let i = 1; i <= count; i++) {
  const name = process.env[`BOT_NAME_${i}`]?.trim();

  if (!name) {
    console.error(`❌ اكتب اسم الروبوت رقم ${i} في .env`);
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
  const number = index + 1;

  setTimeout(() => {
    console.log(`🤖 الروبوت ${number}: ${username} — جاري الاتصال`);

    let bot;

    try {
      bot = mineflayer.createBot({
        host,
        port,
        username,
        auth: 'offline'
      });
    } catch (error) {
      console.error(`❌ ${username}: فشل إنشاء الاتصال:`, error.message);
      return;
    }

    let spawned = false;

    bot.once('spawn', () => {
      spawned = true;
      console.log(`✅ ${username}: الروبوت دخل العالم بنجاح!`);
    });

    bot.on('kicked', reason => {
      console.error(`❌ ${username}: الروبوت اتطرد:`, reason);
    });

    bot.on('error', error => {
      console.error(`❌ ${username}: خطأ اتصال:`, error.message);
    });

    bot.on('end', reason => {
      if (!spawned) {
        console.error(`❌ ${username}: الروبوت فشل في الدخول.`);
      } else {
        console.log(`⚠️ ${username}: انتهى الاتصال.`);
      }

      if (reason) console.log('السبب:', reason);
      console.log('لن تتم إعادة الاتصال تلقائيًا.');
    });
  }, index * 2000);
});
