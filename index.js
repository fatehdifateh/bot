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

  const files = [...msg.attachments.values()].map((a) => ({
    attachment: a.url,
    name: a.name,
  }));

  if (!msg.content && files.length === 0) return;

  try {
    await msg.channel.send({
      content: msg.content || undefined,
      files,
      allowedMentions: { parse: [] }, // @everyone / @kişi etiketleri tekrar bildirim atmasın
    });
    await msg.delete();
  } catch (err) {
    console.error('Hata:', err);
  }
});

client.login(process.env.TOKEN);
