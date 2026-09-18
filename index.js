Skip to content
fatehdifateh
bot
Repository navigation
Code
Issues
Pull requests
Actions
Projects
Wiki
Security and quality
Insights
Settings
Files
Go to file
t
T
.github/workflows
bot.yml
index.js
package.json
bot
/
index.js
in
main

Edit

Preview
Indent mode

Spaces
Indent size

4
Line wrap mode

No wrap
Editing index.js file contents
  1
  2
  3
  4
  5
  6
  7
  8
  9
 10
 11
 12
 13
 14
 15
 16
 17
 18
 19
 20
 21
 22
 23
 24
 25
 26
 27
 28
 29
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

Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
While the code is focused, press Alt+F1 for a menu of operations.
