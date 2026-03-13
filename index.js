import { Client, GatewayIntentBits, REST, Routes } from "discord.js"
import fs from "fs"

const client = new Client({
 intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
 ]
})

/* COMANDOS SLASH */

const commands = [
 {
  name: "painel",
  description: "Abrir painel do bot de feedback"
 }
]

/* REGISTRAR COMANDOS */

client.once("clientReady", async () => {

 console.log(`🤖 Bot online: ${client.user.tag}`)

 const rest = new REST({ version: "10" }).setToken(process.env.TOKEN)

 try {

  await rest.put(
   Routes.applicationCommands(client.user.id),
   { body: commands }
  )

  console.log("✅ Slash command /painel registrado")

 } catch (error) {

  console.error(error)

 }

})

/* CARREGAR EVENTS */

fs.readdirSync("./events").forEach(file=>{
 import(`./events/${file}`).then(event=>{
  event.default(client)
 })
})

client.login(process.env.TOKEN)
