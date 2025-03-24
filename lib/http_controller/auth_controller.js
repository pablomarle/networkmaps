/**
 * Authentication Controller
 *
 * Handles all authentication-related functionality including:
 * - Login/logout
 * - Account registration and validation
 * - Password reset
 * - OAuth/OpenID authentication
 */

const context = require('../context');
const { Logger } = require('../utils/logger');

const authLogger = new Logger({ prefix: 'AuthController' });

/**
 * Display the main index page with appropriate authentication state
 * Redirects to OpenID provider if using OpenID and not authenticated
 *
 * @param {Object} callData - Object containing request details
 * @param {string} callData.method - HTTP method
 * @param {string} callData.url - Request URL
 * @param {Object} callData.session - User session object
 * @param {string} callData.content_type - Content-Type header
 * @param {string} callData.body - Request body
 * @param {Function} callData.sendresponse - Function to send HTTP response
 */
function showIndex(callData) {
    const { session, sendresponse } = callData;

    // If a session is not authenticated and we are doing openid, redirect to the openid provider
    if ((context.config.users.authentication === "openid") && (!session.data.user)) {
        let [state, redirect_url] = context.usermgt.init_openid_auth(session.sessionid, context.html.get_server());
        sendresponse(302, null, "", session.sessionid, redirect_url);
    } else {
        sendresponse(200, "text/html", context.html.index(), session.sessionid);
    }
}

/**
 * Process callback from OpenID provider
 *
 * @param {Object} callData - Object containing request details
 */
function handleOpenIdCallback(callData) {
    const { url, session, sendresponse } = callData;

    context.usermgt.auth_openid(session.sessionid, url.split("?")[1], context.html.get_server(), (err) => {
        if (err) {
            sendresponse(403, "text/html", context.html.notAuthorized(err), "");
            return;
        } else {
            sendresponse(302, null, null, session.sessionid, "/");
        }
    });
}

/**
 * Validate a newly created user account using validation token
 *
 * @param {Object} callData - Object containing request details
 */
function validateAccount(callData) {
    const { url, session, sendresponse } = callData;

    let ac_email = url.split("/")[2].split("?");
    if (ac_email.length != 2) {
        sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
        return;
    }

    let validateResult = context.usermgt.validateUser(ac_email[1], ac_email[0]);
    if ("error" in validateResult) {
        sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
        authLogger.error("Error on user activation: " + validateResult.error);
        return;
    }

    context.sendmail.sendMail(
        validateResult.email,
        "NetworkMaps account has been confirmed.",
        `Welcome to NetworkMaps.\n\nYour account has been activated.\n\n
        A temporary password has been assigned to you:\n
        Username: ${validateResult.email}\n
        Password: ${validateResult.password}\n\nRegards,\n`
    );
    sendresponse(200, "text/html", context.html.userValidated(), session.sessionid);
}

/**
 * Process a password reset request
 *
 * @param {Object} callData - Object containing request details
 */
function confirmPasswordReset(callData) {
    const { url, session, sendresponse } = callData;

    let ac_email = url.split("/")[2].split("?");
    if (ac_email.length != 2) {
        sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
        return;
    }

    let resetPasswordResult = context.userdb.resetPassword(ac_email[1], ac_email[0]);
    if("error" in resetPasswordResult) {
        sendresponse(404, "text/html", context.html.notFound(), "");
        authLogger.error("Error on password reset: " + resetPasswordResult.error);
        return;
    }

    context.sendmail.sendMail(
        resetPasswordResult.email,
        "NetworkMaps password has been reset.",
        `Your password has been reset.\n\n
        Username: ${resetPasswordResult.email}\n
        Password: ${resetPasswordResult.password}\n`
    );
    sendresponse(200, "text/html", context.html.passwordReset(), session.sessionid);
}

module.exports = {
    showIndex,
    handleOpenIdCallback,
    validateAccount,
    confirmPasswordReset,
};