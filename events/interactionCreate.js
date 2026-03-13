import {
 ActionRowBuilder,
 ButtonBuilder,
 ButtonStyle,
 EmbedBuilder,
 ChannelSelectMenuBuilder,
 ChannelType
} from "discord.js"

import db from "../database/db.js"

export default (client)=>{

 client.feedbackStep = {}
 client.feedbackMedia = {}

 client.on("interactionCreate", async interaction => {

  /* SLASH COMMAND */

  if (interaction.isChatInputCommand()) {
    
if (interaction.commandName === "painel") {

 if (!interaction.member.permissions.has("Administrator")) {
  return interaction.reply({
   content: "❌ Apenas administradores podem usar este painel.",
   ephemeral: true
  })
 }

    const embed = new EmbedBuilder()
     .setTitle("⚙️ Painel do Bot de Feedback")
     .setDescription("Configure o sistema usando os botões abaixo.")
     .setColor("Blue")

    const row = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
      .setCustomId("send_embed")
      .setLabel("Enviar Embed Feedback")
      .setEmoji("⭐")
      .setStyle(ButtonStyle.Success),

     new ButtonBuilder()
      .setCustomId("config_channel")
      .setLabel("Configurar Canal")
      .setEmoji("🔘")
      .setStyle(ButtonStyle.Primary)

    )

    return interaction.reply({
     embeds:[embed],
     components:[row],
     ephemeral:true
    })

   }

  }

  /* BOTÃO CONFIGURAR CANAL */

  if (interaction.isButton()) {

   if (interaction.customId === "config_channel") {

    const select = new ChannelSelectMenuBuilder()
     .setCustomId("select_feedback_channel")
     .setPlaceholder("Selecione o canal de feedback")
     .setChannelTypes(ChannelType.GuildText)

    const row = new ActionRowBuilder().addComponents(select)

    return interaction.reply({
     content:"📢 Escolha o canal onde os feedbacks serão enviados:",
     components:[row],
     ephemeral:true
    })

   }

   /* BOTÃO ENVIAR EMBED */

   if (interaction.customId === "send_embed") {

    const embed = new EmbedBuilder()
     .setTitle("⭐ Envie seu Feedback")
     .setDescription("Clique no botão abaixo para enviar seu feedback.")
     .setColor("Green")

    const row = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
      .setCustomId("start_feedback")
      .setLabel("Enviar Feedback")
      .setEmoji("⭐")
      .setStyle(ButtonStyle.Primary)

    )

    await interaction.channel.send({
     embeds:[embed],
     components:[row]
    })

    return interaction.reply({
     content:"✅ Embed enviada!",
     ephemeral:true
    })

   }

   /* CLIENTE COMEÇA FEEDBACK */

   if (interaction.customId === "start_feedback") {

    await interaction.reply({
     content:"📷 Envie uma imagem ou vídeo do seu resultado.",
     ephemeral:true
    })

    client.feedbackStep[interaction.user.id] = "media"

   }

  }

  /* SELEÇÃO DO CANAL */

  if (interaction.isChannelSelectMenu()) {

   if (interaction.customId === "select_feedback_channel") {

    const channelId = interaction.values[0]

    db.run(
     `INSERT OR REPLACE INTO config (guild, feedbackChannel) VALUES (?, ?)`,
     [interaction.guild.id, channelId]
    )

    return interaction.reply({
     content:`✅ Canal configurado: <#${channelId}>`,
     ephemeral:true
    })

   }

  }

 })

}
