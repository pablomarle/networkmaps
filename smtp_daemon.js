#!/usr/bin/node

/**
 * NetworkMaps SMTP Daemon
 * 
 * This daemon handles the asynchronous processing of emails in NetworkMaps.
 * It periodically checks the email queue directory for pending emails,
 * sends them, and moves them to the sent directory.
 * 
 * Configuration options in config.json:
 * - sendmail.integrated: When true, email processing runs in the main server process instead
 * - sendmail.interval: Milliseconds between queue processing cycles (default: 30000)
 * - sendmail.queue: Directory where queued emails are stored
 * - sendmail.sent: Directory where processed emails are moved after sending
 * - sendmail.server: SMTP server hostname
 * - sendmail.port: SMTP server port
 * - sendmail.is_secured: Whether to use TLS for SMTP connection
 * - sendmail.verify_ssl_cert: Whether to verify SSL certificate of SMTP server
 * - sendmail.user: SMTP authentication username
 * - sendmail.password: SMTP authentication password
 * - sendmail.from: Email address used as sender
 * 
 * Usage:
 *   node smtp_daemon.js [--config /path/to/config.json]
 * 
 * When the 'integrated' option is enabled in the configuration, this daemon
 * will exit immediately as email processing will be handled by the main server.
 */

const sendmail = require("./lib/sendmail");
const config = require('./lib/config');
const { Logger } = require('./lib/utils/logger');

const smtpLogger = new Logger({ prefix: 'SMTP-Daemon' });

/**
 * Main function that initializes and runs the email processing daemon
 * 
 * The daemon will:
 * 1. Check if integrated mode is enabled and exit if so
 * 2. Initialize the sendmail module with configuration
 * 3. Set up an interval to process the email queue periodically
 */
function main() {
    // Exit if integrated mode is enabled
    if (config.sendmail.integrated) {
        smtpLogger.info("Email processing is integrated with main server. Exiting daemon.");
        process.exit(0);
    }

    smtpLogger.info("Starting standalone email processing daemon");
    sendmail.initialize(config.sendmail);
    
    // Process email queue at regular intervals
    setInterval(() => { 
        sendmail.empty_queue().catch(err => {
            smtpLogger.error("Error processing email queue: " + err);
        });
    }, config.sendmail.interval || 30000);
    
    // Handle process termination
    process.on('SIGINT', () => {
        smtpLogger.info("Shutting down email processing daemon");
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        smtpLogger.info("Shutting down email processing daemon");
        process.exit(0);
    });
}

// Start the daemon
main();
