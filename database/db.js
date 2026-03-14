import sqlite3 from "sqlite3"

const db = new sqlite3.Database("./database.sqlite")

db.serialize(()=>{

 db.run(`
 CREATE TABLE IF NOT EXISTS config(
 guild TEXT PRIMARY KEY,
 feedbackChannel TEXT,
 embedTitle TEXT,
 embedDescription TEXT,
 embedImage TEXT,
 embedColor TEXT,
 buttonLabel TEXT,
 buttonEmoji TEXT,
 buttonStyle TEXT
 )
 `)

})

export default db