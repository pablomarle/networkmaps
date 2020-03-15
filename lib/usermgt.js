const crypto = require("crypto");
const validator = require("validator")
const fs = require('fs');
const NMLDAP = require("./nmldap");
const usermgt_migrations = require("./usermgt_migrations");

// Constant that defines when a session is not valid any more
const SESSION_TIMEOUT = 30
const PWD_VALID_CHARS = "1234567890$%#!@_-qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
const PWD_LENGTH = 12
const SALT_LENGTH = 16

class UserMGT {
    constructor(user_timeout, save_timeout, ldap_grouprefresh_timeout, user_options) {
        this.filename = user_options.path + "/user_db.json";
        this.data = {
            version: 1,
            session: {},
            user: {},
            password_reset: {},
            diagram: {},
            shape_group_data: {
                categories: ["3dshapes", "networking", "clients", "servers", "security"],
                shape_group: {
                    "1": {name: "Shapes",description: "Basic shapes like cubes, spheres, ...",owner: null,public: true,category: "3dshapes",tags: []},
                    "2": {name: "Network",description: "Devices like routers, switches, loadbalancers, ...",owner: null,public: true,category: "networking",tags: []},
                    "3": {name: "Clients",description: "Users, laptops, desktops, printers, offices, ...",owner: null,public: true,category: "clients",tags: []},
                    "4": {name: "Servers",description: "Servers",owner: null,public: true,category: "servers",tags: []},
                    "5": {name: "Security",description: "Security devices like firewalls, antivirus, ...",owner: null,public: true,category: "security",tags: []},
                }
            },
        }
        this.user_timeout = user_timeout;
        this.save_timeout = save_timeout;
        this.ldap_grouprefresh_timeout = ldap_grouprefresh_timeout;
        this.register_self = user_options.register_self;
        this.admin_user = user_options.admin_username;
        this.admin_password = user_options.admin_password;
        this.allowed_domains = (Array.isArray(user_options.allowed_domains)) ? user_options.allowed_domains : [];
        this.authentication = user_options.authentication;
        this.ldap = user_options.ldap;
    }

    initialize() {
        // First, load the file with the data.
        try {
            let json = fs.readFileSync(this.filename);
            this.data = JSON.parse(json);
        } catch(e) {
            console.log("Couldn't read userMGT file. Running with empty user data.")
        }

        // Fix usermgt based on version
        let migrations = usermgt_migrations.fix_usermgt_version(this.data);
        migrations.forEach((entry) => { console.log("Migration on usermgt: " + entry.from + " => " + entry.to)});

        // Try a write. If it fails, we let the system fail.
        let json = JSON.stringify(this.data);
        try {
            fs.writeFileSync(this.filename, json);
        } catch(e) {
            throw("Can't write to user data file: " + e)
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
                    this.data.user[username].diagrams.forEach((diagram_uuid) => {
                        if(diagram_uuid in this.data.diagram) {
                            let diagram = this.data.diagram[diagram_uuid];
                            if(username in diagram.permissions)
                                delete diagram.permissions[username]
                        }
                    });
                    delete this.data.user[username];
                }
            }
            console.log("User Not Validated Cleanup Done")
        }, this.user_timeout * 1000);

        this.save_interval = setInterval(() => {
            this.save();
        }, this.save_timeout * 1000);

        // Set up ldap
        if(this.authentication === "ldap") {
            this.nmldap = new NMLDAP(this.ldap);

            console.log("Initial LDAP Group membership update started.")
            this.nmldap.update_group_members((err_list) => {
                if(err_list)
                    err_list.forEach((err) => {console.log(err)});
                console.log("Initial LDAP Group membership update done.")
            });

            this.ldap_grouprefresh_interval = setInterval(() => {
                console.log("LDAP Group membership update started.")
                this.nmldap.update_group_members((err_list) => {
                    if(err_list)
                        err_list.forEach((err) => {console.log(err)});
                    console.log("LDAP Group membership update done.")
                });
            }, this.ldap_grouprefresh_timeout * 1000);
        }
    }

    save() {
        console.log("Saving UserMGT data");
        let json = JSON.stringify(this.data);
        fs.writeFile(this.filename, json, (err) => {
            if(err)
                console.log("Error writing user file: " + err) 
            else
                console.log("UserMGT data saved");
        });
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

    isUserDomainAllowed(email) {
        // Check if user is in allowed domains list
        if(this.allowed_domains.length > 0) {
            let user_domain = email.split("@")[1];
            for(let x = 0; x < this.allowed_domains.length; x++) {
                if(this.allowed_domains[x] === user_domain)
                    return true;
            }
            return false;
        }
        return true;
    }

    createUser(userdata, callback) {
        if((!this.register_self) || (this.authentication !== "local")){
            callback("Users not allowed to register.");
            return;
        }

        if((!userdata) || (typeof(userdata) !== 'object') || (typeof(userdata.email) !== 'string') || (typeof(userdata.name) !== 'string') || (typeof(userdata.lastname) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }

        // Check first if parameters are valid
        if(!validator.isEmail(userdata.email)) {
            callback("Email address is not valid.");
            return;            
        }
        userdata.email = userdata.email.toLowerCase();

        // Check if user is in allowed domains list
        if(!this.isUserDomainAllowed(userdata.email)) {
            callback("Domain not allowed to register");
            return;
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
                mark_delete: false,
            };
            callback(null, activation_code);
        }
    }

    createOrUpdateLDAPUser(email, name, lastname) {
        if(!(email in this.data.user)) {
            // If the user doesn't exist, we create it
            this.data.user[email] = {
                name: name,
                lastname: lastname,
                password: null,
                salt: null,
                is_active: true,
                activation_code: null,
                activation_date: null,
                diagrams: [],
                mark_delete: false,
            }
        }
        else {
            // Update some data from this user
            this.data.user[email].name = name;
            this.data.user[email].lastname = lastname;
            this.data.user[email].is_active = true;
            this.data.user[email].mark_delete = false;
        }
    }

    validateUser(email, validate_string, callback) {
        if((!this.register_self) || (this.authentication !== "local")){
            callback("Users not allowed to register.");
            return;
        }

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
        if(this.authentication !== "local") {
            callback("Can't change password here (" + this.authentication + ").");
            return;
        }

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

        if((email in this.data.user) && (this.data.user[email].is_active) && (!this.data.user[email].mark_delete)) {
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
        if(this.authentication !== "local") {
            callback("Can't reset password here (" + this.authentication + ").");
            return;
        }

        if((typeof(email) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }

        email = email.toLowerCase();

        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }

        if((email in this.data.user) && (this.data.user[email].is_active) && (!this.data.user[email].mark_delete)) {
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
            callback("Email address not registered or not activated.");
        }
    }

    resetPassword(email, validation_code, callback) {
        if(this.authentication !== "local") {
            callback("Can't reset password here (" + this.authentication + ").");
            return;
        }

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
        }
    }

    loginUser(sessionid, email, password, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(email) !== 'string') || (typeof(password) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        email = email.toLowerCase();

        // Validate data
        if (!validator.isAlphanumeric(sessionid)) {
            callback("Invalid session id")
            return
        }
        if(!(sessionid in this.data.session)) {
            callback("Invalid session id");
            return
        }
        if (!validator.isEmail(email)) {
            callback("Invalid email")
            return
        }

        // Check if user is in allowed domains list
        if(!this.isUserDomainAllowed(email)) {
            callback("Domain not allowed to register");
            return;
        }

        if(this.authentication === "local") {
            if(!this.isValidPassword(password)) {
                callback("Invalid password")
                return          
            }
            if((email in this.data.user) && (this.data.user[email].is_active) && (!this.data.user[email].mark_delete)) {
                let hash = this.generateHash(password, this.data.user[email].salt);
                if (hash === this.data.user[email].password) {
                    this.data.session[sessionid].user = email;
                    this.data.session[sessionid].data.user = email;
                    this.data.session[sessionid].data.name = this.data.user[email].name;
                    this.data.session[sessionid].data.lastname = this.data.user[email].lastname;
                    callback(null, this.data.session[sessionid].data);
                }
                else
                    callback("Invalid username or password.");
            }
            else {
                callback("Invalid username or password.");
            }
        }
        else if(this.authentication === "ldap") {
            this.nmldap.emailAuthenticate(email, password, (err, user_data) => {
                if(err) {
                    if(err.name === "InvalidCredentialsError")
                        callback("Invalid Credentials");
                    else if(err.name === "NMLDAPError")
                        callback("Invalid Credentials: " + err.message);
                    else {
                        console.log("Unexpected LDAP error: " + err.name + " " + err.message);
                        callback("Unexpected error: " + err)
                    }
                    return;
                }

                this.createOrUpdateLDAPUser(email, user_data.name, user_data.lastname);

                // Update the session and callback success                
                this.data.session[sessionid].user = email;
                this.data.session[sessionid].data.user = email;
                this.data.session[sessionid].data.name = this.data.user[email].name;
                this.data.session[sessionid].data.lastname = this.data.user[email].lastname;
                callback(null, this.data.session[sessionid].data);                
            })
        }
        else {
            callback("No valid authentication method available.");
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
        if(this.authentication !== "local") {
            callback("Can't change user data here (" + this.authentication + ").");
            return;
        }

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
            link_sharing: false,
        }

        this.data.user[this.data.session[sessionid].user].diagrams.push(uuid);

        callback(null, uuid);
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
                let owner = {name: null, lastname: null};  // If a user is deleted, a diagram can end up without owner
                if(diagram.owner in this.data.user)
                    owner = this.data.user[diagram.owner];
                if(diagram.owner === user)
                    result.push({
                        uuid: diagram_uuid,
                        name: diagram.name,
                        permission: "OWNER",
                        oe: diagram.owner,
                        on: owner.name,
                        ol: owner.lastname,
                        ls: ("link_sharing" in diagram) ? diagram.link_sharing : false,
                    })
                else if(user in diagram.permissions)
                    result.push({
                        uuid: diagram_uuid,
                        name: diagram.name,
                        permission: diagram.permissions[user],
                        oe: diagram.owner,
                        on: owner.name,
                        ol: owner.lastname,
                        ls: ("link_sharing" in diagram) ? diagram.link_sharing : false,
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

        if(this.authentication === "local") {
            // Check if the user exists
            if(email in this.data.user) {
                this.data.diagram[uuid].permissions[email] = permission;
                this.data.user[email].diagrams.push(uuid);
                callback(null, null, {
                    req_name: this.data.session[sessionid].data.name, 
                    req_lastname: this.data.session[sessionid].data.lastname,
                    req_email: this.data.session[sessionid].user,
                    diag_name: this.data.diagram[uuid].name,
                });
            }
            else {
                this.createUser({email: email, name: "NewUser", lastname: "Lastname"}, (error, activationcode) => {
                    if (error) {
                        callback("Error sharing diagram: " + error);
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
        else if(this.authentication === "ldap") {
            // Check if user exists on ldap
            this.nmldap.emailSearch(email, (err, user_data) => {
                if(err) {
                    if(err.name === "NMLDAPError") {
                        // User does not exist in LDAP.
                        callback(err.message);
                        return;
                    }
                    else {
                        // Unexpected error
                        console.log(err);
                        callback("Unexpected error while checking user LDAP membership.")
                        return;
                    }
                }

                // Create or update data from the user this diagram is to be shared with
                this.createOrUpdateLDAPUser(email, user_data.name, user_data.lastname);

                // Finally, share the diagram with the user.
                this.data.diagram[uuid].permissions[email] = permission;
                this.data.user[email].diagrams.push(uuid);
                callback(null, null, {
                    req_name: this.data.session[sessionid].data.name, 
                    req_lastname: this.data.session[sessionid].data.lastname,
                    req_email: this.data.session[sessionid].user,
                    diag_name: this.data.diagram[uuid].name,
                });
            });
        }
        else
            callback("Invalid authentication method.");
    }

    link_sharing(sessionid, uuid, share, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(uuid) !== 'string') || (typeof(share) !== 'boolean')) {
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

        if(this.data.diagram[uuid].owner !==  this.data.session[sessionid].user) {
            callback("You don't have permission to do this action.");
            return;
        }

        this.data.diagram[uuid].link_sharing = share;
        callback(null, this.data.diagram[uuid].link_sharing);
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

        if((!(uuid in this.data.diagram)) || (this.data.diagram[uuid].mark_delete)) {
            callback("Invalid parameters.");
            return;
        }

        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }

        if(
                (this.data.session[sessionid].user !== "") && 
                (!(this.data.session[sessionid].user in this.data.user))
                ) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        if((this.data.session[sessionid].user !== "") && (this.data.diagram[uuid].owner === this.data.session[sessionid].user)) {
            callback(null, {
                sdata: this.data.session[sessionid].data,
                permission: "OWNER",
                ddata: {
                    name: this.data.diagram[uuid].name,
                },
            });
            return;
        }
        else if((this.data.session[sessionid].user !== "") && (this.data.session[sessionid].user in this.data.diagram[uuid].permissions)) {
            callback(null, {
                sdata: this.data.session[sessionid].data,
                permission: this.data.diagram[uuid].permissions[this.data.session[sessionid].user],
                ddata: {
                    name: this.data.diagram[uuid].name,
                },
            });
            return;
        }
        else if(this.data.diagram[uuid].link_sharing) {
            callback(null, {
                sdata: this.data.session[sessionid].data,
                permission: "RO",
                ddata: {
                    name: this.data.diagram[uuid].name,
                },
            });
            return;            
        }
        else {
            callback("Diagram identifier not valid.");
            return;
        }
    }

    listShapes(sessionid, callback) {
        if(typeof(sessionid) !== 'string') {
            callback("Invalid parameters.");
            return;
        }
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        let shapes = {};
        for(let key in this.data.shape_group_data.shape_group) {
            let shape = this.data.shape_group_data.shape_group[key];
            if((shape.owner === this.data.session[sessionid].user) || (shape.public === true)) {
                shapes[key] = shape;
            }
        }
        callback(null, shapes);
    }

    loginAdmin(sessionid, username, password, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(username) !== 'string') || (typeof(password) !== 'string')) {
            callback("Invalid parameters.");
            return;
        }
        username = username.toLowerCase();

        // Validate data
        if (!validator.isAlphanumeric(username)) {
            callback("Invalid user")
            return;
        }
        if(!this.isValidPassword(password)) {
            callback("Invalid password")
            return;
        }
        if(!(sessionid in this.data.session)) {
            callback("Invalid session id");
            return;
        }

        if((username === this.admin_user) && (password === this.admin_password)) {
            this.data.session[sessionid].data.admin = true;
            callback(null, this.data.session[sessionid].data);
        }
        else {
            callback("Invalid username or password.");
        }
    }

    logoutAdmin(sessionid, callback) {
        if(typeof(sessionid) !== 'string') {
            callback("Invalid parameters.");
            return;
        }
        if(sessionid in this.data.session) {
            this.data.session[sessionid].data.admin = false;
        }

        callback(null);
    }

    adminCreateUser(sessionid, userdata, callback) {
        if(this.authentication !== "local") {
            callback("Can't create user here (" + this.authentication + ").");
            return;
        }

        if(
                (typeof(sessionid) !== 'string') ||
                (!userdata) || (typeof(userdata) !== 'object') ||
                (typeof(userdata.email) !== 'string') ||
                (typeof(userdata.name) !== 'string') ||
                (typeof(userdata.lastname) !== 'string') ||
                (typeof(userdata.password) !== 'string')
                ) {
            callback("Invalid parameters.");
            return;
        }

        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.")
            return;
        }

        // Check if parameters are valid
        if(!validator.isEmail(userdata.email)) {
            callback("Email address is not valid.");
            return;
        }
        let email = userdata.email.toLowerCase();

        if(!this.isValidPassword(userdata.password)) {
            callback("Invalid new password");
            return;
        }

        // Check if the user exists
        if((userdata.email in this.data.user) && (!this.data.user[userdata.email].mark_delete)) {
            callback("Email already registered.");
            return;
        }


        // Generate salt and hash for the password
        const {salt, hash} = this.generateSaltedHash(userdata.password);

        this.data.user[userdata.email] = {
            name: userdata.name,
            lastname: userdata.lastname,
            password: hash,
            salt: salt,
            is_active: true,
            activation_code: null,
            activation_date: Date.now() + 1000 * 3600*24,
            diagrams: [],
        };
        callback(null);
    }

    adminChangeUserData(sessionid, email, name, lastname, callback) {
        if(this.authentication !== "local") {
            callback("Can't change user data here (" + this.authentication + ").");
            return;
        }

        if((typeof(sessionid) !== 'string') || (typeof(email) !== 'string') || (typeof(name) !== 'string') || (typeof(lastname) !== 'string')) {
            callback("Invalid parameters.");
            return;            
        }

        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.")
            return;
        }

        email = email.toLowerCase();

        // Validate data
        if (!validator.isEmail(email)) {
            callback("Invalid email");
            return;
        }

        if(email in this.data.user) {
            this.data.user[email].name = name;
            this.data.user[email].lastname = lastname;
            callback(null);
        }
        else {
            callback("Invalid email");
        }
    }

    adminChangeUserPassword(sessionid, email, password, callback) {
        if(this.authentication !== "local") {
            callback("Can't change password here (" + this.authentication + ").");
            return;
        }

        if((typeof(sessionid) !== 'string') || (typeof(email) !== 'string') || (typeof(password) !== 'string')) {
            callback("Invalid parameters.");
            return;            
        }

        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.")
            return;
        }

        email = email.toLowerCase();

        // Validate data
        if (!validator.isEmail(email)) {
            callback("Invalid email");
            return;
        }
        if(!this.isValidPassword(password)) {
            callback("Invalid password");
            return;
        }

        if(email in this.data.user) {
            // Password can be changed. Generate salt and hash and update database
            const {salt, hash} = this.generateSaltedHash(password);
            this.data.user[email].password = hash;
            this.data.user[email].salt = salt;
            callback(null);
        }
        else {
            callback("Invalid email");
        }
    }

    adminDeleteUser(sessionid, email, callback) {
        if((typeof(sessionid) !== 'string') || (typeof(email) !== 'string')) {
            callback("Invalid parameters");
            return;
        }

        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.")
            return;
        }

        email = email.toLowerCase();

        if(email in this.data.user) {
            this.data.user[email].mark_delete = true;

            // Logout session belonging to this user
            for(let sessionid in this.data.session) {
                if(this.data.session[sessionid].user === email) {
                    this.data.session[sessionid].user = "";
                    this.data.session[sessionid].data = {};
                }
            }

            // Mark all diagrams owned by this person as not owned by anyone (deactivated as now users are
            // marked as deleted)
            // for(let uuid in this.data.diagram) {
            //    if(this.data.diagram[uuid].owner === email) {
            //        this.data.diagram[uuid].owner = null;
            //    }
            // }

            // Remove all permissions from this user. Also, make a list of diagrams owned by this user
            // to update the list of diagrams this user has access to
            let owned_diagrams = [];
            for(let uuid in this.data.diagram) {
                if(email in this.data.diagram[uuid].permissions)
                    delete this.data.diagram[uuid].permissions[email];
                if(email === this.data.diagram[uuid].owner)
                    owned_diagrams.push(uuid);
            }

            // Update the user list of diagrams with the owned diagrams
            this.data.user[email].diagrams = owned_diagrams;

            callback(null);
        }
        else {
            callback("Invalid email");
        }
    }

    adminGetUsers(sessionid, callback) {
        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.");
            return;
        }

        callback(null, this.data.user);
    }

    adminGetSessions(sessionid, callback) {
        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.")
            return;
        }

        callback(null, this.data.session);
    }

    adminGetDiagrams(sessionid, callback) {
        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.")
            return;
        }

        callback(null, this.data.diagram);
    }

    adminChangeDiagramOwnership(sessionid, uuid, email, callback) {
        if(typeof(email) !== 'string') {
            callback("Invalid parameters")
            return;
        }
        email = email.toLowerCase();

        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.")
            return;
        }

        if((!(uuid in this.data.diagram)) || (!(email in this.data.user))) {
            callback("Invalid parameters");
            return;
        }

        // Change owner of the diagram
        let old_owner = this.data.diagram[uuid].owner;
        this.data.diagram[uuid].owner = email;

        // Add this diagram to the list of diagrams the new owner has access to
        if(this.data.user[email].diagrams.indexOf(uuid) === -1)
            this.data.user[email].diagrams.push(uuid);

        // Remove this diagram from the list of diagrams of the owner
        if(old_owner in this.data.user) {
            let index = this.data.user[old_owner].diagrams.indexOf(uuid);
            if(index !== -1)
                this.data.user[email].diagrams.splice(index, 1);
        }

        // Remove permissions of new owner on diagram (he doesn't need them anymore)
        if(email in this.data.diagram[uuid].permissions)
            delete this.data.diagram[uuid].permissions[email];

        callback(null);
    }

    adminDeleteDiagram(sessionid, uuid, callback) {
        // Check if session is an admin session
        if((!(sessionid in this.data.session)) || (!this.data.session[sessionid].data.admin)) {
            callback("Session is not admin session.")
            return;
        }

        if(!(uuid in this.data.diagram)) {
            callback("Invalid parameters");
            return;
        }

        // Delete the diagram
        this.data.diagram[uuid].mark_delete = true;
        callback(null);
    }
}

module.exports = UserMGT
