const https = require('https');
const http = require('http');
const WebSocket = require('ws');
const crypto = require("crypto");
const fs = require('fs');

const SESSION_COOKIE_MAXAGE = 30* (24*3600);
                    
class HTTPServer {
    constructor(use_ssl, hostname, port, certpath, keypath, requestcallback, wsconnectcallback) {
        this.use_ssl = use_ssl;
        this.hostname = hostname;
        this.port = port;
        this.requestcallback = requestcallback;
        this.wsconnectcallback = wsconnectcallback;

        let httpserver = this;
        let type_server = http;
        let options = {};
        if(use_ssl) {
            options = {
                key: fs.readFileSync(keypath),
                cert: fs.readFileSync(certpath),
            }
            type_server = https;
        }

        this.server = type_server.createServer(options, (request, response) => {
            const { method, url, headers } = request;
        
            console.log(`${method} ${url} HOST:${headers.host} USER AGENT:${headers["user-agent"]} COOKIE:${headers.cookie} REMOTEIP:${request.connection.remoteAddress} XFORWARDED:${headers["x-forwarded-for"]}` );

            let sessionid = httpserver.HTTP_ReadSession(headers);

            if(method === "POST") {
                let body = "";
                let too_big = false;
                request.on("data", (chunk) => {
                    if(!too_big) {
                        body += chunk.toString("latin1");
                        if(body.length > 10485760) {
                            too_big = true;
                            body = "";
                            console.log("Upload too big");
                        }
                    }
                });
                request.on("end", () => {
                    if(too_big) {
                        response.statusCode = 413;
                        response.setHeader('Content-Type', "text/plain");
                        response.end("Uploaded data too long.");
                        return;
                    }
                    httpserver.requestcallback(method, url, sessionid, headers['content-type'], body, (statusCode, contentType, content, newsessionid, redirectLocation, cacheMaxAge) => {
                        response.statusCode = statusCode;
                        if(contentType)
                            response.setHeader('Content-Type', contentType);
                        if(newsessionid)
                            if(use_ssl)
                                response.setHeader('Set-Cookie', 'NetSessionSec=' + newsessionid + "; Max-Age=" + SESSION_COOKIE_MAXAGE + "; path=/; secure");
                            else
                                response.setHeader('Set-Cookie', 'NetSessionNoSec=' + newsessionid + "; Max-Age=" + SESSION_COOKIE_MAXAGE + "; path=/");
                        if(redirectLocation)
                            response.setHeader('Location', redirectLocation);
                        if(cacheMaxAge)
                            response.setHeader('Cache-Control', 'public, max-age=' + cacheMaxAge);
                        response.end(content);
                    });                    
                });
            }
            else {
                httpserver.requestcallback(method, url, sessionid, "", "", (statusCode, contentType, content, newsessionid, redirectLocation, cacheMaxAge) => {
                    response.statusCode = statusCode;
                    if(contentType)
                        response.setHeader('Content-Type', contentType);
                    if(newsessionid)
                        if(use_ssl)
                            response.setHeader('Set-Cookie', 'NetSessionSec=' + newsessionid + "; Max-Age=" + SESSION_COOKIE_MAXAGE + "; path=/; secure");
                        else
                            response.setHeader('Set-Cookie', 'NetSessionNoSec=' + newsessionid + "; Max-Age=" + SESSION_COOKIE_MAXAGE + "; path=/");
                    if(redirectLocation)
                        response.setHeader('Location', redirectLocation);
                    if(cacheMaxAge)
                        response.setHeader('Cache-Control', 'public, max-age=' + cacheMaxAge);
                    response.end(content);
                });
            }
        });

        let server_options = {
            port: this.port
        }
        if(this.hostname)
            server_options.host = this.host;
        
        this.server.listen(server_options, () => {
            if(use_ssl)
                console.log(`Server running at https://${this.hostname}:${this.port}/`)
            else
                console.log(`Server running at http://${this.hostname}:${this.port}/`)
        });

        this.wss = new WebSocket.Server({"server":this.server});

        this.wss.on('connection', 
            (ws, request) => {
                const { method, url, headers } = request;
                console.log(`WS ${url} HOST:${headers.host} USER AGENT:${headers["user-agent"]} COOKIE:${headers.cookie} REMOTEIP:${request.connection.remoteAddress} XFORWARDED:${headers["x-forwarded-for"]}` );

                let session = httpserver.HTTP_ReadSession(headers);
                httpserver.wsconnectcallback(ws, url, session);
            });
    }

    HTTP_ReadSession(headers) {
        if (! ('cookie' in headers)) {
            return "";
        }
        else {
            let cookielist = headers['cookie'].split("; ");
            for(let x = 0; x < cookielist.length; x++) {
                let cookie = cookielist[x].split("=");
                if(this.use_ssl && (cookie[0] === "NetSessionSec"))
                    return cookie[1];
                else if(!this.use_ssl && (cookie[0] === "NetSessionNoSec"))
                    return cookie[1];
            }
        }

        return "";
    }
}

module.exports = HTTPServer
