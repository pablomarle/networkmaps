const mysql = require("mysql");
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})
const fs = require('fs').promises;

function findEmailOfUserID(userlist, id) {
    for(let x = 0; x < userlist.length; x++) {
        if(userlist[x].id == id)
            return userlist[x].email;
    }
}

function export_data(data, filename) {
    let result = {
        session:{},
        user:{},
        password_reset: {},
        diagram: {},
    }
    console.log(data);
    console.log(data.user.length);
    for(let x = 0; x < data.user.length; x++) {
        result.user[data.user[x].email] = {
            name: data.user[x].name,
            lastname: data.user[x].lastname,
            password: data.user[x].password.toString('base64'),
            salt: data.user[x].salt,
            is_active: data.user[x].isactive,
            activation_code: data.user[x].activationcode,
            activation_date: new Date(data.user[x].activationdate).getTime(),
            diagrams: []
        }
    }

    for(let x = 0; x < data.session.length; x++) {
        let j = JSON.parse(data.session[x].data);
        result.session[data.session[x].sessionid] = {
            user: ("user" in j) ? j.user : "",
            last_used: new Date(data.session[x].last_used).getTime(),
            data: j
        }
    }
    for(let x = 0; x < data.diagram.length; x++) {
        let entry = data.diagram[x];
        let uuid = entry.uuid.toString('hex');
        let owner_email = findEmailOfUserID(data.user, entry.owner);
        result.user[owner_email].diagrams.push(uuid);
        result.diagram[uuid] = {
            name: entry.name,
            owner: owner_email,
            last_modified: new Date(entry.last_modified).getTime(),
            mark_delete: (entry.mark_delete) ? true : false,
            permissions: {},
        }
        for(let y = 0; y < data.diagram_permission.length; y++) {
            if(data.diagram_permission[y].id == entry.id) {
                let perm_email = findEmailOfUserID(data.user, data.diagram_permission[y].user);
                result.diagram[uuid].permissions[perm_email] = data.diagram_permission[y].permission;
                result.user[perm_email].diagrams.push(uuid);
            }
        }
    }
    json = JSON.stringify(result);
    fs.writeFile(filename, json);
    console.log(json);
}

function query_db_file(dbdata, filename) {
    let mysqlpool = mysql.createPool(dbdata);
    let data = {};

    mysqlpool.query("SELECT * FROM user", [],
        (error, results, fields) => {
            if(error) {
                console.log("Error on user query.")
                console.log(error);
                return;
            }
            data.user = results;

            mysqlpool.query("SELECT * FROM session", [],
                (error, results, fields) => {
                    if(error) {
                        console.log("Error on session.")
                        console.log(error);
                        return;
                    }
                    data.session = results;

                    mysqlpool.query("SELECT * FROM password_reset", [],
                        (error, results, fields) => {
                            if(error) {
                                console.log("Error on password_reset.")
                                console.log(error);
                                return;
                            }
                            data.password_reset = results;

                            mysqlpool.query("SELECT * FROM diagram_permission", [],
                                (error, results, fields) => {
                                    if(error) {
                                        console.log("Error on diagram_permission.")
                                        console.log(error);
                                        return;
                                    }
                                    data.diagram_permission = results;

                                    mysqlpool.query("SELECT * FROM diagram", [],
                                        (error, results, fields) => {
                                            if(error) {
                                                console.log("Error on diagram.")
                                                console.log(error);
                                                return;
                                            }
                                            data.diagram = results;

                                            export_data(data, filename);
                                        });
                                });
                        });
                });
        });

}

function create_db_file() {
    let dbdata = {};
/*        "database": "users",
        "host": "localhost",
        "user": "root",
        "password": "a password"
    }*/

    readline.question("Mysql host? ", (host) => {
        dbdata.host = host;
        readline.question("Mysql user? ", (user) => {
            dbdata.user = user;
            readline.question("Mysql password? ", (password) => {
                dbdata.password = password;
                readline.question("DB name? ", (name) => {
                    dbdata.database = name;
                    readline.question("Output file? ", (filename) => {
                        query_db_file(dbdata, filename);
                    })
                })
            })
        })
    })
}
create_db_file() 
