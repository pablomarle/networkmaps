/**
 * Utility functions for user management
 */

const crypto = require("crypto");
const validator = require("validator");

// Constants
const PWD_VALID_CHARS = "1234567890$%#!@_-qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
const FILENAME_VALID_CHARS = "1234567890_-.qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM ()";
const PWD_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Sanitize a string input
 *
 * @param {string} s - String to sanitize
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {string|null} Sanitized string or null if invalid
 */
function sanitize_string(s, min, max) {
    if(
        (typeof(s) !== "string") ||
        (s.length < min) ||
        (s.length > max)
        )
        return null;
    return validator.escape(s);
}

/**
 * Sanitize a filename
 *
 * @param {string} fn - Filename to sanitize
 * @returns {string|null} Sanitized filename or null if invalid
 */
function sanitize_filename(fn) {
    if(
        (typeof(fn) !== "string") ||
        (fn.length < 2) ||
        (fn.length > 256)
        )
        return null;

    // Check if there are directories and remove them
    if(fn.indexOf("/") !== -1) {
        let fns = fn.split("/");
        fn = fns[fns.length-1];
    }
    if(fn.indexOf("\\") !== -1) {
        let fns = fn.split("\\");
        fn = fns[fns.length-1];
    }

    // Replace spaces with "_"
    fn = fn.replace(/ /g, "_");

    if(fn.length < 2)
        return null;

    // Validate characters
    for(let x = 0; x < fn.length; x++) {
        if(FILENAME_VALID_CHARS.indexOf(fn[x]) === -1) {
            return null
        }
    }

    return fn;
}

/**
 * Generate a random password
 *
 * @param {number} pwdlength - Length of password
 * @returns {string} Random password
 */
function generateRandomPassword(pwdlength=PWD_LENGTH) {
    let randombuffer = crypto.randomBytes(pwdlength);
    let randompwd = "";
    for (let x = 0; x < pwdlength; x++)
        randompwd += PWD_VALID_CHARS[randombuffer[x]%PWD_VALID_CHARS.length];
    return randompwd;
}

/**
 * Generate a salted hash from a password
 *
 * @param {string} password - Password to hash
 * @param {number} saltlength - Length of salt
 * @returns {Object} Object with salt and hash
 */
function generateSaltedHash(password, saltlength=SALT_LENGTH) {
    const salt = generateRandomPassword(saltlength);
    const digest = generateHash(password, salt);

    return {salt: salt, hash: digest};
}

/**
 * Generate a hash from a password and salt
 *
 * @param {string} password - Password to hash
 * @param {string} salt - Salt to use
 * @returns {string} Hash
 */
function generateHash(password, salt) {
    const saltedpassword = password + salt;
    const hash = crypto.createHash('sha512');
    hash.update(saltedpassword);
    const digest = hash.digest().toString('base64');

    return digest;
}

/**
 * Check if a password is valid
 *
 * @param {string} password - Password to check
 * @returns {boolean} True if valid
 */
function isValidPassword(password) {
    if(password.length > 64)
        return false;

    for(let x = 0; x < password.length; x++)
        if(PWD_VALID_CHARS.indexOf(password[x]) == -1)
            return false;

    return true;
}

module.exports = {
    sanitize_string,
    sanitize_filename,
    generateRandomPassword,
    generateSaltedHash,
    generateHash,
    isValidPassword
};