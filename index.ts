import { ButtonInteraction, Client, Collection, ComponentType, EmbedBuilder, InteractionType } from "discord.js";
import { readdirSync } from "fs";
import { CommandType } from "./src/types/CommandType";
import "dotenv/config"
import { NewClient } from "./src/types/Client";
import { VoteOPT } from "./src/types/VoteOPT";
import candidates from "./candidates.json"
import { Database } from "simpl.db";
const db = new Database();

const client = new Client({ intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'GuildPresences'] }) as NewClient
const commands = new Collection<string, CommandType>();
client.vote = new Collection<string, VoteOPT>();
readdirSync('./src/cmds').forEach(file => {
    const command = require(`./src/cmds/${file}`) as CommandType
    commands.set(command.name, command);
})
client.on('ready', () => {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.log('Servidor não encontrado');
        return process.exit(1)
    }
    commands.forEach(x => {
        guild.commands.create({ name: x.name, description: x.description ?? null });
    })
    console.log(`Logged in as ${client.user.tag}!`);
})
client.on('interactionCreate', async interaction => {
    if (interaction.type === InteractionType.ApplicationCommand) {
        const command = commands.get(interaction.commandName);
        command.run(client, interaction);
    }
    if (interaction.isButton()) {
        const vote = client.vote.get(interaction.user.id);
        if (!vote || vote.msgid !== interaction.message.id || vote.type !== "deputado federal") return;
        interaction.deferUpdate();
        if (interaction.customId !== "white" && interaction.customId !== "rewrite" && interaction.customId !== "confirm") {
            vote.number = vote.number + interaction.customId;
            client.vote.set(interaction.message.id, vote);
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(`${vote.type} \n \n${vote.number}`)
            if (vote.number.length >= 4) {
                embed.setThumbnail(candidates.find(x => x.infos.number == Number(vote.number))?.infos?.image || null)
                embed.setDescription(`${vote.type} \n \n${vote.number} \n \nNome: ${candidates.find(x => x.infos.number == Number(vote.number))?.name ?? "Deputado nulo."}${candidates.find(x => x.infos.number == Number(vote.number)) ? `\nVice presidente: ${candidates.find(x => x.infos.number == Number(vote.number)).infos.president2}\nPartido: ${candidates.find(x => x.infos.number == Number(vote.number)).infos.team}`:""}`)
            }
            interaction.message.edit({ embeds: [embed] });
        } else {
            switch (interaction.customId) {
                case "white":
                    vote.infos.push({ deput_code: "white" })
                    proxEtape(interaction, vote)
                    break;
                case "rewrite":
                    client.vote.set(interaction.message.id, vote);
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setDescription(`${vote.type} \n \nInsere o número`)
                    interaction.message.edit({ embeds: [embed] });
                    break;
                case "confirm":
                    vote.infos.push({ deput_code: vote.number })
                    proxEtape(interaction, vote)
                    break;
            }
            vote.number = "";
        }
    }
})
client.login(process.env.DISCORD_TOKEN);
async function proxEtape(interaction: ButtonInteraction, vote: VoteOPT) {
    const voteCollection = db.getCollection('vote') ?? db.createCollection('vote');
    vote.type = "Presidente"
    client.vote.set(interaction.user.id, vote);
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setImage(null)
        .setDescription(`${vote.type} \n \nInsere o número`)
    const msg = await interaction.message.edit({ embeds: [embed] });
    const collector = msg.createMessageComponentCollector({ filter: m => m.user.id === interaction.user.id, componentType: ComponentType.Button });
    collector.on('collect', m => {
        if (m.customId !== "white" && m.customId !== "rewrite" && m.customId !== "confirm") {
            m.deferUpdate()
            vote.number = vote.number + m.customId;
            client.vote.set(interaction.message.id, vote);
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setThumbnail(candidates.find(x => x.infos.number == Number(vote.number))?.infos?.image || null)
                .setDescription(`${vote.type} \n \n${vote.number}`)
            if (vote.number.length >= 2) {
                embed.setDescription(`${vote.type} \n \n${vote.number} \n \nNome: ${candidates.find(x => x.infos.number == Number(vote.number))?.name ?? "Presidente nulo."}${candidates.find(x => x.infos.number == Number(vote.number)) ? `\nVice Presidente: ${candidates.find(x => x.infos.number == Number(vote.number)).infos.president2}\nPartido: ${candidates.find(x => x.infos.number == Number(vote.number)).infos.team}`:""}`)
            }
            interaction.message.edit({ embeds: [embed] });
        } else {
            const embedConfirm = new EmbedBuilder()
            .setTitle("Confirmação")
            .setDescription(`Você votou com sucesso!`)
            switch (m.customId) {
                case "white":
                    vote.infos.push({ deput_code: "white" })
                    m.reply({embeds: [embedConfirm], ephemeral: true});
                    voteCollection.create({id: interaction.user.id, votes: vote.infos})
                    break;
                case "rewrite":
                    m.deferUpdate()
                    client.vote.set(interaction.message.id, vote);
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setDescription(`${vote.type} \n \nInsere o número`)
                    interaction.message.edit({ embeds: [embed] });
                    break;
                case "confirm":
                    vote.infos.push({ deput_code: vote.number })
                    m.reply({embeds: [embedConfirm], ephemeral: true});
                    voteCollection.create({id: interaction.user.id, votes: vote.infos})
                    break;
            }
            vote.number = "";
            client.vote.delete(interaction.user.id)
        }
    })
}