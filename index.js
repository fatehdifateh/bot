const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const KANAL_ID = '';

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} giriş yaptı!`);
});

async function downloadFile(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function forwardMessage(channel, m) {
  try {
    const content = m.content || undefined;
    const attachments = [...m.attachments.values()];
    const MAX_SIZE = 25 * 1024 * 1024;

    const files = [];
    for (const a of attachments) {
      if (a.size && a.size > MAX_SIZE) {
        console.log(`⚠️ Atlandı: ${a.name} (${(a.size/1024/1024).toFixed(1)}MB)`);
        continue;
      }
      try {
        const buf = await downloadFile(a.url);
        files.push({ attachment: buf, name: a.name || 'dosya' });
      } catch (e) {
        console.error('Dosya indirilemedi:', e.message);
      }
    }

    const chunks = chunkArray(files, 10);

    if (chunks.length === 0) {
      if (content) {
        await channel.send({ content, allowedMentions: { parse: [] } });
      }
    } else {
      for (let i = 0; i < chunks.length; i++) {
        await channel.send({
          content: i === 0 ? content : undefined,
          files: chunks[i],
          allowedMentions: { parse: [] },
        });
      }
    }

    await m.delete().catch(() => {});
  } catch (e) {
    console.error('İletme hatası:', e.message);
  }
}

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (KANAL_ID && msg.channel.id !== KANAL_ID) return;

  // ==========================================
  // !sil <sayı>
  // ==========================================
  if (msg.content.startsWith('!sil')) {
    const parts = msg.content.trim().split(/\s+/);
    const count = parseInt(parts[1]) || 5;
    await msg.delete().catch(() => {});
    const fetched = await msg.channel.messages.fetch({ limit: count });
    const toDelete = [...fetched.values()].slice(0, count);
    for (const m of toDelete) {
      await m.delete().catch(() => {});
    }
    return;
  }

  // ==========================================
  // !deyiş <sayı>
  // ==========================================
  if (msg.content.startsWith('!deyiş')) {
    const parts = msg.content.trim().split(/\s+/);
    const count = parseInt(parts[1]) || 10;
    await msg.delete().catch(() => {});
    const fetched = await msg.channel.messages.fetch({ limit: 100 });
    const nonBotMsgs = [...fetched.values()]
      .filter(m => !m.author.bot)
      .slice(0, count)
      .reverse();
    for (const m of nonBotMsgs) {
      await forwardMessage(msg.channel, m);
    }
    return;
  }

  // ==========================================
  // Normal mesaj - ilet
  // ==========================================
  const content = msg.content || '';
  const attachments = [...msg.attachments.values()];
  if (!content && attachments.length === 0) return;

  await forwardMessage(msg.channel, msg);
});

client.login(process.env.TOKEN);
