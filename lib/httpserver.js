/**
 * HTTP/HTTPS Server Module
 * 
 * This module provides a unified server implementation that can operate in either
 * HTTP or HTTPS mode. It handles HTTP requests as well as WebSocket connections,
 * sessions through cookies, and implements proper response handling.
 * 
 * @module httpserver
 */

const https = require('https');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const { Logger } = require('./utils/logger');

/** 
 * Cookie expiration time in seconds (30 days)
 * @constant {number}
 */
const SESSION_COOKIE_MAXAGE = 30 * (24 * 3600);

/** Logger instance for HTTP-related logs */
const httpLogger = new Logger({ prefix: 'HTTP' });

/**
 * HTTP/HTTPS Server implementation with WebSocket support
 * 
 * Creates a server that can handle both regular HTTP(S) requests and
 * WebSocket connections with session tracking.
 */
class HTTPServer {
    /**
     * Create a new HTTP or HTTPS server with WebSocket support
     * 
     * @param {boolean} use_ssl - Whether to use HTTPS (true) or HTTP (false)
     * @param {string} hostname - Hostname to bind to
     * @param {number} port - Port number to listen on
     * @param {string} certpath - Path to SSL certificate file (only used if use_ssl is true)
     * @param {string} keypath - Path to SSL key file (only used if use_ssl is true)
     * @param {Function} requestcallback - Callback function to handle HTTP requests
     * @param {Function} wsconnectcallback - Callback function to handle new WebSocket connections
     */
    constructor(use_ssl, hostname, port, certpath, keypath, requestcallback, wsconnectcallback) {
        /** @property {boolean} use_ssl - Whether SSL is enabled for this server */
        this.use_ssl = use_ssl;
        
        /** @property {string} hostname - Hostname the server is bound to */
        this.hostname = hostname;
        
        /** @property {number} port - Port the server is listening on */
        this.port = port;
        
        /** @property {Function} requestcallback - HTTP request callback function */
        this.requestcallback = requestcallback;
        
        /** @property {Function} wsconnectcallback - WebSocket connection callback function */
        this.wsconnectcallback = wsconnectcallback;

        let httpserver = this;
        let type_server = http;
        let options = {};
        
        // Configure SSL if enabled
        if(use_ssl) {
            options = {
                key: fs.readFileSync(keypath),
                cert: fs.readFileSync(certpath),
            }
            type_server = https;
        }

        /**
         * HTTP(S) server instance
         * @property {http.Server|https.Server}
         */
        this.server = type_server.createServer(options, (request, response) => {
            const { method, url, headers } = request;
        
            httpLogger.info(`${method} ${url} HOST:${headers.host} USER AGENT:${headers["user-agent"]} COOKIE:${headers.cookie} REMOTEIP:${request.connection.remoteAddress} XFORWARDED:${headers["x-forwarded-for"]}` );

            // Extract session ID from cookies
            let sessionid = httpserver.HTTP_ReadSession(headers);

            // Handle POST requests with body
            if(method === "POST") {
                let body = "";
                let too_big = false;
                
                // Collect body chunks
                request.on("data", (chunk) => {
                    if(!too_big) {
                        body += chunk.toString("latin1");
                        // Limit body size to 10MB
                        if(body.length > 10485760) {
                            too_big = true;
                            body = "";
                            httpLogger.error("Upload too big");
                        }
                    }
                });
                
                // Process the complete request
                request.on("end", () => {
                    if(too_big) {
                        response.statusCode = 413;
                        response.setHeader('Content-Type', "text/plain");
                        response.end("Uploaded data too long.");
                        return;
                    }
                    
                    // Pass to the callback and handle the response
                    httpserver.requestcallback(method, url, sessionid, headers['content-type'], body, (statusCode, contentType, content, newsessionid, redirectLocation, cacheMaxAge) => {
                        this.handleResponse(response, statusCode, contentType, content, newsessionid, redirectLocation, cacheMaxAge);
                    });
                });
            }
            // For non-POST requests, handle without body
            else {
                httpserver.requestcallback(method, url, sessionid, "", "", (statusCode, contentType, content, newsessionid, redirectLocation, cacheMaxAge) => {
                    this.handleResponse(response, statusCode, contentType, content, newsessionid, redirectLocation, cacheMaxAge);
                });
            }
        });

        // Configure server listening options
        let server_options = {
            port: this.port
        }
        if(this.hostname)
            server_options.host = this.hostname;
        
        // Start the server
        this.server.listen(server_options, () => {
            if(use_ssl)
                httpLogger.info(`Server running at https://${this.hostname}:${this.port}/`)
            else
                httpLogger.info(`Server running at http://${this.hostname}:${this.port}/`)
        });

        /**
         * WebSocket server instance
         * @property {WebSocket.Server}
         */
        this.wss = new WebSocket.Server({"server":this.server});

        // Handle WebSocket connections
        this.wss.on('connection', 
            (ws, request) => {
                const { method, url, headers } = request;
                httpLogger.info(`WS ${url} HOST:${headers.host} USER AGENT:${headers["user-agent"]} COOKIE:${headers.cookie} REMOTEIP:${request.connection.remoteAddress} XFORWARDED:${headers["x-forwarded-for"]}` );

                let session = httpserver.HTTP_ReadSession(headers);
                httpserver.wsconnectcallback(ws, url, session);
            });
    }

    /**
     * Extract session ID from cookies in HTTP headers
     * 
     * @param {Object} headers - HTTP request headers
     * @returns {string} Session ID if found, empty string otherwise
     */
    HTTP_ReadSession(headers) {
        if (! ('cookie' in headers)) {
            return "";
        }
        else {
            let cookielist = headers['cookie'].split("; ");
            for(let x = 0; x < cookielist.length; x++) {
                let cookie = cookielist[x].split("=");
                // Use secure cookies for HTTPS connections
                if(this.use_ssl && (cookie[0] === "NetSessionSec"))
                    return cookie[1];
                // Use non-secure cookies for HTTP connections
                else if(!this.use_ssl && (cookie[0] === "NetSessionNoSec"))
                    return cookie[1];
            }
        }

        return "";
    }

    /**
     * Gracefully shut down the server
     */
    close() {
        this.server.close();
    }

    /**
     * Handle HTTP response with appropriate headers and content
     * 
     * @param {http.ServerResponse} response - HTTP response object
     * @param {number} statusCode - HTTP status code
     * @param {string} contentType - Content-Type header value
     * @param {string} content - Response body content
     * @param {string} newsessionid - New session ID to set in cookie (if provided)
     * @param {string} redirectLocation - URL to redirect to (if provided)
     * @param {number} cacheMaxAge - Cache control max-age in seconds (if provided)
     */
    handleResponse(response, statusCode, contentType, content, newsessionid, redirectLocation, cacheMaxAge) {
        // Set status code
        response.statusCode = statusCode;
        
        // Set content type if provided
        if(contentType)
            response.setHeader('Content-Type', contentType);
        
        // Set session cookie if provided
        if(newsessionid)
            if(this.use_ssl)
                response.setHeader('Set-Cookie', 'NetSessionSec=' + newsessionid + "; Max-Age=" + SESSION_COOKIE_MAXAGE + "; path=/; secure");
            else
                response.setHeader('Set-Cookie', 'NetSessionNoSec=' + newsessionid + "; Max-Age=" + SESSION_COOKIE_MAXAGE + "; path=/");
        
        // Set redirect location if provided
        if(redirectLocation)
            response.setHeader('Location', redirectLocation);
        
        // Set cache control if provided
        if(cacheMaxAge)
            response.setHeader('Cache-Control', 'public, max-age=' + cacheMaxAge);
        
        // Send response
        response.end(content);
    }
}

module.exports = HTTPServer;
