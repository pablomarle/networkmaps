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
    let result = wsUserContext.usermgt.createDiagram(wsUserContext.sessionid, data.n, data.t);
    if("error" in result) {
        wsUserContext.sendError("DN", result.error);
        return;
    }

    wsUserContext.send("DN", {uuid: result.uuid});
}

/**
 * Handle diagram import request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Import data
 */
function wsDiagramImport(wsUserContext, data) {
    let resultCreateDiagram = wsUserContext.usermgt.createDiagram(wsUserContext.sessionid, data.n, data.d.type);
    if("error" in resultCreateDiagram) {
        wsUserContext.sendError("DI", resultCreateDiagram.error);
        return;
    }

    ETMap.saveDiagram(wsUserContext.config.diagrams.path, resultCreateDiagram.uuid, data.d, (error) => {
        if(error) {
            wsUserContext.send("DI", { error: error, uuid: resultCreateDiagram.uuid });
            return;
        }
        wsUserContext.send("DI", {uuid: resultCreateDiagram.uuid});
    });
}

/**
 * Handle diagram list request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Request data
 */
function wsDiagramList(wsUserContext, data) {
    let result = wsUserContext.usermgt.getListDiagrams(wsUserContext.sessionid);
    if("error" in result) {
        wsUserContext.sendError("DL", result.error);
        return;
    }

    wsUserContext.send("DL", {dl: result.diagrams});
}

/**
 * Handle diagram delete request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Diagram data
 */
function wsDiagramDelete(wsUserContext, data) {
    let result = wsUserContext.usermgt.deleteDiagram(wsUserContext.sessionid, data.uuid);
    if("error" in result) {
        wsUserContext.sendError("DD", result.error);
        return;
    }

    wsUserContext.send("DD", {});
}

/**
 * Handle diagram rename request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Rename data
 */
function wsDiagramRename(wsUserContext, data) {
    let result = wsUserContext.usermgt.renameDiagram(wsUserContext.sessionid, data.uuid, data.n);
    if ("error" in result) {
        wsUserContext.sendError("DR", result.error);
        return;
    }

    wsUserContext.send("DR", {});
}

/**
 * Handle get diagram permissions request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Request data
 */
function wsDiagramGetPermissions(wsUserContext, data) {
    let result = wsUserContext.usermgt.getDiagramPermissions(wsUserContext.sessionid, data.uuid);
    if("error" in result) {
        wsUserContext.sendError("DP", result.error);
        return;
    }

    wsUserContext.send("DP", {p: result.permissions, uuid: data.uuid});
}

/**
 * Handle delete diagram permission request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Permission data
 */
function wsDiagramDeletePermission(wsUserContext, data) {
    let result = wsUserContext.usermgt.deleteDiagramPermission(wsUserContext.sessionid, data.uuid, data.id);
    if("error" in result) {
        wsUserContext.sendError("DP", result.error);
        return;
    }

    wsUserContext.send("DP", {});
}

/**
 * Handle diagram sharing request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Sharing data
 */
async function wsDiagramShare(wsUserContext, data) {
    let result = await wsUserContext.usermgt.shareDiagram(wsUserContext.sessionid, data.uuid, data.e, data.p);
    if("error" in result) {
        wsUserContext.sendError("DS", result.error);
        return;
    }
    wsUserContext.send("DS", {});
    const baseUrl = `${wsUserContext.html.get_http_proto()}${wsUserContext.config.server.hostname}:${wsUserContext.config.server.port}`;

    if (result.new_user) {
        sendmail.sendMail(data.e,
            `${result.new_user.req_name} ${result.new_user.req_lastname} has shared a Network Diagram with you.`,
            `Hello.\n\n${result.new_user.req_name} ${result.new_user.req_lastname} has shared a Network Diagram with you: '${result.new_user.diag_name}'.\n\n` +
            `We have created a temporary account for you. We need you to confirm this account. To do this, please follow this link:\n\n${baseUrl}/validate/${result.new_user.activationcode}?${data.e}\n\n` +
            `This will be valid for the next 24 hours. After that, this account will be removed from our system.\n\nRegards.`);
    }
    else {
        sendmail.sendMail(data.e,
            `${result.user.req_name} ${result.user.req_lastname} has shared a Network Diagram with you.`,
            `Hello.\n\n${result.user.req_name} ${result.user.req_lastname} has shared a Network Diagram with you: '${result.user.diag_name}'.\n\n` +
            `You can access it on:\n\n${baseUrl}\n\n` +
            `Regards.`);
    }
}

/**
 * Handle diagram link sharing request
 * @param {import('../.context').WSUserContext} wsUserContext - WebSocket context
 * @param {Object} data - Link sharing data
 */
function wsDiagramLinkSharing(wsUserContext, data) {
    let result = wsUserContext.usermgt.linkSharing(wsUserContext.sessionid, data.uuid, data.ls);
    if("error" in result) {
        wsUserContext.sendError("DW", result.error);
        return;
    }

    wsUserContext.send("DW", { ls: result.link_sharing });
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