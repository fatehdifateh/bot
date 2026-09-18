const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  rest: { timeout: 120000 }, // büyük yüklemeler için zaman aşımını 2 dakikaya çıkarır
});

// Sadece belirli kanalda çalışsın istersen kanal ID'sini yaz, hepsinde çalışsın istersen boş bırak
const KANAL_ID = '';

client.once('ready', () => {
  console.log(`${client.user.tag} olarak giriş yapıldı!`);
});

async function dosyalariHazirla(liste) {
  const files = [];
  for (const a of liste) {
    const res = await fetch(a.url);
    if (!res.ok) throw new Error('İndirme hatası: HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    const isim = a.name || a.url.split('?')[0].split('/').pop() || 'dosya';
    files.push({ attachment: buf, name: isim });
  }
  return files;
}

function hataYaz(baslik, err) {
  console.error(`${baslik} | kod: ${err.code ?? '-'} | durum: ${err.status ?? '-'} | ${err.message}`);
}

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (KANAL_ID && msg.channel.id !== KANAL_ID) return;

  let content = msg.content || '';
  let attachments = [...msg.attachments.values()];
  const embeds = [];
  const linkler = [];

  const snapshot = msg.messageSnapshots?.first();
  if (snapshot) {
    content = '↪️ **İletildi**' + (snapshot.content ? '\n' + snapshot.content : '');
    attachments = [...(snapshot.attachments?.values() ?? [])];

    for (const e of snapshot.embeds ?? []) {
      const tip = e.data?.type;
      if (tip === 'rich') embeds.push(e);
      else if (['image', 'gifv', 'video'].includes(tip) && e.url) linkler.push(e.url);
    }
  }

  const toplam = attachments.reduce((t, a) => t + (a.size || 0), 0);
  console.log(
    `Mesaj alındı | iletilen: ${!!snapshot} | dosya: ${attachments.length} | toplam: ${(toplam / 1048576).toFixed(2)} MB | limit: ${((msg.guild.maximumUploadLimit ?? 0) / 1048576).toFixed(0)} MB`
  );

  if (!content && attachments.length === 0 && embeds.length === 0 && linkler.length === 0) return;

  const metin = [content, ...linkler].filter(Boolean).join('\n').slice(0, 2000) || undefined;
  const secenek = { allowedMentions: { parse: [] } };

  let files;
  try {
    files = await dosyalariHazirla(attachments);
  } catch (err) {
    hataYaz('Dosya indirilemedi, orijinal mesaj silinmedi', err);
    return;
  }

  let tamam = false;

  // 1. deneme: hepsi tek mesajda
  try {
    await msg.channel.send({ content: metin, files, embeds, ...secenek });
    tamam = true;
    console.log('Tek mesajda gönderildi.');
  } catch (err) {
    hataYaz('Toplu gönderim başarısız, dosyalar tek tek denenecek', err);
  }

  // 2. deneme: her dosya ayrı mesajda
  if (!tamam) {
    try {
      let ilk = true;
      for (const f of files) {
        await msg.channel.send({
          content: ilk ? metin : undefined,
          files: [f],
          embeds: ilk ? embeds : [],
          ...secenek,
        });
        ilk = false;
        console.log('Dosya ayrı gönderildi:', f.name);
      }
      if (files.length === 0) {
        await msg.channel.send({ content: metin, embeds, ...secenek });
      }
      tamam = true;
    } catch (err) {
      hataYaz('Tek tek gönderim de başarısız, orijinal mesaj silinmedi', err);
    }
  }

  if (tamam) {
    try {
      await msg.delete();
    } catch (err) {
      hataYaz('Orijinal mesaj silinemedi', err);
    }
  }
});

client.login(process.env.TOKEN);
