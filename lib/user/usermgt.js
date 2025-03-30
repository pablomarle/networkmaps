const { Logger } = require('../utils/logger');
const userLogger = new Logger({ prefix: 'UserMGT' });

const context = require('../context');
const crypto = require("crypto");
const validator = require("validator")
const syncfs = require('fs');
const fs = syncfs.promises;
const NMLDAP = require("../nmldap");
const NMOPENID = require("../nmopenid");
const usermgt_migrations = require("./usermgt_migrations");
const sharp = require("sharp");
const utils = require("./utils");
const validators = require("./validators");
const session_manager = require("./session_manager");
const authentication = require("./authentication");
const diagramManager = require("./diagram_manager");

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

class UserMGT {
    constructor() {
        this.filename = context.config.users.path + "/user_db.json";
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
        this.user_timeout = context.config.timers.usertimeout;
        this.save_timeout = context.config.timers.usersavetimeout;
        this.ldap_grouprefresh_timeout = context.config.timers.ldap_grouprefresh;
        this.register_self = context.config.users.register_self;
        this.admin_user = context.config.users.admin_username;
        this.admin_password = context.config.users.admin_password;
        this.allowed_domains = (Array.isArray(context.config.users.allowed_domains)) ? context.config.users.allowed_domains : [];
        this.authentication = context.config.users.authentication;
        this.ldap = context.config.users.ldap;
        this.openid = context.config.users.openid;
        this.shapes_path = context.config.diagrams.shapes;
        this.diagrams_path = context.config.diagrams.path;
    }

    fix_user_version() {
        if((this.data.version === undefined) || (this.data.version === 1)) {
            userLogger.info("Fixing userdb from v1 to v2");
            this.data.version = 2;
            for(let user in this.data.user) {
                this.data.user[user].textures = {};
            }
        }

        if((this.data.version === 2)) {
            userLogger.info("Fixing userdb from v2 to v3");
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
            let json = syncfs.readFileSync(this.filename);
            this.data = JSON.parse(json);
            this.fix_user_version();
        } catch(e) {
            userLogger.info("Couldn't read userMGT file. Running with empty user data.")
        }

        // Fix usermgt based on version
        let migrations = usermgt_migrations.fix_usermgt_version(this.data);
        migrations.forEach((entry) => {
            userLogger.info(`Migration on usermgt: ${entry.from} => ${entry.to}`);
        });

        // Try a write. If it fails, we let the system fail.
        let json = JSON.stringify(this.data);
        try {
            syncfs.writeFileSync(this.filename, json);
        } catch(e) {
            throw("Can't write to user data file: " + e)
        }

        // Then, setup timeouts to do cleanup and save data
        this.cleanup_interval = setInterval(() => {
            let timestamp = Date.now();

            userLogger.info("Password Reset cleanup Running")
            for(let activation_code in this.data.password_reset) {
                if(this.data.password_reset[activation_code].activation_date < timestamp)
                    delete this.data.password_reset[activation_code];
            }
            userLogger.info("Password Reset cleanup Done")

            userLogger.info("Session Cleanup Running")
            session_manager.cleanupSessions(this.data, 1000 * context.config.timers.session_timeout);
            userLogger.info("Session Cleanup Done")

            userLogger.info("User Not Validated Cleanup Running")
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
            userLogger.info("User Not Validated Cleanup Done")
        }, this.user_timeout * 1000);

        this.save_interval = setInterval(() => {
            this.save();
        }, this.save_timeout * 1000);

        // Set up ldap
        if(this.authentication === "ldap") {
            this.nmldap = new NMLDAP(this.ldap);

            userLogger.info("Initial LDAP Group membership update started.")
            this.nmldap.update_group_members((err_list) => {
                if(err_list)
                    err_list.forEach((err) => {userLogger.error(err)});
                userLogger.info("Initial LDAP Group membership update done.")
            });

            this.ldap_grouprefresh_interval = setInterval(() => {
                userLogger.info("LDAP Group membership update started.")
                this.nmldap.update_group_members((err_list) => {
                    if(err_list)
                        err_list.forEach((err) => {userLogger.error(err)});
                    userLogger.info("LDAP Group membership update done.")
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

                userLogger.info("Openid initialized.");
                this.openid_config = {
                    authorization_endpoint: openid_config.authorization_endpoint,
                    token_endpoint: openid_config.token_endpoint,
                    userinfo_endpoint: openid_config.userinfo_endpoint,
                }
            })
        }
    }

    async save() {
        userLogger.info("Saving UserMGT data");
        let json = JSON.stringify(this.data);
        try {
            await fs.writeFile(this.filename, json);
            userLogger.info("UserMGT data saved");
        } catch(e) {
            userLogger.error("Error writing user file: " + e)
        }
    }

    saveSync() {
        userLogger.info("Saving UserMGT data");
        let json = JSON.stringify(this.data);
        let err = syncfs.writeFileSync(this.filename, json);
        if(err)
            userLogger.error("Error writing user file: " + err)
        userLogger.info("UserMGT data saved");
    }

    /**
     * Function to get the session data
     * @param {string} sessionid - Session identifier
     * @returns {Object} Session data object
     */
    getSession(sessionid) {
        return session_manager.getSession(sessionid, this.data);
    }

    /**
     * Creates a new user in the system
     *
     * @param {Object} userdata - User information object
     * @param {string} userdata.email - User's email address
     * @param {string} userdata.name - User's first name
     * @param {string} userdata.lastname - User's last name
     * @returns {Object} Result object with success status and activation code or error
     */
    createUser(userdata) {
        return authentication.createUser(userdata, this.data, this.authentication, this.register_self, this.allowed_domains);
    }

    /**
     * Function to validate a user
     * @param {string} email - User's email address
     * @param {string} validate_string - Validation string
     * @returns {Object} Result object with success status or error
     */
    validateUser(email, validate_string) {
        return authentication.validateUser(email, validate_string, this.data, this.authentication, this.register_self, this.allowed_domains);
    }

    /**
     * Function to change a user's password
     * @param {string} email - User's email address
     * @param {string} oldpassword - User's old password
     * @param {string} newpassword - User's new password
     * @returns {Object} Result object with success status or error
     */
    changePassword(email, oldpassword, newpassword) {
        return authentication.changePassword(email, oldpassword, newpassword, this.data, this.authentication, this.allowed_domains);
    }

    /**
     * Function to request a password reset
     * @param {string} email - User's email address
     * @param {string} validation_code - Validation code
     * @returns {Object} Result object with success status or error
     */
    requestResetPassword(email) {
        return authentication.requestResetPassword(email, this.data, this.authentication, this.allowed_domains);
    }

    /**
     * Function to reset a user's password
     * @param {string} email - User's email address
     * @param {string} validation_code - Validation code
     * @returns {Object} Result object with success status or error
     */
    resetPassword(email, validation_code) {
        return authentication.resetPassword(email, validation_code, this.data, this.authentication, this.allowed_domains);
    }

    /**
     * Function to login a user
     * @param {string} sessionid - Session identifier
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Object} Result object with success status or error
     */
    async loginUser(sessionid, email, password) {
        return await authentication.loginUser(sessionid, email, password, this.data, this.authentication, this.allowed_domains, this.nmldap);
    }

    /**
     * Function to initialize OpenID authentication
     * @param {string} sessionid - Session identifier
     * @param {string} server_url - Server URL
     * @returns {Object} Result object with redirect URL or error
     */
    initOpenidAuth(sessionid, server_url) {
        return authentication.initOpenidAuth(sessionid, server_url, this.openid_config, this.openid, this.data, this.authentication, this.allowed_domains);
    }

    authOpenid(sessionid, parameters, server_url, callback) {
        return authentication.authOpenid(sessionid, parameters, server_url, this.openid_config, this.openid, this.data, this.openid, this.data, this.authentication, this.allowed_domains, callback);
    }

    logoutUser(sessionid) {
        return authentication.logoutUser(sessionid, this.data, this.authentication, this.allowed_domains);
    }

    changeUserData(sessionid, newusername, newuserlastname) {
        return authentication.changeUserData(sessionid, newusername, newuserlastname, this.data, this.authentication, this.allowed_domains);
    }

    /**
     * Creates a new diagram
     *
     * @param {string} sessionid - Session identifier
     * @param {string} diagram_name - Name for the new diagram
     * @param {string} diagram_type - Type of diagram ('network' or 'basic')
     * @returns {Object} Result object with UUID or error
     */
    createDiagram(sessionid, diagram_name, diagram_type) {
        return diagramManager.createDiagram(sessionid, diagram_name, diagram_type, this.data);
    }

    /**
     * Function to get a list of diagrams for a user
     * @param {str} sessionid
     * @returns {Object} Result object with list of diagrams or error
     */
    getListDiagrams(sessionid) {
        return diagramManager.getListDiagrams(sessionid, this.data);
    }

    /**
     * Function to rename a diagram
     * @param {str} sessionid
     * @param {str} uuid
     * @param {str} newname
     * @returns {Object} Result object with error or success
     */
    renameDiagram(sessionid, uuid, newname) {
        return diagramManager.renameDiagram(sessionid, uuid, newname, this.data);
    }

    /**
     * Function to delete a diagram
     * @param {str} sessionid
     * @param {str} uuid
     * @returns {Object} Result object with error or success
     */
    deleteDiagram(sessionid, uuid) {
        return diagramManager.deleteDiagram(sessionid, uuid, this.data);
    }

    /**
     * Function to get diagram permissions
     * @param {str} sessionid
     * @param {str} uuid
     * @returns {Object} Result object with error or permissions
     */
    getDiagramPermissions(sessionid, uuid) {
        return diagramManager.getDiagramPermissions(sessionid, uuid, this.data);
    }

    /**
     * Function to delete diagram permissions
     * @param {str} sessionid
     * @param {str} uuid
     * @param {str} email
     * @returns {Object} Result object with error or success
     */
    deleteDiagramPermission(sessionid, uuid, email) {
        return diagramManager.deleteDiagramPermission(sessionid, uuid, email, this.data);
    }

    /**
     * Function to share a diagram
     * @param {str} sessionid
     * @param {str} uuid
     * @param {str} email
     * @param {str} permission
     * @returns {Promise} Result object with error or success
     */
    async shareDiagram(sessionid, uuid, email, permission) {
        return await diagramManager.shareDiagram(sessionid, uuid, email, permission, this.data);
    }

    /**
     * Function to set link sharing for a diagram
     * @param {str} sessionid
     * @param {str} uuid
     * @param {bool} share
     * @returns {Object} Result object with error or success
     */
    linkSharing(sessionid, uuid, share) {
        return diagramManager.linkSharing(sessionid, uuid, share, this.data);
    }

    isUserAllowed(sessionid, uuid) {
        return diagramManager.isUserAllowed(sessionid, uuid, this.data);
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
        name = utils.sanitize_string(name, 1, 32);
        description = utils.sanitize_string(description, 1, 256);

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
                userLogger.error("Failed to create directory for shapegroup:");
                userLogger.error(err);
                return;
            }
            // Add an icon for the "0" shape in this shapegroup (and for the shapegroup).
            fs.copyFile("html/static/img/unknown.png", dir_path + "/0.png", (err) => {
                if(err) {
                    delete this.data.shape_group_data.shape_group[key];
                    callback("Could not create default files in shapegroup directory.");
                    userLogger.error("Failed to copy unknown.png.");
                    userLogger.error(err);
                    return;
                }
                // Add a texture for "0" shape in this shapegroup (and for the shapegroup).
                fs.copyFile("html/static/textures/basic.png", dir_path + "/basic.png", (err) => {
                    if(err) {
                        delete this.data.shape_group_data.shape_group[key];
                        callback("Could not create default files in shapegroup directory.");
                        userLogger.error("Failed to copy basic.png.");
                        userLogger.error(err);
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
                            userLogger.error("Failed to create definition.json.");
                            userLogger.error(err);
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
                userLogger.error(`Failed to read file: ${path}`);
                userLogger.error(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("Definition file not valid.");
                userLogger.error(`Error parsing JSON definition file: ${path}`);
                userLogger.error(e);
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
                result_shape.name = utils.sanitize_string(shape.name, 1, 16);
                if(result_shape.name === null) {
                    callback("Invalid shape " + shape_key + " name.");
                    return;
                }

                // Verify shape description
                result_shape.description = utils.sanitize_string(shape.description, 1, 256);
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
                    userLogger.error(`Failed to write file: ${path}`);
                    userLogger.error(err);
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
        name = utils.sanitize_string(name, 1, 32);
        description = utils.sanitize_string(description, 1, 256);

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
                userLogger.error(`Failed to read file: ${path}`);
                userLogger.error(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("ShapeGroup partially updated. Definition not valid.");
                userLogger.error(`Error parsing JSON definition file: ${path}`);
                userLogger.error(e);
                return;
            }

            definition.name = name;
            definition.description = description;
            definition.category = category;
            data = JSON.stringify(definition);
            fs.writeFile(path, data, (err) => {
                if(err) {
                    callback("ShapeGroup partially updated. Error writing def file.");
                    userLogger.error(`Failed to write file: ${path}`);
                    userLogger.error(err);
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
                userLogger.error(`Failed to read file: ${path}definition.json`);
                userLogger.error(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("Definition file seems to be corrupted.");
                userLogger.error(`Error parsing JSON definition file: ${path}definition.json`);
                userLogger.error(e);
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
                    userLogger.error(`Failed to write file: ${path}definition`);
                    userLogger.error(err);
                    return;
                }
                else {
                    fs.unlink(path + filename, (err) => {
                        if(err) {
                            callback("Error removing file from disc.");
                            userLogger.error(`Failed to remove texture file: ${path}${filename}`);
                            userLogger.error(err);
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
        filename = utils.sanitize_filename(filename);
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
                userLogger.error(`Failed to read file: ${path}definition.json`);
                userLogger.error(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("Definition file seems to be corrupted.");
                userLogger.error(`Error parsing JSON definition file: ${path}definition.json`);
                userLogger.error(e);
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
                    userLogger.error(`Failed to write file: ${path}${filename}`);
                    userLogger.error(err);
                    return;
                }

                // Write definition file
                let data = JSON.stringify(definition);
                fs.writeFile(path + "definition.json", data, (err) => {
                    if(err) {
                        callback("Error writing def file.");
                        userLogger.error(`Failed to write file: ${path}definition`);
                        userLogger.error(err);
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
                userLogger.error(`Failed to read file: ${path}definition.json`);
                userLogger.error(err);
                return;
            }
            let definition;
            try {
                definition = JSON.parse(data);
            }
            catch (e) {
                callback("Definition file seems to be corrupted.");
                userLogger.error(`Error parsing JSON definition file: ${path}definition.json`);
                userLogger.error(e);
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
                    userLogger.error(`Failed to write file: ${path}${filename}`);
                    userLogger.error(err);
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
        filename = utils.sanitize_filename(filename);
        if(filename === null) {
            callback("Invalid filename: " + old_filename);
            return;
        }

        // Verify if this is really an image and find what size we will store
        let img = sharp(Buffer.from(file_contents, "latin1"));
        userLogger.info("Ready");
        img.metadata((err, metadata) => {
            if(err) {
                userLogger.error(`Uploaded file is not valid: ${sessionid} ${filename} ${err}`);
                callback("Uploaded file is not valid.");
                return;
            }
            userLogger.info(metadata);
            // Resize the image.
            let width = 1 << 31 - Math.clz32(metadata.width);
            let height = 1 << 31 - Math.clz32(metadata.height);
            let size = (width > height) ? width : height;
            if(size > 512)   // Limit size to 512x512
                size = 512;

            img.resize(size, size, {fit: "fill"}).toFormat("png").toBuffer((err, data, info) => {
                if(err) {
                    userLogger.error(`Failed convert to buffer uploaded file ${sessionid} ${filename}`);
                    callback("Failed convert to buffer uploaded file");
                    return;
                }
                let hash = crypto.createHash('sha512');
                hash.update(data);
                const digest = hash.digest().toString('hex');
                let path = this.diagrams_path + "/textures/" + digest + ".png";

                // Save file
                img.toFile(path, (err) => {
                    if(err) {
                        userLogger.error(`Failed to save uploaded file ${sessionid} ${filename} ${path} ${err}`);
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
        new_name = utils.sanitize_filename(new_name);
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
        if(!utils.isValidPassword(password)) {
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

        if(!utils.isValidPassword(userdata.password)) {
            callback("Invalid new password");
            return;
        }

        // Check if the user exists
        if((userdata.email in this.data.user) && (!this.data.user[userdata.email].mark_delete)) {
            callback("Email already registered.");
            return;
        }


        // Generate salt and hash for the password
        const {salt, hash} = utils.generateSaltedHash(userdata.password);

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
        if(!utils.isValidPassword(password)) {
            callback("Invalid password");
            return;
        }

        if(email in this.data.user) {
            // Password can be changed. Generate salt and hash and update database
            const {salt, hash} = utils.generateSaltedHash(password);
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
