import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js"
import db from "../database/db.js"

export default (client)=>{

 client.feedbackStep = {}
 client.feedbackMedia = {}

 client.on("interactionCreate",async interaction=>{

  if(!interaction.isButton()) return

  /* BOTÃO PARA ENVIAR EMBED */

  if(interaction.customId === "send_embed"){

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

   interaction.channel.send({embeds:[embed],components:[row]})

   interaction.reply({content:"✅ Embed enviada!",ephemeral:true})

  }

  /* CLIENTE INICIANDO FEEDBACK */

  if(interaction.customId === "start_feedback"){

   interaction.reply({
    content:"📷 Envie uma imagem ou vídeo do seu resultado.",
    ephemeral:true
   })

   client.feedbackStep[interaction.user.id] = "media"

  }

 })

}
