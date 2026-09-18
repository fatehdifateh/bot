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

// Dosyaları indirip buffer olarak hazırlar
async function dosyalariHazirla(liste) {
  const files = [];
  for (const a of liste) {
    try {
      const res = await fetch(a.url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      const isim = a.name || a.url.split('?')[0].split('/').pop() || 'dosya';
      files.push({ attachment: buf, name: isim });
    } catch (e) {
      console.error('Dosya indirilemedi:', a.url, e.message);
    }
  }
  return files;
}

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (KANAL_ID && msg.channel.id !== KANAL_ID) return;

  let content = msg.content || '';
  let attachments = [...msg.attachments.values()];
  let embeds = [];
  const linkler = [];

  // İletilen mesajsa asıl içerik snapshot'ın içinde
  const snapshot = msg.messageSnapshots?.first();
  if (snapshot) {
    content = '✔ **Gönderildi**' + (snapshot.content ? '\n' + snapshot.content : '');
    attachments = [...(snapshot.attachments?.values() ?? [])];

    for (const e of snapshot.embeds ?? []) {
      const tip = e.data?.type;
      if (tip === 'rich') embeds.push(e);
      else if (['image', 'gifv', 'video'].includes(tip) && e.url) linkler.push(e.url);
    }
  }

  console.log(
    `Mesaj alındı | iletilen: ${!!snapshot} | dosya: ${attachments.length} | embed: ${embeds.length}`
  );

  if (!content && attachments.length === 0 && embeds.length === 0 && linkler.length === 0) return;

  try {
    const files = await dosyalariHazirla(attachments);

    // İndirilemeyen dosyalar link olarak eklensin
    if (files.length < attachments.length) {
      const inenler = new Set(files.map((f) => f.name));
      for (const a of attachments) {
        if (!inenler.has(a.name)) linkler.push(a.url);
      }
    }

    const metin = [content, ...linkler].filter(Boolean).join('\n');

    try {
      await msg.channel.send({
        content: metin.slice(0, 2000) || undefined,
        files,
        embeds,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      // Dosyalı gönderim başarısız olursa hepsini link olarak gönder
      console.error('Dosyalı gönderim hatası:', err.message);
      const yedek = [content, ...attachments.map((a) => a.url), ...linkler]
        .filter(Boolean)
        .join('\n');
      await msg.channel.send({
        content: yedek.slice(0, 2000),
        allowedMentions: { parse: [] },
      });
    }

    await msg.delete();
  } catch (err) {
    console.error('Hata:', err);
  }
});

client.login(process.env.TOKEN);
