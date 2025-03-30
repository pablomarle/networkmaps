/**
 * Session management functionality
 */

const crypto = require("crypto");
const validator = require("validator");
const { Logger } = require('../utils/logger');

const sessionLogger = new Logger({ prefix: 'SessionManager' });

/**
 * Create a new session
 *
 * @param {Object} data - User management data
 * @returns {Object} Session object
 */
function createSession(data) {
    let sessionid = crypto.randomBytes(32).toString('hex');
    data.session[sessionid] = {
        user: "",
        last_used: Date.now(),
        data: {},
    };

    return {"sessionid": sessionid, "data": {}};
}

/**
 * Get a session, creating a new one if it doesn't exist
 *
 * @param {string} sessionid - Session ID
 * @param {Object} data - User management data
 * @returns {Object} Session object
 */
function getSession(sessionid, data) {
    if (!validator.isAlphanumeric(sessionid)) {
        return createSession(data);
    }

    if(sessionid in data.session) {
        data.session[sessionid].last_used = Date.now();
        return {
            "sessionid": sessionid,
            "data": data.session[sessionid].data
        };
    }
    else {
        return createSession(data);
    }
}

/**
 * Clean up expired sessions
 *
 * @param {Object} data - User management data
 * @param {number} maxAge - Maximum session age in milliseconds
 */
function cleanupSessions(data, maxAge) {
    const timestamp = Date.now();
    let count = 0;

    sessionLogger.info("Session Cleanup Running");
    for(let session_id in data.session) {
        if(data.session[session_id].last_used < timestamp - maxAge) {
            delete data.session[session_id];
            count++;
        }
    }
    sessionLogger.info(`Session Cleanup Done, removed ${count} sessions`);
}

module.exports = {
    createSession,
    getSession,
    cleanupSessions
};