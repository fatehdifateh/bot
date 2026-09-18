const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} giriş yaptı!`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;

  // !sil <sayı>
  if (msg.content.startsWith('!sil')) {
    const count = parseInt(msg.content.trim().split(/\s+/)[1]) || 5;
    await msg.delete().catch(() => {});
    const fetched = await msg.channel.messages.fetch({ limit: count });
    for (const m of [...fetched.values()].slice(0, count)) {
      await m.delete().catch(() => {});
    }
    return;
  }

  // !deyiş <sayı>
  if (msg.content.startsWith('!deyiş')) {
    const count = parseInt(msg.content.trim().split(/\s+/)[1]) || 10;
    await msg.delete().catch(() => {});
    const fetched = await msg.channel.messages.fetch({ limit: 100 });
    const mesajlar = [...fetched.values()].filter(m => !m.author.bot).slice(0, count).reverse();
    for (const m of mesajlar) {
      await msg.channel.send({
        content: m.content || undefined,
        files: [...m.attachments.values()].map(a => a.url),
        allowedMentions: { parse: [] },
      }).catch(() => {});
      await m.delete().catch(() => {});
    }
    return;
  }

  // Normal mesaj
  if (!msg.content && msg.attachments.size === 0) return;

  await msg.channel.send({
    content: msg.content || undefined,
    files: [...msg.attachments.values()].map(a => a.url),
    allowedMentions: { parse: [] },
  }).catch(() => {});
  await msg.delete().catch(() => {});
});

client.login(process.env.TOKEN);
