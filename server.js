#!/usr/bin/node

const config = require('./lib/config');
const httpServer = require('./lib/httpserver');
const html = require('./lib/html');
const UserMGT = require('./lib/usermgt');
const ws = require('./lib/ws');
const sendmail = require("./lib/sendmail");
const staticcontent = require("./lib/staticcontent");
const usermgt = new UserMGT(
	config.timers.usertimeout,
	config.timers.usersavetimeout,
	config.timers.ldap_grouprefresh,
	config.users,
	config.diagrams.shapes,
);
const fs = require('fs');

function sendMail(to, subject, content) {
    console.log(`Sending email to queue: ${to} : ${subject}`)
    sendmail.queue_email(to, subject, content)
        .catch(err => {
            console.log(`Error sending email: ${to} : ${subject}`)
        });
}

function multiIndexOf(s, m) {
	let result = [];

	let i = s.indexOf(m);
	while(i !== -1) {
		result.push(i);
		i = s.indexOf(m, i+1);
	}
	return result;
}

function findLineWith(s, m, i_start, i_end) {
	let lindex = s.indexOf(m, i_start);
	if((lindex === -1) || (lindex >= i_end))
		return null;
	lindex_end = s.indexOf("\r\n", lindex);
	if(lindex_end === -1)
		lindex_end = i_end;

	return s.substring(lindex, lindex_end);
}

function findContent(s, i_start, i_end) {
	let lindex = s.indexOf("\r\n\r\n");
	if((lindex === -1) || (lindex >= i_end))
		return null;
	return lindex + 4;
}

function removeDoubleQuote(s) {
	if(s.length === 0)
		return s;
	if(s[0] === "\"") {
		if((s.length > 2) && (s[s.length-1] === "\""))
			return s.substr(1, s.length-2);
		else
			return null;
	}

	return s;
}

function process_multipart_formdata(content_type, body) {
	let result = {};

	let sct = content_type.split(";");
	if((sct.length < 2) || (sct[0] !== "multipart/form-data"))
		return null;

	let boundary = null;
	for(let x = 0; x < sct.length; x++) {
		let sct_2 = sct[x].trim().split("=");
		if((sct_2.length === 2) && (sct_2[0] === "boundary"))
			boundary = sct_2[1];
	}
	if(boundary === null) return null;

	let boundary_index = multiIndexOf(body, "--" + boundary);
	for(let x = 0; x < boundary_index.length-1; x++) {
		// Find file name and parameter name in content-disposition
		let filename = null, name = null;
		let cd = findLineWith(body, "Content-Disposition: form-data", boundary_index[x], boundary_index[x+1]);
		let scd = cd.split(";");
		for(let y = 1; y < scd.length; y++) {
			let scd_2 = scd[y].trim().split("=");
			if((scd_2.length === 2) && (scd_2[0] === "filename"))
				filename = removeDoubleQuote(scd_2[1]);
			if((scd_2.length === 2) && (scd_2[0] === "name"))
				name = removeDoubleQuote(scd_2[1]);
		}
		if(name === null)
			return null;

		// Find the start and end index of the file contents
		let cindex = findContent(body, boundary_index[x], boundary_index[x+1])

		result[name] = {
			filename: filename,
			content_index_start: cindex,
			content_index_end: boundary_index[x+1] - 2,
		}
	}

	return result;
}

function HTTP_callback(method, url, sessionid, content_type, body, sendresponse) {
	usermgt.getSession(sessionid, (error, session) => {
		if(error) {
			sendresponse(500, "text/html", html.not_found(config), "");
			console.log("Error on main: " + error)
			return;
		}

		// This is the index. The main page where users register, access their account and manage their diagrams
		if ((url == "/") && (method === "GET"))  {
			sendresponse(200, "text/html", html.index(config), session.sessionid);
			return;
		}

		// Validate the creation of user accounts
		else if (url.startsWith("/validate/") && (method === "GET"))  {
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
                    sendMail(email, "NetworkMaps account has been confirmed.", 
                                `Welcome to NetworkMaps.\n\nYour account has been activated.\n\n
                                A temporary password has been assigned to you:\n
                                Username: ` + email + `\n
                                Password: ` + newpassword + `\n\nRegards,\n`)
					sendresponse(200, "text/html", html.user_validated(config), session.sessionid);
					return;
				}
			});

		}

		// Confirm a password reset request
		else if (url.startsWith("/passwordreset/") && (method === "GET"))  {
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
                    sendMail(email, "NetworkMaps password has been reset.", 
                        `Your password has been reset.\n\n
                        Username: ` + email + `\n
                        Password: ` + password + `\n`);


					sendresponse(200, "text/html", html.password_reset(config), session.sessionid);
					return;
				}				
			});			
		}

		// Access a diagram. Gets the client that will be used to edit a diagram
		else if (url.startsWith("/diagram/") && (method === "GET"))  {
			// If the user is not logged in, redirect him to /
			//if(!session.data.user) {
			//	sendresponse(302, "text/html", "", session.sessionid, "/");
			//	return;
			//}
			let surl = url.split("/");
			if(surl.length != 3) {
				sendresponse(404, "text/html", html.not_found(config), session.sessionid);
				return;
			}
			sendresponse(200, "text/html", html.diagram(config, surl[2]), session.sessionid);
			return;
		}
		else if((url === "/favicon.ico") && (method === "GET")) {
			staticcontent.get("/static/img/favicon.ico", sendresponse, session.sessionid);
		}
		// Serving static content
		else if ((config.serve_static_locally) && url.startsWith("/static/") && (method === "GET"))  {
			staticcontent.get(url, sendresponse, session.sessionid);
		}
		// Serving the screen to manage shapegroups
		else if((url === "/shapegroups") && (method === "GET")) {
			sendresponse(200, "text/html", html.shapegroups(config, usermgt.data.shape_group_data.categories), session.sessionid);
			return;
		}
		// Get list of shapes available for this user
		else if((url === "/shapegroups/list") && (method === "GET")) {
			usermgt.listShapes(session.sessionid, (error, result) => {
				if(error)
					sendresponse(401, "application/json", JSON.stringify({error: error}), session.sessionid);
				else
					sendresponse(200, "application/json", JSON.stringify(result), session.sessionid);
			})
		}
		// Create a group of 3d shapes
		else if((url === "/shapegroups/new") && (method === "POST")) {
			let new_data;
			try {
				new_data = JSON.parse(body);
			} catch {
				sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
				return;
			}
			usermgt.newShape(session.sessionid, new_data.name, new_data.description, new_data.category, (err, result) => {
				if(err) {
					sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
					return;
				}
				sendresponse(200, "application/json", JSON.stringify(result));
			})
		}
		// Delete a shapegroup
		else if((url === "/shapegroups/delete") && (method === "POST")) {
			let new_data;
			try {
				new_data = JSON.parse(body);
			} catch {
				sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
				return;
			}
			usermgt.deleteShape(session.sessionid, new_data.id, (err, result) => {
				if(err) {
					sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
					return;
				}
				sendresponse(200, "application/json", "{}");
			})
		}
		// Update properties of a shapegroup (name, description, category)
		else if((url === "/shapegroups/update") && (method === "POST")) {
			let new_data;
			try {
				new_data = JSON.parse(body);
			} catch {
				sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
				return;
			}
			usermgt.updateShape(session.sessionid, new_data.id, new_data.name, new_data.description, new_data.category, (err, result) => {
				if(err) {
					sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
					return;
				}
				sendresponse(200, "application/json", "{}");
			})
		}
		// Update shapegroup shapes.
		else if((url === "/shapegroups/update_shapes") && (method === "POST")) {
			let new_data;
			try {
				new_data = JSON.parse(body);
			} catch {
				sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
				return;
			}
			usermgt.updateShapeShapes(session.sessionid, new_data.key, new_data.shapes, (err, result) => {
				if(err) {
					sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
					return;
				}
				sendresponse(200, "application/json", "{}");
			})
		}
		// Shapegroup editor
		else if (url.startsWith("/shapegroups/edit/") && (method === "GET")) {
			let surl = url.split("/");
			if(surl.length === 4) {
				let key = surl[3];
				if(key in usermgt.data.shape_group_data.shape_group) {
					sendresponse(200, "text/html", html.shapegroup_editor(config, key), session.sessionid);
				}
				else {
					sendresponse(404, "text/html", html.shapegroup_editor(config, key), session.sessionid);
				}
			}
			else {
				sendresponse(404, "text/html", html.not_found(config), session.sessionid);
			}
		}
		// Remove texture from shapegroup
		else if((url === "/shapegroups/removetexture") && (method === "POST")) {
			let new_data;
			try {
				new_data = JSON.parse(body);
			} catch {
				sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
				return;
			}
			usermgt.removeShapeTexture(session.sessionid, new_data.key, new_data.filename, (err) => {
				if(err) {
					sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
					return;
				}
				sendresponse(200, "application/json", "{}");
			})
		}
		// Upload texture to shapegroup
		else if (url.startsWith("/shapegroups/uploadtexture/") && (method === "POST")) {
			let surl = url.split("/");
			if(surl.length === 4) {
				let key = surl[3];
				if(key in usermgt.data.shape_group_data.shape_group) {
					let result = process_multipart_formdata(content_type, body);
					if(result === null) {
						sendresponse(400, "text/plain", "Invalid request", session.sessionid);
						return;
					}
					else {
						if("img" in result) {
							usermgt.uploadShapeTexture(
								session.sessionid,
								key,
								result["img"].filename,
								body.substring(result["img"].content_index_start, result["img"].content_index_end),
								(err, filename) => {
									if(err) {
										console.log("Error uploading texture to shapegroup: " + err);
										sendresponse(400, "text/plain", "Upload error: " + err, session.sessionid);
										return;
									}
									else {
										console.log("Uploaded texture file to shapegroup " + key);
										console.log("File name: " + result["img"].filename);
										console.log("File size: " + (result["img"].content_index_end - result["img"].content_index_start));	
										sendresponse(200, "text/plain", filename, session.sessionid);
										return;
									}
								}
							);
						}
						else {
							sendresponse(400, "text/plain", "Invalid Format", session.sessionid);
						}
					}
				}
				else {
					sendresponse(404, "text/html", html.shapegroup_editor(config, key), session.sessionid);
				}
			}
			else {
				sendresponse(404, "text/html", html.not_found(config), session.sessionid);
			}
		}
		// Upload shape icon to shapegroup
		else if (url.startsWith("/shapegroups/uploadicon/") && (method === "POST")) {
			let surl = url.split("/");
			if(surl.length === 5) {
				let shapegroup_key = surl[3];
				let shape_key = surl[4];

				let result = process_multipart_formdata(content_type, body);
				if((result === null) || (!result.img)) {
					sendresponse(400, "text/plain", "Invalid request", session.sessionid);
					console.log(result);
					return;
				}
				usermgt.uploadShapeIcon(session.sessionid, shapegroup_key, shape_key,
					body.substring(result["img"].content_index_start, result["img"].content_index_end),
					(err, filename) => {
						if(err) {
							console.log("Error uploading icon to shapegroup: " + err);
							sendresponse(400, "text/plain", "Upload error: " + err, session.sessionid);
							return;
						}
						else {
							console.log("Uploaded icon file to shapegroup " + shapegroup_key);
							console.log("File name: " + filename);
							console.log("File size: " + (result["img"].content_index_end - result["img"].content_index_start));	
							sendresponse(200, "text/plain", filename, session.sessionid);
							return;
						}
					}
				);
			}
			else {
				sendresponse(404, "text/html", html.not_found(config), session.sessionid);
			}
		}

		// Get a group of 3d shapes
		else if (url.startsWith("/3dshapes/") && (method === "GET")) {
			let surl = url.split("/");
			let path = config.diagrams.shapes;
			if(surl.length === 4) {
				staticcontent.get_file(path + "/" + surl[2] + "/" + surl[3], sendresponse, session.sessionid);
			}
			else {
				sendresponse(404, "text/html", html.not_found(config), session.sessionid);
				return;
			}
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
