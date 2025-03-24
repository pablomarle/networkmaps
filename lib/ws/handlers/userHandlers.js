const sendmail = require('../../sendmail');
const { Logger } = require('../../utils/logger');
const ETMap = require('../../etmap/etmap');
const ws = require('../ws');

const wsLogger = new Logger({ prefix: 'UserHandlers' });

/**
 * Handle user login request
 * @param {import('../context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Login data
 */
async function wsUserLogin(wsUserContext, data) {
    let loginResult = await wsUserContext.usermgt.loginUser(wsUserContext.sessionid, data.username, data.password);
    if("error" in loginResult) {
        wsUserContext.sendError("L", loginResult.error);
        wsLogger.error(loginResult.error);
        return;
    }

    wsUserContext.send("L", {result: loginResult});
}

/**
 * Handle user logout request
 * @param {import('../context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Logout data
 */
function wsUserLogout(wsUserContext, data) {
    let resultLogout = wsUserContext.usermgt.logoutUser(wsUserContext.sessionid);
    if("error" in resultLogout) {
        wsUserContext.sendError("O", resultLogout.error);
        return;
    }

    wsUserContext.send("O", {});
}

/**
 * Handle password change request
 * @param {import('../context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Password change data
 */
function wsUserChangePassword(wsUserContext, data) {
    let changePasswordResult = wsUserContext.usermgt.changePassword(data.e, data.o, data.n);

    if("error" in changePasswordResult) {
        wsUserContext.sendError("X", changePasswordResult.error);
        return;
    }

    sendmail.sendMail(data.e, "NetworkMaps account has been changed.",
        "Hello.\n\nYour password has been changed.\n\n");

    wsUserContext.send("X", {});
}

/**
 * Handle user data change request
 * @param {import('../context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - User data
 */
function wsUserChangeData(wsUserContext, data) {
    let chengeResult = wsUserContext.usermgt.changeUserData(wsUserContext.sessionid, data.n, data.l);
    if("error" in chengeResult) {
        wsUserContext.sendError("D", chengeResult.error);
        return;
    }

    wsUserContext.send("D", {n: data.n, l: data.l});
}

/**
 * Handle password reset request
 * @param {import('../context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Reset request data
 */
function wsUserResetPassword(wsUserContext, data) {
    let resetPasswordResult = wsUserContext.usermgt.requestResetPassword(data.email);
    if("error" in resetPasswordResult) {
        wsUserContext.sendError("R", resetPasswordResult.error);
        return;
    }

    const resetUrl = `${wsUserContext.html.get_http_proto()}${wsUserContext.config.server.hostname}:${wsUserContext.config.server.port}/passwordreset/${resetPasswordResult.validation_code}?${data.email}`;

    sendmail.sendMail(data.email, "NetworkMaps account password reset requested.",
        `Hello.\n\nWe have received a request for your account password to be reset.\n\nPlease, follow this link for your account to be changed:\n${resetUrl}\n\nThis link will be valid for the next 24 hours.\n\nThanks.`);
    wsUserContext.send("R", {});
}

/**
 * Handle user creation request
 * @param {import('../context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - New user data
 */
function wsUserCreateUser(wsUserContext, data) {
    let createUserResult = wsUserContext.usermgt.createUser({email: data.email, name: data.name, lastname: data.lastname});
    if(createUserResult.error) {
        wsUserContext.sendError("C", createUserResult.error);
        return;
    }

    const validateUrl = `${wsUserContext.html.get_http_proto()}${wsUserContext.config.server.hostname}:${wsUserContext.config.server.port}/validate/${createUserResult.activation_code}?${data.email}`;
    sendmail.sendMail(data.email, "NetworkMaps account confirmation needed.",
        `Welcome to NetworkMaps.\n\nWe need you to confirm your account. To do this, please follow this link:\n\n${validateUrl}\n\nThis will be valid for the next 24 hours.\n\nThanks.`);
    wsUserContext.send("C", {});
}

/**
 * Handle diagram creation request
 * @param {import('../context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Diagram data
 */
function wsDiagramCreate(wsUserContext, data) {
    wsUserContext.usermgt.createDiagram(wsUserContext.sessionid, data.n, data.t, (error, uuid) => {
        if(error) {
            wsUserContext.sendError("DN", error);
        }
        else {
            wsUserContext.send("DN", {uuid: uuid});
        }
    });
}

/**
 * Handle diagram import request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Import data
 */
function wsDiagramImport(wsUserContext, data) {
    wsUserContext.usermgt.createDiagram(wsUserContext.sessionid, data.n, data.d.type, (error, uuid) => {
        if(error) {
            wsUserContext.sendError("DI", error);
        }
        else {
            ETMap.saveDiagram(wsUserContext.config.diagrams.path, uuid, data.d, (error) => {
                if(error) {
                    wsUserContext.send("DI", { error: error, uuid: uuid });
                    return;
                }
                wsUserContext.send("DI", {uuid: uuid});
            });
        }
    });
}

/**
 * Handle diagram list request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Request data
 */
function wsDiagramList(wsUserContext, data) {
    wsUserContext.usermgt.getListDiagrams(wsUserContext.sessionid, (error, listdiagrams) => {
        if(error) {
            wsUserContext.sendError("DL", error);
        }
        else {
            wsUserContext.send("DL", {dl: listdiagrams});
        }
    });
}

/**
 * Handle diagram delete request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Diagram data
 */
function wsDiagramDelete(wsUserContext, data) {
    wsUserContext.usermgt.deleteDiagram(wsUserContext.sessionid, data.uuid, (error) => {
        if(error) {
            wsUserContext.sendError("DD", error);
        }
        else {
            wsUserContext.send("DD", {});
        }
    });
}

/**
 * Handle diagram rename request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Rename data
 */
function wsDiagramRename(wsUserContext, data) {
    wsUserContext.usermgt.renameDiagram(wsUserContext.sessionid, data.uuid, data.n, (error) => {
        if(error) {
            wsUserContext.sendError("DR", error);
        }
        else {
            wsUserContext.send("DR", {});
        }
    });
}

/**
 * Handle get diagram permissions request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Request data
 */
function wsDiagramGetPermissions(wsUserContext, data) {
    wsUserContext.usermgt.getDiagramPermissions(wsUserContext.sessionid, data.uuid, (error, plist) => {
        if(error) {
            wsUserContext.sendError("DP", error);
        }
        else {
            wsUserContext.send("DP", { p: plist, uuid: data.uuid });
        }
    });
}

/**
 * Handle delete diagram permission request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Permission data
 */
function wsDiagramDeletePermission(wsUserContext, data) {
    wsUserContext.usermgt.deleteDiagramPermission(wsUserContext.sessionid, data.uuid, data.id, (error) => {
        if(error) {
            wsUserContext.sendError("PD", error);
        }
        else {
            wsUserContext.send("PD", {});
        }
    });
}

/**
 * Handle diagram sharing request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Sharing data
 */
function wsDiagramShare(wsUserContext, data) {
    wsUserContext.usermgt.shareDiagram(wsUserContext.sessionid, data.uuid, data.e, data.p, (error, newuser, user) => {
        if(error) {
            wsUserContext.sendError("DS", error);
        }
        else {
            wsUserContext.send("DS", {});

            const baseUrl = `${wsUserContext.html.get_http_proto()}${wsUserContext.config.server.hostname}:${wsUserContext.config.server.port}`;

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
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Link sharing data
 */
function wsDiagramLinkSharing(wsUserContext, data) {
    wsUserContext.usermgt.link_sharing(wsUserContext.sessionid, data.uuid, data.ls, (error, link_sharing) => {
        if(error) {
            wsUserContext.sendError("DW", error);
        }
        else {
            wsUserContext.send("DW", { ls: link_sharing });
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