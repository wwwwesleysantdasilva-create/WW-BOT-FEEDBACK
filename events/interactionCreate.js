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

 client.feedbackStep ??= {}
 client.feedbackMedia ??= {}

 client.editState ??= {}

 client.on("interactionCreate", async interaction => {

  try{

  /* ================= SLASH COMMAND ================= */

  if(interaction.isChatInputCommand()){

   if(interaction.commandName === "painel"){

    if(!interaction.member.permissions.has("Administrator")){
     return interaction.reply({
      content:"❌ Apenas administradores podem usar este painel.",
      ephemeral:true
     })
    }

    const embed = new EmbedBuilder()
    .setTitle("⚙️ Painel de Controle")
    .setDescription("Gerencie o sistema de feedback do servidor.")
    .setColor("#FFFFFF")

    const row1 = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
     .setCustomId("config_channel")
     .setLabel("Canal Feedback")
     .setEmoji("📢")
     .setStyle(ButtonStyle.Primary),

     new ButtonBuilder()
     .setCustomId("edit_embed_text")
     .setLabel("Editar Texto")
     .setEmoji("📝")
     .setStyle(ButtonStyle.Secondary)

    )

    const row2 = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
     .setCustomId("edit_embed_image")
     .setLabel("Imagem Embed")
     .setEmoji("🖼️")
     .setStyle(ButtonStyle.Secondary),

     new ButtonBuilder()
     .setCustomId("edit_embed_color")
     .setLabel("Cor Embed")
     .setEmoji("🎨")
     .setStyle(ButtonStyle.Secondary)

    )

    const row3 = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
     .setCustomId("edit_button")
     .setLabel("Botão Feedback")
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

  if(interaction.isButton()){

   const userId = interaction.user.id

   if(interaction.customId === "config_channel"){

    const menu = new ChannelSelectMenuBuilder()
    .setCustomId("select_feedback_channel")
    .setPlaceholder("Selecione o canal de feedback")
    .setChannelTypes(ChannelType.GuildText)

    const row = new ActionRowBuilder().addComponents(menu)

    return interaction.reply({
     content:"📢 Escolha o canal onde os feedbacks serão enviados:",
     components:[row],
     ephemeral:true
    })

   }

   if(interaction.customId === "edit_embed_text"){

    client.editState[userId] = "text"

    return interaction.reply({
     content:"✍️ Envie:\n\n`TITULO | DESCRIÇÃO`",
     ephemeral:true
    })

   }

   if(interaction.customId === "edit_embed_image"){

    client.editState[userId] = "image"

    return interaction.reply({
     content:"🖼️ Envie o link da imagem da embed.",
     ephemeral:true
    })

   }

   if(interaction.customId === "edit_embed_color"){

    client.editState[userId] = "color"

    return interaction.reply({
     content:"🎨 Envie a cor HEX.\nEx: `#ffffff`",
     ephemeral:true
    })

   }

   if(interaction.customId === "edit_button"){

    client.editState[userId] = "button"

    return interaction.reply({
     content:"🔘 Envie:\n\n`EMOJI | TEXTO`",
     ephemeral:true
    })

   }

   if(interaction.customId === "send_embed"){

    db.get(`SELECT * FROM config WHERE guild=?`,
    [interaction.guild.id],
    async(_,row)=>{

     const embed = new EmbedBuilder()
     .setTitle(row?.embedTitle || "⭐ Envie seu Feedback")
     .setDescription(row?.embedDescription || "Clique no botão abaixo.")
     .setImage(row?.embedImage || null)
     .setColor(row?.embedColor || "#FFFFFF")

     const button = new ButtonBuilder()
     .setCustomId("start_feedback")
     .setLabel(row?.buttonLabel || "Enviar Feedback")
     .setEmoji(row?.buttonEmoji || "⭐")
     .setStyle(ButtonStyle.Primary)

     const rowBtn = new ActionRowBuilder().addComponents(button)

     await interaction.channel.send({
      embeds:[embed],
      components:[rowBtn]
     })

     interaction.reply({
      content:"✅ Embed enviada!",
      ephemeral:true
     })

    })

   }

   if(interaction.customId === "start_feedback"){

    client.feedbackStep[userId] = "media"

    return interaction.reply({
     content:"📷 Envie uma imagem ou vídeo do resultado.",
     ephemeral:true
    })

   }

  }

  /* ================= MENU CANAL ================= */

  if(interaction.isChannelSelectMenu()){

   if(interaction.customId === "select_feedback_channel"){

    const channelId = interaction.values[0]

    db.run(
     `INSERT OR REPLACE INTO config (guild,feedbackChannel)
     VALUES (?,?)`,
     [interaction.guild.id,channelId]
    )

    return interaction.reply({
     content:`✅ Canal configurado: <#${channelId}>`,
     ephemeral:true
    })

   }

  }

 }catch(err){

  console.error("Erro interaction:",err)

 }

 })

}