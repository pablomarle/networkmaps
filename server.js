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
    config.diagrams.path,
);
const fs = require('fs');
const { testDirectories } = require('./lib/utils/filesystem');
const { multiIndexOf, findLineWith, removeDoubleQuote } = require('./lib/utils/string');
const { process_multipart_formdata } = require('./lib/utils/formdata');
const { Logger } = require('./lib/utils/logger');

const serverLogger = new Logger({ prefix: 'Server' });

function sendMail(to, subject, content) {
    serverLogger.info(`Sending email to queue: ${to} : ${subject}`)
    sendmail.queue_email(to, subject, content)
        .catch(err => {
            serverLogger.error(`Error sending email: ${to} : ${subject}`)
        });
}

function findContent(s, i_start, i_end) {
    let lindex = s.indexOf("\r\n\r\n");
    if((lindex === -1) || (lindex >= i_end))
        return null;
    return lindex + 4;
}

function HTTP_callback(method, url, sessionid, content_type, body, sendresponse) {
    usermgt.getSession(sessionid, (error, session) => {
        if(error) {
            sendresponse(500, "text/html", html.not_found(config), "");
            serverLogger.error("Error on main: " + error)
            return;
        }

        // This is the index. The main page where users register, access their account and manage their diagrams
        if ((url == "/") && (method === "GET"))  {
            // If a session is not authenticated and we are doing openid, redirect to the openid provider
            if((config.users.authentication === "openid") && (!session.data.user)) {
                let [state, redirect_url] = usermgt.init_openid_auth(session.sessionid, html.get_server());
                sendresponse(302, null, "", session.sessionid, redirect_url);
            }
            else {
                sendresponse(200, "text/html", html.index(config), session.sessionid);
            }
            return;
        }

        // For openid integration, the page where users are redirected from the openid provider
        if((url.startsWith("/cb?")) && (method === "GET")) {
            usermgt.auth_openid(sessionid, url.split("?")[1], html.get_server(), (err) => {
                if(err) {
                    sendresponse(403, "text/html", html.not_authorized(config, err), "");
                    return;
                }
                else {
                    sendresponse(302, null, null, session.sessionid, "/");
                }
            });
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
                    serverLogger.error("Error on user activation: " + error)
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
            //  sendresponse(302, "text/html", "", session.sessionid, "/");
            //  return;
            //}
            let surl = url.split("/");
            if(surl.length != 3) {
                sendresponse(404, "text/html", html.not_found(config), session.sessionid);
                return;
            }
            let diagram_uuid = surl[2].split("?")[0];
            sendresponse(200, "text/html", html.diagram(config, diagram_uuid), session.sessionid);
            return;
        }

        // Export a diagram.
        else if (url.startsWith("/export_diagram/") && (method === "GET"))  {
            // If user not logged in or user has no rights on this diagram, return 404
            let surl = url.split("/");
            if(surl.length != 3) {
                sendresponse(404, "application/json", '{"error": "Not found"}', session.sessionid);
                return;
            }
            if(!session.data.user) {
                sendresponse(403, "application/json", JSON.stringify({"error": "Forbidden"}), session.sessionid);
                return;
            }
            ws.exportDiagram(session.sessionid, surl[2], (error, result) => {
                if(error) {
                    sendresponse(403, "application/json", JSON.stringify({"error": error}), session.sessionid);
                }
                else {
                    sendresponse(200, "application/json", JSON.stringify(result));
                }
            })
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
                                        serverLogger.error("Error uploading texture to shapegroup: " + err);
                                        sendresponse(400, "text/plain", "Upload error: " + err, session.sessionid);
                                        return;
                                    }
                                    else {
                                        serverLogger.info("Uploaded texture file to shapegroup " + key);
                                        serverLogger.info("File name: " + result["img"].filename);
                                        serverLogger.info("File size: " + (result["img"].content_index_end - result["img"].content_index_start)); 
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
                            serverLogger.error("Error uploading icon to shapegroup: " + err);
                            sendresponse(400, "text/plain", "Upload error: " + err, session.sessionid);
                            return;
                        }
                        else {
                            serverLogger.info("Uploaded icon file to shapegroup " + shapegroup_key);
                            serverLogger.info("File name: " + filename);
                            serverLogger.info("File size: " + (result["img"].content_index_end - result["img"].content_index_start)); 
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

        // Upload an image to be used as texture
        else if ((url === "/upload/texture") && (method === "POST")) {
            let result = process_multipart_formdata(content_type, body);
            if((result === null) || (!result.img)) {
                sendresponse(400, "application/json", '{"error": "Invalid request"}', session.sessionid);
                console.log(result);
                return;
            }
            usermgt.uploadUserTexture(session.sessionid, result.img.filename,
                body.substring(result["img"].content_index_start, result["img"].content_index_end),
                (err, filename) => {
                    if(err) {
                        serverLogger.error("Error uploading user texture: " + err);
                        serverLogger.error("File size: " + (result["img"].content_index_end - result["img"].content_index_start)); 
                        sendresponse(400, "application/json", '{"error": "Upload error"}', session.sessionid);
                        return;
                    }
                    else {
                        serverLogger.info("Uploaded user texture ");
                        serverLogger.info("File name: " + filename);
                        serverLogger.info("File size: " + (result["img"].content_index_end - result["img"].content_index_start)); 
                        sendresponse(200, "application/json", JSON.stringify({filename: filename}), session.sessionid);
                        return;
                    }
                }
            );
        }

        // List user textures
        else if ((url === "/usertextures") && (method === "GET")) {
            sendresponse(200, "text/html", html.usertextures(config), session.sessionid);
            return;
        }

        // Delete user texture
        else if ((url === "/usertextures/delete") && (method === "POST")) {
            let new_data;
            try { new_data = JSON.parse(body) } catch { sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid); return }

            usermgt.deleteUserTexture(session.sessionid, new_data.id, (err, result) => {
                if(err) {
                    sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
                    return;
                }
                sendresponse(200, "application/json", "{}");
            })
        }

        // Rename user texture
        else if ((url === "/usertextures/rename") && (method === "POST")) {
            let new_data;
            try { new_data = JSON.parse(body) } catch { sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid); return }

            usermgt.renameUserTexture(session.sessionid, new_data.id, new_data.name, (err, result) => {
                if(err) {
                    sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
                    return;
                }
                sendresponse(200, "application/json", "{}", session.sessionid);
            })
        }

        // Rename user texture
        else if ((url === "/usertextures/list") && (method === "GET")) {
            let userTextures = usermgt.getUserTextures(session.sessionid);
            if(userTextures === null) {
                sendresponse(200, "application/json", JSON.stringify({error: "Couldn't get user textures"}), session.sessionid);
                return;
            }
            sendresponse(200, "application/json", JSON.stringify(userTextures), session.sessionid);
        }

        // Get user texture
        else if (url.startsWith("/usertexture/") && (method === "GET")) {
            let surl = url.split("/");
            let path = config.diagrams.path;
            if(surl.length === 3) {
                staticcontent.get_file(path + "/textures/" + surl[2], sendresponse, session.sessionid);
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

function main() {
    console.log("\nIf you like NetworkMaps, consider making a small donation :)\n")
    testDirectories(config);

    usermgt.initialize();
    sendmail.initialize(config.sendmail);
    html.initialize(config);
    ws.initialize(config, usermgt, html, sendmail);

    const server = new httpServer(
        config.use_ssl_socket, 
        config.socket.address, 
        config.socket.port, 
        config.socket.cert, 
        config.socket.key, 
        HTTP_callback, 
        ws.WS_callback
    );
}

main()
