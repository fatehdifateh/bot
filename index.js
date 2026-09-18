const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('ready', () => {
    console.log(`${client.user.tag} aktif ve yetki odaklı çalışıyor!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return; 

    const botYetkileri = message.channel.permissionsFor(message.guild.members.me);
    if (!botYetkileri || !botYetkileri.has(PermissionFlagsBits.ManageMessages)) {
        return; 
    }

    try {
        await message.channel.send({ 
            content: message.content || null, 
            files: message.attachments.map(att => att.url) 
        });
        await message.delete();
    } catch (error) {
        console.error("Hata oluştu:", error);
    }
});

client.login(process.env.TOKEN);
