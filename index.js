const { Client, GatewayIntentBits } = require('discord.js');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const KANAL_ID = '';
const DISCORD_LINK = 'https://discord.gg/EMPU2dbcpt';
const COMMENT_TEXT = `nosignalpack\n${DISCORD_LINK}`;
const COUNTER_FILE = 'counter.txt';

let packCounter = 1;
if (fs.existsSync(COUNTER_FILE)) {
  packCounter = parseInt(fs.readFileSync(COUNTER_FILE, 'utf8').trim()) || 1;
}
function saveCounter() {
  fs.writeFileSync(COUNTER_FILE, packCounter.toString());
}

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} giriş yaptı!`);
});

async function processRar(buffer, num) {
  const tempPath = `/tmp/nosignalpack${num}_in.rar`;
  const commentPath = `/tmp/comment${num}.txt`;
  fs.writeFileSync(tempPath, buffer);
  fs.writeFileSync(commentPath, COMMENT_TEXT);
  try {
    execSync(`rar c -z"${commentPath}" "${tempPath}"`, { stdio: 'pipe' });
  } catch (e) {
    console.error('RAR comment hatası:', e.message);
  }
  const result = fs.readFileSync(tempPath);
  fs.unlinkSync(tempPath);
  fs.unlinkSync(commentPath);
  return result;
}

async function processZip(buffer) {
  const zip = new AdmZip(buffer);
  zip.addZipComment(COMMENT_TEXT);
  return zip.toBuffer();
}

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

async function processAttachments(attachments) {
  const files = [];
  const linkler = [];

  for (const a of attachments) {
    try {
      const buf = await downloadFile(a.url);
      const name = a.name || 'dosya';
      const isRar = name.toLowerCase().endsWith('.rar');
      const isZip = name.toLowerCase().endsWith('.zip');

      if (isRar) {
        const processed = await processRar(buf, packCounter);
        files.push({ attachment: processed, name: `nosignalpack${packCounter}.rar` });
        packCounter++; saveCounter();
      } else if (isZip) {
        const processed = await processZip(buf);
        files.push({ attachment: processed, name: `nosignalpack${packCounter}.zip` });
        packCounter++; saveCounter();
      } else {
        files.push({ attachment: buf, name });
      }
    } catch (e) {
      console.error('Dosya indirilemedi:', e.message);
      linkler.push(a.url);
    }
  }

  return { files, linkler };
}

async function sendFilesInChunks(channel, content, files) {
  const chunks = chunkArray(files, 10);
  for (let i = 0; i < chunks.length; i++) {
    await channel.send({
      content: i === 0 ? (content || undefined) : undefined,
      files: chunks[i],
      allowedMentions: { parse: [] },
    });
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
      const content = m.content || '';
      const attachments = [...m.attachments.values()];
      const { files, linkler } = await processAttachments(attachments);
      const metin = [content, ...linkler].filter(Boolean).join('\n');

      await m.delete().catch(() => {});

      if (metin || files.length > 0) {
        await sendFilesInChunks(msg.channel, metin, files);
      }
    }
    return;
  }

    // ==========================================
  // Normal mesaj
  // ==========================================
  const content = msg.content || '';
  const attachments = [...msg.attachments.values()];
  if (!content && attachments.length === 0) return;

  const { files, linkler } = await processAttachments(attachments);
  const metin = [content, ...linkler].filter(Boolean).join('\n');

    try {
    if (!metin && files.length === 0) return;
    await sendFilesInChunks(msg.channel, metin, files);
    await msg.delete();
  } catch (e) {
    console.error('Gönderim hatası:', e.message);
  }
});

client.login(process.env.TOKEN);
