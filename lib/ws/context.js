const UserMGT = require("../usermgt");

/**
 * WebSocket Context class
 * 
 * Provides a structured container for the core dependencies and state 
 * needed by WebSocket handlers. This centralizes access to common 
 * resources and reduces parameter passing between functions.
 * 
 * @class
 */
class WSUserContext {
    /**
     * Creates a new WebSocket context
     * 
     * @param {WebSocket} ws - The WebSocket connection
     * @param {Object} usermgt - User management service
     * @param {Object} config - Application configuration
     * @param {Object} html - HTML template engine
     * @param {string} sessionid - User's session identifier
     */
    constructor(ws, usermgt, config, html, sessionid) {
        /**
         * WebSocket connection
         * @type {WebSocket}
         */
        this.ws = ws;

        /**
         * User management service
         * @type {UserMGT}
         */
        this.usermgt = usermgt;

        /**
         * Application configuration
         * @type {Object}
         */
        this.config = config;

        /**
         * HTML template engine
         * @type {Object}
         */
        this.html = html;

        /**
         * User's session identifier
         * @type {string}
         */
        this.sessionid = sessionid;
    }

    /**
     * Sends a formatted message through the WebSocket
     * 
     * @param {string} messageType - Type identifier for the message
     * @param {Object} data - Data payload to send
     * @returns {void}
     */
    send(messageType, data) {
        this.ws.send(JSON.stringify({
            m: messageType,
            d: data
        }));
    }

    /**
     * Sends an error response through the WebSocket
     * 
     * @param {string} messageType - Type identifier for the message
     * @param {string|Error} error - Error message or object
     * @returns {void}
     */
    sendError(messageType, error) {
        const errorMessage = error instanceof Error ? error.message : error;
        this.send(messageType, { error: errorMessage });
    }
}

module.exports = {
    WSUserContext,
};