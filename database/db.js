import sqlite3 from "sqlite3"

const db = new sqlite3.Database("./database.sqlite")

db.serialize(()=>{

 db.run(`
 CREATE TABLE IF NOT EXISTS config(
 guild TEXT,
 feedbackChannel TEXT
 )
 `)

})

export default db
