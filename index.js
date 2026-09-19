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

  try {
    await msg.forward(msg.channel);
    console.log('Mesaj iletildi.');
    await msg.delete();
  } catch (err) {
    console.error(`İletme başarısız, orijinal mesaj silinmedi | kod: ${err.code ?? '-'} | ${err.message}`);
  }
});

client.login(process.env.TOKEN);
