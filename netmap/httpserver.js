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
        if(use_ssl) {
		    this.server = https.createServer({
			    	key: fs.readFileSync(keypath),
				    cert: fs.readFileSync(certpath),
			    },
			    (request, response) => {
				    const { method, url, headers } = request;
				
				    console.log(method + " " + url + " " + JSON.stringify(headers));

				    let sessionid = httpserver.HTTP_ReadSession(headers);

				    httpserver.requestcallback(method, url, sessionid, (statusCode, contentType, content, newsessionid, redirectLocation) => {
				 	    response.statusCode = statusCode;
				 	    if(contentType)
				 		    response.setHeader('Content-Type', contentType);
				 	    if(newsessionid)
				 		    response.setHeader('Set-Cookie', 'NetSession=' + newsessionid + "; Max-Age=" + SESSION_COOKIE_MAXAGE + "; path=/; secure");
				 	    if(redirectLocation)
				 		    response.setHeader('Location', redirectLocation);
				 	    response.end(content);							
				    });

			    });
        }
        else {
		    this.server = http.createServer(
			    (request, response) => {
				    const { method, url, headers } = request;
				
				    console.log(method + " " + url + " " + JSON.stringify(headers));

				    let sessionid = httpserver.HTTP_ReadSession(headers);

				    httpserver.requestcallback(method, url, sessionid, (statusCode, contentType, content, newsessionid, redirectLocation) => {
				 	    response.statusCode = statusCode;
				 	    if(contentType)
				 		    response.setHeader('Content-Type', contentType);
				 	    if(newsessionid)
				 		    response.setHeader('Set-Cookie', 'NetSession=' + newsessionid + "; Max-Age=" + SESSION_COOKIE_MAXAGE + "; path=/");
				 	    if(redirectLocation)
				 		    response.setHeader('Location', redirectLocation);
				 	    response.end(content);							
				    });

			    });
        }

		this.server.listen(this.port, this.hostname, () => {
            if(use_ssl)
		        console.log(`Server running at https://${this.hostname}:${this.port}/`)
		    else
                console.log(`Server running at http://${this.hostname}:${this.port}/`)
		});

		this.wss = new WebSocket.Server({"server":this.server});

		this.wss.on('connection', 
			(ws, request) => {
				const { method, url, headers } = request;
				console.log("WS " + url + " " + JSON.stringify(headers));

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
				if (cookie[0] == "NetSession") {
					return cookie[1];
				}
			}
		}

		return "";
	}
}

module.exports = HTTPServer
