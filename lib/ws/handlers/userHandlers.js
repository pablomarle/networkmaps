const sendmail = require('../../sendmail');
const { Logger } = require('../../utils/logger');
const ETMap = require('../../etmap/etmap');

const wsLogger = new Logger({ prefix: 'UserHandlers' });

/**
 * Handle user login request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Login data
 */
function wsUserLogin(context, data) {
    context.usermgt.loginUser(context.sessionid, data.username, data.password, (error, result) => {
        if(error) {
            context.sendError("L", error);
            wsLogger.error(error);
        }
        else {
            context.send("L", {result: result});
        }
    });
}

/**
 * Handle user logout request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Logout data
 */
function wsUserLogout(context, data) {
    context.usermgt.logoutUser(context.sessionid, (error) => {
        if(error) {
            context.sendError("O", error);
        }
        else {
            context.send("O", {});
        }
    });
}

/**
 * Handle password change request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Password change data
 */
function wsUserChangePassword(context, data) {
    context.usermgt.changePassword(data.e, data.o, data.n, (error) => {
        if(error) {
            context.sendError("X", error);
        }
        else {
            sendmail.sendMail(data.e, "NetworkMaps account has been changed.", 
                "Hello.\n\nYour password has been changed.\n\n");

            context.send("X", {});
        }       
    });
}

/**
 * Handle user data change request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - User data
 */
function wsUserChangeData(context, data) {
    context.usermgt.changeUserData(context.sessionid, data.n, data.l, (error) => {
        if(error) {
            context.sendError("D", error);
        }
        else {
            context.send("D", {n: data.n, l: data.l});
        }       
    });
}

/**
 * Handle password reset request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Reset request data
 */
function wsUserResetPassword(context, data) {
    context.usermgt.requestResetPassword(data.email, (error, validation_code) => {
        if(error) {
            context.sendError("R", error);
        }
        else {
            const resetUrl = `${context.html.get_http_proto()}${context.config.server.hostname}:${context.config.server.port}/passwordreset/${validation_code}?${data.email}`;
            
            sendmail.sendMail(data.email, "NetworkMaps account password reset requested.", 
                `Hello.\n\nWe have received a request for your account password to be reset.\n\nPlease, follow this link for your account to be changed:\n${resetUrl}\n\nThis link will be valid for the next 24 hours.\n\nThanks.`);
            
            context.send("R", {});
        }
    });
}

/**
 * Handle user creation request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - New user data
 */
function wsUserCreateUser(context, data) {
    context.usermgt.createUser({email: data.email, name: data.name, lastname: data.lastname}, (error, activationcode) => {
        if(error) {
            context.sendError("C", error);
        }
        else {
            const validateUrl = `${context.html.get_http_proto()}${context.config.server.hostname}:${context.config.server.port}/validate/${activationcode}?${data.email}`;
            
            sendmail.sendMail(data.email, "NetworkMaps account confirmation needed.", 
                `Welcome to NetworkMaps.\n\nWe need you to confirm your account. To do this, please follow this link:\n\n${validateUrl}\n\nThis will be valid for the next 24 hours.\n\nThanks.`);

            context.send("C", {});
        }
    });
}

/**
 * Handle diagram creation request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Diagram data
 */
function wsDiagramCreate(context, data) {
    context.usermgt.createDiagram(context.sessionid, data.n, data.t, (error, uuid) => {
        if(error) {
            context.sendError("DN", error);
        }
        else {
            context.send("DN", {uuid: uuid});
        }
    });
}

/**
 * Handle diagram import request
 * @param {import('../.context').WSUserContext} context - WebSocket context
 * @param {Object} data - Import data
 */
function wsDiagramImport(context, data) {
    context.usermgt.createDiagram(context.sessionid, data.n, data.d.type, (error, uuid) => {
        if(error) {
            context.sendError("DI", error);
        }
        else {
            ETMap.saveDiagram(context.config.diagrams.path, uuid, data.d, (error) => {
                if(error) {
                    context.send("DI", { error: error, uuid: uuid });
                    return;
                }
                context.send("DI", {uuid: uuid});
            });
        }
    });
}

/**
 * Handle diagram list request
 * @param {import('../.context').WSUserContext} context - WebSocket context
 * @param {Object} data - Request data
 */
function wsDiagramList(context, data) {
    context.usermgt.getListDiagrams(context.sessionid, (error, listdiagrams) => {
        if(error) {
            context.sendError("DL", error);
        }
        else {
            context.send("DL", {dl: listdiagrams});
        }
    });
}

/**
 * Handle diagram delete request
 * @param {import('../.context').WSUserContext} context - WebSocket context
 * @param {Object} data - Diagram data
 */
function wsDiagramDelete(context, data) {
    context.usermgt.deleteDiagram(context.sessionid, data.uuid, (error) => {
        if(error) {
            context.sendError("DD", error);
        }
        else {
            context.send("DD", {});
        }       
    });
}

/**
 * Handle diagram rename request
 * @param {import('../.context').WSUserContext} context - WebSocket context
 * @param {Object} data - Rename data
 */
function wsDiagramRename(context, data) {
    context.usermgt.renameDiagram(context.sessionid, data.uuid, data.n, (error) => {
        if(error) {
            context.sendError("DR", error);
        }
        else {
            context.send("DR", {});
        }       
    });
}

/**
 * Handle get diagram permissions request
 * @param {import('../.context').WSUserContext} context - WebSocket context
 * @param {Object} data - Request data
 */
function wsDiagramGetPermissions(context, data) {
    context.usermgt.getDiagramPermissions(context.sessionid, data.uuid, (error, plist) => {
        if(error) {
            context.sendError("DP", error);
        }
        else {
            context.send("DP", { p: plist, uuid: data.uuid });
        }       
    });
}

/**
 * Handle delete diagram permission request
 * @param {import('../.context').WSUserContext} context - WebSocket context
 * @param {Object} data - Permission data
 */
function wsDiagramDeletePermission(context, data) {
    context.usermgt.deleteDiagramPermission(context.sessionid, data.uuid, data.id, (error) => {
        if(error) {
            context.sendError("PD", error);
        }
        else {
            context.send("PD", {});
        }       
    });
}

/**
 * Handle diagram sharing request
 * @param {import('../.context').WSUserContext} context - WebSocket context
 * @param {Object} data - Sharing data
 */
function wsDiagramShare(context, data) {
    context.usermgt.shareDiagram(context.sessionid, data.uuid, data.e, data.p, (error, newuser, user) => {
        if(error) {
            context.sendError("DS", error);
        }
        else {
            context.send("DS", {});

            const baseUrl = `${context.html.get_http_proto()}${context.config.server.hostname}:${context.config.server.port}`;

            if (newuser) {
                sendmail.sendMail(data.e, 
                    `${newuser.req_name} ${newuser.req_lastname} has shared a Network Diagram with you.`,
                    `Hello.\n\n${newuser.req_name} ${newuser.req_lastname} has shared a Network Diagram with you: '${newuser.diag_name}'.\n\n` +
                    `We have created a temporary account for you. We need you to confirm this account. To do this, please follow this link:\n\n${baseUrl}/validate/${newuser.activationcode}?${data.e}\n\n` + 
                    `This will be valid for the next 24 hours. After that, this account will be removed from our system.\n\nRegards.`);
            }
            else {
                sendmail.sendMail(data.e, 
                    `${user.req_name} ${user.req_lastname} has shared a Network Diagram with you.`,
                    `Hello.\n\n${user.req_name} ${user.req_lastname} has shared a Network Diagram with you: '${user.diag_name}'.\n\n` +
                    `You can access it on:\n\n${baseUrl}\n\n` + 
                    `Regards.`);
            }
        }       
    });
}

/**
 * Handle diagram link sharing request
 * @param {import('../.context').WSUserContext} context - WebSocket context
 * @param {Object} data - Link sharing data
 */
function wsDiagramLinkSharing(context, data) {
    context.usermgt.link_sharing(context.sessionid, data.uuid, data.ls, (error, link_sharing) => {
        if(error) {
            context.sendError("DW", error);
        }
        else {
            context.send("DW", { ls: link_sharing });
        }
    });
}

module.exports = {
    wsDiagramCreate,
    wsDiagramImport,
    wsDiagramList,
    wsDiagramDelete,
    wsDiagramRename,
    wsDiagramGetPermissions,
    wsDiagramDeletePermission,
    wsDiagramShare,
    wsDiagramLinkSharing,
    wsUserLogin,
    wsUserLogout,
    wsUserChangePassword,
    wsUserChangeData,
    wsUserResetPassword,
    wsUserCreateUser,
};