const {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  Partials,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Onay emojileri: standart unicode, özel emoji ismi veya özel emoji ID'si
const ONAY_UNICODE = ['✅', '✔️', '☑️'];
const ONAY_OZEL_ISIMLER = ['white_check_mark', 'onay', 'check']; // özel emoji isimleri (kendine göre düzenle)
const ONAY_OZEL_IDLER = []; // örn: ['123456789012345678']

// Aynı mesajın tekrar işlenmesini önlemek için
const islenenMesajlar = new Set();

function onayEmojisiMi(emoji) {
  if (emoji.id) {
    // Özel emoji
    return (
      ONAY_OZEL_IDLER.includes(emoji.id) ||
      ONAY_OZEL_ISIMLER.includes(emoji.name)
    );
  }
  // Standart unicode emoji
  return ONAY_UNICODE.includes(emoji.name);
}

client.once(Events.ClientReady, (c) => {
  console.log(`${c.user.tag} aktif!`);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user.bot) return;

    // Partial tepki ve mesajı tam olarak getir
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (!onayEmojisiMi(reaction.emoji)) return;

    const message = reaction.message;
    const guild = message.guild;
    if (!guild) return;

    if (!message.author || message.author.bot) return;

    // Aynı mesaj daha önce işlendiyse tekrar yapma
    if (islenenMesajlar.has(message.id)) return;

    // Yetkiyi kontrol et
    const moderator = await guild.members.fetch(user.id);
    if (!moderator.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      console.log(`[Yetkisiz] ${user.tag} onay vermeye çalıştı.`);
      await reaction.users.remove(user.id).catch(() => {});
      return;
    }

    // Kendi mesajını onaylamayı engelle
    if (moderator.id === message.author.id) {
      console.log(`[Engellendi] ${user.tag} kendi mesajını onaylamaya çalıştı.`);
      await reaction.users.remove(user.id).catch(() => {});
      return;
    }

    const yeniIsim = (message.content || '').trim();

    if (!yeniIsim) {
      console.log('[Atlandı] Mesaj içeriği boş (Message Content Intent kapalı olabilir).');
      return;
    }
    if (yeniIsim.length > 32) {
      await message.reply('❌ İsim 32 karakterden uzun olamaz.').catch(() => {});
      return;
    }

    const targetMember = await guild.members.fetch(message.author.id);

    if (!targetMember.manageable) {
      await message.reply(
        '❌ Bu kullanıcının takma adını değiştiremiyorum (rol hiyerarşisi veya sunucu sahibi).'
      ).catch(() => {});
      return;
    }

    await targetMember.setNickname(yeniIsim, `${user.tag} tarafından onaylandı`);
    islenenMesajlar.add(message.id);

    await message.reply(`✅ İsim onaylandı: **${yeniIsim}**`);
    console.log(`[Başarılı] ${targetMember.user.tag} -> ${yeniIsim} (onaylayan: ${user.tag})`);
  } catch (error) {
    console.error('[Hata] İsim onay sisteminde sorun:', error);
  }
});

client.login('BOTUNUN_TOKENI');
