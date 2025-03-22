const ETMap = require('../etmap/etmap')
const {WSUserContext} = require('./context');
const crypto = require("crypto");
const { Logger } = require('../utils/logger');
const userHandlers = require('./handlers/userHandlers');
const adminHandlers = require('./handlers/adminHandlers');
const wsLogger = new Logger({ prefix: 'WebSocket' });

let usermgt = null;
let config = null;
let etmaps = null;
let html = null;

const userRouter = {
    "L": userHandlers.wsUserLogin,
    "O": userHandlers.wsUserLogout,
    "D": userHandlers.wsUserChangeData,
    "X": userHandlers.wsUserChangePassword,
    "R": userHandlers.wsUserResetPassword,
    "C": userHandlers.wsUserCreateUser,
    "DN": userHandlers.wsDiagramCreate,
    "DI": userHandlers.wsDiagramImport,
    "DL": userHandlers.wsDiagramList,
    "DD": userHandlers.wsDiagramDelete,
    "DR": userHandlers.wsDiagramRename,
    "DP": userHandlers.wsDiagramGetPermissions,
    "PD": userHandlers.wsDiagramDeletePermission,
    "DS": userHandlers.wsDiagramShare,
    "DW": userHandlers.wsDiagramLinkSharing,
}

const adminRouter = {
    "L": adminHandlers.wsAdminLogin,
    "O": adminHandlers.wsAdminLogout,
    "C": adminHandlers.wsAdminCreateUser,
    "D": adminHandlers.wsAdminChangeUserData,
    "X": adminHandlers.wsAdminChangeUserPassword,
    "DU": adminHandlers.wsAdminDeleteUser,
    "GU": adminHandlers.wsAdminGetUsers,
    "GS": adminHandlers.wsAdminGetSessions,
    "GD": adminHandlers.wsAdminGetDiagrams,
    "DO": adminHandlers.wsAdminChangeDiagramOwnership,
    "DD": adminHandlers.wsAdminDeleteDiagram,
}

function initialize(newconfig, newusermgt, newhtml, etmaps_dict) {
    usermgt = newusermgt;
    config = newconfig;
    html = newhtml;
    etmaps = etmaps_dict;
}

/**
 * Generic WebSocket connection handler
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} sessionid - Session identifier
 * @param {Object} router - Message router containing handlers
 * @param {boolean} isAdmin - Whether this is an admin connection
 */
function handleWSConnection(ws, sessionid, router, isAdmin) {
    const context = new WSUserContext(ws, usermgt, config, html, sessionid);

    ws.on("message", (message) => {
        let json;
        try {
            json = JSON.parse(message);
        } catch (e) {
            ws.close();
            wsLogger.error(`Error parsing message '${message}'`);
            return; 
        }
        
        if (!json.m || !json.d) {
            ws.close();
            wsLogger.error(`Error parsing message (no m or d) '${message}'`);
            return;             
        }
        
        if (!router[json.m]) {
            clearInterval(ws.interval);
            ws.close();
            return;
        }
        
        router[json.m](context, json.d);
    });

    ws.on("close", () => {
        clearInterval(ws.interval);
    });

    ws.on("error", (error) => {
        wsLogger.error(`WebSocket error: ${error}`);
        clearInterval(ws.interval);
        ws.close();
    });

    // Send initial info about the session to client
    usermgt.getSession(sessionid, (error, sessiondata) => {
        if(error) {
            clearInterval(ws.interval);
            ws.close();
            wsLogger.error(error);
            return;
        }

        let message = {
            m: "I",
            d: isAdmin ? sessiondata : sessiondata.data,
            session_id: sessiondata.sessionid,
        };
        
        // Only include register_self for user connections
        if (!isAdmin) {
            message.register_self = usermgt.register_self;
        }
        
        sessionid = sessiondata.sessionid;
        ws.send(JSON.stringify(message));
    });

    // PING PONG to detect broken connections
    ws.isAlive = true;
    ws.interval = setInterval(() => {
        if (ws.isAlive === false) {
            clearInterval(ws.interval);
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping('');
    }, 30000);

    ws.on("pong", () => {
        ws.isAlive = true;
    });
}

function WS_DIAGRAM(ws, uuid, sessionid) {
    // Check if user has permission to access this diagram
    usermgt.isUserAllowed(sessionid, uuid, (error, result) => {
        if(error) {
            ws.send(JSON.stringify({m: "E", d: {error: "Either you don't have access to this diagram, or diagram does not exist.", fatal: true}}));
            ws.close();
            wsLogger.error(`Error while accessing a diagram: ${error}`);
            return;
        }

        if(result.permission == "") {
            ws.close();
            return;
        }

        if(!(uuid in etmaps)) {
            etmaps[uuid] = new ETMap(result.ddata.name, result.ddata.type, config.diagrams.path, uuid, usermgt, config.timers.savediagram, (uuid) => {
                delete etmaps[uuid];
            });

            etmaps[uuid].initialize((err) => {
                if(err) {
                    delete etmaps[uuid];
                    ws.close();
                }
            });
        }
        
        ws.nm_data = {
            user: result.sdata.user,
            sessionid: sessionid,
            permission: result.permission,
            conn_id: crypto.randomBytes(32).toString('hex'),
        };
        etmaps[uuid].addWS(ws);
    });
}

/**
 * Handle user WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} sessionid - Session identifier
 */
function wsUser(ws, sessionid) {
    handleWSConnection(ws, sessionid, userRouter, false);
}

/**
 * Handle admin WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} sessionid - Session identifier
 */
function wsAdmin(ws, sessionid) {
    // Also need to update the adminHandlers to use context!
    let context = new WSUserContext(ws, usermgt, config, html, sessionid);
    
    handleWSConnection(ws, sessionid, adminRouter, true);
}

function wsCallback(ws, url, sessionid) {
    let urlbroken = url.split("/");

    if (urlbroken.length == 2) {
        if (urlbroken[1] == "user") {
            wsUser(ws, sessionid);
            return;
        }
        else if (urlbroken[1] == "admin") {
            wsAdmin(ws, sessionid);
            return;
        }
    }
    else if (urlbroken.length == 3) {
        if (urlbroken[1] == "diagram") {
            WS_DIAGRAM(ws, urlbroken[2], sessionid);
            return;
        }
    }

    // If we get here, the websocket is invalid
    ws.close();
}

function close() {
    for (let uuid in etmaps) {
        etmaps[uuid].shutdown();
    }
}

module.exports = {
    initialize: initialize,
    wsCallback: wsCallback,
    close: close,
}