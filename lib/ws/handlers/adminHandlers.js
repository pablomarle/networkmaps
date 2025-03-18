const { Logger } = require('../../utils/logger');
const wsLogger = new Logger({ prefix: 'AdminHandlers' });

/**
 * Handle admin login request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Login data
 */
function wsAdminLogin(context, data) {
    context.usermgt.loginAdmin(context.sessionid, data.username, data.password, (error, result) => {
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
 * Handle admin logout request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Logout data
 */
function wsAdminLogout(context, data) {
    context.usermgt.logoutAdmin(context.sessionid, (error) => {
        if(error) {
            context.sendError("O", error);
        }
        else {
            context.send("O", {});
        }
    });
}

/**
 * Handle admin create user request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - User data
 */
function wsAdminCreateUser(context, data) {
    context.usermgt.adminCreateUser(context.sessionid, {
        email: data.e, 
        name: data.n, 
        lastname: data.l, 
        password: data.p
    }, (error) => {
        if(error) {
            context.sendError("C", error);
        }
        else {
            context.send("C", {});
        }
    });
}

/**
 * Handle admin change user data request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - User data
 */
function wsAdminChangeUserData(context, data) {
    context.usermgt.adminChangeUserData(context.sessionid, data.e, data.n, data.l, (error) => {
        if(error) {
            context.sendError("D", error);
        }
        else {
            context.send("D", {});
        }
    });
}

/**
 * Handle admin change user password request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Password data
 */
function wsAdminChangeUserPassword(context, data) {
    context.usermgt.adminChangeUserPassword(context.sessionid, data.e, data.p, (error) => {
        if(error) {
            context.sendError("X", error);
        }
        else {
            context.send("X", {});
        }
    });
}

/**
 * Handle admin delete user request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - User data
 */
function wsAdminDeleteUser(context, data) {
    context.usermgt.adminDeleteUser(context.sessionid, data.e, (error) => {
        if(error) {
            context.sendError("DU", error);
        }
        else {
            context.send("DU", {});
        }
    });
}

/**
 * Handle admin get users request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Request data
 */
function wsAdminGetUsers(context, data) {
    context.usermgt.adminGetUsers(context.sessionid, (error, userData) => {
        if(error) {
            context.sendError("GU", error);
        }
        else {
            context.send("GU", {ul: userData});
        }
    });
}

/**
 * Handle admin get sessions request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Request data
 */
function wsAdminGetSessions(context, data) {
    context.usermgt.adminGetSessions(context.sessionid, (error, sessionData) => {
        if(error) {
            context.sendError("GS", error);
        }
        else {
            context.send("GS", {sl: sessionData});
        }
    });
}

/**
 * Handle admin get diagrams request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Request data
 */
function wsAdminGetDiagrams(context, data) {
    context.usermgt.adminGetDiagrams(context.sessionid, (error, diagramData) => {
        if(error) {
            context.sendError("GD", error);
        }
        else {
            context.send("GD", {dl: diagramData});
        }
    });
}

/**
 * Handle admin change diagram ownership request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Ownership data
 */
function wsAdminChangeDiagramOwnership(context, data) {
    context.usermgt.adminChangeDiagramOwnership(context.sessionid, data.uuid, data.e, (error) => {
        if(error) {
            context.sendError("DO", error);
        }
        else {
            context.send("DO", {});
        }
    });
}

/**
 * Handle admin delete diagram request
 * @param {import('../context').WSUserContext} context - WebSocket context
 * @param {Object} data - Diagram data
 */
function wsAdminDeleteDiagram(context, data) {
    context.usermgt.adminDeleteDiagram(context.sessionid, data.uuid, (error) => {
        if(error) {
            context.sendError("DD", error);
        }
        else {
            context.send("DD", {});
        }
    });
}

module.exports = {
    wsAdminLogin,
    wsAdminLogout,
    wsAdminCreateUser,
    wsAdminChangeUserData,
    wsAdminChangeUserPassword,
    wsAdminDeleteUser,
    wsAdminGetUsers,
    wsAdminGetSessions,
    wsAdminGetDiagrams,
    wsAdminChangeDiagramOwnership,
    wsAdminDeleteDiagram
};
