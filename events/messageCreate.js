import { EmbedBuilder } from "discord.js"
import db from "../database/db.js"

export default (client)=>{

 client.on("messageCreate", async msg=>{

  try{

  if(msg.author.bot) return
  if(!msg.guild) return

  const userId = msg.author.id
  const edit = client.editState?.[userId]

  /* ================= CONFIGURAÇÕES ================= */

  if(edit){

   if(edit === "text"){

    const [title,desc] = msg.content.split("|")

    db.run(`
    UPDATE config SET
    embedTitle=?,
    embedDescription=?
    WHERE guild=?`,
    [title?.trim(),desc?.trim(),msg.guild.id])

    msg.reply("✅ Texto da embed atualizado.")
   }

   if(edit === "image"){

    db.run(`
    UPDATE config SET
    embedImage=?
    WHERE guild=?`,
    [msg.content,msg.guild.id])

    msg.reply("✅ Imagem atualizada.")
   }

   if(edit === "color"){

    db.run(`
    UPDATE config SET
    embedColor=?
    WHERE guild=?`,
    [msg.content,msg.guild.id])

    msg.reply("✅ Cor atualizada.")
   }

   if(edit === "button"){

    const [emoji,label] = msg.content.split("|")

    db.run(`
    UPDATE config SET
    buttonEmoji=?,
    buttonLabel=?
    WHERE guild=?`,
    [emoji?.trim(),label?.trim(),msg.guild.id])

    msg.reply("✅ Botão atualizado.")
   }

   delete client.editState[userId]
   return
  }

  /* ================= SISTEMA FEEDBACK ================= */

  const step = client.feedbackStep[userId]

  if(step === "media"){

   if(msg.attachments.size === 0){
    return msg.reply("❌ Envie uma imagem ou vídeo.")
   }

   client.feedbackMedia[userId] = msg.attachments.first().url
   client.feedbackStep[userId] = "text"

   return msg.reply("✍️ Agora escreva seu feedback.")
  }

  if(step === "text"){

   const feedback = msg.content

   db.get(
    `SELECT feedbackChannel FROM config WHERE guild=?`,
    [msg.guild.id],
    async(_,row)=>{

     if(!row?.feedbackChannel){
      return msg.reply("❌ Canal de feedback não configurado.")
     }

     const channel = msg.guild.channels.cache.get(row.feedbackChannel)

     if(!channel){
      return msg.reply("❌ Canal não encontrado.")
     }

     const embed = new EmbedBuilder()
     .setTitle("⭐ Novo Feedback")
     .setDescription(feedback)
     .setThumbnail(msg.author.displayAvatarURL())
     .setImage(client.feedbackMedia[userId])
     .setColor("#FFD700")
     .setFooter({
      text:`Cliente: ${msg.author.tag}`
     })

     await channel.send({embeds:[embed]})

     msg.reply("✅ Feedback enviado!")

     delete client.feedbackStep[userId]
     delete client.feedbackMedia[userId]

    })

  }

 }catch(err){

  console.error("Erro message:",err)

 }

 })

}