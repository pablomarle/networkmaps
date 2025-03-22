// Context
const context = require('../context');

// Import logger
const serverLogger = require('../utils/logger').Logger({ prefix: 'HttpController' });

// Import static content
const staticcontent = require('../staticcontent');
const { process_multipart_formdata } = require('../utils/formdata');

// Import controllers
const authController = require('./auth_controller');
const diagramController = require('./diagram_controller');


function httpCallback(method, url, sessionid, content_type, body, sendresponse) {
    context.usermgt.getSession(sessionid, (error, session) => {
        if(error) {
            sendresponse(500, "text/html", context.html.notFound(), "");
            serverLogger.error("Error on main: " + error)
            return;
        }

        let callData = {
            method: method,
            url: url,
            session: session,
            content_type: content_type,
            body: body,
            sendresponse: sendresponse,
        }

        // This is the index. The main page where users register, access their account and manage their diagrams
        if ((url == "/") && (method === "GET"))
            return authController.showIndex(callData);

        // For openid integration, the page where users are redirected from the openid provider
        if((url.startsWith("/cb?")) && (method === "GET")) 
            return authController.handleOpenIdCallback(callData);

        // Validate the creation of user accounts
        else if (url.startsWith("/validate/") && (method === "GET"))
            return authController.validateAccount(callData);

        // Confirm a password reset request
        else if (url.startsWith("/passwordreset/") && (method === "GET"))
            return authController.confirmPasswordReset(callData);

        // Access a diagram. Gets the client that will be used to edit a diagram
        else if (url.startsWith("/diagram/") && (method === "GET"))
            return diagramController.showDiagram(callData);

        // Export a diagram.
        else if (url.startsWith("/export_diagram/") && (method === "GET"))
            return diagramController.exportDiagram(callData);

        else if((url === "/favicon.ico") && (method === "GET")) {
            staticcontent.get("/static/img/favicon.ico", sendresponse, session.sessionid);
        }

        // Serving static content
        else if ((context.config.serve_static_locally) && url.startsWith("/static/") && (method === "GET"))  {
            staticcontent.get(url, sendresponse, session.sessionid);
        }
        // Serving the screen to manage shapegroups
        else if((url === "/shapegroups") && (method === "GET")) {
            sendresponse(200, "text/html", context.html.shapegroups(), session.sessionid);
            return;
        }
        // Get list of shapes available for this user
        else if((url === "/shapegroups/list") && (method === "GET")) {
            context.usermgt.listShapes(session.sessionid, (error, result) => {
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
            context.usermgt.newShape(session.sessionid, new_data.name, new_data.description, new_data.category, (err, result) => {
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
            context.usermgt.deleteShape(session.sessionid, new_data.id, (err, result) => {
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
            context.usermgt.updateShape(session.sessionid, new_data.id, new_data.name, new_data.description, new_data.category, (err, result) => {
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
            context.usermgt.updateShapeShapes(session.sessionid, new_data.key, new_data.shapes, (err, result) => {
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
                if(key in context.usermgt.data.shape_group_data.shape_group) {
                    sendresponse(200, "text/html", context.html.shapegroup_editor(key), session.sessionid);
                }
                else {
                    sendresponse(404, "text/html", context.html.shapegroup_editor(key), session.sessionid);
                }
            }
            else {
                sendresponse(404, "text/html", context.html.notFound(config), session.sessionid);
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
            context.usermgt.removeShapeTexture(session.sessionid, new_data.key, new_data.filename, (err) => {
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
                if(key in context.usermgt.data.shape_group_data.shape_group) {
                    let result = process_multipart_formdata(content_type, body);
                    if(result === null) {
                        sendresponse(400, "text/plain", "Invalid request", session.sessionid);
                        return;
                    }
                    else {
                        if("img" in result) {
                            context.usermgt.uploadShapeTexture(
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
                    sendresponse(404, "text/html", context.html.shapegroup_editor(key), session.sessionid);
                }
            }
            else {
                sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
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
                context.usermgt.uploadShapeIcon(session.sessionid, shapegroup_key, shape_key,
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
                sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
            }
        }

        // Get a group of 3d shapes
        else if (url.startsWith("/3dshapes/") && (method === "GET")) {
            let surl = url.split("/");
            let path = context.config.diagrams.shapes;
            if(surl.length === 4) {
                staticcontent.get_file(path + "/" + surl[2] + "/" + surl[3], sendresponse, session.sessionid);
            }
            else {
                sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
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
            context.usermgt.uploadUserTexture(session.sessionid, result.img.filename,
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
            sendresponse(200, "text/html", context.html.usertextures(), session.sessionid);
            return;
        }

        // Delete user texture
        else if ((url === "/usertextures/delete") && (method === "POST")) {
            let new_data;
            try { new_data = JSON.parse(body) } catch { sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid); return }

            context.usermgt.deleteUserTexture(session.sessionid, new_data.id, (err, result) => {
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

            context.usermgt.renameUserTexture(session.sessionid, new_data.id, new_data.name, (err, result) => {
                if(err) {
                    sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
                    return;
                }
                sendresponse(200, "application/json", "{}", session.sessionid);
            })
        }

        // Rename user texture
        else if ((url === "/usertextures/list") && (method === "GET")) {
            let userTextures = context.usermgt.getUserTextures(session.sessionid);
            if(userTextures === null) {
                sendresponse(200, "application/json", JSON.stringify({error: "Couldn't get user textures"}), session.sessionid);
                return;
            }
            sendresponse(200, "application/json", JSON.stringify(userTextures), session.sessionid);
        }

        // Get user texture
        else if (url.startsWith("/usertexture/") && (method === "GET")) {
            let surl = url.split("/");
            let path = context.config.diagrams.path;
            if(surl.length === 3) {
                staticcontent.get_file(path + "/textures/" + surl[2], sendresponse, session.sessionid);
            }
            else {
                sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
                return;
            }
        }

        else {
            sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
            return;
        }

    });
}

module.exports = httpCallback;