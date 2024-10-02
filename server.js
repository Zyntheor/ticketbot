const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const TICKET_CATEGORY_ID = '1290733538311671829'; // Remplace par l'ID de la catégorie où les tickets seront créés

client.once('ready', () => {
    console.log(`Le bot ${client.user.tag} est en ligne.`);
});

// Commande pour créer un ticket
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'create') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Créer un ticket')
                .setStyle(ButtonStyle.Success),
        );

        await interaction.reply({ content: 'Cliquez sur le bouton pour créer un ticket.', components: [row], ephemeral: true });
    }
});

// Quand un bouton est cliqué
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        const category = await interaction.guild.channels.fetch(TICKET_CATEGORY_ID);

        if (!category || category.type !== ChannelType.GuildCategory) {
            return interaction.reply({ content: 'Catégorie de tickets invalide.', ephemeral: true });
        }

        // Vérifie si l'utilisateur a déjà un ticket
        const existingChannel = interaction.guild.channels.cache.find(channel => channel.name === `ticket-${interaction.user.id}`);
        if (existingChannel) {
            return interaction.reply({ content: `Vous avez déjà un ticket ouvert : ${existingChannel}.`, ephemeral: true });
        }

        // Crée le salon pour le ticket
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        await ticketChannel.send(`Ticket créé par ${interaction.user}.`);
        await interaction.reply({ content: `Votre ticket a été créé : ${ticketChannel}`, ephemeral: true });
    }
});

// Commande pour fermer un ticket
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'close') {
        const channel = interaction.channel;
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: "Cette commande doit être utilisée dans un salon de ticket.", ephemeral: true });
        }

        await interaction.reply('Le ticket sera fermé dans 10 secondes...');
        setTimeout(async () => {
            await channel.permissionOverwrites.edit(interaction.user, { SendMessages: false });
            await interaction.followUp('Le ticket est maintenant fermé.');
        }, 10000);
    }
});

// Commande pour supprimer un ticket
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'delete') {
        const channel = interaction.channel;
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: "Cette commande doit être utilisée dans un salon de ticket.", ephemeral: true });
        }

        await interaction.reply('Le ticket sera définitivement supprimé dans 5 secondes...');
        setTimeout(async () => {
            await channel.delete();
        }, 5000);
    }
});

// Commande pour réouvrir un ticket
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'reopen') {
        const channel = interaction.channel;
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: "Cette commande doit être utilisée dans un salon de ticket.", ephemeral: true });
        }

        await interaction.reply('Le ticket a été rouvert.');
        await channel.permissionOverwrites.edit(interaction.user, { SendMessages: true });
    }
});

// Commande pour changer les informations du ticket
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'change') {
        const newName = interaction.options.getString('name');
        const channel = interaction.channel;
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: "Cette commande doit être utilisée dans un salon de ticket.", ephemeral: true });
        }

        await channel.setName(`ticket-${newName}`);
        await interaction.reply(`Le ticket a été renommé en : ticket-${newName}`);
    }
});

// Enregistrement des commandes slash
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const commands = [
    new SlashCommandBuilder().setName('create').setDescription('Créer un ticket'),
    new SlashCommandBuilder().setName('close').setDescription('Fermer un ticket'),
    new SlashCommandBuilder().setName('delete').setDescription('Supprimer un ticket'),
    new SlashCommandBuilder().setName('reopen').setDescription('Réouvrir un ticket'),
    new SlashCommandBuilder()
        .setName('change')
        .setDescription('Changer le nom du ticket')
        .addStringOption(option => option.setName('name').setDescription('Le nouveau nom du ticket').setRequired(true)),
];

(async () => {
    try {
        console.log('Enregistrement des commandes slash.');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Commandes enregistrées avec succès.');
    } catch (error) {
        console.error(error);
    }
})();

// Connexion du bot
client.login(process.env.TOKEN);
