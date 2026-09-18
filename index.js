const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Sadece belirli kanalda çalışsın istersen kanal ID'sini yaz, hepsinde çalışsın istersen boş bırak
const KANAL_ID = '';

client.once('ready', () => {
  console.log(`${client.user.tag} olarak giriş yapıldı!`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (KANAL_ID && msg.channel.id !== KANAL_ID) return;

  let content = msg.content || '';
  let attachments = [...msg.attachments.values()];
  let embeds = [];

  // İletilen mesajsa asıl içerik snapshot'ın içinde
  const snapshot = msg.messageSnapshots?.first();
  if (snapshot) {
    content = '✔ **GONDERILDI**\n' + (snapshot.content || '');
    attachments = [...snapshot.attachments.values()];
    embeds = [...snapshot.embeds].filter((e) => e.data.type === 'rich');
  }

  const files = attachments.map((a) => ({ attachment: a.url, name: a.name }));

  if (!content && files.length === 0 && embeds.length === 0) return;

  try {
    await msg.channel.send({
      content: content.slice(0, 2000) || undefined,
      files,
      embeds,
      allowedMentions: { parse: [] },
    });
    await msg.delete();
  } catch (err) {
    console.error('Hata:', err);
  }
});

client.login(process.env.TOKEN);
