const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('ready', () => {
    console.log(`${client.user.tag} aktif!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return; 

    try {
        await message.channel.send({ 
            content: message.content || null, 
            files: message.attachments.map(att => att.url) 
        });
        await message.delete();
    } catch (error) {
        console.error("Hata:", error);
    }
});

client.login(process.env.TOKEN);
