import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js"
import db from "../database/db.js"

export default (client)=>{

 client.feedbackStep = {}
 client.feedbackMedia = {}

 client.on("interactionCreate", async interaction => {

  /* COMANDO /PAINEL */

  if (interaction.isChatInputCommand()) {

   if (interaction.commandName === "painel") {

    const embed = new EmbedBuilder()
    .setTitle("⚙️ Painel do Bot de Feedback")
    .setDescription("Use o botão abaixo para enviar a embed de feedback.")
    .setColor("Blue")

    const row = new ActionRowBuilder().addComponents(

     new ButtonBuilder()
     .setCustomId("send_embed")
     .setLabel("Enviar Embed Feedback")
     .setEmoji("⭐")
     .setStyle(ButtonStyle.Success)

    )

    return interaction.reply({
     embeds: [embed],
     components: [row]
    })

   }

  }

  /* BOTÕES */

  if (!interaction.isButton()) return

  /* BOTÃO PARA ENVIAR EMBED */

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
    embeds: [embed],
    components: [row]
   })

   await interaction.reply({
    content: "✅ Embed enviada!",
    ephemeral: true
   })

  }

  /* CLIENTE INICIANDO FEEDBACK */

  if (interaction.customId === "start_feedback") {

   await interaction.reply({
    content: "📷 Envie uma imagem ou vídeo do seu resultado.",
    ephemeral: true
   })

   client.feedbackStep[interaction.user.id] = "media"

  }

 })

}
