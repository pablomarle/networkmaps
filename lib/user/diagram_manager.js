const validators = require('./validators');
const crypto = require('crypto');

/**
 * Function to create a new diagram
 * @param {string} sessionid - Session identifier
 * @param {string} diagram_name - Diagram name
 * @param {string} diagram_type - Diagram type
 * @param {Object} userMgtData - User management data object
 * @returns {Object} Result object with diagram UUID or error
 */
function createDiagram(sessionid, diagram_name, diagram_type, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true, diagram_name: diagram_name, diagram_type: diagram_type}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    let uuid = crypto.randomBytes(32).toString('hex');
    userMgtData.diagram[uuid] = {
        name: diagram_name,
        type: diagram_type,
        owner: userMgtData.session[sessionid].user,
        last_modified: Date.now(),
        mark_delete: false,
        permissions: {},
        link_sharing: false,
    }

    userMgtData.user[userMgtData.session[sessionid].user].diagrams.push(uuid);

    return {"uuid": uuid};

}

/**
 * Function to get a list of diagrams the user has access to
 * @param {string} sessionid - Session identifier
 * @param {Object} userMgtData - User management data object
 * @returns {Object} Result object with diagrams or error
 */
function getListDiagrams(sessionid, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    let result = [];
    let user = userMgtData.session[sessionid].user;

    userMgtData.user[user].diagrams.forEach((diagram_uuid) => {
        if((diagram_uuid in userMgtData.diagram) && (!userMgtData.diagram[diagram_uuid].mark_delete)) {
            let diagram = userMgtData.diagram[diagram_uuid];
            let owner = {name: null, lastname: null};  // If a user is deleted, a diagram can end up without owner
            if(diagram.owner in userMgtData.user)
                owner = userMgtData.user[diagram.owner];
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
    return { diagrams: result };
}

/**
 * Function to rename a diagram
 * @param {str} sessionid - Session identifier
 * @param {str} uuid - Diagram UUID
 * @param {str} newname - New diagram name
 * @param {Object} userMgtData - User management data object
 * @returns {Object} Result object with error or success
 */
function renameDiagram(sessionid, uuid, newname, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true, uuid: uuid, diagram_name: newname}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    if(userMgtData.diagram[uuid].owner !==  userMgtData.session[sessionid].user) {
        return { error: "You don't have permission to do this action." };
    }

    userMgtData.diagram[uuid].name = newname;
    return {};
}

/**
 * Function to delete a diagram
 * @param {str} sessionid
 * @param {str} uuid
 * @param {Object} userMgtData - User management data object
 * @returns {Object} Result object with error or success
 */
function deleteDiagram(sessionid, uuid, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true, uuid: uuid}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    if(userMgtData.diagram[uuid].owner !==  userMgtData.session[sessionid].user) {
        return { error: "You don't have permission to do this action." };
    }

    userMgtData.diagram[uuid].mark_delete = true;
    return {};
}

/**
 * Function to get diagram permissions
 * @param {str} sessionid
 * @param {str} uuid
 * @param {Object} userMgtData - User management data object
 * @returns {Object} Result object with error or permissions
 */
function getDiagramPermissions(sessionid, uuid, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true, uuid: uuid}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    let result = [];
    let diagram = userMgtData.diagram[uuid];
    for(let email in diagram.permissions) {
        if(email in userMgtData.user) {
            result.push({
                email: email,
                n: userMgtData.user[email].name,
                l: userMgtData.user[email].lastname,
                pid: email,
                p: diagram.permissions[email],
            })
        }
    }
    return { permissions: result };
}

/**
 * Function to delete diagram permissions
 * @param {str} sessionid
 * @param {str} uuid
 * @param {str} email
 * @param {Object} userMgtData - User management data object
 * @returns {Object} Result object with error or success
 */
function deleteDiagramPermission(sessionid, uuid, email, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true, uuid: uuid, email: email}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    if(userMgtData.diagram[uuid].owner !==  userMgtData.session[sessionid].user) {
        return { error: "You don't have permission to do this action." };
    }

    if(!(email in userMgtData.diagram[uuid].permissions)) {
        return { error: "Permission does not exist." };
    }
    if(!(email in userMgtData.user)) {
        return { error: "Permission does not exist." };
    }

    delete userMgtData.diagram[uuid].permissions[email];
    let user_index = userMgtData.user[email].diagrams.indexOf(uuid);
    if(user_index != -1)
        userMgtData.user[email].diagrams.splice(user_index, 1);

    return {};
}

/**
 * Function to share a diagram
 * @param {str} sessionid
 * @param {str} uuid
 * @param {str} email
 * @param {str} permission
 * @param {Object} userMgtData - User management data object
 * @returns {Promise} Result object with error or success
 */
async function shareDiagram(sessionid, uuid, email, permission, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true, uuid: uuid, email: email, permission: permission}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    if(userMgtData.diagram[uuid].owner !==  userMgtData.session[sessionid].user) {
        return { error: "You don't have permission to do this action." };
    }

    // Check if the user to be shared with has already permissions
    if((email in userMgtData.diagram[uuid].permissions) || (userMgtData.diagram[uuid].owner === email)) {
        return { error: "User already have permission on this diagram." };
    }

    if(this.authentication === "local") {
        // Check if the user exists
        if(email in userMgtData.user) {
            userMgtData.diagram[uuid].permissions[email] = permission;
            userMgtData.user[email].diagrams.push(uuid);
            return {
                new_user: null,
                existing_user: {
                    req_name: userMgtData.session[sessionid].data.name,
                    req_lastname: userMgtData.session[sessionid].data.lastname,
                    req_email: userMgtData.session[sessionid].user,
                    diag_name: userMgtData.diagram[uuid].name,
                }
            };
        }
        else {
            let createUserResult = this.createUser({email: email, name: "NewUser", lastname: "Lastname"});
            if("error" in createUserResult) {
                return { error: "Error sharing diagram: " + createUserResult.error };
            }

            userMgtData.diagram[uuid].permissions[email] = permission;
            userMgtData.user[email].diagrams.push(uuid);
            return {
                new_user: {
                    activationcode: createUserResult.activation_code,
                    req_name: userMgtData.session[sessionid].data.name,
                    req_lastname: userMgtData.session[sessionid].data.lastname,
                    req_email: userMgtData.session[sessionid].user,
                    diag_name: userMgtData.diagram[uuid].name,
                },
                existing_user: null,
            }
        }
    }
    else if(this.authentication === "ldap") {
        try {
            let result = await new Promise((resolve, reject) => {
                // Check if user exists on ldap
                this.nmldap.emailSearch(email, (err, user_data) => {
                    if(err) {
                        if(err.name === "NMLDAPError") {
                            // User does not exist in LDAP.
                            reject(err.message);
                            return;
                        }
                        else {
                            // Unexpected error
                            reject("Unexpected error while checking user LDAP membership.")
                            return;
                        }
                    }

                    // Create or update data from the user this diagram is to be shared with
                    authentication.createOrUpdateLDAPUser(email, user_data.name, user_data.lastname, userMgtData);

                    // Finally, share the diagram with the user.
                    userMgtData.diagram[uuid].permissions[email] = permission;
                    userMgtData.user[email].diagrams.push(uuid);
                    resolve({
                        req_name: userMgtData.session[sessionid].data.name,
                        req_lastname: userMgtData.session[sessionid].data.lastname,
                        req_email: userMgtData.session[sessionid].user,
                        diag_name: userMgtData.diagram[uuid].name,
                    });
                });
            });
            return { new_user: null, existing_user: result };
        } catch(e) {
            return { error: e };
        }
    }

    return { error: "Invalid authentication method." };
}

/**
 * Function to set link sharing for a diagram
 * @param {str} sessionid
 * @param {str} uuid
 * @param {bool} share
 * @param {Object} userMgtData - User management data object
 * @returns {Object} Result object with error or success
 */
function linkSharing(sessionid, uuid, share, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, session_is_active: true, uuid: uuid}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    if(userMgtData.diagram[uuid].owner !==  userMgtData.session[sessionid].user) {
        callback("You don't have permission to do this action.");
        return;
    }

    if(typeof(share) !== 'boolean') {
        return { error: "Invalid parameter." };
    }

    userMgtData.diagram[uuid].link_sharing = share;
    return {link_sharing: share};
}

function isUserAllowed(sessionid, uuid, userMgtData) {
    let validateResult = validators.validateParameters({sessionid: sessionid, uuid: uuid}, userMgtData);
    if(validateResult.error) {
        return { error: validateResult.error };
    }

    if((userMgtData.session[sessionid].user !== "") && (userMgtData.diagram[uuid].owner === userMgtData.session[sessionid].user)) {
        return {
            sdata: userMgtData.session[sessionid].data,
            permission: "OWNER",
            ddata: {
                name: userMgtData.diagram[uuid].name,
                type: userMgtData.diagram[uuid].type,
            },
        };
    }
    else if((userMgtData.session[sessionid].user !== "") && (userMgtData.session[sessionid].user in userMgtData.diagram[uuid].permissions)) {
        return {
            sdata: userMgtData.session[sessionid].data,
            permission: userMgtData.diagram[uuid].permissions[userMgtData.session[sessionid].user],
            ddata: {
                name: userMgtData.diagram[uuid].name,
                type: userMgtData.diagram[uuid].type,
            },
        };
    }
    else if(userMgtData.diagram[uuid].link_sharing) {
        return {
            sdata: userMgtData.session[sessionid].data,
            permission: "RO",
            ddata: {
                name: userMgtData.diagram[uuid].name,
                type: userMgtData.diagram[uuid].type,
            },
        };
    }
    else {
        return { error: "Diagram identifier not valid." };
    }
}


module.exports = {
    createDiagram,
    getListDiagrams,
    renameDiagram,
    deleteDiagram,
    getDiagramPermissions,
    deleteDiagramPermission,
    shareDiagram,
    linkSharing,
    isUserAllowed,
}