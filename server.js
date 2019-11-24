#!/usr/bin/node

const config = require('./lib/config');
const httpServer = require('./lib/httpserver');
const html = require('./lib/html');
const UserMGT = require('./lib/usermgt');
const ws = require('./lib/ws');
const sendmail = require("./lib/sendmail");
const staticcontent = require("./lib/staticcontent");
const usermgt = new UserMGT(
	config.users.path,
	config.timers.usertimeout,
	config.timers.usersavetimeout,
	config.users.register_self,
	config.users.admin_username,
	config.users.admin_password,
	config.users.allowed_domains);
const fs = require('fs');

function sendMail(to, subject, content) {
    console.log(`Sending email to queue: ${to} : ${subject}`)
    sendmail.queue_email(to, subject, content)
        .catch(err => {
            console.log(`Error sending email: ${to} : ${subject}`)
        });
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
                    sendMail(email, "MaSSHandra account has been confirmed.", 
                                `Welcome to MaSSHandra.\n\nYour account has been activated.\n\n
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
                    sendMail(email, "MaSSHandra password has been reset.", 
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
		else if((url == "/favicon.ico") && (method == "GET")) {
			staticcontent.get("/static/img/favicon.ico", sendresponse, session.sessionid);
		}
		// Serving static content
		else if ((config.serve_static_locally) && url.startsWith("/static/") && (method == "GET"))  {
			staticcontent.get(url, sendresponse, session.sessionid);
		}

		else {
			sendresponse(404, "text/html", html.not_found(config), session.sessionid);
			return;
		}
	});
}

function test_directories() {
	// Function to check if the directories on the configuration files exist and if we have RW access to them
	try {
		fs.accessSync(config.diagrams.path, fs.constants.R_OK | fs.constants.W_OK);
	} catch(e) {
		throw("I don't have RW access to diagrams directory " + config.diagrams.path);
	}

	try {
		fs.accessSync(config.users.path, fs.constants.R_OK | fs.constants.W_OK);
	} catch(e) {
		throw("I don't have RW access to users directory " + config.users.path);
	}

	try {
		fs.accessSync(config.users.path, fs.constants.R_OK | fs.constants.W_OK);
	} catch(e) {
		throw("I don't have RW access to users directory " + config.users.path);
	}

	try {
		fs.accessSync(config.sendmail.queue, fs.constants.R_OK | fs.constants.W_OK);
	} catch(e) {
		throw("I don't have RW access to sendmail queue directory " + config.sendmail.queue);
	}
}

function main() {
	test_directories();

	usermgt.initialize();
    sendmail.initialize(config.sendmail);
    html.initialize(config);
	ws.initialize(config, usermgt, html, sendmail);

	const server = new httpServer(config.use_ssl_socket, config.socket.address, config.socket.port, config.socket.cert, config.socket.key, HTTP_callback, ws.WS_callback);
}

main()
