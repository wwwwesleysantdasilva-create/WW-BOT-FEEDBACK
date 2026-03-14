import { EmbedBuilder } from "discord.js"
import db from "../database/db.js"

export default (client)=>{

 client.on("messageCreate", async msg=>{

  if(msg.author.bot) return
  if(!msg.guild) return

  const userId = msg.author.id
  const step = client.feedbackStep[userId]

  /* PASSO 1 - MIDIA */

  if(step === "media"){

   if(msg.attachments.size === 0){
    return msg.reply("❌ Envie uma imagem ou vídeo.")
   }

   client.feedbackMedia[userId] = msg.attachments.first().url
   client.feedbackStep[userId] = "phone"

   return msg.reply("📱 Qual modelo do celular você usa?\nEx: iPhone 12 / Redmi Note 11")
  }

  /* PASSO 2 - CELULAR */

  if(step === "phone"){

   client.feedbackPhone ??= {}
   client.feedbackPhone[userId] = msg.content

   client.feedbackStep[userId] = "text"

   return msg.reply("💬 Agora escreva seu feedback.")
  }

  /* PASSO 3 - FEEDBACK */

  if(step === "text"){

   const feedbackText = msg.content

   db.get(
    `SELECT feedbackChannel FROM config WHERE guild=?`,
    [msg.guild.id],
    async(err,row)=>{

     if(!row?.feedbackChannel){
      return msg.reply("❌ Canal de feedback não configurado.")
     }

     const channel = msg.guild.channels.cache.get(row.feedbackChannel)

     if(!channel){
      return msg.reply("❌ Canal não encontrado.")
     }

     const embed = new EmbedBuilder()
     .setTitle("⭐ Novo Feedback")
     .addFields(
      {
       name:"📱 Celular",
       value: client.feedbackPhone[userId] || "Não informado",
       inline:true
      },
      {
       name:"💬 Feedback",
       value: feedbackText,
       inline:false
      }
     )
     .setThumbnail(msg.author.displayAvatarURL())
     .setImage(client.feedbackMedia[userId])
     .setColor("#FFD700")
     .setFooter({
      text:`Cliente: ${msg.author.tag}`
     })

     await channel.send({embeds:[embed]})

     msg.reply("✅ Feedback enviado com sucesso!")

     delete client.feedbackStep[userId]
     delete client.feedbackMedia[userId]
     delete client.feedbackPhone[userId]

    })

  }

 })

}