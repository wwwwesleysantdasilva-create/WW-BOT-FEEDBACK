import { Client, GatewayIntentBits } from "discord.js"
import fs from "fs"

const client = new Client({
 intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
 ]
})

/* CARREGAR EVENTS */

fs.readdirSync("./events").forEach(file=>{
 import(`./events/${file}`).then(event=>{
  event.default(client)
 })
})

client.login(process.env.TOKEN)
