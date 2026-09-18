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

// Sayaç yükle
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

// RAR comment ekle
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

// ZIP comment ekle
async function processZip(buffer) {
  const zip = new AdmZip(buffer);
  zip.addZipComment(COMMENT_TEXT);
  return zip.toBuffer();
}

// Dosyaları URL'den indir
async function downloadFile(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

// Tekil eklenti işleyici
async function processAttachment(a) {
  const buf = await downloadFile(a.url);
  const name = a.name || 'dosya';
  const isRar = name.toLowerCase().endsWith('.rar');
  const isZip = name.toLowerCase().endsWith('.zip');

  if (isRar) {
    const processed = await processRar(buf, packCounter);
    const fileName = `nosignalpack${packCounter}.rar`;
    packCounter++;
    saveCounter();
    return { attachment: processed, name: fileName };
  } else if (isZip) {
    const processed = await processZip(buf);
    const fileName = `nosignalpack${packCounter}.zip`;
    packCounter++;
    saveCounter();
    return { attachment: processed, name: fileName };
  } else {
    return { attachment: buf, name };
  }
}

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (KANAL_ID && msg.channel.id !== KANAL_ID) return;

  // ==========================================
  // !deyiş <sayı> komutu
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
      await handleMessageProcessing(m);
    }
    return;
  }

  // ==========================================
  // Normal mesaj akışı
  // ==========================================
  await handleMessageProcessing(msg);
});

// Mesaj ve eklentileri tek tek/sırayla işleyen ana fonksiyon
async function handleMessageProcessing(msg) {
  const content = msg.content || '';
  const attachments = [...msg.attachments.values()];

  if (!content && attachments.length === 0) return;

  // Eklenti yoksa sadece metni gönder
  if (attachments.length === 0) {
    await msg.channel.send({
      content: content.slice(0, 2000),
      allowedMentions: { parse: [] },
    }).catch(e => console.error('Metin gönderme hatası:', e.message));
    await msg.delete().catch(() => {});
    return;
  }

  // Birden fazla eklenti varsa her birini ayrı bir mesaj olarak gönderir (Hata oluşmasını engeller)
  let isFirst = true;
  for (const a of attachments) {
    try {
      const fileData = await processAttachment(a);
      await msg.channel.send({
        content: isFirst && content ? content.slice(0, 2000) : undefined,
        files: [fileData],
        allowedMentions: { parse: [] },
      });
      isFirst = false; // Metin ilk eklenti ile gittiği için sonrakilerde tekrar yazmaz
    } catch (e) {
      console.error('Eklenti işleme/gönderme hatası:', e.message);
      // Hata durumunda doğrudan orijinal linki atar
      await msg.channel.send({
        content: (isFirst && content ? content + '\n' : '') + a.url,
        allowedMentions: { parse: [] },
      }).catch(() => {});
      isFirst = false;
    }
  }

  // Orijinal mesajı sil
  await msg.delete().catch(() => {});
}

client.login(process.env.TOKEN);
