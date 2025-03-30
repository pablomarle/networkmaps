/**
 * Authentication-related functionality
 */

const crypto = require("crypto");
const validators = require('./validators');
const utils = require('./utils');
const NMOPENID = require("../nmopenid");
const { Logger } = require('../utils/logger');
const userLogger = new Logger({ prefix: 'User' });
/**
 * Create a new user
 *
 * @param {Object} userdata - User data
 * @param {Object} userMgtData - User management data
 * @param {string} authType - Authentication type
 * @param {boolean} registerSelf - Whether self-registration is allowed
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Object} Result object
 */
function createUser(userdata, userMgtData, authType, registerSelf, allowedDomains) {
    // Check if self-registration is allowed
    if((!registerSelf) || (authType !== "local")){
        return {
            success: false,
            error: "Users not allowed to register."
        };
    }

    // Validate required parameters
    if((!userdata) || (typeof(userdata) !== 'object')) {
        return {
            error: "Invalid parameters."
        };
    }
    let validateResult = validators.validateParameters(userdata, userMgtData, allowedDomains);
    if(validateResult.error) {
        return {
            error: validateResult.error
        };
    }

    userdata.email = userdata.email.toLowerCase();

    // Check if user already exists
    if(userdata.email in userMgtData.user) {
        return {
            error: "Email already registered."
        };
    }

    // Create new user with activation code
    let activation_code = crypto.randomBytes(32).toString('hex');
    userMgtData.user[userdata.email] = {
        name: userdata.name,
        lastname: userdata.lastname,
        password: "",
        salt: "",
        is_active: false,
        activation_code: activation_code,
        activation_date: Date.now() + 1000 * 3600*24, // 24 hours from now
        diagrams: [],
        textures: {},
        mark_delete: false,
    };

    return {
        activation_code: activation_code
    };
}

/**
 * Create or update LDAP user
 *
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} lastname - User lastname
 * @param {Object} userMgtData - User management data
 */
function createOrUpdateLDAPUser(email, name, lastname, userMgtData) {
    if(!(email in userMgtData.user)) {
        // If the user doesn't exist, we create it
        userMgtData.user[email] = {
            name: name,
            lastname: lastname,
            password: null,
            salt: null,
            is_active: true,
            activation_code: null,
            activation_date: null,
            diagrams: [],
            textures: {},
            mark_delete: false,
        }
    }
    else {
        // Update some data from this user
        userMgtData.user[email].name = name;
        userMgtData.user[email].lastname = lastname;
        userMgtData.user[email].is_active = true;
        userMgtData.user[email].mark_delete = false;
    }
}

/**
 * Validate a user account
 *
 * @param {string} email - User email
 * @param {string} validate_string - Validation string
 * @param {Object} userMgtData - User management data
 * @param {string} authType - Authentication type
 * @param {boolean} registerSelf - Whether self-registration is allowed
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Object} Result object
 */
function validateUser(email, validate_string, userMgtData, authType, registerSelf, allowedDomains) {
    if((!registerSelf) || (authType !== "local")) {
        return { success: false, error: "Users not allowed to register." };
    }

    let validateResult = validators.validateParameters({ email: email, validate_string: validate_string }, userMgtData, allowedDomains);
    if(validateResult.error) {
        return {error: validateResult.error};
    }

    email = email.toLowerCase();

    if((email in userMgtData.user) && (!userMgtData.user[email].is_active) &&
       (userMgtData.user[email].activation_code === validate_string)) {
        let newpassword = utils.generateRandomPassword();
        const {salt, hash} = utils.generateSaltedHash(newpassword);
        userMgtData.user[email].password = hash;
        userMgtData.user[email].salt = salt;
        userMgtData.user[email].is_active = true;

        return { email: email, password: newpassword };
    }
    else {
        return { error: "Error on user activation" };
    }
}

/**
 * Change user password
 *
 * @param {string} email - User email
 * @param {string} oldpassword - Old password
 * @param {string} newpassword - New password
 * @param {Object} userMgtData - User management data
 * @param {string} authType - Authentication type
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Object} Result object
 */
function changePassword(email, oldpassword, newpassword, userMgtData, authType, allowedDomains) {
    if(authType !== "local") {
        return { error: "You can't change your password here (" + authType + " authentication)." };
    }

    let validateResult = validators.validateParameters({email: email, password: oldpassword, newpassword: newpassword}, userMgtData, allowedDomains);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    email = email.toLowerCase();

    if((email in userMgtData.user) && (userMgtData.user[email].is_active) && (!userMgtData.user[email].mark_delete)) {
        let hashOld = utils.generateHash(oldpassword, userMgtData.user[email].salt);
        if(hashOld !== userMgtData.user[email].password) {
            return { error: "Old password invalid" };
        }

        // Password can be changed. Generate salt and hash and update database
        const {salt, hash} = utils.generateSaltedHash(newpassword);
        userMgtData.user[email].password = hash;
        userMgtData.user[email].salt = salt;
        return {};
    }
    else {
        return { error: "Error on changePassword" };
    }
}

/**
 * Request password reset
 *
 * @param {string} email - User email
 * @param {Object} userMgtData - User management data
 * @param {string} authType - Authentication type
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Object} Result object
 */
function requestResetPassword(email, userMgtData, authType, allowedDomains) {
    if(authType !== "local") {
        return { success: false, error: `Can't reset password here (${authType}).` };
    }

    let validateResult = validators.validateParameters({email: email}, userMgtData, allowedDomains);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    email = email.toLowerCase();

    if((email in userMgtData.user) && (userMgtData.user[email].is_active) && (!userMgtData.user[email].mark_delete)) {
        let validation_code = crypto.randomBytes(32).toString('hex');

        // Check if this user has already a password reset request. If so, remove it.
        for(let check_valid_code in userMgtData.password_reset) {
            if(userMgtData.password_reset[check_valid_code].user === email) {
                delete userMgtData.password_reset[check_valid_code];
            }
        }

        // Create a password reset request
        userMgtData.password_reset[validation_code] = {
            user: email,
            activation_date: Date.now() + 1000 * 3600*24,
        }

        return { validation_code: validation_code };
    }
    else {
        return { error: "Email address not registered or not activated." };
    }
}

/**
 * Reset user password
 *
 * @param {string} email - User email
 * @param {string} validationCode - Validation code
 * @param {Object} userMgtData - User management data
 * @param {string} authType - Authentication type
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Object} Result object
 */
function resetPassword(email, validationCode, userMgtData, authType, allowedDomains) {
    if(authType !== "local") {
        return { error: "Can't reset password here (" + authType + ")." };
    }
    let validateResult = validators.validateParameters({email: email, validate_string: validationCode}, userMgtData, allowedDomains);
    if(validateResult.error) {
        return { error: validateResult.error };
    }
    email = email.toLowerCase();
    if((validationCode in userMgtData.password_reset) &&
       (userMgtData.password_reset[validationCode].user === email) &&
       (email in userMgtData.user) &&
       (userMgtData.password_reset[validationCode].activation_date > Date.now())) {
        delete userMgtData.password_reset[validationCode];
        let newpassword = utils.generateRandomPassword();
        const {salt, hash} = utils.generateSaltedHash(newpassword);
        userMgtData.user[email].password = hash;
        userMgtData.user[email].salt = salt;
        return { email: email, password: newpassword };
    }
    else {
        return { error: "Reset password code not valid." };
    }
}

/**
 * Login user
 *
 * @param {string} sessionid - Session ID
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} userMgtData - User management data
 * @param {string} authType - Authentication type
 * @param {Array} allowedDomains - List of allowed domains
 * @param {Object} nmldap - LDAP object
 * @returns {Object} Result object
 */
async function loginUser(sessionid, email, password, userMgtData, authType, allowedDomains, nmldap) {
    let validationResult = validators.validateParameters({sessionid: sessionid, email: email, password: password}, userMgtData, allowedDomains);
    if(validationResult.error) {
        return { error: validationResult.error };
    }

    email = email.toLowerCase();

    if(authType === "local") {
        if((email in userMgtData.user) && (userMgtData.user[email].is_active) && (!userMgtData.user[email].mark_delete)) {
            let hash = utils.generateHash(password, userMgtData.user[email].salt);
            if (hash === userMgtData.user[email].password) {
                userMgtData.session[sessionid].user = email;
                userMgtData.session[sessionid].data.user = email;
                userMgtData.session[sessionid].data.name = userMgtData.user[email].name;
                userMgtData.session[sessionid].data.lastname = userMgtData.user[email].lastname;
                return userMgtData.session[sessionid].data;
            }
            else
                return { error: "Invalid username or password." };
        }
        else {
            return { error: "Invalid username or password." };
        }
    }
    else if(authType === "ldap") {
        try {
            await new Promise((resolve, reject) => {
                nmldap.emailAuthenticate(email, password, (err, user_data) => {
                    if(err) {
                        if(err.name === "InvalidCredentialsError")
                            reject("Invalid Credentials");
                        else if(err.name === "NMLDAPError")
                            reject("Invalid Credentials: " + err.message);
                        else {
                            userLogger.error(`Unexpected LDAP error: ${err.name} ${err.message}`);
                            reject("Unexpected error")
                        }
                        return;
                    }

                    createOrUpdateLDAPUser(email, user_data.name, user_data.lastname, userMgtData);

                    // Update the session and callback success
                    userMgtData.session[sessionid].user = email;
                    userMgtData.session[sessionid].data.user = email;
                    userMgtData.session[sessionid].data.name = userMgtData.user[email].name;
                    userMgtData.session[sessionid].data.lastname = userMgtData.user[email].lastname;
                    resolve();
                });
            });
            return userMgtData.session[sessionid].data;
        } catch(e) {
            return { error: e };
        }
    }
    else if(authType === "openid") {
        return { error: "Refresh your browser to authenticate." };
    }
    else {
        return { error: "No valid authentication method available." };
    }
}

/**
 * Function to initialize OpenID authentication
 * Generates a random state and constructs the OpenID authorization URL
 * for redirecting the user to the OpenID provider.
 * The state is stored in the session data for later validation.
 * @param {string} sessionid - The session ID of the user
 * @param {string} server_url - The server URL for the callback
 * @param {Object} openid_config - The OpenID configuration object
 * @param {Object} openid - The OpenID object containing client ID
 * @param {Object} userMgtData - User management data
 * @param {string} authType - The authentication type
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Object} - An object containing the state and redirect URL
 *                     or an error if validation fails
 */
 function initOpenidAuth(sessionid, server_url, openid_config, openid, userMgtData, authType, allowedDomains) {
    if(authType !== "openid") {
        return { error: "OpenID authentication not enabled." };
    }

    // Validate required parameters
    let validateResult = validators.validateParameters({sessionid: sessionid}, userMgtData, allowedDomains);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    let state = crypto.randomBytes(32).toString('hex');
    userMgtData.session[sessionid].openid_state = state;

    let redirect_url = `${openid_config.authorization_endpoint}?response_type=code&scope=openid%20profile%20email` +
            `&client_id=${openid.client_id}&state=${state}&redirect_uri=${server_url}%2Fcb`;

    return {state: state, redirect_url: redirect_url};
}

/**
 * Function to handle OpenID authentication callback
 * Validates the state and processes the authentication code
 * to retrieve user information from the OpenID provider.
 * Updates the user management data with the retrieved information.
 * @param {string} sessionid - The session ID of the user
 * @param {string} parameters - The URL parameters from the callback
 * @param {string} server_url - The server URL for the callback
 * @param {Object} openid_config - The OpenID configuration object
 * @param {Object} openid - The OpenID object containing client ID and secret
 * @param {Object} userMgtData - User management data
 * @param {string} authType - The authentication type
 * @param {Array} allowedDomains - List of allowed domains
 * @param {Function} callback - Callback function to handle the result
 */
function authOpenid(sessionid, parameters, server_url, openid_config, openid, userMgtData, authType, allowedDomains, callback) {
    let validateResult = validators.validateParameters({sessionid: sessionid}, userMgtData, allowedDomains);
    if(validateResult.error) {
        callback(validateResult.error);
        return;
    }
    if(authType !== "openid") {
        callback("OpenID authentication not enabled.");
        return;
    }

    let error, code, state, error_description;

    parameters.split("&").forEach((parameter) => {
        let [key, value] = parameter.split("=");
        if(key === "error") error = value;
        else if(key === "code") code = value;
        else if(key === "state") state = value;
        else if(key === "error_description") error_description = value;
    })

    if(state != userMgtData.session[sessionid].openid_state) {
        callback(`Authentication failed: unexpected state data.`);
        return;
    }
    delete userMgtData.session[sessionid].openid_state;

    if(error) {
        if(error_description)
            callback(`Authentication failed: ${error_description}`);
        else
            callback("Authentication failed.");
        return;
    }

    if(!code) {
        callback("Authentication failed: invalid code received");
        return;
    }

    NMOPENID.authenticate(`${server_url}%2Fcb`, openid_config, code, openid.client_id, openid.secret, (err, data) => {
        if(err) {
            userLogger.error(err);
            callback(err);
            return;
        }
        else {
            if(data.email in userMgtData.user) {
                userMgtData.user[data.email].name = data.name;
                userMgtData.user[data.email].lastname = data.lastname;
            }
            else if(validators.isUserDomainAllowed(data.email, allowedDomains)) {
                userMgtData.user[data.email] = {
                    name: data.name,
                    lastname: data.lastname,
                    password: null,
                    salt: null,
                    is_active: true,
                    activation_code: null,
                    activation_date: null,
                    diagrams: [],
                    textures: {},
                    mark_delete: false,
                }
            }
            else {
                callback("User domain not allowed.");
                return;
            }
            userMgtData.session[sessionid].user = data.email;
            userMgtData.session[sessionid].data.user = data.email;
            userMgtData.session[sessionid].data.name = userMgtData.user[data.email].name;
            userMgtData.session[sessionid].data.lastname = userMgtData.user[data.email].lastname;
            callback();
        }
    });
}

/**
 * Logout user
 *
 * @param {string} sessionid - Session ID
 * @param {Object} userMgtData - User management data
 * @param {string} authType - Authentication type
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Object} Result object
 */
function logoutUser(sessionid, userMgtData, authType, allowedDomains) {
    let validateResult = validators.validateParameters({sessionid: sessionid}, userMgtData, allowedDomains);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    userMgtData.session[sessionid].data = {};
    userMgtData.session[sessionid].user = "";
    return {};
}

/**
 * Change user data
 *
 * @param {string} sessionid - Session ID
 * @param {string} newusername - New username
 * @param {string} newuserlastname - New user lastname
 * @param {Object} userMgtData - User management data
 * @param {string} authType - Authentication type
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {Object} Result object
 */
function changeUserData(sessionid, newusername, newuserlastname, userMgtData, authType, allowedDomains) {
    if(authType !== "local") {
        return { error: "Can't change user data here (" + authType + ")." };
    }

    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active:true, name: newusername, lastname: newuserlastname}, userMgtData, allowedDomains);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    let user = userMgtData.user[userMgtData.session[sessionid].user];
    user.name = newusername;
    user.lastname = newuserlastname;

    // Update also the data on this session
    userMgtData.session[sessionid].data.name = newusername;
    userMgtData.session[sessionid].data.lastname = newuserlastname;

    return {};
}

module.exports = {
    createUser,
    createOrUpdateLDAPUser,
    validateUser,
    changePassword,
    requestResetPassword,
    resetPassword,
    loginUser,
    initOpenidAuth,
    authOpenid,
    logoutUser,
    changeUserData,
};