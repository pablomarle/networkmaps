/**
 * Shape Group Controller
 * 
 * Handles all shape group-related functionality including:
 * - Displaying shape groups management interface
 * - Creating, updating, and deleting shape groups
 * - Managing textures and icons for shape groups
 */

const context = require('../context');
const { process_multipart_formdata } = require('../utils/formdata');
const { Logger } = require('../utils/logger');

const shapeLogger = new Logger({ prefix: 'ShapeGroupController' });

const staticcontent = require('../staticcontent');

/**
 * Display shape groups management interface
 * 
 * @param {Object} callData - Object containing request details
 */
function showShapeGroups(callData) {
    const { session, sendresponse } = callData;
    sendresponse(200, "text/html", context.html.shapegroups(), session.sessionid);
}

/**
 * List shapes available to the user
 * 
 * @param {Object} callData - Object containing request details
 */
function listShapes(callData) {
    const { session, sendresponse } = callData;
    
    context.usermgt.listShapes(session.sessionid, (error, result) => {
        if (error)
            sendresponse(401, "application/json", JSON.stringify({error: error}), session.sessionid);
        else
            sendresponse(200, "application/json", JSON.stringify(result), session.sessionid);
    });
}

/**
 * Create a new shape group
 * 
 * @param {Object} callData - Object containing request details
 */
function newShapeGroup(callData) {
    const { body, session, sendresponse } = callData;
    
    let new_data;
    try {
        new_data = JSON.parse(body);
    } catch {
        sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
        return;
    }
    
    context.usermgt.newShape(
        session.sessionid, 
        new_data.name, 
        new_data.description, 
        new_data.category, 
        (err, result) => {
            if (err) {
                sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
                return;
            }
            sendresponse(200, "application/json", JSON.stringify(result));
        }
    );
}

/**
 * Delete a shape group
 * 
 * @param {Object} callData - Object containing request details
 */
function deleteShapeGroup(callData) {
    const { body, session, sendresponse } = callData;
    
    let new_data;
    try {
        new_data = JSON.parse(body);
    } catch {
        sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
        return;
    }
    
    context.usermgt.deleteShape(session.sessionid, new_data.id, (err, result) => {
        if (err) {
            sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
            return;
        }
        sendresponse(200, "application/json", "{}", session.sessionid);
    });
}

/**
 * Update shape group properties
 * 
 * @param {Object} callData - Object containing request details
 */
function updateShapeGroup(callData) {
    const { body, session, sendresponse } = callData;
    
    let new_data;
    try {
        new_data = JSON.parse(body);
    } catch {
        sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
        return;
    }
    
    context.usermgt.updateShape(
        session.sessionid, 
        new_data.id, 
        new_data.name, 
        new_data.description, 
        new_data.category, 
        (err, result) => {
            if (err) {
                sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
                return;
            }
            sendresponse(200, "application/json", "{}", session.sessionid);
        }
    );
}

/**
 * Update shapes in a shape group
 * 
 * @param {Object} callData - Object containing request details
 */
function updateShapeGroupShapes(callData) {
    const { body, session, sendresponse } = callData;
    
    let new_data;
    try {
        new_data = JSON.parse(body);
    } catch {
        sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
        return;
    }
    
    context.usermgt.updateShapeShapes(
        session.sessionid, 
        new_data.key, 
        new_data.shapes, 
        (err, result) => {
            if (err) {
                sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
                return;
            }
            sendresponse(200, "application/json", "{}", session.sessionid);
        }
    );
}

/**
 * Show shape group editor for a specific shape group
 * 
 * @param {Object} callData - Object containing request details
 */
function showShapeGroupEditor(callData) {
    const { url, session, sendresponse } = callData;
    
    let surl = url.split("/");
    if (surl.length === 4) {
        let key = surl[3];
        if (key in context.usermgt.data.shape_group_data.shape_group) {
            sendresponse(200, "text/html", context.html.shapegroup_editor(key), session.sessionid);
        }
        else {
            sendresponse(404, "text/html", context.html.shapegroup_editor(key), session.sessionid);
        }
    }
    else {
        sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
    }
}

/**
 * Remove texture from a shape group
 * 
 * @param {Object} callData - Object containing request details
 */
function removeShapeTexture(callData) {
    const { body, session, sendresponse } = callData;
    
    let new_data;
    try {
        new_data = JSON.parse(body);
    } catch {
        sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid);
        return;
    }
    
    context.usermgt.removeShapeTexture(
        session.sessionid, 
        new_data.key, 
        new_data.filename, 
        (err) => {
            if (err) {
                sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
                return;
            }
            sendresponse(200, "application/json", "{}", session.sessionid);
        }
    );
}

/**
 * Upload texture to a shape group
 * 
 * @param {Object} callData - Object containing request details
 */
function uploadShapeTexture(callData) {
    const { url, content_type, body, session, sendresponse } = callData;
    
    let surl = url.split("/");
    if (surl.length === 4) {
        let key = surl[3];
        if (key in context.usermgt.data.shape_group_data.shape_group) {
            let result = process_multipart_formdata(content_type, body);
            if (result === null) {
                sendresponse(400, "text/plain", "Invalid request", session.sessionid);
                return;
            }
            else {
                if ("img" in result) {
                    context.usermgt.uploadShapeTexture(
                        session.sessionid,
                        key,
                        result["img"].filename,
                        body.substring(result["img"].content_index_start, result["img"].content_index_end),
                        (err, filename) => {
                            if (err) {
                                shapeLogger.error("Error uploading texture to shapegroup: " + err);
                                sendresponse(400, "text/plain", "Upload error: " + err, session.sessionid);
                                return;
                            }
                            else {
                                shapeLogger.info("Uploaded texture file to shapegroup " + key);
                                shapeLogger.info("File name: " + result["img"].filename);
                                shapeLogger.info("File size: " + (result["img"].content_index_end - result["img"].content_index_start)); 
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

/**
 * Upload icon for a shape in a shape group
 * 
 * @param {Object} callData - Object containing request details
 */
function uploadShapeIcon(callData) {
    const { url, content_type, body, session, sendresponse } = callData;
    
    let surl = url.split("/");
    if (surl.length === 5) {
        let shapegroup_key = surl[3];
        let shape_key = surl[4];

        let result = process_multipart_formdata(content_type, body);
        if ((result === null) || (!result.img)) {
            sendresponse(400, "text/plain", "Invalid request", session.sessionid);
            console.log(result);
            return;
        }
        context.usermgt.uploadShapeIcon(
            session.sessionid, 
            shapegroup_key, 
            shape_key,
            body.substring(result["img"].content_index_start, result["img"].content_index_end),
            (err, filename) => {
                if (err) {
                    shapeLogger.error("Error uploading icon to shapegroup: " + err);
                    sendresponse(400, "text/plain", "Upload error: " + err, session.sessionid);
                    return;
                }
                else {
                    shapeLogger.info("Uploaded icon file to shapegroup " + shapegroup_key);
                    shapeLogger.info("File name: " + filename);
                    shapeLogger.info("File size: " + (result["img"].content_index_end - result["img"].content_index_start)); 
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

/**
 * Function to handle all shapegroup requests redirecting to the appropriate function
 * each request type
 * @param {Object} callData - Object containing request details
 * @param {string} callData.method - HTTP method
 * @param {string} callData.url - Request URL
 * @param {Object} callData.session - User session object
 * @param {string} callData.content_type - Content-Type header
 * @param {string} callData.body - Request body
 * @param {Function} callData.sendresponse - Function to send HTTP response
 */
function handleShapegroupRequests(callData) {
    const { method, url, sendresponse } = callData;
    
    if (method === "GET") {
        if (url === "/shapegroups") {
            return showShapeGroups(callData);
        }
        else if (url === "/shapegroups/list") {
            return listShapes(callData);
        }
        else if (url.startsWith("/shapegroups/edit/")) {
            return showShapeGroupEditor(callData);
        }
    }
    else if (method === "POST") {
        if (url === "/shapegroups/new") {
            return newShapeGroup(callData);
        }
        else if (url === "/shapegroups/update") {
            return updateShapeGroup(callData);
        }
        else if (url === "/shapegroups/delete") {
            return deleteShapeGroup(callData);
        }
        else if (url === "/shapegroups/update_shapes") {
            return updateShapeGroupShapes(callData);
        }
        else if (url.startsWith("/shapegroups/removetexture/")) {
            return removeShapeTexture(callData);
        }
        else if (url.startsWith("/shapegroups/uploadtexture/")) {
            return uploadShapeTexture(callData);
        }
        else if (url.startsWith("/shapegroups/uploadicon/")) {
            return uploadShapeIcon(callData);
        }
    }
    sendresponse(404, "text/html", context.html.notFound(), callData.session.sessionid);
}

/**
 * Serve 3D shape files
 * 
 * @param {Object} callData - Object containing request details
 */
function get3DShapeFile(callData) {
    const { url, session, sendresponse } = callData;
    
    let surl = url.split("/");
    let path = context.config.diagrams.shapes;
    if (surl.length === 4) {
        staticcontent.get_file(path + "/" + surl[2] + "/" + surl[3], sendresponse, session.sessionid);
    }
    else {
        sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
    }
}

module.exports = {
    handleShapegroupRequests,
    get3DShapeFile
};