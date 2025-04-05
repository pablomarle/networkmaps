const { Logger } = require('../utils/logger');
const userLogger = new Logger({ prefix: 'UserMGT' });

const fs = require('fs').promises;
const utils = require('./utils.js');
const validators = require('./validators.js');

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

/**
 * Function to list the shapes of a user.
 * This function will return the shapes that are public or owned by the user.
 * @param {string} sessionid - The session id of the user.
 * @param {object} userMgtData - The user management data.
 * @returns {object} - The shapes of the user.
 */
function listShapes(sessionid, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true}, userMgtData);
    if(validateResult.error) {
        return {error: validateResult.error};
    }

    let shapes = {};
    for(let key in userMgtData.shape_group_data.shape_group) {
        let shape = userMgtData.shape_group_data.shape_group[key];
        if((shape.owner === userMgtData.session[sessionid].user) || (shape.public === true)) {
            shapes[key] = {
                owner: shape.owner,
                public: shape.public,
                name: shape.name,
                description: shape.description,
                category: shape.category,
                tags: shape.tags,
                am_i_owner: (shape.owner === userMgtData.session[sessionid].user),
            }
        }
    }

    return shapes;
}


/**
 * This function creates a new shapegroup.
 * It will create a new directory with the name of the shapegroup and
 * the initial files needed for the shapegroup.
 * The shapegroup will be created in the userMgtData.shapes_path directory.
 * @param {string} sessionid - The session id of the user.
 * @param {string} name - The name of the shapegroup.
 * @param {string} description - The description of the shapegroup.
 * @param {string} category - The category of the shapegroup.
 * @param {object} userMgtData - The user management data.
 * @param {string} shapesPath - The path to the shapes directory.
 * @returns {object} - The shapegroup created.
 */
async function newShape(sessionid, name, description, category, userMgtData, shapesPath) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true}, userMgtData);
    if(validateResult.error) {
        return {error: validateResult.error};
    }

    // Check if name, description and category are valid
    name = utils.sanitize_string(name, 1, 32);
    description = utils.sanitize_string(description, 1, 256);

    if(name === null) {
        return {error: "Invalid name."};
    }
    if(description === null) {
        return {error: "Invalid description."};
    }
    if((typeof(category) !== 'string') ||
        (userMgtData.shape_group_data.categories.indexOf(category) === -1)
        ) {
            return {error: "Invalid category."};
    }

    // Create an ID for this shape
    let exists = true;
    let key;
    while(exists) {
        key = "" + Date.now();
        if(!(key in userMgtData.shape_group_data.shape_group))
            exists = false;
    }

    // Create the shape structure
    userMgtData.shape_group_data.shape_group[key] = {
        name: name,
        description: description,
        owner: userMgtData.session[sessionid].user,
        public: false,
        category: category,
        tags: [],
    }

    // Create the needed directory and initial files
    let dir_path = shapesPath + "/" + key;
    // Create the directory
    try {
        await fs.mkdir(dir_path, {recursive: true});
    } catch (err) {
        delete userMgtData.shape_group_data.shape_group[key];
        userLogger.error("Failed to create directory for shapegroup:");
        userLogger.error(err);
        return {error: "Could not create shapegroup directory."};
    }

    // Add an icon for the "0" shape in this shapegroup (and for the shapegroup).
    try {
        await fs.copyFile("html/static/img/unknown.png", dir_path + "/0.png");
    } catch (err) {
        delete userMgtData.shape_group_data.shape_group[key];
        try {
            fs.rmdir(dir_path, {recursive: true});
        } catch (err) {
            userLogger.error("Failed to remove directory for shapegroup:");
            userLogger.error(err);
        }
        userLogger.error("Failed to copy unknown.png.");
        userLogger.error(err);
        return {error: "Could not create default files in shapegroup directory."};
    }

    // Add a texture for "0" shape in this shapegroup (and for the shapegroup).
    try {
        await fs.copyFile("html/static/textures/basic.png", dir_path + "/basic.png");
    } catch (err) {
        delete userMgtData.shape_group_data.shape_group[key];
        try {
            fs.rmdir(dir_path, {recursive: true});
        } catch (err) {
            userLogger.error("Failed to remove directory for shapegroup:");
            userLogger.error(err);
        }
        userLogger.error("Failed to copy basic.png.");
        userLogger.error(err);
        return {error: "Could not create default files in shapegroup directory."};
    }

    // Create the definition file of this shapegroup
    SHAPEGROUP_INITIAL_DEFINITION.name = name;
    SHAPEGROUP_INITIAL_DEFINITION.description = description;
    SHAPEGROUP_INITIAL_DEFINITION.category = category;
    SHAPEGROUP_INITIAL_DEFINITION.owner = userMgtData.session[sessionid].user;
    try {
        await fs.writeFile(dir_path + "/definition.json", JSON.stringify(SHAPEGROUP_INITIAL_DEFINITION), 'utf8');
    } catch (err) {
        delete userMgtData.shape_group_data.shape_group[key];
        try {
            fs.rmdir(dir_path, {recursive: true});
        } catch (err) {
            userLogger.error("Failed to remove directory for shapegroup:");
            userLogger.error(err);
        }
        userLogger.error("Failed to create definition.json.");
        userLogger.error(err);
        return {error: "Could not create default files in shapegroup directory."};
    }
    return {key: key, data: userMgtData.shape_group_data.shape_group[key]};
}

/**
    * Function that removes a shapegroup from the shapegroup structure.
    * This function will not remove the shapegroup directory. This will be reachable in case
    * any diagram uses them (and for recovery purposes)
    */
function deleteShape(sessionid, shape_key, callback) {
    /* Check if session id is valid */
    if(!(sessionid in userMgtData.session)) {
        callback("Session does not exist.");
        return;
    }
    if((!(userMgtData.session[sessionid].user in userMgtData.user))) {
        callback("Session doesn't have a valid user assigned");
        return;
    }

    // Check if shapegroup exists and if it's owned by the current user
    if(
        (typeof(shape_key) !== "string") ||
        (isNaN(shape_key)) ||
        (shape_key < 1000) ||
        (!(shape_key in userMgtData.shape_group_data.shape_group)) ||
        (userMgtData.shape_group_data.shape_group[shape_key].owner !== userMgtData.session[sessionid].user)
        ) {
        callback("Shape Group does not exists: " + shape_key);
        return;
    }

    // Delete shapegroup
    delete(userMgtData.shape_group_data.shape_group[shape_key]);
    callback(null);
}

/**
    * Function to update the shapes of a shapegroup
    */
function updateShapeShapes(sessionid, shape_key, shapes, callback) {
    /* Check if session id is valid */
    if(!(sessionid in userMgtData.session)) {
        callback("Session does not exist.");
        return;
    }
    if((!(userMgtData.session[sessionid].user in userMgtData.user))) {
        callback("Session doesn't have a valid user assigned");
        return;
    }

    // Check if shapegroup exists and if it's owned by the current user
    if(
        (typeof(shape_key) !== "string") ||
        (isNaN(shape_key)) ||
        (shape_key < 1000) ||
        (!(shape_key in userMgtData.shape_group_data.shape_group)) ||
        (userMgtData.shape_group_data.shape_group[shape_key].owner !== userMgtData.session[sessionid].user)
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
function updateShape(sessionid, shape_key, name, description, category, callback) {
    /* Check if session id is valid */
    if(!(sessionid in userMgtData.session)) {
        callback("Session does not exist.");
        return;
    }
    if((!(userMgtData.session[sessionid].user in userMgtData.user))) {
        callback("Session doesn't have a valid user assigned");
        return;
    }

    // Check if shapegroup exists and if it's owned by the current user
    if(
        (typeof(shape_key) !== "string") ||
        (isNaN(shape_key)) ||
        (shape_key < 1000) ||
        (!(shape_key in userMgtData.shape_group_data.shape_group)) ||
        (userMgtData.shape_group_data.shape_group[shape_key].owner !== userMgtData.session[sessionid].user)
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
        (userMgtData.shape_group_data.categories.indexOf(category) === -1)
        ) {
        callback("Invalid category.");
        return;
    }

    // Update the shape group in the usermgt object
    userMgtData.shape_group_data.shape_group[shape_key].name = name;
    userMgtData.shape_group_data.shape_group[shape_key].description = description;
    userMgtData.shape_group_data.shape_group[shape_key].category = category;

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
function removeShapeTexture(sessionid, shapegroup_key, filename, callback) {
    /* Check if session id is valid */
    if(!(sessionid in userMgtData.session)) {
        callback("Session does not exist.");
        return;
    }
    if((!(userMgtData.session[sessionid].user in userMgtData.user))) {
        callback("Session doesn't have a valid user assigned");
        return;
    }

    // Check if shapegroup exists and if it's owned by the current user
    if(
        (typeof(shapegroup_key) !== "string") ||
        (isNaN(shapegroup_key)) ||
        (shapegroup_key < 1000) ||
        (!(shapegroup_key in userMgtData.shape_group_data.shape_group)) ||
        (userMgtData.shape_group_data.shape_group[shapegroup_key].owner !== userMgtData.session[sessionid].user)
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
function uploadShapeTexture(sessionid, shapegroup_key, filename, file_contents, callback) {
    /* Check if session id is valid */
    if(!(sessionid in userMgtData.session)) {
        callback("Session does not exist.");
        return;
    }
    if((!(userMgtData.session[sessionid].user in userMgtData.user))) {
        callback("Session doesn't have a valid user assigned");
        return;
    }

    // Check if shapegroup exists and if it's owned by the current user
    if(
        (typeof(shapegroup_key) !== "string") ||
        (isNaN(shapegroup_key)) ||
        (shapegroup_key < 1000) ||
        (!(shapegroup_key in userMgtData.shape_group_data.shape_group)) ||
        (userMgtData.shape_group_data.shape_group[shapegroup_key].owner !== userMgtData.session[sessionid].user)
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
function uploadShapeIcon(sessionid, shapegroup_key, shape_key, file_contents, callback) {
    /* Check if session id is valid */
    if(!(sessionid in userMgtData.session)) {
        callback("Session does not exist.");
        return;
    }
    if((!(userMgtData.session[sessionid].user in userMgtData.user))) {
        callback("Session doesn't have a valid user assigned");
        return;
    }

    // Check if shapegroup exists and if it's owned by the current user
    if(
        (typeof(shapegroup_key) !== "string") ||
        (isNaN(shapegroup_key)) ||
        (shapegroup_key < 1000) ||
        (!(shapegroup_key in userMgtData.shape_group_data.shape_group)) ||
        (userMgtData.shape_group_data.shape_group[shapegroup_key].owner !== userMgtData.session[sessionid].user)
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

module.exports = {
    listShapes: listShapes,
    newShape: newShape,
    deleteShape: deleteShape,
    updateShape: updateShape,
    updateShapeShapes: updateShapeShapes,
    uploadShapeTexture: uploadShapeTexture,
    removeShapeTexture: removeShapeTexture,
    uploadShapeIcon: uploadShapeIcon,
};