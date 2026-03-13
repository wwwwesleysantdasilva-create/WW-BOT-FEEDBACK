import { EmbedBuilder } from "discord.js"
import db from "../database/db.js"

export default (client)=>{

 client.on("messageCreate",async msg=>{

  if(msg.author.bot) return

  const step = client.feedbackStep[msg.author.id]

  /* PASSO 1 - MIDIA */

  if(step === "media"){

   if(msg.attachments.size === 0){
    return msg.reply("❌ Envie uma imagem ou vídeo.")
   }

   client.feedbackMedia[msg.author.id] = msg.attachments.first().url
   client.feedbackStep[msg.author.id] = "text"

   return msg.reply("✍️ Agora escreva seu feedback.")

  }

  /* PASSO 2 - TEXTO */

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
