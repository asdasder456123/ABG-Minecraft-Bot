const mineflayer = require('mineflayer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

async function main() {
  console.log('\n=== ABG Minecraft Bot ===\n');

  const host = await ask('اكتب IP السيرفر: ');
  const portText = await ask('اكتب Port السيرفر: ');
  const username = await ask('اكتب اسم الروبوت: ');

  const port = Number(portText);

  if (!host || !Number.isInteger(port) || port < 1 ||
      port > 65535 || !username) {
    console.log('خطأ: تأكد من IP وPort واسم الروبوت.');
    rl.close();
    return;
  }

  rl.close();

  console.log(`جاري الاتصال بـ ${host}:${port}...`);

  const bot = mineflayer.createBot({
    host,
    port,
    username,
    auth: 'offline'
  });

  bot.once('login', () => console.log('تم تسجيل الدخول.'));
  bot.once('spawn', () => console.log('الروبوت دخل العالم بنجاح!'));

  bot.on('kicked', reason => {
    console.log('تم طرد الروبوت:', reason);
  });

  bot.on('end', reason => {
    console.log('انتهى الاتصال:', reason || 'انقطع الاتصال');
    console.log('لن تتم إعادة الاتصال تلقائيًا.');
  });

  bot.on('error', error => {
    console.log('خطأ:', error.message);
  });
}

main().catch(error => {
  console.error('خطأ:', error.message);
  rl.close();
});
