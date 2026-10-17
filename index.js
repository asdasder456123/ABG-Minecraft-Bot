require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const mineflayer = require('mineflayer');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const bots = new Map();
const retryTimers = new Map();
const MAX_RETRIES = 5;
const RETRY_DELAY = 4000;

client.once('ready', () => {
  console.log(`ABG Bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!ABG')) {
    return;
  }

  const args = message.content.trim().split(/\s+/);

  if (args.length !== 4) {
    await message.reply(
      'الاستخدام: `!ABG <IP> <PORT> <BOT_NAME>`\n' +
      'مثال: `!ABG play.example.net 25565 ABG_Bot`'
    );
    return;
  }

  const [, host, portText, username] = args;
  const port = Number(portText);

  if (
    !host ||
    host.length > 253 ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !/^[A-Za-z0-9_]{3,16}$/.test(username)
  ) {
    await message.reply('راجع عنوان السيرفر والبورت واسم الروبوت.');
    return;
  }

  if (bots.has(username)) {
    await message.reply(`الروبوت ${username} مسجل بالفعل.`);
    return;
  }

  await message.reply(`بحاول أوصل ${username} بالسيرفر ${host}:${port}، وهعيد المحاولة حتى 5 مرات بفاصل 10 ثواني.`);

  let attempts = 0;
  let stopped = false;
  let everSpawned = false;

  const connect = () => {
    if (stopped || (everSpawned && attempts >= MAX_RETRIES)) {
      bots.delete(username);
      retryTimers.delete(username);
      message.channel.send(`❌ انتهت محاولات الاتصال للروبوت ${username}.`).catch(() => {});
      return;
    }

    if (everSpawned) attempts++;
    message.channel.send(everSpawned ? `🔄 إعادة اتصال ${attempts}/${MAX_RETRIES} للروبوت ${username}...` : `🔌 محاولة الدخول الأولى للروبوت ${username}...`).catch(() => {});

    let bot;

    try {
      bot = mineflayer.createBot({
        host,
        port,
        username,
        auth: 'offline'
      });

      bots.set(username, bot);
      let spawned = false;

      bot.once('spawn', () => {
        spawned = true;
        everSpawned = true;
        retryTimers.delete(username);
        message.channel.send(`✅ الروبوت ${username} دخل السيرفر ${host}:${port}.`).catch(() => {});
      });

      bot.on('error', (err) => {
        console.error(`[${username}]`, err.message);
      });

      bot.once('end', () => {
        if (bots.get(username) === bot) {
          bots.delete(username);
        }

        if (stopped) {
          retryTimers.delete(username);
          return;
        }

        if (spawned) {
          attempts = 0;
        }

        if (everSpawned && attempts < MAX_RETRIES) {
          const timer = setTimeout(connect, RETRY_DELAY);
          retryTimers.set(username, timer);
        } else {
          retryTimers.delete(username);
          message.channel.send(`❌ انتهت محاولات إعادة الاتصال للروبوت ${username}.`).catch(() => {});
        }
      });
    } catch (err) {
      console.error(`[${username}]`, err.message);

      if (everSpawned && attempts < MAX_RETRIES) {
        const timer = setTimeout(connect, RETRY_DELAY);
        retryTimers.set(username, timer);
      } else {
        bots.delete(username);
        retryTimers.delete(username);
        message.channel.send(`❌ فشل الاتصال بعد ${MAX_RETRIES} محاولات: ${err.message}`).catch(() => {});
      }
    }
  };

  connect();
});

client.login(process.env.DISCORD_TOKEN);
