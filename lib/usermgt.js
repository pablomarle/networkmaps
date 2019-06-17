const crypto = require("crypto");
const validator = require("validator")
const fs = require('fs').promises;

// Constant that defines when a session is not valid any more
const SESSION_TIMEOUT = 30
const PWD_VALID_CHARS = "1234567890$%#!@_-qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
const PWD_LENGTH = 12
const SALT_LENGTH = 16

class UserMGT {
    constructor(filename, user_timeout, save_timeout) {
        this.filename = filename;
        this.data = {
            session: {},
            user: {},
            password_reset: {},
            diagram: {}
        }
        this.user_timeout = user_timeout;
        this.save_timeout = save_timeout;
    }

    async initialize() {
        // First, load the file with the data.
        try {
            let json = await fs.readFile(this.filename);
            this.data = JSON.parse(json);
        } catch(e) {
            console.log("Couldn't read userMGT file. Running with empty user data.")
        }

        // Then, setup timeouts to do cleanup and save data
        this.cleanup_intervale = setInterval(() => {
            let timestamp = Date.now();

            console.log("Password Reset cleanup Running")
            for(let activation_code in this.data.password_reset) {
                if(this.data.password_reset[activation_code].activation_date < timestamp)
                    delete this.data.password_reset[activation_code];
            }
            console.log("Password Reset cleanup Done")

            console.log("Session Cleanup Running")
            for(let session_id in this.data.session) {
                if(this.data.session[session_id].last_used < timestamp - (1000 * 3600*24*30))
                    delete this.data.session[session_id];
            }
            console.log("Session Cleanup Done")

            console.log("User Not Validated Cleanup Running")
            for(let username in this.data.user) {
                if(!this.data.user[username].is_active && this.data.user[username].activation_date < timestamp) {
                    for(diagram_uuid in this.data.users[username].diagrams) {
                        if(diagram_uuid in this.data.diagrams) {
                            let diagram = this.data.diagrams[diagram_uuid];
                            if(username in diagram.permissions)
                                delete diagram.permissions[username]
                        }
                    }
                    delete this.data.user[username];
                }
            }
            console.log("User Not Validated Cleanup Done")
        }, this.user_timeout * 1000);

        this.save_interval = setInterval(() => {
            this.save();
        }, this.save_timeout * 1000);
    }

    async save() {
        console.log("Saving UserMGT data");
        let json = JSON.stringify(this.data);
        await fs.writeFile(this.filename, json);
        console.log("UserMGT data saved");
    }

    generateRandomPassword(pwdlength=PWD_LENGTH) {
        let randombuffer = crypto.randomBytes(pwdlength)
        let randompwd = ""
        for (let x = 0; x < pwdlength; x++)
            randompwd += PWD_VALID_CHARS[randombuffer[x]%PWD_VALID_CHARS.length]
        return randompwd;
    }
    
    generateSaltedHash(password, saltlength=SALT_LENGTH) {
        const salt = this.generateRandomPassword(saltlength);
        const digest = this.generateHash(password, salt)

        return {salt: salt, hash: digest};
    }

    generateHash(password, salt) {
        const saltedpassword = password + salt;
        const hash = crypto.createHash('sha512');
        hash.update(saltedpassword);
        const digest = hash.digest().toString('base64');

        return digest;
    }

    isValidPassword(password) {
        if(password.length > 64)
            return false;

        for(let x = 0; x < password.length; x++)
            if(PWD_VALID_CHARS.indexOf(password[x]) == -1)
                return false

        return true
    }

    createSession(callback) {
        let sessionid = crypto.randomBytes(32).toString('hex');
        let sessiondata = "{}";
        this.data.session[sessionid] = {
            user: "",
            last_used: Date.now(),
            data: {},
        }

        callback({"sessionid": sessionid, "data": {}});
    }

    getSession(sessionid, callback) {
        if (!validator.isAlphanumeric(sessionid)) {
            this.createSession((session) => {callback(null, session)});
            return
        }

        if(sessionid in this.data.session) {
            this.data.session[sessionid].last_used = Date.now();
            callback(null, {"sessionid": sessionid, "data": this.data.session[sessionid].data})
        }
        else {
            this.createSession((session) => {callback(null, session)});
        }
    }

    getSessionNoCreate(sessionid, callback) {
        if (!validator.isAlphanumeric(sessionid)) {
            callback("Error on get session (3): '" + sessionid + "'")
            return
        }

        if(sessionid in this.data.session) {
            this.data.session[sessionid].last_used = Date.now();
            callback(null, {"sessionid": sessionid, "data": this.data.session[sessionid].data})
        }
        else {
            callback("Error on get session (2).")
        }
    }

    setSession(sessionid, data) {
        if (!validator.isAlphanumeric(sessionid)) {
            return
        }
        if(sessionid in this.data.session) {
            this.data.session[sessionid].data = data;
        }
    }

    createUser(userdata, callback) {
        if((!userdata) || (typeof(userdata) !== 'object') || (typeof(userdata.email) !== 'string') || (typeof(userdata.name) !== 'string') || (typeof(userdata.lastname) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }

        let checkParameters = {}

        // Check first if parameters are valid
        checkParameters.email = validator.isEmail(userdata.email)
        userdata.email = userdata.email.toLowerCase();

        if(!checkParameters.email) {
            callback("Email address is not valid.")
            return
        }

        // Check if the user exists
        if(userdata.email in this.data.user) {
            callback("Email already registered.");
        }
        else {
            let activation_code = crypto.randomBytes(32).toString('hex');
            this.data.user[userdata.email] = {
                name: userdata.name,
                lastname: userdata.lastname,
                password: "",
                salt: "",
                is_active: false,
                activation_code: activation_code,
                activation_date: Date.now() + 1000 * 3600*24,
                diagrams: [],
            };
            callback(null, activation_code);
        }
    }

    validateUser(email, validate_string, callback) {
        if((typeof(email) !== 'string') || (typeof(validate_string) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }

        email = email.toLowerCase();

        // Check parameters
        if (!validator.isAlphanumeric(validate_string)) {
            callback("Activation code invalid");
            return;
        }
        if (!validator.isEmail(email)) {
            callback("Email invalid");
            return;
        }

        if((email in this.data.user) && (!this.data.user[email].is_active) && (this.data.user[email].activation_code === validate_string)) {
            let newpassword = this.generateRandomPassword();
            const {salt, hash} = this.generateSaltedHash(newpassword);
            this.data.user[email].password = hash;
            this.data.user[email].salt = salt;
            this.data.user[email].is_active = true;
            callback(null, email, newpassword);
        }
        else {
            callback("Error on user activation (3)");
        }
    }

    changePassword(email, oldpassword, newpassword, callback) {
        if((typeof(email) !== 'string') || (typeof(oldpassword) !== 'string') || (typeof(newpassword) !== 'string')) {
            callback("Invalid parameters.");
            return;            
        }

        email = email.toLowerCase();

        // Validate data
        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }
        if(!this.isValidPassword(oldpassword)) {
            callback("Invalid old password")
            return          
        }
        if(!this.isValidPassword(newpassword)) {
            callback("Invalid new password")
            return          
        }

        if((email in this.data.user) && (this.data.user[email].is_active)) {
            let hash = this.generateHash(oldpassword, this.data.user[email].salt)
            if (hash == this.data.user[email].password) {
                // Password can be changed. Generate salt and hash and update database
                const {salt, hash} = this.generateSaltedHash(newpassword);
                this.data.user[email].password = hash;
                this.data.user[email].salt = salt;
                callback(null);
            }
            else {
                callback("Old password invalid")
            }
        }
        else {
            callback("Error on changePassword")
        }
    }

    requestResetPassword(email, callback) {
        if((typeof(email) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }

        email = email.toLowerCase();

        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }

        if((email in this.data.user) && (this.data.user[email].is_active)) {
            let validation_code = crypto.randomBytes(32).toString('hex');

            // Check if this user has already a password reset request. If so,
            // we remove it.
            for(let check_valid_code in this.data.password_reset) {
                if(this.data.password_reset[check_valid_code].user === email) {
                    delete this.data.password_reset[check_valid_code];
                }
            }

            // Create a password reset request
            this.data.password_reset[validation_code] = {
                user: email,
                activation_date: Date.now() + 1000 * 3600*24,
            }
            callback(null, validation_code);
        }
        else {
            callback("Error on resetPassword");
        }
    }

    resetPassword(email, validation_code, callback) {
        if((typeof(email) !== 'string') || (typeof(validation_code) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }

        email = email.toLowerCase();

        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return;
        }

        if (!validator.isAlphanumeric(validation_code)) {
            callback("Invalid activation code")
            return;
        }

        if(     (validation_code in this.data.password_reset) &&
                (this.data.password_reset[validation_code].user === email) &&
                (email in this.data.user) &&
                (this.data.password_reset[validation_code].activation_date > Date.now())) {
            
            delete this.data.password_reset[validation_code];
            let newpassword = this.generateRandomPassword();
            const {salt, hash} = this.generateSaltedHash(newpassword);
            this.data.user[email].password = hash;
            this.data.user[email].salt = salt;
            callback(null, email, newpassword);
        }
        else {
            callback("Reset password code not valid.");
            if(validation_code in this.data.password_reset)
                console.log("A");
            if(this.data.password_reset[validation_code].email === email)
                console.log("B");
            if (email in this.data.user)
                console.log("C");
            if(this.data.password_reset[validation_code].activation_date > Date.now())
                console.log("D");
            console.log(validation_code);
            console.log(this.data.password_reset);
            console.log(email);
            console.log(Date.now());
        }
    }

    loginUser(sessionid, email, password, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(email) !== 'string') || (typeof(password) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        email = email.toLowerCase();

        // Validate data
        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }
        if(!this.isValidPassword(password)) {
            callback("Invalid password")
            return          
        }
        if (!validator.isAlphanumeric(sessionid)) {
            callback("Invalid session id")
            return
        }
        if(!(sessionid in this.data.session)) {
            callback("Invalid session id");
            return
        }

        if((email in this.data.user) && (this.data.user[email].is_active)) {
            let hash = this.generateHash(password, this.data.user[email].salt);
            if (hash === this.data.user[email].password) {
                this.data.session[sessionid].user = email;
                this.data.session[sessionid].data.user = email;
                this.data.session[sessionid].data.name = this.data.user[email].name;
                this.data.session[sessionid].data.lastname = this.data.user[email].lastname;
                callback(null, this.data.session[sessionid].data);
            }
        }
        else {
            callback(null, null);
        }
    }

    logoutUser(sessionid, callback) {
        if(typeof(sessionid) !== 'string') {
            callback("Invalid parameters.");
            return;
        }
        if (!validator.isAlphanumeric(sessionid)) {
            callback("Invalid session id")
            return
        }

        if(sessionid in this.data.session) {
            this.data.session[sessionid].data = {};
            this.data.session[sessionid].user = "";
        }

        callback(null);
    }

    changeUserData(sessionid, newusername, newuserlastname, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(newusername) !== 'string') || (typeof(newuserlastname) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        if(sessionid in this.data.session) {
            if(this.data.session[sessionid].user === "") {
                callback("Session doesn't have a user assigned");
                return;
            }
            if(!(this.data.session[sessionid].user in this.data.user)) {
                callback("Session doesn't have a valid user assigned");
                return;
            }
            let user = this.data.user[this.data.session[sessionid].user];
            user.name = newusername;
            user.lastname = newuserlastname;

            callback(null);
        }
        else {
            callback("Session does not exist.");
        }
    }

    createDiagram(sessionid, diagram_name, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(diagram_name) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(this.data.session[sessionid].user === "") {
            callback("Session doesn't have a user assigned");
            return;
        }
        if(!(this.data.session[sessionid].user in this.data.user)) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        let uuid = crypto.randomBytes(32).toString('hex');
        this.data.diagram[uuid] = {
            name: diagram_name,
            owner: this.data.session[sessionid].user,
            last_modified: Date.now(),
            mark_delete: false,
            permissions: {},
        }

        this.data.user[this.data.session[sessionid].user].diagrams.push(uuid);

        callback(null);
    }

    getListDiagrams(sessionid, callback) {
        if(typeof(sessionid) !== 'string') {
            callback("Invalid parameters.");
            return;
        }
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(this.data.session[sessionid].user === "") {
            callback("Session doesn't have a user assigned");
            return;
        }
        if(!(this.data.session[sessionid].user in this.data.user)) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        let result = [];
        let user = this.data.session[sessionid].user;

        this.data.user[user].diagrams.forEach((diagram_uuid) => {
            if((diagram_uuid in this.data.diagram) && (!this.data.diagram[diagram_uuid].mark_delete)) {
                let diagram = this.data.diagram[diagram_uuid];
                let owner = this.data.user[diagram.owner];
                if(diagram.owner === user)
                    result.push({
                        uuid: diagram_uuid,
                        name: diagram.name,
                        permission: "OWNER",
                        oe: diagram.owner,
                        on: owner.name,
                        ol: owner.lastname,
                    })
                else if(user in diagram.permissions)
                    result.push({
                        uuid: diagram_uuid,
                        name: diagram.name,
                        permission: diagram.permissions[user],
                        oe: diagram.owner,
                        on: owner.name,
                        ol: owner.lastname,
                    })
            }
        });
        callback(null, result);
    }

    renameDiagram(sessionid, uuid, newname, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(uuid) !== 'string') || (typeof(newname) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }

        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(this.data.session[sessionid].user === "") {
            callback("Session doesn't have a user assigned");
            return;
        }
        if(!(this.data.session[sessionid].user in this.data.user)) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        if((!(uuid in this.data.diagram)) || (this.data.diagram[uuid].mark_delete)) {
            callback("Diagram does not exist");
            return;
        }

        if(this.data.diagram[uuid].owner !==  this.data.session[sessionid].user) {
            callback("You don't have permission to do this action.");
            return;
        }

        this.data.diagram[uuid].name = newname;
        callback();
    }

    deleteDiagram(sessionid, uuid, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(uuid) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }

        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(this.data.session[sessionid].user === "") {
            callback("Session doesn't have a user assigned");
            return;
        }
        if(!(this.data.session[sessionid].user in this.data.user)) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        if((!(uuid in this.data.diagram)) || (this.data.diagram[uuid].mark_delete)) {
            callback("Diagram does not exist");
            return;
        }

        if(this.data.diagram[uuid].owner !==  this.data.session[sessionid].user) {
            callback("You don't have permission to do this action.");
            return;
        }

        this.data.diagram[uuid].mark_delete = true;
        callback();
    }

    getDiagramPermissions(sessionid, uuid, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(uuid) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }

        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(this.data.session[sessionid].user === "") {
            callback("Session doesn't have a user assigned");
            return;
        }
        if(!(this.data.session[sessionid].user in this.data.user)) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        if((!(uuid in this.data.diagram)) || (this.data.diagram[uuid].mark_delete)) {
            callback("Diagram does not exist");
            return;
        }

        if(this.data.diagram[uuid].owner !==  this.data.session[sessionid].user) {
            callback("You don't have permission to do this action.");
            return;
        }

        let result = [];
        let diagram = this.data.diagram[uuid];
        for(let email in diagram.permissions) {
            if(email in this.data.user) {
                result.push({
                    email: email,
                    n: this.data.user[email].name,
                    l: this.data.user[email].lastname,
                    pid: email,
                    p: diagram.permissions[email],
                })
            }
        }
        callback(null, result);
    }

    deleteDiagramPermission(sessionid, uuid, email, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(uuid) !== 'string') || (typeof(email) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }

        if(!validator.isEmail(email)) {
            callback("Permission ID not valid");
            return;
        }

        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(this.data.session[sessionid].user === "") {
            callback("Session doesn't have a user assigned");
            return;
        }
        if(!(this.data.session[sessionid].user in this.data.user)) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        if((!(uuid in this.data.diagram)) || (this.data.diagram[uuid].mark_delete)) {
            callback("Diagram does not exist");
            return;
        }

        if(this.data.diagram[uuid].owner !==  this.data.session[sessionid].user) {
            callback("You don't have permission to do this action.");
            return;
        }

        if(!(email in this.data.diagram[uuid].permissions)) {
            callback("Permission was not removed.");
            return;
        }
        if(!(email in this.data.user)) {
            callback("Permission was not removed.");
            return;            
        }

        delete this.data.diagram[uuid].permissions[email];
        let user_index = this.data.user[email].diagrams.indexOf(uuid);
        if(user_index != -1)
            this.data.user[email].diagrams.splice(user_index, 1);

        callback();
    }

    shareDiagram(sessionid, uuid, email, permission, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(uuid) !== 'string') || (typeof(email) !== 'string') || (typeof(permission) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }

        if(!validator.isEmail(email)) {
            callback("Email is not valid.");
            return;
        }

        if ((permission !== "RW") && (permission !== "RO")) {
            callback("Permission not valid.")
            return;
        }

        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(this.data.session[sessionid].user === "") {
            callback("Session doesn't have a user assigned");
            return;
        }
        if(!(this.data.session[sessionid].user in this.data.user)) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        if((!(uuid in this.data.diagram)) || (this.data.diagram[uuid].mark_delete)) {
            callback("Diagram does not exist");
            return;
        }

        if(this.data.diagram[uuid].owner !==  this.data.session[sessionid].user) {
            callback("You don't have permission to do this action.");
            return;
        }

        // Check if the user to be shared with has already permissions
        if((email in this.data.diagram[uuid].permissions) || (this.data.diagram[uuid].owner === email)) {
            callback("User already have permission on this diagram.");
            return;
        }

        // Check if the user exists
        if(email in this.data.user) {
            this.data.diagram[uuid].permissions[email] = permission;
            this.data.user[email].diagrams.push(uuid);
            callback();
        }
        else {
            this.createUser({email: email, name: "NewUser", lastname: "Lastname"}, (error, activationcode) => {
                if (error) {
                    callback("There was an error adding the permission");
                    return;
                }
                else {
                    this.data.diagram[uuid].permissions[email] = permission;
                    this.data.user[email].diagrams.push(uuid);
                    callback(null, {
                        activationcode: activationcode, 
                        req_name: this.data.session[sessionid].data.name, 
                        req_lastname: this.data.session[sessionid].data.lastname,
                        req_email: this.data.session[sessionid].user,
                        diag_name: this.data.diagram[uuid].name,
                    })
                }
            });       
        }
    }

    isUserAllowed(sessionid, uuid, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(uuid) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        if(!validator.isAlphanumeric(uuid)) {
            callback("Diagram identifier not valid.");
            return;
        }

        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(this.data.session[sessionid].user === "") {
            callback("Session doesn't have a user assigned");
            return;
        }
        if(!(this.data.session[sessionid].user in this.data.user)) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        if((!(uuid in this.data.diagram)) || (this.data.diagram[uuid].mark_delete)) {
            callback("Diagram does not exist...");
            return;
        }

        if(this.data.diagram[uuid].owner === this.data.session[sessionid].user) {
            callback(null, {
                sdata: this.data.session[sessionid].data,
                permission: "OWNER",
                ddata: {
                    name: this.data.diagram[uuid].name,
                },
            });
        }
        else {
            if(this.data.session[sessionid].user in this.data.diagram[uuid].permissions) {
                callback(null, {
                    sdata: this.data.session[sessionid].data,
                    permission: this.data.diagram[uuid].permissions[this.data.session[sessionid].user],
                    ddata: {
                        name: this.data.diagram[uuid].name,
                    },
                });              
            }
            else {
                callback("Diagram identifier not valid.");
            }
        }
    }
}

module.exports = UserMGT
