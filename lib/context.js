/**
 * Context object to hold the configuration and services
 * used throughout the application.
 * @module context
 * @type {Object}
 * @property {Object} config - Configuration object
 * @property {import('./users/usermgt').UserMGT} usermgt - User management service
 * @property {Object} html - HTML service
 * @property {Object} ws - WebSocket service
 * @property {Object} sendmail - Email sending service
 * @property {Object} etmaps - ET maps service
 */
const context = {
    config: null,
    usermgt: null,
    html: null,
    ws: null,
    sendmail: null,
    etmaps: null,
};

module.exports = context;