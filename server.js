#!/usr/bin/node

const config = require('./lib/config');
const context = require('./lib/context');
const httpServer = require('./lib/httpserver');
const html = require('./lib/html');
const UserMGT = require('./lib/usermgt');
const ws = require('./lib/ws/ws');
const sendmail = require("./lib/sendmail");
const httpCallback = require("./lib/http_controller/http_controller");
const { testDirectories } = require('./lib/utils/filesystem');
const { Logger } = require('./lib/utils/logger');

const serverLogger = new Logger({ prefix: 'Server' });

function main() {
    console.log("\nIf you like NetworkMaps, consider making a small donation :)\n")

    // Set up context
    context.config = config;

    testDirectories(context.config);

    context.etmaps = {};
    context.usermgt = new UserMGT(
        context.config.timers.usertimeout,
        context.config.timers.usersavetimeout,
        context.config.timers.ldap_grouprefresh,
        context.config.users,
        context.config.diagrams.shapes,
        context.config.diagrams.path,
    );    
    context.usermgt.initialize();

    context.sendmail = sendmail;
    context.sendmail.initialize();
    
    html.initialize();
    context.html = html;

    ws.initialize(context.config, context.usermgt, html, context.etmaps);
    context.ws = ws; // Add ws to context for diagram exports

    let smtpIntervalId = null;

    // Set up email processing if integrated mode is enabled
    if (context.config.sendmail.integrated) {
        console.log("Email processing integrated with main server");
        smtpIntervalId = setInterval(() => { 
            context.sendmail.empty_queue().catch(err => {
                serverLogger.error("Error processing email queue: " + err);
            });
        }, context.config.sendmail.interval);
    }

    const server = new httpServer(
        context.config.use_ssl_socket, 
        context.config.socket.address, 
        context.config.socket.port, 
        context.config.socket.cert, 
        context.config.socket.key, 
        httpCallback, 
        ws.wsCallback,
    );

    // Cleanup on server exit
    process.on('SIGINT', () => {
        serverLogger.info("Shutting down server");

        // Stop email processing
        if (smtpIntervalId) clearInterval(smtpIntervalId);

        // Close all connections and save open diagrams
        ws.close();
        server.close();

        // Save user data
        context.usermgt.saveSync();

        // Exit
        process.exit();
    });
}

main()
