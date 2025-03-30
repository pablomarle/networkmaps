/**
 * Validation functions for user management
 */

const validator = require("validator");
const { isValidPassword } = require('./utils');

/** Function to validate a set of provided parameters
 * @param {Object} params - Object with parameters to validate
 * @param {string} params.email - Email address
 * @param {string} params.name - User's first name
 * @param {string} params.lastname - User's last name
 * @param {string} params.validate_string - User creation validation string
 * @param {string} params.password - User's password
 * @param {string} params.newpassword - User's new password
 * @param {string} params.sessionid - Session identifier
 * @param {string} params.session_is_active - Session is active
 * @param {string} params.diagram_uuid - Diagram UUID
 * @param {string} params.diagram_name - Diagram name
 * @param {string} params.diagram_type - Diagram type
 * @param {string} params.permission - Permission of a diagram
 * @param {Object} userData - User data object
 * @param {Array} allowedDomains - List of allowed email domains
 * @returns {Object} Result object with error or empty
 */
function validateParameters(params, userData, allowedDomains) {
    if((!params) || (typeof(params) !== 'object')) {
        return { error: "Invalid parameters." };
    }

    if("email" in params) {
        // Check email is a string
        if((typeof(params.email) !== 'string') || (!validator.isEmail(params.email))) {
            return { error: "Invalid email" };
        }

        // Check if domain is allowed
        if(!isUserDomainAllowed(params.email, allowedDomains)) {
            return { error: "Domain of email not allowed" };
        }
    }

    for(let name of ["name", "lastname"]) {
        if(name in params) {
            if((typeof(params[name]) !== "string") || (params[name].length > 64) || (params[name].length < 1)) {
                return {"error": `${name} is not valid`};
            }
        }
    }

    if("validate_string" in params) {
        if((typeof(params.validate_string) !== 'string') || (!validator.isAlphanumeric(params.validate_string))) {
            return { error: "Invalid validation string" };
        }
    }

    for(let password of ["password", "newpassword"]) {
        if(password in params) {
            if(!isValidPassword(params[password])) {
                return { error: `Invalid ${password}` };
            }
        }
    }

    if("sessionid" in params) {
        if((typeof(params.sessionid) !== 'string') || (!validator.isAlphanumeric(params.sessionid))) {
            return { error: "Invalid session id" };
        }

        if(!(params.sessionid in userData.session)) {
            return { error: "Invalid session id" };
        }

        if(params.session_is_active) {
            if(userData.session[params.sessionid].user === "") {
                return { error: "Session doesn't have a user assigned" };
            }
            if(!(userData.session[params.sessionid].user in userData.user)) {
                return { error: "Session doesn't have a valid user assigned" };
            }
        }
    }

    if("diagram_uuid" in params) {
        if((typeof(params.diagram_uuid) !== 'string') || (!validator.isAlphanumeric(params.diagram_uuid))) {
            return { error: "Invalid diagram id" };
        }

        if(!(params.diagram_uuid in userData.diagram) || (userData.diagram[params.diagram_uuid].mark_delete)) {
            return { error: "Invalid diagram id" };
        }
    }

    if("diagram_name" in params) {
        if((typeof(params.diagram_name) !== 'string') || (params.diagram_name.length < 1) || (params.diagram_name.length > 256)) {
            return { error: "Invalid diagram name" };
        }
    }

    if("diagram_type" in params) {
        if((typeof(params.diagram_type) !== 'string') || (["network", "basic"].indexOf(params.diagram_type) === -1)) {
            return { error: "Invalid diagram type" };
        }
    }

    if("permission" in params) {
        if((typeof(params.permission) != 'string') || (["RO", "RW"].indexOf(params.permission) === -1)) {
            return { error: "Invalid permission" };
        }
    }

    return {};
}

/**
 * Check if user domain is allowed
 *
 * @param {string} email - Email to check
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {boolean} True if domain is allowed
 */
function isUserDomainAllowed(email, allowedDomains) {
    // Check if user is in allowed domains list
    if(allowedDomains.length > 0) {
        let user_domain = email.split("@")[1];
        for(let x = 0; x < allowedDomains.length; x++) {
            if(allowedDomains[x] === user_domain)
                return true;
        }
        return false;
    }
    return true;
}

module.exports = {
    validateParameters,
    isUserDomainAllowed
};