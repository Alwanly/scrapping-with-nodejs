const mysql = require("mysql");

module.exports =  db = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"store_laptop"    
})
db.connect((err)=>{
    if(err) throw err;
    console.log("Connection Successfuly")
})