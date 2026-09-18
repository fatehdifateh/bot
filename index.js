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

// RAR comment ekle (linux rar komutu gerekli)
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

    // Son mesajları çek (bot olmayanları)
    const fetched = await msg.channel.messages.fetch({ limit: 100 });
    const nonBotMsgs = [...fetched.values()]
      .filter(m => !m.author.bot)
      .slice(0, count)
      .reverse(); // eskiden yeniye sırala

    for (const m of nonBotMsgs) {
      const content = m.content || '';
      const attachments = [...m.attachments.values()];
      const files = [];

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
          console.error('Dosya hatası:', e.message);
        }
      }

      await m.delete().catch(() => {});

      if (content || files.length > 0) {
        await msg.channel.send({
          content: content || undefined,
          files: files.length > 0 ? files : undefined,
          allowedMentions: { parse: [] },
        }).catch(e => console.error('Gönderim hatası:', e.message));
      }
    }
    return;
  }

  // ==========================================
  // Normal mesaj - RAR/ZIP varsa işle
  // ==========================================
  const content = msg.content || '';
  const attachments = [...msg.attachments.values()];
  const linkler = [];

  if (!content && attachments.length === 0) return;

  const files = [];
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

  const metin = [content, ...linkler].filter(Boolean).join('\n');

  try {
    await msg.channel.send({
      content: metin.slice(0, 2000) || undefined,
      files: files.length > 0 ? files : undefined,
      allowedMentions: { parse: [] },
    });
    await msg.delete();
  } catch (e) {
    console.error('Gönderim hatası:', e.message);
    const yedek = [content, ...attachments.map(a => a.url)].filter(Boolean).join('\n');
    await msg.channel.send({ content: yedek.slice(0, 2000), allowedMentions: { parse: [] } });
    await msg.delete().catch(() => {});
  }
});

client.login(process.env.TOKEN);
