/**
 * Texture Controller
 * 
 * Handles all texture-related functionality including:
 * - Uploading user textures
 * - Managing texture libraries
 * - Listing, renaming, and deleting textures
 */

const context = require('../context');
const staticcontent = require('../staticcontent');
const { process_multipart_formdata } = require('../utils/formdata');
const { Logger } = require('../utils/logger');

const textureLogger = new Logger({ prefix: 'TextureController' });

/**
 * Upload a new texture
 * 
 * @param {Object} callData - Object containing request details
 */
function uploadTexture(callData) {
    const { content_type, body, session, sendresponse } = callData;
    
    let result = process_multipart_formdata(content_type, body);
    if((result === null) || (!result.img)) {
        sendresponse(400, "application/json", '{"error": "Invalid request"}', session.sessionid);
        textureLogger.error("Invalid texture upload format");
        return;
    }
    
    context.usermgt.uploadUserTexture(
        session.sessionid, 
        result.img.filename,
        body.substring(result["img"].content_index_start, result["img"].content_index_end),
        (err, filename) => {
            if(err) {
                textureLogger.error("Error uploading user texture: " + err);
                textureLogger.error("File size: " + (result["img"].content_index_end - result["img"].content_index_start)); 
                sendresponse(400, "application/json", '{"error": "Upload error"}', session.sessionid);
                return;
            }
            else {
                textureLogger.info("Uploaded user texture ");
                textureLogger.info("File name: " + filename);
                textureLogger.info("File size: " + (result["img"].content_index_end - result["img"].content_index_start)); 
                sendresponse(200, "application/json", JSON.stringify({filename: filename}), session.sessionid);
                return;
            }
        }
    );
}

/**
 * Show texture management interface
 * 
 * @param {Object} callData - Object containing request details
 */
function showUserTextures(callData) {
    const { session, sendresponse } = callData;
    sendresponse(200, "text/html", context.html.usertextures(), session.sessionid);
}

/**
 * Delete a texture
 * 
 * @param {Object} callData - Object containing request details
 */
function deleteTexture(callData) {
    const { body, session, sendresponse } = callData;
    
    let new_data;
    try { 
        new_data = JSON.parse(body); 
    } catch(e) { 
        textureLogger.error("Invalid JSON in delete texture request: " + e.message);
        sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid); 
        return; 
    }

    context.usermgt.deleteUserTexture(session.sessionid, new_data.id, (err, result) => {
        if(err) {
            textureLogger.error(`Error deleting texture ${new_data.id}: ${err}`);
            sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
            return;
        }
        
        textureLogger.info(`Texture ${new_data.id} deleted successfully`);
        sendresponse(200, "application/json", "{}", session.sessionid);
    });
}

/**
 * Rename a texture
 * 
 * @param {Object} callData - Object containing request details
 */
function renameTexture(callData) {
    const { body, session, sendresponse } = callData;
    
    let new_data;
    try { 
        new_data = JSON.parse(body); 
    } catch(e) { 
        textureLogger.error("Invalid JSON in rename texture request: " + e.message);
        sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid); 
        return; 
    }

    context.usermgt.renameUserTexture(session.sessionid, new_data.id, new_data.name, (err, result) => {
        if(err) {
            textureLogger.error(`Error renaming texture ${new_data.id}: ${err}`);
            sendresponse(200, "application/json", JSON.stringify({error: err}), session.sessionid);
            return;
        }
        
        textureLogger.info(`Texture ${new_data.id} renamed to "${new_data.name}"`);
        sendresponse(200, "application/json", "{}", session.sessionid);
    });
}

/**
 * List all textures available to the user
 * 
 * @param {Object} callData - Object containing request details
 */
function listTextures(callData) {
    const { session, sendresponse } = callData;
    
    let userTextures = context.usermgt.getUserTextures(session.sessionid);
    if(userTextures === null) {
        textureLogger.error(`Failed to retrieve texture list for session ${session.sessionid}`);
        sendresponse(200, "application/json", JSON.stringify({error: "Couldn't get user textures"}), session.sessionid);
        return;
    }
    
    textureLogger.info(`Listed ${userTextures.length} textures for session ${session.sessionid}`);
    sendresponse(200, "application/json", JSON.stringify(userTextures), session.sessionid);
}

/**
 * Serve a specific texture file
 * 
 * @param {Object} callData - Object containing request details
 */
function getTexture(callData) {
    const { url, session, sendresponse } = callData;
    
    let surl = url.split("/");
    let path = context.config.diagrams.path;
    
    if(surl.length === 3) {
        textureLogger.debug(`Serving texture file: ${surl[2]}`);
        staticcontent.get_file(path + "/textures/" + surl[2], sendresponse, session.sessionid);
    }
    else {
        textureLogger.warn(`Invalid texture path requested: ${url}`);
        sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
    }
}

/**
 * Share a texture with other users
 * 
 * @param {Object} callData - Object containing request details 
 */
function shareTexture(callData) {
    const { body, session, sendresponse } = callData;
    
    // Check authentication
    if (!session.data.user) {
        sendresponse(401, "application/json", JSON.stringify({error: "Authentication required"}), session.sessionid);
        return;
    }
    
    let shareData;
    try { 
        shareData = JSON.parse(body); 
    } catch(e) { 
        textureLogger.error("Invalid JSON in share texture request: " + e.message);
        sendresponse(400, "application/json", JSON.stringify({error: "Not valid JSON"}), session.sessionid); 
        return; 
    }
    
    if (!shareData.id || !shareData.users || !Array.isArray(shareData.users)) {
        sendresponse(400, "application/json", JSON.stringify({error: "Invalid request format"}), session.sessionid);
        return;
    }
    
    context.usermgt.shareUserTexture(
        session.data.user, 
        shareData.id, 
        shareData.users, 
        (err) => {
            if (err) {
                textureLogger.error(`Error sharing texture ${shareData.id}: ${err}`);
                sendresponse(400, "application/json", JSON.stringify({error: err}), session.sessionid);
                return;
            }
            
            textureLogger.info(`Texture ${shareData.id} shared with ${shareData.users.length} users`);
            sendresponse(200, "application/json", JSON.stringify({success: true}), session.sessionid);
        }
    );
}

function handleUserTexturesRequest(callData) {
    const { method, url } = callData;
    
    if (method === "POST") {
        if (url === "/usertextures/upload") {
            uploadTexture(callData);
        } else if (url === "/usertextures/delete") {
            deleteTexture(callData);
        } else if (url === "/usertextures/rename") {
            renameTexture(callData);
        } else if (url === "/usertextures/share") {
            shareTexture(callData);
        }
    } else if (method === "GET") {
        if (url === "/usertextures") {
            showUserTextures(callData);
        } else if (url === "/usertextures/list") {
            listTextures(callData);
        }
    }
}

module.exports = {
    uploadTexture,
    getTexture,
    handleUserTexturesRequest,
};