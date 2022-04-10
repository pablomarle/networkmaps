const crypto = require("crypto");
const validator = require("validator")
const fs = require('fs');
const NMLDAP = require("./nmldap");
const NMOPENID = require("./nmopenid");
const usermgt_migrations = require("./usermgt_migrations");
const sharp = require("sharp");

// Constant that defines when a session is not valid any more
const SESSION_TIMEOUT = 30
const PWD_VALID_CHARS = "1234567890$%#!@_-qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
const FILENAME_VALID_CHARS = "1234567890_-.qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM ()"
const PWD_LENGTH = 12
const SALT_LENGTH = 16

let SHAPEGROUP_INITIAL_DEFINITION = {
    "name": "",
    "description": "",
    "category": "",
    "owner": "",
    "tags": [],
    "textures": ["basic.png"],
    "shapes": {
        "0": {
            "name": "Cube",
            "description": "Cube",
            "type": "basic",
            "base_scale": [1, 1, 1],
            "subshapes": [
                {
                    "flat_normals": true,
                    "texture": "basic.png",
                    "color": 4755182,
                    "is_texture_light": true,
                    "elements": [
                        {
                            "type": "vertex_list",
                            "v": [[-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5]],
                            "f": [[4,6,5], [4,7,6],[0,4,5], [0,5,1],[1,5,6], [1,6,2],[2,6,7], [2,7,3],[3,7,4], [3,4,0], [0,1,2], [0,2,3]],
                            "uv": [[[0,0],[1,1],[1,0]],[[0,0],[0,1],[1,1]],[[0,0],[0,1],[1,1]],[[0,0],[1,1],[1,0]],[[0,0],[0,1],[1,1]],[[0,0],[1,1],[1,0]],[[0,0],[0,1],[1,1]],[[0,0],[1,1],[1,0]],[[0,0],[0,1],[1,1]],[[0,0],[1,1],[1,0]],[[0,0],[0,1],[1,1]],[[0,0],[1,1],[1,0]]]
                        }
                    ]
                }
            ]
        }
    }
};

function sanitize_string(s, min, max) {
    if(
        (typeof(s) !== "string") ||
        (s.length < min) ||
        (s.length > max)
        )
        return null;
    return validator.escape(s);
}

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
            console.log("invalid char at pos " + x + ":" + fn[x]);
            return null
        }
    }

    return fn;
}

class UserMGT {
    constructor(user_timeout, save_timeout, ldap_grouprefresh_timeout, user_options, shapes_path, diagrams_path) {
        this.filename = user_options.path + "/user_db.json";
        this.data = {
            version: 3,
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
                    "6": {name: "Flow",description: "Elements for a flow diagrams",owner: null,public: true,category: "3dshapes",tags: []},
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
        this.openid = user_options.openid;
        this.shapes_path = shapes_path;
        this.diagrams_path = diagrams_path;
    }

    fix_user_version() {
        if((this.data.version === undefined) || (this.data.version === 1)) {
            console.log("Fixing userdb from v1 to v2");
            this.data.version = 2;
            for(let user in this.data.user) {
                this.data.user[user].textures = {};
            }
        }

        if((this.data.version === 2)) {
            console.log("Fixing userdb from v2 to v3");
            this.data.version = 3;
            for(let diagram in this.data.diagram) {
                diagram.type = "network";
            }
        }

        // Here we make sure new standard shapes are included
        if(! ("6" in this.data.shape_group_data.shape_group))
            this.data.shape_group_data.shape_group["6"] = {name: "Flow",description: "Elements for a flow diagrams",owner: null,public: true,category: "3dshapes",tags: []};

    }

    initialize() {
        // First, load the file with the data.
        try {
            let json = fs.readFileSync(this.filename);
            this.data = JSON.parse(json);
            this.fix_user_version();
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

        // Set up openid
        if(this.authentication === "openid") {
            NMOPENID.get_configuration(this.openid.auth_server_url, (error, openid_config) => {
                if(error) {
                    throw `Openid initialization error: ${error}`;
                }
                if(
                    (openid_config.scopes_supported.indexOf("openid") === -1)
                    || (openid_config.scopes_supported.indexOf("email") === -1)
                    || (openid_config.scopes_supported.indexOf("profile") === -1)
                    ) {
                    throw `Openid initialization error: Scopes not supported`;
                }
                if(
                    (openid_config.grant_types_supported.indexOf("authorization_code") === -1)
                    ) {
                    throw `Openid initialization error: Grant types does not include authorization_code`;
                }

                if(
                    (openid_config.token_endpoint_auth_methods_supported.indexOf("client_secret_post") === -1)
                    ) {
                    throw `Openid initialization error: tocken auth method client_secret_post not allowed`;
                }

                console.log("Openid initialized.");
                this.openid_config = {
                    authorization_endpoint: openid_config.authorization_endpoint,
                    token_endpoint: openid_config.token_endpoint,
                    userinfo_endpoint: openid_config.userinfo_endpoint,
                }
            })
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
                textures: {},
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
                textures: {},
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
            callback("You can't change your password here (" + this.authentication + " authentication).");
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
        else if(this.authentication === "openid") {
            callback("Refresh your browser to authenticate.");
        }
        else {
            callback("No valid authentication method available.");
        }
    }

    init_openid_auth(sessionid, server_url) {
        let state = crypto.randomBytes(32).toString('hex');
        this.data.session[sessionid].openid_state = state;

        let redirect_url = `${this.openid_config.authorization_endpoint}?response_type=code&scope=openid%20profile%20email` +
               `&client_id=${this.openid.client_id}&state=${state}&redirect_uri=${server_url}%2Fcb`;

        return [state, redirect_url];
    }

    auth_openid(sessionid, parameters, server_url, callback) {
        if(!(sessionid in this.data.session)) {
            callback("Invalid session ID");
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

        if(state != this.data.session[sessionid].openid_state) {
            callback(`Authentication failed: unexpected state data.`);
            return;
        }
        delete this.data.session[sessionid].openid_state;

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

        NMOPENID.authenticate(`${server_url}%2Fcb`, this.openid_config, code, this.openid.client_id, this.openid.secret, (err, data) => {
            if(err) {
                console.log(err);
                callback(err);
                return;
            }
            else {
                if(data.email in this.data.user) {
                    this.data.user[data.email].name = data.name;
                    this.data.user[data.email].lastname = data.lastname;
                }
                else if(this.isUserDomainAllowed(data.email)) {
                    this.data.user[data.email] = {
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
                this.data.session[sessionid].user = data.email;
                this.data.session[sessionid].data.user = data.email;
                this.data.session[sessionid].data.name = this.data.user[data.email].name;
                this.data.session[sessionid].data.lastname = this.data.user[data.email].lastname;
                callback();
            }
        });
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

    createDiagram(sessionid, diagram_name, diagram_type, callback) {
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

        if(["network", "basic"].indexOf(diagram_type) === -1) {
            callback("Diagram type invalid");
            return;
        }

        let uuid = crypto.randomBytes(32).toString('hex');
        this.data.diagram[uuid] = {
            name: diagram_name,
            type: diagram_type,
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
                        lm: diagram.last_modified,
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
                        lm: diagram.last_modified,
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
                    type: this.data.diagram[uuid].type,
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
                    type: this.data.diagram[uuid].type,
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
                    type: this.data.diagram[uuid].type,
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
                shapes[key] = {
                    owner: shape.owner,
                    public: shape.public,
                    name: shape.name,
                    description: shape.description,
                    category: shape.category,
                    tags: shape.tags,
                    am_i_owner: (shape.owner === this.data.session[sessionid].user),
                }
            }
        }
        callback(null, shapes);
    }

    /**
     * This function creates a new shapegroup.
     */
    newShape(sessionid, name, description, category, callback) {
        /* Check if session id is valid */
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        // Check if name, description and category are valid
        name = sanitize_string(name, 1, 32);
        description = sanitize_string(description, 1, 256);

        if(name === null) {
            callback("Invalid name.");
            return;
        }
        if(description === null) {
            callback("Invalid description.")
            return;
        }
        if((typeof(category) !== 'string') ||
            (this.data.shape_group_data.categories.indexOf(category) === -1)
            ) {
            callback("Invalid category.");
            return;
        }

        // Create an ID for this shape
        let exists = true;
        let key;
        while(exists) {
            key = "" + Date.now();
            if(!(key in this.data.shape_group_data.shape_group))
                exists = false;
        }

        // Create the shape structure
        this.data.shape_group_data.shape_group[key] = {
            name: name,
            description: description,
            owner: this.data.session[sessionid].user,
            public: false,
            category: category,
            tags: [],
        }

        // Create the needed directory and initial files
        let dir_path = this.shapes_path + "/" + key;
        // Create the directory
        fs.mkdir(dir_path, {}, (err) => {
            if (err) {
                delete this.data.shape_group_data.shape_group[key];
                callback("Could not create shapegroup directory.");
                console.log("Failed to create directory for shapegroup:");
                console.log(err);
                return;
            }
            // Add an icon for the "0" shape in this shapegroup (and for the shapegroup).
            fs.copyFile("html/static/img/unknown.png", dir_path + "/0.png", (err) => {
                if(err) {
                    delete this.data.shape_group_data.shape_group[key];
                    callback("Could not create default files in shapegroup directory.");
                    console.log("Failed to copy unknown.png.")
                    console.log(err);
                    return;
                }
                // Add a texture for "0" shape in this shapegroup (and for the shapegroup).
                fs.copyFile("html/static/textures/basic.png", dir_path + "/basic.png", (err) => {
                    if(err) {
                        delete this.data.shape_group_data.shape_group[key];
                        callback("Could not create default files in shapegroup directory.");
                        console.log("Failed to copy basic.png.")
                        console.log(err);
                        return;
                    }
                    // Create the definition file of this shapegroup
                    SHAPEGROUP_INITIAL_DEFINITION.name = name;
                    SHAPEGROUP_INITIAL_DEFINITION.description = description;
                    SHAPEGROUP_INITIAL_DEFINITION.category = category;
                    SHAPEGROUP_INITIAL_DEFINITION.owner = this.data.session[sessionid].user;
                    fs.writeFile(dir_path + "/definition.json", JSON.stringify(SHAPEGROUP_INITIAL_DEFINITION), 'utf8', (err) => {
                        if(err) {
                            delete this.data.shape_group_data.shape_group[key];
                            callback("Could not create default files in shapegroup directory.");
                            console.log("Failed to create definition.json.")
                            console.log(err);
                            return;
                        }
                        callback(null, {key: key, data: this.data.shape_group_data.shape_group[key]});
                    });
                });                
            });
        });
    }

    /**
     * Function that removes a shapegroup from the shapegroup structure.
     * This function will not remove the shapegroup directory. This will be reachable in case
     * any diagram uses them (and for recovery purposes)
     */
    deleteShape(sessionid, shape_key, callback) {
        /* Check if session id is valid */
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        // Check if shapegroup exists and if it's owned by the current user
        if(
            (typeof(shape_key) !== "string") ||
            (isNaN(shape_key)) ||
            (shape_key < 1000) ||
            (!(shape_key in this.data.shape_group_data.shape_group)) ||
            (this.data.shape_group_data.shape_group[shape_key].owner !== this.data.session[sessionid].user)
            ) {
            callback("Shape Group does not exists: " + shape_key);
            return;
        }

        // Delete shapegroup
        delete(this.data.shape_group_data.shape_group[shape_key]);
        callback(null);
    }

    /**
     * Function to update the shapes of a shapegroup
     */
    updateShapeShapes(sessionid, shape_key, shapes, callback) {
        /* Check if session id is valid */
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        // Check if shapegroup exists and if it's owned by the current user
        if(
            (typeof(shape_key) !== "string") ||
            (isNaN(shape_key)) ||
            (shape_key < 1000) ||
            (!(shape_key in this.data.shape_group_data.shape_group)) ||
            (this.data.shape_group_data.shape_group[shape_key].owner !== this.data.session[sessionid].user)
            ) {
            callback("Shape Group does not exists.");
            return;
        }

        // Load definition file
        let path = this.shapes_path + "/" + shape_key + "/definition.json";
        fs.readFile(path, (err, data) => {
            if(err) {
                callback("Error reading def file.");
                console.log("Failed to read file: " + path);
                console.log(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("Definition file not valid.");
                console.log("Error parsing JSON definition file: " + path);
                console.log(e);
                return;
            }

            // Compose a new shapes object verifying the shapes given are valid
            let result_shapes = {};

            if(typeof(shapes) !== "object") {
                callback("Invalid shapes format");
                return;
            }

            for(shape_key in shapes) {
                let shape = shapes[shape_key];
                let result_shape = {};
                if((isNaN(shape_key)) || (typeof(shape) !== "object")) {
                    callback("Invalid shape " + shape_key + " format.");
                    return;                
                }

                result_shapes[shape_key] = result_shape;
                
                // Verify shape name
                result_shape.name = sanitize_string(shape.name, 1, 16);
                if(result_shape.name === null) {
                    callback("Invalid shape " + shape_key + " name.");
                    return;
                }

                // Verify shape description
                result_shape.description = sanitize_string(shape.description, 1, 256);
                if(result_shape.description === null) {
                    callback("Invalid shape " + shape_key + " description.");
                    return;
                }

                // Verify shape type
                if(["l3device", "l2device", "basic"].indexOf(shape.type) === -1) {
                    callback("Invalid shape " + shape_key + " type.");
                    return;
                }
                result_shape.type = shape.type;

                // Verify base scale
                if((!Array.isArray(shape.base_scale)) || (shape.base_scale.length !== 3) ||
                    (typeof(shape.base_scale[0]) !== "number") ||
                    (typeof(shape.base_scale[1]) !== "number") ||
                    (typeof(shape.base_scale[2]) !== "number")) {
                    callback("Invalid shape " + shape_key + " base scale.");
                    return;
                }
                for(let x = 0; x < 2; x++) {
                    if((shape.base_scale[x] <= 0) || (shape.base_scale[x] > 16)) {
                        callback("Invalid shape " + shape_key + " base scale (less than 0 or greater than 16).");
                        return;
                    }
                }
                result_shape.base_scale = shape.base_scale;

                // Verify subshapes
                if((!Array.isArray(shape.subshapes)) || (shape.subshapes.length < 1) || (shape.subshapes.length > 2)) {
                    callback("Invalid shape " + shape_key + " subshapes.");
                    return;
                }

                result_shape.subshapes = [];
                for(let ss_index = 0; ss_index < shape.subshapes.length; ss_index++) {
                    let ss = shape.subshapes[ss_index];
                    let result_ss = {};
                    result_shape.subshapes.push(result_ss);

                    if(typeof(ss.flat_normals) !== "boolean") {
                        callback("Invalid shape " + shape_key + " flat normals.");
                        return;
                    }
                    result_ss.flat_normals = ss.flat_normals;

                    if(definition.textures.indexOf(ss.texture) === -1) {
                        callback("Invalid shape " + shape_key + " texture.");
                        return;
                    }
                    result_ss.texture = ss.texture;

                    if((typeof(ss.color) !== "number") || (!Number.isInteger(ss.color)) || (ss.color < 0) || (ss.color > 16777216)) {
                        callback("Invalid shape " + shape_key + " color.");
                        return;
                    }
                    result_ss.color = ss.color;

                    if(typeof(ss.is_texture_light) !== "boolean") {
                        callback("Invalid shape " + shape_key + " is_texture_light.");
                        return;
                    }
                    result_ss.is_texture_light = true;

                    if((!Array.isArray(ss.elements)) || (ss.elements.length < 1) || (ss.elements.length > 16)) {
                        callback("Invalid shape " + shape_key + " elements.");
                        return;
                    }

                    result_ss.elements = [];
                    for(let element_index = 0; element_index < ss.elements.length; element_index++) {
                        let element = ss.elements[element_index];
                        let result_element = {
                            type: "vertex_list",
                            v:[], f:[], uv:[],
                        };
                        result_ss.elements.push(result_element);

                        if(element.type === "vertex_list") {
                            if(
                                (!Array.isArray(element.v)) ||
                                (!Array.isArray(element.f)) ||
                                (!Array.isArray(element.uv)) ||
                                (element.f.length !== element.uv.length)) {
                                callback("Invalid shape " + shape_key + " elements.");
                                return;
                            }

                            for(let x = 0; x < element.v.length; x++) {
                                if((!Array.isArray(element.v[x])) ||
                                    (element.v[x].length !== 3) ||
                                    (isNaN(element.v[x][0])) || (isNaN(element.v[x][1])) || (isNaN(element.v[x][2]))) {
                                        callback("Invalid shape " + shape_key + " elements (vertex).");
                                        return;
                                }
                                result_element.v.push([parseFloat(element.v[x][0]), parseFloat(element.v[x][1]), parseFloat(element.v[x][2])]);
                            }
                            for(let x = 0; x < element.f.length; x++) {
                                if((!Array.isArray(element.f[x])) ||
                                    (element.f[x].length !== 3) ||
                                    (!Number.isInteger(element.f[x][0])) ||
                                    (!Number.isInteger(element.f[x][1])) ||
                                    (!Number.isInteger(element.f[x][2])) ||
                                    (element.f[x][0] < 0) || (element.f[x][0] >= element.v.length) ||
                                    (element.f[x][1] < 0) || (element.f[x][1] >= element.v.length) ||
                                    (element.f[x][2] < 0) || (element.f[x][2] >= element.v.length) ) {
                                        callback("Invalid shape " + shape_key + " elements (faces).");
                                        return;
                                }
                                if((!Array.isArray(element.uv[x])) ||
                                    (element.uv[x].length !== 3) ||
                                    (!Array.isArray(element.uv[x][0])) ||
                                    (element.uv[x][0].length !== 2) || (isNaN(element.uv[x][0][0])) || (isNaN(element.uv[x][0][1])) ||
                                    (element.uv[x][1].length !== 2) || (isNaN(element.uv[x][1][0])) || (isNaN(element.uv[x][1][1])) ||
                                    (element.uv[x][2].length !== 2) || (isNaN(element.uv[x][2][0])) || (isNaN(element.uv[x][2][1]))) {
                                        callback("Invalid shape " + shape_key + " elements (uvs).");
                                        return;
                                }
                                result_element.f.push([element.f[x][0], element.f[x][1], element.f[x][2]]);
                                result_element.uv.push([
                                    [element.uv[x][0][0], element.uv[x][0][1]],
                                    [element.uv[x][1][0], element.uv[x][1][1]],
                                    [element.uv[x][2][0], element.uv[x][2][1]]]);

                            }

                        }
                        else if(element.type === "cube") {
                            result_element.type = "cube";
                            let parameters = ["px", "py", "pz", "rx", "ry", "rz", "sx", "sy", "sz", "u1", "u2", "v1", "v2"];
                            for(let parameter of parameters) {
                                if(isNaN(element[parameter])) {
                                    callback("Invalid shape " + shape_key + " elements.");
                                    console.log(element);
                                    console.log(parameter)
                                    return;
                                }
                                result_element[parameter] = element[parameter];
                            }
                        }
                        else {
                            callback("Invalid shape " + shape_key + " elements (type).");
                            return;
                        }
                    }
                }
            }

            // Save definition file
            definition.shapes = result_shapes;

            data = JSON.stringify(definition);
            fs.writeFile(path, data, (err) => {
                if(err) {
                    callback("Error writing def file.");
                    console.log("Failed to write file: " + path);
                    console.log(err);
                    return;
                }
                else {
                    callback();
                }
            })
        });
    }

    /**
     * Function to change the name, description and category of a shape group
     */
    updateShape(sessionid, shape_key, name, description, category, callback) {
        /* Check if session id is valid */
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        // Check if shapegroup exists and if it's owned by the current user
        if(
            (typeof(shape_key) !== "string") ||
            (isNaN(shape_key)) ||
            (shape_key < 1000) ||
            (!(shape_key in this.data.shape_group_data.shape_group)) ||
            (this.data.shape_group_data.shape_group[shape_key].owner !== this.data.session[sessionid].user)
            ) {
            callback("Shape Group does not exists.");
            return;
        }

        // Check if name, description and category are valid
        name = sanitize_string(name, 1, 32);
        description = sanitize_string(description, 1, 256);

        if(name === null) {
            callback("Invalid name.");
            return;
        }
        if(description === null) {
            callback("Invalid description.")
            return;
        }
        if((typeof(category) !== 'string') ||
            (this.data.shape_group_data.categories.indexOf(category) === -1)
            ) {
            callback("Invalid category.");
            return;
        }

        // Update the shape group in the usermgt object
        this.data.shape_group_data.shape_group[shape_key].name = name;
        this.data.shape_group_data.shape_group[shape_key].description = description;
        this.data.shape_group_data.shape_group[shape_key].category = category;

        // Update the shapegroup definition file.
        let path = this.shapes_path + "/" + shape_key + "/definition.json";
        fs.readFile(path, (err, data) => {
            if(err) {
                callback("ShapeGroup partially updated. Error reading def file.");
                console.log("Failed to read file: " + path);
                console.log(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("ShapeGroup partially updated. Definition not valid.");
                console.log("Error parsing JSON definition file: " + path);
                console.log(e);
                return;                
            }

            definition.name = name;
            definition.description = description;
            definition.category = category;
            data = JSON.stringify(definition);
            fs.writeFile(path, data, (err) => {
                if(err) {
                    callback("ShapeGroup partially updated. Error writing def file.");
                    console.log("Failed to write file: " + path);
                    console.log(err);
                    return;
                }
                else {
                    callback();
                }
            })
        });
    }

    /**
     * Function to remove a texture from a shapegroup
     */
    removeShapeTexture(sessionid, shapegroup_key, filename, callback) {
        /* Check if session id is valid */
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        // Check if shapegroup exists and if it's owned by the current user
        if(
            (typeof(shapegroup_key) !== "string") ||
            (isNaN(shapegroup_key)) ||
            (shapegroup_key < 1000) ||
            (!(shapegroup_key in this.data.shape_group_data.shape_group)) ||
            (this.data.shape_group_data.shape_group[shapegroup_key].owner !== this.data.session[sessionid].user)
            ) {
            callback("Shape Group does not exists.");
            return;
        }

        let path = this.shapes_path + "/" + shapegroup_key + "/";

        // Load definition file
        fs.readFile(path + "definition.json", (err, data) => {
            if(err) {
                callback("Error reading definition file.");
                console.log("Failed to read file: " + path + "definition.json");
                console.log(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("Definition file seems to be corrupted.");
                console.log("Error parsing JSON definition file: " + path + "definition.json");
                console.log(e);
                return;                
            }

            // Check if texture filename is there.
            let texture_index = definition["textures"].indexOf(filename);
            if(texture_index === -1) {
                callback("Texture filename does not exist.");
                return;
            }

            // Remove texture from the definition
            definition.textures.splice(texture_index, 1);

            // Write definition file
            fs.writeFile(path + "definition.json", JSON.stringify(definition), (err) => {
                if(err) {
                    callback("Error writing def file.");
                    console.log("Failed to write file: " + path + definition);
                    console.log(err);
                    return;
                }
                else {
                    fs.unlink(path + filename, (err) => {
                        if(err) {
                            callback("Error removing file from disc.");
                            console.log("Failed to remove texture file: " + path + filename);
                            console.log(err);
                            return;                            
                        }
                        callback(null);
                    })
                }
            })
        })
    }

    /**
     * Upload a texture file to a shapegroup
     */
    uploadShapeTexture(sessionid, shapegroup_key, filename, file_contents, callback) {
        /* Check if session id is valid */
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        // Check if shapegroup exists and if it's owned by the current user
        if(
            (typeof(shapegroup_key) !== "string") ||
            (isNaN(shapegroup_key)) ||
            (shapegroup_key < 1000) ||
            (!(shapegroup_key in this.data.shape_group_data.shape_group)) ||
            (this.data.shape_group_data.shape_group[shapegroup_key].owner !== this.data.session[sessionid].user)
            ) {
            callback("Shape Group does not exists.");
            return;
        }

        // Sanitize filename
        let old_filename = filename;
        filename = sanitize_filename(filename);
        if(filename === null) {
            callback("Invalid filename: " + old_filename);
            return;
        }
        if("qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM".indexOf(filename[0]) === -1) {
            callback("File name must start with a letter.");
            return;            
        }
        
        let path = this.shapes_path + "/" + shapegroup_key + "/";
        
        // Load definition file
        fs.readFile(path + "definition.json", (err, data) => {
            if(err) {
                callback("Error reading definition file.");
                console.log("Failed to read file: " + path + "definition.json");
                console.log(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("Definition file seems to be corrupted.");
                console.log("Error parsing JSON definition file: " + path + "definition.json");
                console.log(e);
                return;                
            }

            // Check if texture filename doesn't already exist. If not, add it to the definition file.
            if(definition["textures"].indexOf(filename) !== -1) {
                callback("Texture filename already exists.");
                return;
            }
            definition["textures"].push(filename);

            // Write texture to disk
            fs.writeFile(path + filename, file_contents, {encoding: "latin1", flag: "w"}, (err) => {
                if(err) {
                    callback("Error writing texture to disc.");
                    console.log("Error writing texture file to disk:" + path + filename);
                    return;
                }

                // Write definition file
                let data = JSON.stringify(definition);
                fs.writeFile(path + "definition.json", data, (err) => {
                    if(err) {
                        callback("Error writing def file.");
                        console.log("Failed to write file: " + path + definition);
                        console.log(err);
                        return;
                    }
                    else {
                        callback(null, filename);
                    }
                })
            });
        });
    }

    /**
     * Upload an icon file to a shapegroup for a shape
     */
    uploadShapeIcon(sessionid, shapegroup_key, shape_key, file_contents, callback) {
        /* Check if session id is valid */
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        // Check if shapegroup exists and if it's owned by the current user
        if(
            (typeof(shapegroup_key) !== "string") ||
            (isNaN(shapegroup_key)) ||
            (shapegroup_key < 1000) ||
            (!(shapegroup_key in this.data.shape_group_data.shape_group)) ||
            (this.data.shape_group_data.shape_group[shapegroup_key].owner !== this.data.session[sessionid].user)
            ) {
            callback("Shape Group does not exists.");
            return;
        }

        let path = this.shapes_path + "/" + shapegroup_key + "/";

        // Load definition file
        fs.readFile(path + "definition.json", (err, data) => {
            if(err) {
                callback("Error reading definition file.");
                console.log("Failed to read file: " + path + "definition.json");
                console.log(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("Definition file seems to be corrupted.");
                console.log("Error parsing JSON definition file: " + path + "definition.json");
                console.log(e);
                return;
            }

            // Check the shape key exists
            if(!shape_key in definition.shapes) {
                callback("Shape key does not exist.");
                return;                
            }

            // Save the file
            // Write texture to disk
            let filename = shape_key + ".png";
            fs.writeFile(path + filename, file_contents, {encoding: "latin1", flag: "w"}, (err) => {
                if(err) {
                    callback("Error writing icon to disc.");
                    console.log("Error writing icon file to disk:" + path + filename);
                    return;
                }
                callback(null, filename);
            });
        });
    }

    /**
     * Upload a user texture file
     */
    uploadUserTexture(sessionid, filename, file_contents, callback) {
        /* Check if session id is valid */
        if(!(sessionid in this.data.session)) {
            callback("Session does not exist.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Session doesn't have a valid user assigned");
            return;
        }

        // Sanitize filename
        let old_filename = filename;
        filename = sanitize_filename(filename);
        if(filename === null) {
            callback("Invalid filename: " + old_filename);
            return;
        }

        // Verify if this is really an image and find what size we will store
        let img = sharp(Buffer.from(file_contents, "latin1"));
        console.log("Ready");
        img.metadata((err, metadata) => {
            if(err) {
                console.log("Uploaded file is not valid: " + sessionid + " " + filename + " " + err);
                callback("Uploaded file is not valid.");
                return;
            }
            console.log(metadata);
            // Resize the image.
            let width = 1 << 31 - Math.clz32(metadata.width);
            let height = 1 << 31 - Math.clz32(metadata.height);
            let size = (width > height) ? width : height;
            if(size > 512)   // Limit size to 512x512
                size = 512;

            img.resize(size, size, {fit: "fill"}).toFormat("png").toBuffer((err, data, info) => {
                if(err) {
                    console.log("Failed convet to buffer uploaded file " + sessionid + " " + filename);
                    callback("Failed convet to buffer uploaded file");
                    return;
                }
                let hash = crypto.createHash('sha512');
                hash.update(data);
                const digest = hash.digest().toString('hex');
                let path = this.diagrams_path + "/textures/" + digest + ".png";

                // Save file
                img.toFile(path, (err) => {
                    if(err) {
                        console.log("Failed to save uploaded file " + sessionid + " " + filename + " " + path + " " + err);
                        callback("Failed to save uploaded file");
                        return;
                    }
                    this.data.user[this.data.session[sessionid].user].textures[digest] = {"name": filename};
                    callback(null, digest);
                })
            });
        })
    }

    renameUserTexture(sessionid, texture_id, new_name, callback) {
        if(!(sessionid in this.data.session)) {
            callback("Invalid session id.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Invalid user.");
            return;
        }
        let user = this.data.user[this.data.session[sessionid].user];

        if(!(texture_id in user.textures)) {
            callback("Invalid texture id.");
            return;
        }
        new_name = sanitize_filename(new_name);
        if(new_name === null) {
            callback("Invalid name.");
            return;
        }
        user.textures[texture_id].name = new_name;
        callback();
    }

    deleteUserTexture(sessionid, texture_id, callback) {
        if(!(sessionid in this.data.session)) {
            callback("Invalid session id.");
            return;
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            callback("Invalid user.");
            return;
        }
        let user = this.data.user[this.data.session[sessionid].user];

        if(!(texture_id in user.textures)) {
            callback("Invalid texture id.");
            return;
        }
        delete user.textures[texture_id];
        callback();
    }

    getUserTextures(sessionid) {
        if(!(sessionid in this.data.session)) {
            return null
        }
        if((!(this.data.session[sessionid].user in this.data.user))) {
            return null;
        }

        let user = this.data.user[this.data.session[sessionid].user];
        let result = {};
        for(let id in user.textures) {
            result[id] = {"name": user.textures[id].name};
        }

        return result;
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
            textures: {},
            mark_delete: false,
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
