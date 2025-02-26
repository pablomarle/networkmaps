class Logger {
    constructor(options = {}) {
        this.options = {
            timestamp: options.timestamp ?? true,
            level: options.level ?? 'info',
            prefix: options.prefix ?? '',
            ...options
        };
    }

    getTimestamp() {
        return this.options.timestamp ? `[${new Date().toISOString()}] ` : '';
    }

    log(message, level = 'info') {
        const timestamp = this.getTimestamp();
        const prefix = this.options.prefix ? `[${this.options.prefix}] ` : '';
        console.log(`${timestamp}${prefix}${message}`);
    }

    error(message) {
        this.log(`ERROR: ${message}`, 'error');
    }

    info(message) {
        this.log(message, 'info');
    }

    debug(message) {
        if (this.options.level === 'debug') {
            this.log(`DEBUG: ${message}`, 'debug');
        }
    }

    websocket(message) {
        this.log(`WS: ${message}`, 'info');
    }

    diagram(uuid, clients, message) {
        this.log(`UUID: ${uuid} C: ${clients} M: ${message}`);
    }
}

// Create default logger instance
const defaultLogger = new Logger({ prefix: 'NetworkMaps' });

module.exports = {
    Logger,
    logger: defaultLogger
};