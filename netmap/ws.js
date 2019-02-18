const WebSocket = require('ws');
const ETMap = require('./etmap')

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

function WS_DIAGRAM(ws, uuid, sessionid) {
	// Check if user has permission to access this diagram
	usermgt.isUserAllowed(sessionid, uuid, (error, result) => {
		if(error) {
			ws.send(JSON.stringify({m: "E", d: {error: "Unexpected error while accessing the diagram."}}))
			ws.close();
			console.log("Error while accessing a diagram: " + error);
			return;
		}

		if(result.permission == "") {
			ws.close();
			return;
		}

		if(!(uuid in etmaps)) {
			etmaps[uuid] = new ETMap(result.ddata.name, config.diagrams.path, uuid, (uuid) => {
				delete etmaps[uuid];
			})

			etmaps[uuid].initialize((err) => {
				if(err) {
					delete etmaps[uuid];
					ws.close();
				}
			})
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
			sendMail(data.e, "MaSSHandra account has been changed.", 
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
		    sendMail(data.email, "MaSSHandra account password reset requested.", 
		        "Hello.\n\nWe have received a request for your account password to be reset.\n\nPlease, follow this link for your account to be changed:\n" +
		        html.get_http_proto() + config.server.hostname + ":" + config.server.port + "/passwordreset/" + validation_code + "?" + data.email + 
		        "\n\nThis link will be valid for the next 24 hours.\n\nThanks,\nPablo.");
			
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
            sendMail(data.email, "MaSSHandra account confirmation needed.", 
                "Welcome to MaSSHandra.\n\n We need you to confirm your account. To do this, please follow this link:\n\n" + html.get_http_proto() + config.server.hostname + ":" +
                    config.server.port + "/validate/" + activationcode + "?" + data.email + "\n\nThis will be valid for the next 24 hours.\n\nThanks,\nPablo.")

			ws.send(JSON.stringify({
				m: "C", 
				d: {}
			}))
		}
	})
}

function WS_DIAGRAM_CREATE(ws, sessionid, data) {
	usermgt.createDiagram(sessionid, data.n, (error) => {
		if(error) {
			ws.send(JSON.stringify({
				m: "DN", 
				d: { error: error}
			}))			
		}
		else {
			ws.send(JSON.stringify({
				m: "DN", 
				d: {}
			}))			
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
				d: { p: plist },
			}))			
		}		
	})
}

function WS_DIAGRAM_DELETEPERMISSION(ws, sessionid, data) {
	usermgt.deleteDiagramPermission(sessionid, data.id, (error) => {
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
	usermgt.shareDiagram(sessionid, data.uuid, data.e, data.p, (error, newuser) => {
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
				sendMail(data.e, newuser.req_name + " " + newuser.req_lastname + " has shared a Diagram with you on MaSSHandra.",
					"Hello.\n\n" + newuser.req_name + " " + newuser.req_lastname + " has shared a Network Diagram with you on MaSSHandra: '" + newuser.diag_name + "'.\n\n" +
					"We have created a temporary account for you. We need you to confirm this account. To do this, please follow this link:\n\n" + html.get_http_proto() + config.server.hostname + ":" +
                    config.server.port + "/validate/" + newuser.activationcode + "?" + data.e + "\n\n" + 
                    "This will be valid for the next 24 hours. After that, this account will be removed from our system.\n\nThanks,\nPablo.")
			}
		}		
	})
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
		else {
			clearInterval(ws.interval);
			ws.close();
		}
	})

	ws.on("close", () => {
		clearInterval(ws.interval);
	})

	// Send initial info about the session to client
	usermgt.getSessionNoCreate(sessionid, (error, sessiondata) => {
		if(error) {
			clearInterval(ws.interval);
			ws.close();
			console.log(error);
			return;
		}

		let message = {
			m: "I",
			d: sessiondata.data
		};
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
		ws.ping('', false, true);
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
	WS_callback: WS_callback
}
