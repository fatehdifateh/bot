const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

// Botun sunucudaki mesajları, tepkileri ve üyeleri görebilmesi için gerekli izinler (Intents)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

// Ayarlar
const AYARLAR = {
    // İsimlerin yazılacağı kanalın ID'sini buraya gir (İsteğe bağlı - tüm sunucuda çalışmaması için)
    // Eğer her kanalda çalışsın istiyorsan bu kısmı boş bırakabilirsin
    ISIM_KANAL_ID: "KANAL_ID_BURAYA", 
};

client.once('ready', () => {
    console.log(`${client.user.tag} aktif! FiveM isim onay sistemi hazır.`);
});

// Tepki eklendiğinde tetiklenen fonksiyon
client.on('messageReactionAdd', async (reaction, user) => {
    // Botun kendi tepkilerini veya kısmi (partial) mesajları engellemek için kontrol
    if (user.bot) return;
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Mesaj çekilirken hata oluştu:', error);
            return;
        }
    }

    // Sadece beyaz onay işareti (✅) atıldığında çalışsın
    if (reaction.emoji.name !== '✅' && reaction.emoji.name !== 'white_check_mark') return;

    const guild = reaction.message.guild;
    if (!guild) return;

    // Tepkiyi atan yetkilinin sunucudaki üye (member) verisini çekiyoruz
    const moderator = await guild.members.fetch(user.id);

    // Tepkiyi atan kişinin "Takma Adları Yönet" (Manage Nicknames) yetkisi var mı kontrolü
    if (!moderator.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        // Yetkisi yoksa tepkisini kaldır ve işlem yapma
        try {
            await reaction.users.remove(user.id);
        } catch (e) { console.log("Tepki silinemedi, yetki eksik olabilir.") }
        return;
    }

    // Belirli bir kanal ayarlandıysa sadece o kanalda çalışmasını sağla
    if (AYARLAR.ISIM_KANAL_ID && AYARLAR.ISIM_KANAL_ID !== "KANAL_ID_BURAYA") {
        if (reaction.message.channel.id !== AYARLAR.ISIM_KANAL_ID) return;
    }

    // Mesajı yazan (oyuncu) üye bilgisini çekiyoruz
    const targetUserId = reaction.message.author.id;
    try {
        const targetMember = await guild.members.fetch(targetUserId);
        const yeniIsim = reaction.message.content; // Oyuncunun chate yazdığı metin

        // Discord'da isim sınırı 32 karakterdir, bunu kontrol ediyoruz
        if (yeniIsim.length > 32) {
            reaction.message.reply(`❌ Yazılan isim 32 karakterden uzun olduğu için değiştirilemedi.`);
            return;
        }

        // Oyuncunun ismini chate yazdığı şey ile değiştiriyoruz
        await targetMember.setNickname(yeniIsim);
        
        // Başarılı olduğunda chate bilgi mesajı atar
        reaction.message.reply(`✅ İsim onaylandı! Yeni isim: **${yeniIsim}** (Onaylayan: ${user.username})`);

    } catch (error) {
        console.error("İsim değiştirilirken hata oluştu:", error);
        // Botun rol sırası oyuncudan/yetkiliden düşükse veya bot sunucu sahibine isim vermeye çalışıyorsa hata verir
        reaction.message.reply(`❌ İsim değiştirilemedi. Botun rolünün üst sırada olduğundan ve yetkilerinin tam olduğundan emin olun.`);
    }
});

// Discord Geliştirici Portalından aldığın Bot Tokenini buraya yapıştır
client.login('BOTUNUN_TOKENI');
