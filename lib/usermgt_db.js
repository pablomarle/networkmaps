const mysql = require("mysql")
const crypto = require("crypto");
const validator = require("validator")
const fs = require('fs').promises;

// Constant that defines when a session is not valid any more
const SESSION_TIMEOUT = 30
const PWD_VALID_CHARS = "1234567890$%#!@_-qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
const PWD_LENGTH = 12
const SALT_LENGTH = 16

class UserMGT {
    constructor(dbdata, usertimeout) {
        let mysqlpool = mysql.createPool(dbdata);
        this.mysqlpool = mysqlpool;
        this.cleanupInterval = setInterval(() => {
            console.log("Password Reset cleanup Running")
            mysqlpool.query("DELETE FROM password_reset WHERE activationdate < NOW()")
            console.log("Password Reset cleanup Done")

            console.log("Session Cleanup Running")
            mysqlpool.query("DELETE FROM session WHERE last_used < DATE_SUB(NOW(), INTERVAL 30 DAY)")
            console.log("Session Cleanup Done")

            console.log("User Not Validated Cleanup Running")
            mysqlpool.query("DELETE FROM user WHERE isactive = FALSE and activationdate < NOW()")
            console.log("User Not Validated Cleanup Done")
        }, usertimeout * 1000);
    }

    initialize() {
    }

    generateRandomPassword(pwdlength=PWD_LENGTH) {
        let randombuffer = crypto.randomBytes(pwdlength)
        let randompwd = ""
        for (let x = 0; x < pwdlength; x++)
            randompwd += PWD_VALID_CHARS[randombuffer[x]%64]
        return randompwd;
    }
    
    generateSaltedHash(password, saltlength=SALT_LENGTH) {
        const salt = this.generateRandomPassword(saltlength);
        const digest = this.generateHash(password, salt)

        return {salt: salt, hash: digest};
    }

    generateHash(password, salt) {
        const saltedpassword = password + salt;
        const hash = crypto.createHash('sha512');
        hash.update(saltedpassword);
        const digest = hash.digest();

        return digest;
    }

    isValidPassword(password) {
        if(password.length > 64)
            return false;

        for(let x = 0; x < password.length; x++)
            if(PWD_VALID_CHARS.indexOf(password[x]) == -1)
                return false

        return true
    }

    createSession(callback) {
        let sessionid = crypto.randomBytes(32).toString('hex');
        let sessiondata = "{}";

        this.mysqlpool.query("INSERT INTO session (sessionid, data, last_used) VALUES (?, ?, NOW())", 
            [sessionid, sessiondata],
            (error, results, fields) => {
                if (error) {
                    callback(null);
                }
                else {
                    callback({"sessionid": sessionid, "data": {}})
                }
            })
    }

    getSession(sessionid, callback) {
        if (!validator.isAlphanumeric(sessionid)) {
            this.createSession((session) => {callback(null, session)});
            return
        }

        this.mysqlpool.query("SELECT data FROM session WHERE sessionid = ?", 
            [sessionid],
            (error, results, fields) => {
                if (error) {
                    callback("Error on get session (1): " + error);
                }
                else if (results.length == 0) {
                    this.createSession((session) => {callback(null, session)});
                }
                else {
                    callback(null, {"sessionid": sessionid, "data": JSON.parse(results[0]["data"])})

                    this.mysqlpool.query("UPDATE session SET last_used = NOW() WHERE sessionid = ?", [sessionid]);
                }
            })
    }

    getSessionNoCreate(sessionid, callback) {
        if (!validator.isAlphanumeric(sessionid)) {
            callback("Error on get session (3): '" + sessionid + "'")
            return
        }

        this.mysqlpool.query("SELECT data FROM session WHERE sessionid = ?", 
            [sessionid],
            (error, results, fields) => {
                if (error) {
                    callback("Error on get session (1): " + error);
                }
                else if (results.length == 0) {
                    callback("Error on get session (2).")
                }
                else {
                    callback(null, {"sessionid": sessionid, "data": JSON.parse(results[0]["data"])});
                    this.mysqlpool.query("UPDATE session SET last_used = NOW() WHERE sessionid = ?", [sessionid]);
                }
            })
    }

    setSession(sessionid, data) {
        if (!validator.isAlphanumeric(sessionid)) {
            return
        }

        this.mysqlpool.query("UPDATE session SET data = ? WHERE sessionid = ?", [JSON.stringify(data), sessionid]); 
    }

    createUser(userdata, callback) {
        let checkParameters = {}

        // Check first if parameters are valid
        checkParameters.email = validator.isEmail(userdata.email)

        userdata.email = userdata.email.toLowerCase();

        if(!checkParameters.email) {
            callback("Email address is not valid.")
            return
        }

        // Check if the user exists
        this.mysqlpool.query("SELECT id FROM user WHERE email = ?", [userdata.email], (error, results, fields) => {
            if(error) {
                console.log(error)
                callback("Unexpected error (1). Please, try again later.");
            }
            else if (results.length != 0) {
                callback("Email already registered.");
            }
            else {
                let activationcode = crypto.randomBytes(32).toString('hex');

                this.mysqlpool.query("INSERT INTO user (email, name, lastname, password, isactive, activationcode, activationdate) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))", 
                    [
                        userdata.email,
                        userdata.name, 
                        userdata.lastname,
                        "", 
                        false,
                        activationcode
                    ],
                    (error, results, fields) => {
                        if (error) {
                            console.log(error)
                            callback("Unexpected error (2). Please, try again later.")
                        }
                        else {
                            callback(null, activationcode);
                        }
                    })
            }
        })
    }

    validateUser(email, validate_string, callback) {
        email = email.toLowerCase();

        // Check parameters
        if (!validator.isAlphanumeric(validate_string)) {
            callback("Activation code invalid");
            return;
        }
        if (!validator.isEmail(email)) {
            callback("Email invalid");
            return;
        }

        this.mysqlpool.query("SELECT id FROM user WHERE email = ? AND isactive = FALSE AND activationcode = ?", 
            [email, validate_string],
            (error, results, fields) => {
                if(error) {
                    console.log("Error on user activation (1): " + error);
                    callback("Error on user activation (1)");
                    return;
                }
                if(results.length == 1) {
                    let newpassword = this.generateRandomPassword();
                    const {salt, hash} = this.generateSaltedHash(newpassword);
                    this.mysqlpool.query("UPDATE user SET password = ?, salt = ?, isactive = TRUE WHERE email = ?",
                        [hash, salt, email],
                        (error, results, fields) => {
                            if(error) {
                                console.log("Error on user activation (2): " + error);                              
                                callback("Error on user activation (2)");
                                return;
                            }
                            callback(null, email, newpassword);
                        })
                }
                else {
                    callback("Error on user activation (3)");
                    return;
                }
            });

    }

    changePassword(email, oldpassword, newpassword, callback) {
        email = email.toLowerCase();

        // Validate data
        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }
        if(!this.isValidPassword(oldpassword)) {
            callback("Invalid old password")
            return          
        }
        if(!this.isValidPassword(newpassword)) {
            callback("Invalid new password")
            return          
        }

        // First call: get the data from the user
        this.mysqlpool.query("SELECT password, salt FROM user WHERE email = ? AND isactive = TRUE", 
            [email],
            (error, results, fields) => {
                if(error) {
                    callback("Error on changePassword")
                    console.log("Error on changePassword (1): " + error)
                    return
                }
                if(results.length != 1) {
                    callback("Error on changePassword")
                    console.log("Error on changePassword (2): " + error)
                    return
                }
                let hash = this.generateHash(oldpassword, results[0].salt)
                if (hash.equals(results[0].password)) {
                    // Password can be changed. Generate salt and hash and update database
                    const {salt, hash} = this.generateSaltedHash(newpassword);
                    this.mysqlpool.query("UPDATE user SET password = ?, salt = ? WHERE email = ?",
                        [hash, salt, email],
                        (error, results, fields) => {
                            if(error) {
                                console.log("Error on changePassword (2): " + error);                               
                                callback("Error on changePassword");
                                return;
                            }
                            callback(null);
                        })
                }
                else {
                    callback("Old password invalid")
                }
            })
    }

    requestResetPassword(email, callback) {
        email = email.toLowerCase();

        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }

        // Get the ID of the user (and check if it exists)
        this.mysqlpool.query("SELECT id FROM user WHERE email = ? AND isactive = TRUE", 
            [email],
            (error, results, fields) => {
                if(error) {
                    callback("Error on resetPassword")
                    console.log("Error on resetPassword (1): " + error)
                    return
                }
                if(results.length != 1) {
                    callback("Error on resetPassword");
                    console.log("Error on resetPassword (2): user " + email + " not found");
                    return
                }
                let userid = results[0].id;

                // Generate a password change request
                let validation_code = crypto.randomBytes(32).toString('hex');
                
                this.mysqlpool.query("INSERT INTO password_reset (userid, code, activationdate) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))",
                    [userid, validation_code],
                    (error, results, fields) => {
                        if(error) {
                            callback("Error on resetPassword")
                            console.log("Error on resetPassword (3): " + error)
                            return;
                        }
                        callback(null, validation_code);
                    })
            })
    }

    resetPassword(email, validation_code, callback) {
        email = email.toLowerCase();

        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }

        if (!validator.isAlphanumeric(validation_code)) {
            callback("Invalid activation code")
            return          
        }

        // Check if the validation code is valid
        this.mysqlpool.query("SELECT r.id FROM password_reset r, user u WHERE r.userid = u.id AND u.email = ? and r.code = ? and r.activationdate > NOW()", 
            [email, validation_code],
            (error, results, fields) => {
                if(error) {
                    callback("Error on resetPassword");
                    console.log("Error on resetPassword (1): " + error);
                    return;
                }
                if(results.length != 1) {
                    callback("Reset password code not valid.");
                    console.log("Reset password code not valid");
                    return;
                }
                this.mysqlpool.query("DELETE FROM password_reset WHERE id = ?",
                    [results[0]["id"]]);

                let newpassword = this.generateRandomPassword();
                const {salt, hash} = this.generateSaltedHash(newpassword);

                this.mysqlpool.query("UPDATE user SET password = ?, salt = ? WHERE email = ?",
                    [hash, salt, email],
                    (error, results, fields) => {
                        if(error) {
                            console.log("Error on resetPassword (2): " + error);                                
                            callback("Error on resetPassword");
                            return;
                        }
                        callback(null, email, newpassword);
                    })

            });


    }

    loginUser(sessionid, email, password, callback) {
        email = email.toLowerCase();

        // Validate data
        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }
        if(!this.isValidPassword(password)) {
            callback("Invalid password")
            return          
        }
        if (!validator.isAlphanumeric(sessionid)) {
            callback("Invalid session id")
            return
        }

        // Get password and salt from this user
        this.mysqlpool.query("SELECT password, salt, data, name, lastname FROM user, session WHERE email = ? AND isactive = TRUE and sessionid = ?", 
            [email, sessionid],
            (error, results, fields) => {
                if(error) {
                    console.log("Login error: " + error);
                    callback("Login error")
                    return;
                }
                if(results.length != 1) {
                    callback(null, null);
                    return
                }
                let hash = this.generateHash(password, results[0].salt)
                if (hash.equals(results[0].password)) {
                    let data = JSON.parse(results[0]["data"]);
                    data["user"] = email;
                    data["name"] = results[0]["name"];
                    data["lastname"] = results[0]["lastname"];

                    this.mysqlpool.query("UPDATE session SET data = ?, last_used = NOW() WHERE sessionid = ?",
                        [JSON.stringify(data), sessionid]);

                    callback(null, data);
                }
                else {
                    callback(null, null);
                }
            })
    }

    logoutUser(sessionid, callback) {
        if (!validator.isAlphanumeric(sessionid)) {
            callback("Invalid session id")
            return
        }

        this.mysqlpool.query('UPDATE session SET data = "{}", last_used = NOW() WHERE sessionid = ?', 
            [sessionid], 
            (error, results, fields) => {
                if(error) {
                    console.log("Logout error: " + error);
                    callback("Logout error")
                    return;
                }

                callback(null);
            });
    }

    changeUserData(sessionid, newusername, newuserlastname, callback) {

        this.getSessionNoCreate(sessionid, (error, sessiondata) => {
            if (error) {
                callback(error);
                return;
            }

            if(!sessiondata.data.user) {
                callback("Session doesn't have a user assigned");
                return;
            }

            this.mysqlpool.query("UPDATE user SET name = ?, lastname = ? where email = ?",
                [newusername, newuserlastname, sessiondata.data.user],
                (error, results, fields) => {
                    if(error) {
                        callback("Error on changeUserData (1)");
                        console.log("Error on changeUserData (1): " + error);
                        return;
                    }

                    sessiondata.data.name = newusername;
                    sessiondata.data.lastname = newuserlastname;
                    this.setSession(sessionid, sessiondata.data);
                    
                    callback(null);
                });
        })
    }

    createDiagram(sessionid, diagram_name, callback) {
        /*if (!validator.isAlphanumeric(diagram_name)) {
            callback("Invalid diagram name.")
            return
        }*/

        this.getSessionNoCreate(sessionid, (error, sessiondata) => {
            if (error) {
                callback(error);
                return;
            }

            if(!sessiondata.data.user) {
                callback("Session doesn't have a user assigned");
                return;
            }

            this.mysqlpool.query("INSERT INTO diagram (name, uuid, owner, last_modified) SELECT ?, ?, u.id, NOW() FROM user u  WHERE email = ?",
                [diagram_name, crypto.randomBytes(16), sessiondata.data.user],
                (error, results, fields) => {
                    if(error) {
                        callback("Error creating diagram");
                        console.log("Error creating diagram: " + error);
                        return;
                    }

                    callback(null);
                });
        })
    }

    getListDiagrams(sessionid, callback) {
        this.getSessionNoCreate(sessionid, (error, sessiondata) => {
            if (error) {
                callback(error);
                return;
            }

            if(!sessiondata.data.user) {
                callback("Session doesn't have a user assigned");
                return;
            }
            
            let query = 'SELECT d.uuid, d.name, p.permission, o.email, o.name as `oname`, o.lastname ' +
                        'FROM diagram d ' +
                            'INNER JOIN diagram_permission p ON d.id = p.diagram ' +
                            'INNER JOIN user u ON u.id = p.user ' +
                            'INNER JOIN user o ON o.id = d.owner ' +
                        'WHERE u.email = ? AND d.mark_delete = FALSE ' +
                    'UNION ' +
                        'SELECT d.uuid, d.name, "OWNER", u.email, u.name as `oname`, u.lastname ' +
                        'FROM diagram d ' +
                            'INNER JOIN user u ON u.id = d.owner ' +
                        'WHERE u.email = ? AND d.mark_delete = FALSE '
            this.mysqlpool.query(query, [sessiondata.data.user, sessiondata.data.user],
                (error, results, fields) => {
                    if(error) {
                        callback("Error getting your diagrams.");
                        console.log("Error querying diagrams: " + error);
                        return;
                    }

                    let callbackresult = [];
                    for(let x = 0; x < results.length; x++) {
                        callbackresult.push({
                            uuid: results[x].uuid.toString('hex'),
                            name: results[x].name,
                            permission: results[x].permission,
                            oe: results[x].email,
                            on: results[x].oname,
                            ol: results[x].lastname
                        })
                    }

                    callback(null, callbackresult);
                })
        })
    }

    renameDiagram(sessionid, uuid, newname, callback) {
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }
        this.getSessionNoCreate(sessionid, (error, sessiondata) => {
            if (error) {
                callback(error);
                return;
            }

            let query = "UPDATE diagram d, user u SET d.name = ? WHERE d.uuid = ? AND d.owner = u.id AND u.email = ?";

            this.mysqlpool.query(query, [newname, Buffer.from(uuid, 'hex'), sessiondata.data.user],
                (error, results, fields) => {
                    if(error) {
                        callback("Error renaming diagram.");
                        console.log("Error renaming diagram: " + error);
                        return;
                    }

                    if(results.affectedRows != 1) {
                        callback("You don't have permission to do this action.");
                    }
                    else {
                        callback();
                    }
                })

        })
    }

    deleteDiagram(sessionid, uuid, callback) {
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }
        this.getSessionNoCreate(sessionid, (error, sessiondata) => {
            if (error) {
                callback(error);
                return;
            }

            if(!sessiondata.data.user) {
                callback("Session doesn't have a user assigned");
                return;
            }
            
            let query = 'UPDATE diagram d, user u SET d.mark_delete = TRUE where d.owner = u.id AND d.uuid = ? and u.email = ?';
            this.mysqlpool.query(query, [Buffer.from(uuid, 'hex'), sessiondata.data.user], 
                (error, results, fields) => {
                    if(error) {
                        callback("Error deleting diagram.");
                        console.log("Error deleting diagram: " + error);
                        return;
                    }

                    if (results.affectedRows != 1) {
                        callback("Diagram was not deleted. Make sure you are the owner.");
                        return;
                    }
                    else {
                        callback();
                        return;
                    }
                })
        })
    }

    getDiagramPermissions(sessionid, uuid, callback) {
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }

        this.getSessionNoCreate(sessionid, (error, sessiondata) => {
            if (error) {
                callback(error);
                return;
            }

            let query = "SELECT u.email, u.name, u.lastname, p.id, p.permission " + 
                        "FROM user u, user o, diagram d, diagram_permission p " + 
                        "WHERE d.uuid = ? AND p.diagram = d.id AND p.user = u.id AND d.owner = o.id AND o.email = ? AND d.mark_delete = FALSE"
            this.mysqlpool.query(query, [Buffer.from(uuid, 'hex'), sessiondata.data.user], 
                (error, results, fields) => {
                    if(error) {
                        callback("Error getting diagram permissions.");
                        console.log("Error getting diagram permissions: " + error);
                        return;
                    }

                    let callbackresult = [];
                    for(let x = 0; x < results.length; x++) {
                        callbackresult.push({
                            email: results[x].email,
                            n: results[x].name,
                            l: results[x].lastname,
                            pid: results[x].id,
                            p: results[x].permission
                        })
                    }

                    callback(null, callbackresult);
                })
        })
    }

    deleteDiagramPermission(sessionid, pid, callback) {
        if(!validator.isInt(pid)) {
            callback("Permission ID not valid");
            return;
        }

        this.getSessionNoCreate(sessionid, (error, sessiondata) => {
            if (error) {
                callback(error);
                return;
            }

            let query = "DELETE FROM diagram_permission WHERE id = ? AND diagram IN " + 
                        "(SELECT d.id FROM diagram d, user u WHERE d.owner = u.id AND u.email = ?)"

            this.mysqlpool.query(query, [ pid, sessiondata.data.user ],
                (error, results, fields) => {
                    if(error) {
                        callback("Error removing permission.");
                        console.log("Error removing permission: " + error);
                        return;
                    }

                    if(results.affectedRows != 1) {
                        callback("Permission was not removed.")
                    }
                    else {
                        callback();
                    }
                })
        })

    }

    shareDiagram(sessionid, uuid, email, permission, callback) {
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }

        if(!validator.isEmail(email)) {
            callback("Email is not valid.");
            return;
        }

        if ((permission !== "RW") && (permission !== "RO")) {
            callback("Permission not valid.")
            return;
        }

        // Get Session
        this.getSessionNoCreate(sessionid, (error, sessiondata) => {
            if (error) {
                callback(error);
                return;
            }

            // Check if user has permissions to do this action and get id of diagram
            let query = 'SELECT d.id, d.name FROM diagram d, user o  WHERE d.owner = o.id AND d.uuid = ? AND o.email = ?';
            let uuidbuffer = Buffer.from(uuid, 'hex');

            this.mysqlpool.query(query, [uuidbuffer, sessiondata.data.user], 
                (error, results, fields) => {
                    if(error) {
                        callback("Error checking diagram permissions.");
                        console.log("Error checking diagram permissions: " + error);
                        return;
                    }

                    if(results.length != 1) {
                        callback("You don't have permission to do this action.")
                        return;
                    }

                    let diagramid = results[0].id;
                    let diagram_name = results[0].name;

                    // Check if the user to be shared with has already permissions
                    let query = "SELECT p.id FROM diagram_permission p, user u WHERE p.diagram = ? AND p.user = u.id AND u.email = ?";
                    this.mysqlpool.query(query, [diagramid, email], 
                        (error, results, fields) => {
                            if(error) {
                                callback("Error checking diagram permissions (2).");
                                console.log("Error checking diagram permissions (2): " + error);
                                return;
                            }

                            if (results.length != 0) {
                                callback("Diagram already shared with this user.");
                                return;
                            }

                            // And finally, we share the diagram with the user
                            let insertquery = "INSERT INTO diagram_permission (user, diagram, permission) SELECT u.id, ?, ? FROM user u WHERE u.email = ?"
                            this.mysqlpool.query(insertquery, [diagramid, permission, email], 
                                (error, results, fields) => {
                                    if(error) {
                                        callback("Error adding permission.");
                                        console.log("Error adding permission: " + error);
                                        return;
                                    }

                                    if (results.affectedRows != 1) {
                                        // User doesn't exist in our database. We create it
                                        this.createUser({email: email, name: "NewUser", lastname: "Lastname"}, (error, activationcode) => {
                                            if (error) {
                                                callback("There was an error adding the permission");
                                                console.log("Add permission error: " + error);
                                                return
                                            }
                                            else {
                                                // Try again to add the permission
                                                this.mysqlpool.query(insertquery, [diagramid, permission, email],
                                                    (error, results, fields) => {
                                                        if(error) {
                                                            callback("Error adding permission (2).");
                                                            console.log("Error adding permission (2): " + error);
                                                            return;
                                                        }

                                                        callback(null, {activationcode: activationcode, 
                                                            req_name: sessiondata.data.name, 
                                                            req_lastname: sessiondata.data.lastname,
                                                            req_email: sessiondata.data.user,
                                                            diag_name: diagram_name
                                                        })
                                                    })
                                            }
                                        })
                                    }
                                    else {
                                        // User is on the database and permission was succesfully added
                                        callback();
                                    }
                                })
                        })

                })
        })
    }

    isUserAllowed(sessionid, uuid, callback) {
        this.getSessionNoCreate(sessionid, (error, sdata) => {
            if(error) {
                callback("Error getting session data: " + error);
                return;
            }

            let result = { sdata: sdata.data, permission: "", ddata: {name: ""}}

            let query = 'SELECT d.name, p.permission ' +
                        'FROM diagram d ' +
                            'INNER JOIN diagram_permission p ON d.id = p.diagram ' +
                            'INNER JOIN user u ON u.id = p.user ' +
                        'WHERE u.email = ? AND d.mark_delete = FALSE AND d.uuid = ?' +
                    'UNION ' +
                        'SELECT d.name, "RW" ' +
                        'FROM diagram d ' +
                            'INNER JOIN user u ON u.id = d.owner ' +
                        'WHERE u.email = ? AND d.mark_delete = FALSE AND d.uuid = ?'

            let uuidbuffer = Buffer.from(uuid, 'hex');
            this.mysqlpool.query(query, [sdata.data.user, uuidbuffer, sdata.data.user, uuidbuffer], 
                (error, results, fields) => {
                    if(error) {
                        callback("Error checking diagram permissions.");
                        console.log("Error checking diagram permissions: " + error);
                        return;
                    }

                    if(results.length != 1) {
                        callback(null, result)
                        return;
                    }

                    result.permission = results[0].permission;
                    result.ddata.name = results[0].name;

                    callback(null, result);
                });
        })
    }
}

module.exports = UserMGT
