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

  /* ================= SLASH COMMAND ================= */

  if (interaction.isChatInputCommand()) {

   if (interaction.commandName === "painel") {

    if (!interaction.member.permissions.has("Administrator")) {
     return interaction.reply({
      content:"❌ Apenas administradores podem usar este painel.",
      ephemeral:true
     })
    }

    const embed = new EmbedBuilder()
    .setTitle("⚙️ Painel do Bot de Feedback")
    .setDescription("Use os botões abaixo para configurar o bot.")
    .setColor("Blue")

    const row1 = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
      .setCustomId("config_channel")
      .setLabel("Canal Feedback")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Primary),

     new ButtonBuilder()
      .setCustomId("edit_embed")
      .setLabel("Editar Texto")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Secondary)

    )

    const row2 = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
      .setCustomId("edit_image")
      .setLabel("Imagem Embed")
      .setEmoji("🖼️")
      .setStyle(ButtonStyle.Secondary),

     new ButtonBuilder()
      .setCustomId("edit_color")
      .setLabel("Cor Embed")
      .setEmoji("🎨")
      .setStyle(ButtonStyle.Secondary)

    )

    const row3 = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
      .setCustomId("edit_button")
      .setLabel("Editar Botão")
      .setEmoji("🔘")
      .setStyle(ButtonStyle.Secondary),

     new ButtonBuilder()
      .setCustomId("send_embed")
      .setLabel("Enviar Embed")
      .setEmoji("⭐")
      .setStyle(ButtonStyle.Success)

    )

    return interaction.reply({
     embeds:[embed],
     components:[row1,row2,row3],
     ephemeral:true
    })

   }

  }

  /* ================= BOTÕES ================= */

  if (interaction.isButton()) {

   /* CONFIGURAR CANAL */

   if (interaction.customId === "config_channel") {

    const select = new ChannelSelectMenuBuilder()
    .setCustomId("select_feedback_channel")
    .setPlaceholder("Selecione o canal de feedback")
    .setChannelTypes(ChannelType.GuildText)

    const row = new ActionRowBuilder().addComponents(select)

    return interaction.reply({
     content:"📢 Escolha o canal de feedback:",
     components:[row],
     ephemeral:true
    })

   }

   /* EDITAR TEXTO */

   if (interaction.customId === "edit_embed") {

    client.editEmbedUser = interaction.user.id

    return interaction.reply({
     content:"✍️ Envie:\n\nTITULO | DESCRIÇÃO\n\nExemplo:\nFeedback da Loja | Veja os resultados dos clientes",
     ephemeral:true
    })

   }

   /* EDITAR IMAGEM */

   if (interaction.customId === "edit_image") {

    client.editImageUser = interaction.user.id

    return interaction.reply({
     content:"🖼️ Envie o link da imagem da embed.",
     ephemeral:true
    })

   }

   /* EDITAR COR */

   if (interaction.customId === "edit_color") {

    client.editColorUser = interaction.user.id

    return interaction.reply({
     content:"🎨 Envie a cor em HEX.\nExemplo: #00ff88",
     ephemeral:true
    })

   }

   /* EDITAR BOTÃO */

   if (interaction.customId === "edit_button") {

    client.editButtonUser = interaction.user.id

    return interaction.reply({
     content:"🔘 Envie:\n\nEMOJI | TEXTO\n\nExemplo:\n⭐ | Enviar Feedback",
     ephemeral:true
    })

   }

   /* ENVIAR EMBED */

   if (interaction.customId === "send_embed") {

    db.get(`SELECT * FROM config WHERE guild=?`,[interaction.guild.id],(_,row)=>{

     const embed = new EmbedBuilder()
     .setTitle(row?.embedTitle || "⭐ Envie seu Feedback")
     .setDescription(row?.embedDescription || "Clique no botão abaixo para enviar.")
     .setImage(row?.embedImage || null)
     .setColor(row?.embedColor || "Green")

     const rowBtn = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
      .setCustomId("start_feedback")
      .setLabel(row?.buttonLabel || "Enviar Feedback")
      .setEmoji(row?.buttonEmoji || "⭐")
      .setStyle(ButtonStyle.Primary)

     )

     interaction.channel.send({
      embeds:[embed],
      components:[rowBtn]
     })

     interaction.reply({
      content:"✅ Embed enviada!",
      ephemeral:true
     })

    })

   }

   /* INICIAR FEEDBACK */

   if (interaction.customId === "start_feedback") {

    client.feedbackStep[interaction.user.id] = "media"

    return interaction.reply({
     content:"📷 Envie uma imagem ou vídeo do seu resultado.",
     ephemeral:true
    })

   }

  }

  /* ================= SELECT MENU ================= */

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