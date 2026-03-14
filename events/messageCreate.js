import { EmbedBuilder } from "discord.js"
import db from "../database/db.js"

export default (client)=>{

 client.on("messageCreate", async msg=>{

  if(msg.author.bot) return

  /* ================= EDITAR TEXTO EMBED ================= */

  if(client.editEmbedUser === msg.author.id){

   const data = msg.content.split("|")

   const title = data[0]?.trim()
   const desc = data[1]?.trim()

   db.run(`
   INSERT OR REPLACE INTO config
   (guild, embedTitle, embedDescription)
   VALUES (?,?,?)
   `,
   [
    msg.guild.id,
    title,
    desc
   ])

   msg.reply("✅ Texto da embed atualizado!")

   client.editEmbedUser = null
   return
  }

  /* ================= EDITAR IMAGEM ================= */

  if(client.editImageUser === msg.author.id){

   db.run(`
   INSERT OR REPLACE INTO config
   (guild, embedImage)
   VALUES (?,?)
   `,
   [
    msg.guild.id,
    msg.content
   ])

   msg.reply("✅ Imagem da embed atualizada!")

   client.editImageUser = null
   return
  }

  /* ================= EDITAR COR ================= */

  if(client.editColorUser === msg.author.id){

   db.run(`
   INSERT OR REPLACE INTO config
   (guild, embedColor)
   VALUES (?,?)
   `,
   [
    msg.guild.id,
    msg.content
   ])

   msg.reply("✅ Cor da embed atualizada!")

   client.editColorUser = null
   return
  }

  /* ================= EDITAR BOTÃO ================= */

  if(client.editButtonUser === msg.author.id){

   const data = msg.content.split("|")

   const emoji = data[0]?.trim()
   const label = data[1]?.trim()

   db.run(`
   INSERT OR REPLACE INTO config
   (guild, buttonEmoji, buttonLabel)
   VALUES (?,?,?)
   `,
   [
    msg.guild.id,
    emoji,
    label
   ])

   msg.reply("✅ Botão atualizado!")

   client.editButtonUser = null
   return
  }

  /* ================= SISTEMA DE FEEDBACK ================= */

  const step = client.feedbackStep[msg.author.id]

  if(step === "media"){

   if(msg.attachments.size === 0){
    return msg.reply("❌ Envie uma imagem ou vídeo.")
   }

   client.feedbackMedia[msg.author.id] = msg.attachments.first().url
   client.feedbackStep[msg.author.id] = "text"

   return msg.reply("✍️ Agora escreva seu feedback.")
  }

  if(step === "text"){

   const feedbackText = msg.content

   db.get(`SELECT feedbackChannel FROM config WHERE guild=?`,[
    msg.guild.id
   ],async(err,row)=>{

    if(!row){
     return msg.reply("❌ Canal de feedback não configurado.")
    }

    const channel = msg.guild.channels.cache.get(row.feedbackChannel)

    const embed = new EmbedBuilder()
    .setTitle("⭐ Novo Feedback")
    .setDescription(feedbackText)
    .setThumbnail(msg.author.displayAvatarURL())
    .setImage(client.feedbackMedia[msg.author.id])
    .setColor("Gold")

    channel.send({embeds:[embed]})

    msg.reply("✅ Feedback enviado com sucesso!")

    delete client.feedbackStep[msg.author.id]
    delete client.feedbackMedia[msg.author.id]

   })

  }

 })

}