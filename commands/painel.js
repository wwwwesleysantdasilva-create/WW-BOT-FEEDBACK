import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"

export const data = {
 name: "painel",
 description: "Abrir painel do bot"
}

export async function execute(interaction){

 const embed = new EmbedBuilder()
 .setTitle("⚙️ Painel do Bot de Feedback")
 .setDescription("Use os botões abaixo para configurar o sistema.")
 .setColor("Blue")

 const row = new ActionRowBuilder().addComponents(

  new ButtonBuilder()
   .setCustomId("set_feedback")
   .setLabel("Configurar Canal")
   .setStyle(ButtonStyle.Primary),

  new ButtonBuilder()
   .setCustomId("send_embed")
   .setLabel("Enviar Embed Feedback")
   .setStyle(ButtonStyle.Success)

 )

 await interaction.reply({
  embeds:[embed],
  components:[row]
 })

}
