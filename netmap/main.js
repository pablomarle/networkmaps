const config = require('./config');
const httpServer = require('./httpserver')
const html = require('./html')
const UserMGT = require('./usermgt')
const ws = require('./ws')

const usermgt = new UserMGT(config.db.users);

function sendMail(email, subject, content, callback) {
    console.log("Email sending to " + email + ":")
    console.log("   "+subject)
    console.log("   "+content)
    if(callback) {
        callback(null);
    }
}

function HTTP_callback(method, url, sessionid, sendresponse) {
	usermgt.getSession(sessionid, (error, session) => {
		if(error) {
			sendresponse(500, "text/html", html.not_found(config), "");
			console.log("Error on main: " + error)
			return;
		}

		// This is the index. The main page where users register, access their account and manage their diagrams
		if ((url == "/") && (method == "GET"))  {
			sendresponse(200, "text/html", html.index(config), session.sessionid);
			return;
		}

		// Validate the creation of user accounts
		else if (url.startsWith("/validate/") && (method == "GET"))  {
			let ac_email = url.split("/")[2].split("?");
			if(ac_email.length != 2) {
				sendresponse(404, "text/html", html.not_found(config), session.sessionid);
				return;
			}
			
			usermgt.validateUser(ac_email[1], ac_email[0], (error, email, newpassword) => {
				if(error) {
					sendresponse(404, "text/html", html.not_found(config), "");
					console.log("Error on user activation: " + error)
					return;
				}
				else {
                    sendMail(email, "NetMap account has been confirmed.", 
                                `Welcome to NetMap.\n\nYour account has been activated.\n\n
                                A temporary password has been assigned to you:\n
                                Username: ` + email + `\n
                                Password: ` + newpassword + `\n\nRegards,\nPablo.`)
					sendresponse(200, "text/html", html.user_validated(config), session.sessionid);
					return;
				}
			});

		}

		// Confirm a password reset request
		else if (url.startsWith("/passwordreset/") && (method == "GET"))  {
			let ac_email = url.split("/")[2].split("?");
			if(ac_email.length != 2) {
				sendresponse(404, "text/html", html.not_found(config), session.sessionid);
				return;
			}

			usermgt.resetPassword(ac_email[1], ac_email[0], (error, email, password) => {
				if(error) {
					sendresponse(404, "text/html", html.not_found(config), "");
					console.log("Error on user activation: " + error)
					return;
				}

				else {
                    sendMail(email, "NetMap password has been reset.", 
                        `Your password has been reset.\n\n
                        Username: ` + email + `\n
                        Password: ` + password + `\n`);


					sendresponse(200, "text/html", html.password_reset(config), session.sessionid);
					return;
				}				
			});			
		}

		// Access a diagram. Gets the client that will be used to edit a diagram
		else if (url.startsWith("/diagram/") && (method == "GET"))  {
			// If the user is not logged in, redirect him to /
			if(!session.data.user) {
				sendresponse(302, "text/html", "", session.sessionid, "/");
				return;
			}
			let surl = url.split("/");
			if(surl.length != 3) {
				sendresponse(404, "text/html", html.not_found(config), session.sessionid);
				return;
			}
			sendresponse(200, "text/html", html.diagram(config, surl[2]), session.sessionid);
			return;
		}

		else {
			sendresponse(404, "text/html", html.not_found(config), session.sessionid);
			return;
		}
	});
}


function main() {
	ws.initialize(config, usermgt);

	const server = new httpServer(config.server.hostname, config.server.port, config.server.cert, config.server.key, HTTP_callback, ws.WS_callback);
}

main()