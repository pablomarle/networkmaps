// Context
const context = require('../context');

// Import logger
const { Logger } = require('../utils/logger');
const serverLogger = new Logger({ prefix: 'HttpController' });

// Import static content
const staticcontent = require('../staticcontent');
const { process_multipart_formdata } = require('../utils/formdata');

// Import controllers
const authController = require('./auth_controller');
const diagramController = require('./diagram_controller');
const shapegroupController = require('./shapegroup_controller');
const textureController = require('./texture_controller');

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
        else if(url.startsWith("/shapegroups")) {
            shapegroupController.handleShapegroupRequests(callData);
        }

        // Get a group of 3d shapes
        else if (url.startsWith("/3dshapes/") && (method === "GET"))
            return shapegroupController.get3DShapeFile(callData);

        // Upload an image to be used as texture
        else if ((url === "/upload/texture") && (method === "POST")) 
            textureController.uploadTexture(callData);

        // Handle /usertextures requests
        else if (url.startsWith("/usertextures")) 
            textureController.handleUserTexturesRequest(callData);

        else if (url.startsWith("/usertexture/") && (method === "GET"))
            textureController.getTexture(callData);

        else {
            sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
            return;
        }

    });
}

module.exports = httpCallback;