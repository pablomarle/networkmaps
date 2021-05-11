const WebSocket = require('ws');
const ETMap = require('./etmap')
const crypto = require("crypto");

let usermgt = null;
let config = null;
let etmaps = {};
let html = null;
let sendmail = null;

function initialize(newconfig, newusermgt, newhtml, newsendmail) {
    usermgt = newusermgt;
    diagramchanels = {};
    config = newconfig;
    html = newhtml;
    sendmail = newsendmail;
}

function sendMail(to, subject, content) {
    console.log(`Sending email to queue: ${to} : ${subject}`)
    sendmail.queue_email(to, subject, content)
        .catch(err => {
            console.log(`Error sending email: ${to} : ${subject}`)
        });
}

function exportDiagram(sessionid, uuid, callback) {
    usermgt.isUserAllowed(sessionid, uuid, (error, user_result) => {
        if(error) {
            callback(error)
        }
        else {
            if(!(uuid in etmaps)) {
                ETMap.loadDiagram(null, config.diagrams.path, uuid, (err, diagram_data) => {
                    if(err)
                        callback(err);
                    else
                        callback(null, {
                            name: user_result.ddata.name,
                            diagram: diagram_data,
                        })
                });
            }
            else {
                callback(null, {
                    name: user_result.ddata.name,
                    diagram: etmaps[uuid].diagram,
                })
            }
        }
    });
}

function WS_DIAGRAM(ws, uuid, sessionid) {
    // Check if user has permission to access this diagram
    usermgt.isUserAllowed(sessionid, uuid, (error, result) => {
        if(error) {
            ws.send(JSON.stringify({m: "E", d: {error: "Either you don't have access to this diagram, or diagram does not exist.", fatal: true}}))
            ws.close();
            console.log("Error while accessing a diagram: " + error);
            return;
        }

        if(result.permission == "") {
            ws.close();
            return;
        }

        console.log(result.ddata);

        if(!(uuid in etmaps)) {
            etmaps[uuid] = new ETMap(result.ddata.name, result.ddata.type, config.diagrams.path, uuid, usermgt, config.timers.savediagram, (uuid) => {
                delete etmaps[uuid];
            })

            etmaps[uuid].initialize((err) => {
                if(err) {
                    delete etmaps[uuid];
                    ws.close();
                }
            })
        }
        
        ws.nm_data = {
            user: result.sdata.user,
            sessionid: sessionid,
            permission: result.permission,
            conn_id: crypto.randomBytes(32).toString('hex'),
        }
        etmaps[uuid].addWS(ws)
    })
}

function WS_USER_LOGIN(ws, sessionid, data) {
    usermgt.loginUser(sessionid, data.username, data.password, (error, result) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "L",
                d: { error: error}
            }))
            console.log(error);
        }
        else {
            ws.send(JSON.stringify({
                m: "L",
                d: {result: result}
            }))
        }
    })
}

function WS_USER_LOGOUT(ws, sessionid, data) {
    usermgt.logoutUser(sessionid, (error) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "O",
                d: { error: error}
            }))
        }
        else {
            ws.send(JSON.stringify({
                m: "O",
                d: {}
            }))         
        }
    })
}

function WS_USER_CHANGEPASSWORD(ws, sessionid, data) {
    usermgt.changePassword(data.e, data.o, data.n, (error) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "X",
                d: { error: error}
            }))
        }
        else {
            sendMail(data.e, "NetworkMaps account has been changed.", 
                                `Hello.\n\nYour password has been changed.\n\n`);

            ws.send(JSON.stringify({
                m: "X",
                d: {}
            })) 
        }       
    })
}

function WS_USER_CHANGEDATA(ws, sessionid, data) {
    usermgt.changeUserData(sessionid, data.n, data.l, (error) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "D",
                d: { error: error}
            }))
        }
        else {
            ws.send(JSON.stringify({
                m: "D",
                d: {n: data.n, l: data.l}
            })) 
        }       

    })
}

function WS_USER_RESETPASSWORD(ws, sessionid, data) {
    usermgt.requestResetPassword(data.email, (error, validation_code) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "R", 
                d: { error: error}
            }))
        }
        else {
            sendMail(data.email, "NetworkMaps account password reset requested.", 
                "Hello.\n\nWe have received a request for your account password to be reset.\n\nPlease, follow this link for your account to be changed:\n" +
                html.get_http_proto() + config.server.hostname + ":" + config.server.port + "/passwordreset/" + validation_code + "?" + data.email + 
                "\n\nThis link will be valid for the next 24 hours.\n\nThanks.");
            
            ws.send(JSON.stringify({
                m: "R", 
                d: {}
            }));
        }
    });
}

function WS_USER_CREATEUSER(ws, sessionid, data) {
    usermgt.createUser({email: data.email, name: data.name, lastname: data.lastname}, (error, activationcode) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "C", 
                d: { error: error}
            }))
        }
        else {
            sendMail(data.email, "NetworkMaps account confirmation needed.", 
                "Welcome to NetworkMaps.\n\n We need you to confirm your account. To do this, please follow this link:\n\n" + html.get_http_proto() + config.server.hostname + ":" +
                    config.server.port + "/validate/" + activationcode + "?" + data.email + "\n\nThis will be valid for the next 24 hours.\n\nThanks.")

            ws.send(JSON.stringify({
                m: "C", 
                d: {}
            }))
        }
    })
}

function WS_DIAGRAM_CREATE(ws, sessionid, data) {
    usermgt.createDiagram(sessionid, data.n, data.t, (error, uuid) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "DN", 
                d: { error: error}
            }))         
        }
        else {
            ws.send(JSON.stringify({
                m: "DN", 
                d: {uuid: uuid}
            }))         
        }
    })
}

function WS_DIAGRAM_IMPORT(ws, sessionid, data) {
    usermgt.createDiagram(sessionid, data.n, data.d.type, (error, uuid) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "DI", 
                d: { error: error}
            }))
        }
        else {
            ETMap.saveDiagram(config.diagrams.path, uuid, data.d, (error) => {
                if(error) {
                    ws.send(JSON.stringify({
                        m: "DI", 
                        d: { error: error, uuid: uuid}
                    }))
                    return;
                }
                ws.send(JSON.stringify({
                    m: "DI",
                    d: {uuid: uuid}
                }))
            });
        }
    })
}

function WS_DIAGRAM_LIST(ws, sessionid, data) {
    usermgt.getListDiagrams(sessionid, (error, listdiagrams) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "DL", 
                d: { error: error}
            }))         
        }
        else {
            ws.send(JSON.stringify({
                m: "DL", 
                d: {dl:listdiagrams},
            }))         
        }

    })
}

function WS_DIAGRAM_DELETE(ws, sessionid, data) {
    usermgt.deleteDiagram(sessionid, data.uuid, (error) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "DD", 
                d: { error: error}
            }))         
        }
        else {
            ws.send(JSON.stringify({
                m: "DD", 
                d: {},
            }))         
        }       
    })
}

function WS_DIAGRAM_RENAME(ws, sessionid, data) {
    usermgt.renameDiagram(sessionid, data.uuid, data.n, (error) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "DR", 
                d: { error: error}
            }))         
        }
        else {
            ws.send(JSON.stringify({
                m: "DR", 
                d: {},
            }))         
        }       
    })
}

function WS_DIAGRAM_GETPERMISSIONS(ws, sessionid, data) {
    usermgt.getDiagramPermissions(sessionid, data.uuid, (error, plist) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "DP", 
                d: { error: error}
            }))
        }
        else {
            ws.send(JSON.stringify({
                m: "DP",
                d: { p: plist, uuid: data.uuid },
            }))         
        }       
    })
}

function WS_DIAGRAM_DELETEPERMISSION(ws, sessionid, data) {
    usermgt.deleteDiagramPermission(sessionid, data.uuid, data.id, (error) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "PD", 
                d: { error: error}
            }))
        }
        else {
            ws.send(JSON.stringify({
                m: "PD",
                d: {},
            }))         
        }       
    })
}

function WS_DIAGRAM_SHARE(ws, sessionid, data) {
    usermgt.shareDiagram(sessionid, data.uuid, data.e, data.p, (error, newuser, user) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "DS", 
                d: { error: error}
            }))
        }
        else {
            ws.send(JSON.stringify({
                m: "DS",
                d: {}
            }))

            if (newuser) {
                sendMail(data.e, newuser.req_name + " " + newuser.req_lastname + " has shared a Network Diagram with you.",
                    "Hello.\n\n" + newuser.req_name + " " + newuser.req_lastname + " has shared a Network Diagram with you: '" + newuser.diag_name + "'.\n\n" +
                    "We have created a temporary account for you. We need you to confirm this account. To do this, please follow this link:\n\n" + html.get_http_proto() + config.server.hostname + ":" +
                    config.server.port + "/validate/" + newuser.activationcode + "?" + data.e + "\n\n" + 
                    "This will be valid for the next 24 hours. After that, this account will be removed from our system.\n\nRegards.");
            }
            else {
                sendMail(data.e, user.req_name + " " + user.req_lastname + " has shared a Network Diagram with you.",
                    "Hello.\n\n" + user.req_name + " " + user.req_lastname + " has shared a Network Diagram with you: '" + user.diag_name + "'.\n\n" +
                    "You can access it on:\n\n" + html.get_http_proto() + config.server.hostname + ":" + config.server.port + "\n\n" + 
                    "Regards.");
            }
        }       
    })
}

function WS_DIAGRAM_LINKSHARING(ws, sessionid, data) {
    usermgt.link_sharing(sessionid, data.uuid, data.ls, (error, link_sharing) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "DW", 
                d: { error: error}
            }))
        }
        else {
            ws.send(JSON.stringify({
                m: "DW",
                d: { ls: link_sharing}
            }))
        }
    });
}

function WS_USER(ws, sessionid) {
    ws.on("message", (message) => {
        let json;
        try {
            json = JSON.parse(message);
        } catch (e) {
            ws.close();
            console.log("WS ERROR parsing message '" + message + "'");
            return; 
        }
        if (!json.m || !json.d) {
            ws.close();
            console.log("WS ERROR parsing message (no m or d)'" + message + "'");
            return;             
        }

        if(json.m === "L")
            WS_USER_LOGIN(ws, sessionid, json.d);
        else if (json.m === "O")
            WS_USER_LOGOUT(ws, sessionid, json.d);
        else if (json.m === "D") 
            WS_USER_CHANGEDATA(ws, sessionid, json.d);
        else if (json.m === "X") 
            WS_USER_CHANGEPASSWORD(ws, sessionid, json.d);
        else if (json.m === "R") 
            WS_USER_RESETPASSWORD(ws, sessionid, json.d);
        else if (json.m === "C") 
            WS_USER_CREATEUSER(ws, sessionid, json.d);
        else if (json.m === "DN")
            WS_DIAGRAM_CREATE(ws, sessionid, json.d);
        else if (json.m === "DI")
            WS_DIAGRAM_IMPORT(ws, sessionid, json.d);
        else if (json.m === "DL")
            WS_DIAGRAM_LIST(ws, sessionid, json.d);
        else if (json.m === "DD")
            WS_DIAGRAM_DELETE(ws, sessionid, json.d);
        else if (json.m === "DR")
            WS_DIAGRAM_RENAME(ws, sessionid, json.d);
        else if (json.m === "DP")
            WS_DIAGRAM_GETPERMISSIONS(ws, sessionid, json.d);
        else if (json.m === "PD")
            WS_DIAGRAM_DELETEPERMISSION(ws, sessionid, json.d);
        else if (json.m === "DS")
            WS_DIAGRAM_SHARE(ws, sessionid, json.d);
        else if (json.m === "DW")
            WS_DIAGRAM_LINKSHARING(ws, sessionid, json.d);
        else {
            clearInterval(ws.interval);
            ws.close();
        }
    })

    ws.on("close", () => {
        clearInterval(ws.interval);
    })

    ws.on("error", (error) => {
        console.log("ERROR");
        console.log(error);
        clearInterval(ws.interval);
        ws.close();
    })

    // Send initial info about the session to client
    // usermgt.getSessionNoCreate(sessionid, (error, sessiondata) => {
    usermgt.getSession(sessionid, (error, sessiondata) => {
        if(error) {
            clearInterval(ws.interval);
            ws.close();
            console.log(error);
            return;
        }

        let message = {
            m: "I",
            d: sessiondata.data,
            session_id: sessiondata.sessionid,
            register_self: usermgt.register_self,
        };
        sessionid = sessiondata.sessionid;
        ws.send(JSON.stringify(message));
    })

    // PING PONG to detect broken connections
    ws.isAlive = true;
    ws.interval = setInterval(() => {
        if (ws.isAlive === false) {
            clearInterval(ws.interval);
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping('');
    }, 30000);

    ws.on("pong", () => {
        ws.isAlive = true;
    })
}

function WS_ADMIN_LOGIN(ws, sessionid, data) {
    usermgt.loginAdmin(sessionid, data.username, data.password, (error, result) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "L",
                d: { error: error}
            }))
            console.log(error);
        }
        else {
            ws.send(JSON.stringify({
                m: "L",
                d: {result: result}
            }))
        }
    })
}

function WS_ADMIN_LOGOUT(ws, sessionid, data) {
    usermgt.logoutAdmin(sessionid, (error) => {
        if(error) {
            ws.send(JSON.stringify({
                m: "O",
                d: { error: error}
            }))
        }
        else {
            ws.send(JSON.stringify({
                m: "O",
                d: {}
            }))         
        }
    })
}

function WS_ADMIN_CREATEUSER(ws, sessionid, data) {
    usermgt.adminCreateUser(sessionid, {email: data.e, name: data.n, lastname: data.l, password: data.p}, (error) => {
        if(error) ws.send(JSON.stringify({m: "C", d: { error: error} }));
        else ws.send(JSON.stringify({m: "C", d: {} }));
    });
}

function WS_ADMIN_CHANGEDATA(ws, sessionid, data) {
    usermgt.adminChangeUserData(sessionid, data.e, data.n, data.l, (error) => {
        if(error) ws.send(JSON.stringify({m: "D", d: { error: error} }));
        else ws.send(JSON.stringify({m: "D", d: {} }));
    });
}

function WS_ADMIN_CHANGEPASSWORD(ws, sessionid, data) {
    usermgt.adminChangeUserPassword(sessionid, data.e, data.p, (error) => {
        if(error) ws.send(JSON.stringify({m: "X", d: { error: error} }));
        else ws.send(JSON.stringify({m: "X", d: {} }));
    });
}

function WS_ADMIN_DELETEUSER(ws, sessionid, data) {
    usermgt.adminDeleteUser(sessionid, data.e, (error) => {
        if(error) ws.send(JSON.stringify({m: "DU", d: { error: error} }));
        else ws.send(JSON.stringify({m: "DU", d: {} }));
    });
}

function WS_ADMIN_GETUSERS(ws, sessionid, data) {
    usermgt.adminGetUsers(sessionid, (error, data) => {
        if(error) ws.send(JSON.stringify({m: "GU", d: { error: error} }));
        else ws.send(JSON.stringify({m: "GU", d: {ul: data} }));
    });
}

function WS_ADMIN_GETSESSIONS(ws, sessionid, data) {
    usermgt.adminGetSessions(sessionid, (error, data) => {
        if(error) ws.send(JSON.stringify({m: "GS", d: { error: error} }));
        else ws.send(JSON.stringify({m: "GS", d: {sl: data} }));
    });
}

function WS_ADMIN_GETDIAGRAMS(ws, sessionid, data) {
    usermgt.adminGetDiagrams(sessionid, (error, data) => {
        if(error) ws.send(JSON.stringify({m: "GD", d: { error: error} }));
        else ws.send(JSON.stringify({m: "GD", d: {dl: data} }));
    });
}

function WS_ADMIN_CHANGEDIAGRAMOWNERSHIP(ws, sessionid, data) {
    usermgt.adminChangeDiagramOwnership(sessionid, data.uuid, data.e, (error) => {
        if(error) ws.send(JSON.stringify({m: "DO", d: { error: error} }));
        else ws.send(JSON.stringify({m: "DO", d: {} }));
    });
}

function WS_ADMIN_DELETEDIAGRAM(ws, sessionid, data) {
    usermgt.adminDeleteDiagram(sessionid, data.uuid, (error) => {
        if(error) ws.send(JSON.stringify({m: "DD", d: { error: error} }));
        else ws.send(JSON.stringify({m: "DD", d: {} }));
    });
}

function WS_ADMIN(ws, sessionid) {
    ws.on("message", (message) => {
        let json;
        try {
            json = JSON.parse(message);
        } catch (e) {
            ws.close();
            console.log("WS ERROR parsing message '" + message + "'");
            return; 
        }
        if (!json.m || !json.d) {
            ws.close();
            console.log("WS ERROR parsing message (no m or d)'" + message + "'");
            return;             
        }

        if(json.m === "L")
            WS_ADMIN_LOGIN(ws, sessionid, json.d);
        else if (json.m === "O")
            WS_ADMIN_LOGOUT(ws, sessionid, json.d);
        else if (json.m === "C")
            WS_ADMIN_CREATEUSER(ws, sessionid, json.d);
        else if (json.m === "D") 
            WS_ADMIN_CHANGEDATA(ws, sessionid, json.d);
        else if (json.m === "X") 
            WS_ADMIN_CHANGEPASSWORD(ws, sessionid, json.d);
        else if (json.m === "DU")
            WS_ADMIN_DELETEUSER(ws, sessionid, json.d);
        else if (json.m === "GU")
            WS_ADMIN_GETUSERS(ws, sessionid, json.d);
        else if (json.m === "GS")
            WS_ADMIN_GETSESSIONS(ws, sessionid, json.d);
        else if (json.m === "GD")
            WS_ADMIN_GETDIAGRAMS(ws, sessionid, json.d);
        else if (json.m === "DO")
            WS_ADMIN_CHANGEDIAGRAMOWNERSHIP(ws, sessionid, json.d);
        else if (json.m === "DD")
            WS_ADMIN_DELETEDIAGRAM(ws, sessionid, json.d);
        else {
            clearInterval(ws.interval);
            ws.close();
        }
    })

    ws.on("close", () => {
        clearInterval(ws.interval);
    })

    ws.on("error", (error) => {
        console.log("ERROR");
        console.log(error);
        clearInterval(ws.interval);
        ws.close();
    })

    // Send initial info about the session to client
    // usermgt.getSessionNoCreate(sessionid, (error, sessiondata) => {
    usermgt.getSession(sessionid, (error, sessiondata) => {
        if(error) {
            clearInterval(ws.interval);
            ws.close();
            console.log(error);
            return;
        }

        let message = {
            m: "I",
            d: sessiondata,
            session_id: sessiondata.sessionid,
        };
        sessionid = sessiondata.sessionid;
        ws.send(JSON.stringify(message));
    })

    // PING PONG to detect broken connections
    ws.isAlive = true;
    ws.interval = setInterval(() => {
        if (ws.isAlive === false) {
            clearInterval(ws.interval);
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping('');
    }, 30000);

    ws.on("pong", () => {
        ws.isAlive = true;
    })
}

function WS_callback(ws, url, sessionid) {
    let urlbroken = url.split("/");

    if (urlbroken.length == 2) {
        if (urlbroken[1] == "user") {
            WS_USER(ws, sessionid);
            return;
        }
        else if (urlbroken[1] == "admin") {
            WS_ADMIN(ws, sessionid);
            return;
        }
    }
    else if (urlbroken.length == 3) {
        if (urlbroken[1] == "diagram") {
            WS_DIAGRAM(ws, urlbroken[2], sessionid);
            return;
        }
    }

    // If we get here, the websocket is invalid
    ws.close();
}

module.exports = {
    initialize: initialize,
    WS_callback: WS_callback,
    exportDiagram: exportDiagram,
}
