const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  rest: { timeout: 120000 },
});

// ---------------- AYARLAR ----------------
const KANAL_ID = '';        // boş = tüm kanallar
const OTOMATIK = true;      // true = her mesajı kendiliğinden işler, !deyiş de çalışır
const MAX_ADET = 10;        // !deyiş ile en fazla kaç mesaj

const AD = 'nosignalpack';  // yeni ad: nosignalpack4821.rar
const ADI_DEGISENLER = ['.rar', '.zip'];
const RENAME_LIMIT = 25 * 1024 * 1024; // 25 MB altı değişir
// -----------------------------------------

client.once('ready', () => {
  console.log(`${client.user.tag} olarak giriş yapıldı!`);
});

function uzantiAl(ad) {
  const n = ad.lastIndexOf('.');
  return n > 0 ? ad.slice(n).toLowerCase() : '';
}

function arsivMi(a) {
  return ADI_DEGISENLER.includes(uzantiAl(a.name || ''));
}

async function dosyalariHazirla(liste) {
  const files = [];
  const kullanilan = new Set();

  for (const a of liste) {
    const res = await fetch(a.url);
    if (!res.ok) throw new Error('İndirme hatası: HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    let isim = a.name || a.url.split('?')[0].split('/').pop() || 'dosya';

    if (arsivMi(a)) {
      const uzanti = uzantiAl(isim);
      let yeni;
      do {
        const sayi = Math.floor(1000 + Math.random() * 9000); // 1000-9999
        yeni = `${AD}${sayi}${uzanti}`;
      } while (kullanilan.has(yeni));
      kullanilan.add(yeni);
      isim = yeni;
    }
    files.push({ attachment: buf, name: isim });
  }
  return files;
}

function hataYaz(baslik, err) {
  console.error(`${baslik} | kod: ${err.code ?? '-'} | durum: ${err.status ?? '-'} | ${err.message}`);
}

// Tek bir mesajı işler: yeniden yükler ya da iletir, başarılıysa orijinali siler
async function isle(m) {
  let content = m.content || '';
  let attachments = [...m.attachments.values()];

  const snapshot = m.messageSnapshots?.first();
  if (snapshot) {
    content = '↪️ **İletildi**' + (snapshot.content ? '\n' + snapshot.content : '');
    attachments = [...(snapshot.attachments?.values() ?? [])];
  }

  const arsivler = attachments.filter(arsivMi);
  const toplam = attachments.reduce((t, a) => t + (a.size || 0), 0);
  const limit = m.guild.maximumUploadLimit ?? 10 * 1024 * 1024;

  const adDegisecek =
    arsivler.length > 0 &&
    arsivler.every((a) => (a.size || 0) < RENAME_LIMIT) &&
    toplam <= limit;

  console.log(
    `İşleniyor | iletilen: ${!!snapshot} | dosya: ${attachments.length} | arşiv: ${arsivler.length} | toplam: ${(toplam / 1048576).toFixed(2)} MB | yöntem: ${adDegisecek ? 'yeniden yükle' : 'ilet'}`
  );

  let tamam = false;

  if (adDegisecek) {
    try {
      const files = await dosyalariHazirla(attachments);
      await m.channel.send({
        content: content.slice(0, 2000) || undefined,
        files,
        allowedMentions: { parse: [] },
      });
      tamam = true;
      console.log('Yeni adla yeniden yüklendi.');
    } catch (err) {
      hataYaz('Yeniden yükleme başarısız, iletme denenecek', err);
    }
  }

  if (!tamam) {
    try {
      await m.forward(m.channel);
      tamam = true;
      console.log('Mesaj iletildi.');
    } catch (err) {
      hataYaz('İletme de başarısız, orijinal mesaj silinmedi', err);
    }
  }

  if (tamam) {
    try {
      await m.delete();
    } catch (err) {
      hataYaz('Orijinal mesaj silinemedi', err);
    }
  }
  return tamam;
}

const KOMUT = /^!(deyiş|deyis)(?:\s+(\d+))?\s*$/i;

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (KANAL_ID && msg.channel.id !== KANAL_ID) return;

  const eslesme = msg.content.trim().match(KOMUT);

  // --- !deyiş komutu ---
  if (eslesme) {
    const adet = Math.min(Math.max(parseInt(eslesme[2] || '1', 10), 1), MAX_ADET);

    try {
      const son = await msg.channel.messages.fetch({ limit: 50, before: msg.id });
      const hedefler = [...son.values()]
        .filter((m) => !m.author.bot && !KOMUT.test(m.content.trim()))
        .slice(0, adet)
        .reverse();

      if (hedefler.length === 0) {
        const uyari = await msg.channel.send('İşlenecek mesaj bulunamadı.');
        setTimeout(() => uyari.delete().catch(() => {}), 5000);
      }

      for (const m of hedefler) {
        await isle(m);
      }
    } catch (err) {
      hataYaz('!deyiş hatası', err);
    }

    try {
      await msg.delete();
    } catch (err) {
      hataYaz('Komut mesajı silinemedi', err);
    }
    return;
  }

  // --- Otomatik mod ---
  if (OTOMATIK) {
    await isle(msg);
  }
});

client.login(process.env.TOKEN);
