const WebSocket = require('ws');

/**
 * Class to programatically administrate networkmapslib
 */
class NetworkMapsAdminLib {
    constructor(use_ssl, hostname, port, options, ready_callback, close_callback) {
        this.conn = {};

        this.conn.hostname = hostname;
        this.conn.port = port;
        this.conn.use_ssl = use_ssl;
        this.conn.ready_callback = ready_callback;
        this.conn.close_callback = close_callback;
        this.callbacks = {};
        this.connected = false;
        this.authenticated = false;

        if(options) {
            this.conn.session_id = ("session_id" in options) ? options.session_id : "";
            this.conn.verify_cert = ("verify_cert" in options) ? options.verify_cert : true;
        }
        else {
            this.conn.session_id = "";
            this.conn.verify_cert = true;
        }

        this.conn.headers = {};
        this.conn.proto = "http";
        if(this.conn.use_ssl) {
            this.conn.proto = "https";
            if(this.conn.session_id)
                this.conn.headers.Cookie = 'NetSessionSec=' + this.conn.session_id;
        }
        else {
            if(this.conn.session_id)
                this.conn.headers.Cookie = 'NetSessionNoSec=' + this.conn.session_id;
        }

        this.diagrams = {};

        this.setup_admin_ws();
    }

    /**
     * Function to create the initial connection to the server on the admin endpoint and get the
     * session id (if not provided) that we will use to make changes on NetworkMaps.
     * This function will be called by the constructor.
     */
    setup_admin_ws() {
        this.admin_ws = new WebSocket(this.conn.proto + "://" + this.conn.hostname + ":" + this.conn.port + "/admin", {
            "rejectUnauthorized": this.conn.verify_cert,
            "headers": this.conn.headers,
        });

        this.admin_ws.on('open', () => {
            this.connected = true;
        })
        this.admin_ws.on('close', () => {
            this.connected = false;
            if(this.conn.close_callback)
                this.conn.close_callback();
        });
        this.admin_ws.on('message', (data) => {
            this.process_message(data);
        });
    }

    execute_callback(callback_name, error, data) {
    	if(this.callbacks[callback_name]) {
    		this.callbacks[callback_name](error, data);
    		this.callbacks[callback_name] = null;
    	}
    }
    /**
     * Internal function used to process the messages received from the server on the user endpoint.
     * This function will make callbacks to functions provided by the user upon reception of expected
     * messages.
     * @param {Object}  data    Data received on the user websocket
     */
    process_message(data) {
        let jdata = JSON.parse(data);
        
        if(jdata.m === "I") {
            this.conn.session_id = jdata.session_id;
            if(jdata.d.data.admin) {
                this.authenticated = true;
                this.conn.ready_callback();
            }
            else {
                this.conn.ready_callback();
                return;
            }
        }
        else if(jdata.m === "L") {
            if("error" in jdata.d) {
            	this.execute_callback("login", jdata.d.error, null);
            }
            else {
                this.authenticated = true;
            	this.execute_callback("login", null, jdata.d.result);
            }
        }
        else if(jdata.m === "O") {
            this.authenticated = false;
            this.execute_callback("logout", null, null);
        }
        else if(jdata.m === "GU")
        	this.execute_callback("get_users", jdata.d.error, jdata.d.ul);
        else if(jdata.m === "GS")
        	this.execute_callback("get_sessions", jdata.d.error, jdata.d.sl);
        else if(jdata.m === "GD")
        	this.execute_callback("get_diagrams", jdata.d.error, jdata.d.dl);
        else if(jdata.m === "C")
        	this.execute_callback("add_user", jdata.d.error, {});
        else if(jdata.m === "D")
        	this.execute_callback("change_user_data", jdata.d.error, {});
        else if(jdata.m === "X")
        	this.execute_callback("change_user_password", jdata.d.error, {});
        else if(jdata.m === "DU")
        	this.execute_callback("delete_user", jdata.d.error, {});
        else if(jdata.m === "DD")
        	this.execute_callback("delete_diagram", jdata.d.error, {});
        else if(jdata.m === "DO")
        	this.execute_callback("change_diagram_ownership", jdata.d.error, {});
    }

    check_connected_authenticated(callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return false;
        }
        if(!this.authenticated) {
            if(callback) callback("Already authenticated.");
            return false;
        }

        return true;
    }
    /**
     * Function for authenticate the session created with NetworkMaps
     * @param {string}      username    Name of the user (email address).
     * @param {string}      password    Password of this user
     * @param {Function}    callback    Function to be called once a response is received from
     *                                  NetworkMaps. This function will have two parameters:
     *                                      error: String with error description if there was an error
     *                                      result: object containing user, name and last name of the user authenticated
     */
    login(username, password, callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return;
        }
        if(this.authenticated) {
            if(callback) callback("Already authenticated.");
            return;
        }

        this.callbacks.login = callback;
        this.admin_ws.send(JSON.stringify({
            "m":"L",
            "d": {
                "username": username,
                "password": password
            }
        }));
    }

    /**
     * Function to logout the session.
     * @param {Function}    callback    Function to be called once a response is received from the server. This
     *                                  function will have one parameters: error in case there was an error on this call
     */
    logout(callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return;
        }
        if(!this.authenticated) {
            if(callback) callback("Not authenticated.");
            return;
        }
        this.callbacks.logout = callback;
        this.admin_ws.send(JSON.stringify({"m":"O","d":{}}));
    }

    get_users(callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.get_users = callback;    	
        this.admin_ws.send(JSON.stringify({"m":"GU","d":{}}));
    }

    get_sessions(callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.get_sessions = callback;    	
        this.admin_ws.send(JSON.stringify({"m":"GS","d":{}}));
    }

    get_diagrams(callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.get_diagrams = callback;    	
        this.admin_ws.send(JSON.stringify({"m":"GD","d":{}}));
    }

    add_user(email, name, lastname, password, callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.add_user = callback;    	
        this.admin_ws.send(JSON.stringify({
        	"m":"C",
        	"d": {
        		e: email,
        		n: name,
        		l: lastname,
        		p: password,
        	}
        }));
    }

    change_user_data(email, name, lastname, callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.change_user_data = callback;    	
        this.admin_ws.send(JSON.stringify({
        	"m":"D",
        	"d": {
        		e: email,
        		n: name,
        		l: lastname,
        	}
        }));
    }

    change_user_password(email, password, callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.change_user_password = callback;    	
        this.admin_ws.send(JSON.stringify({
        	"m":"X",
        	"d": {
        		e: email,
        		p: password,
        	}
        }));
    }

    delete_user(email, callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.delete_user = callback;    	
        this.admin_ws.send(JSON.stringify({
        	"m":"DU",
        	"d": {
        		e: email,
        	}
        }));
    }

    delete_diagram(uuid, callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.delete_diagram = callback;    	
        this.admin_ws.send(JSON.stringify({
        	"m":"DD",
        	"d": {
        		uuid: uuid,
        	}
        }));
    }

    change_diagram_ownership(uuid, owner_email, callback) {
    	if (!this.check_connected_authenticated(callback)) return;

		this.callbacks.change_diagram_ownership = callback;    	
        this.admin_ws.send(JSON.stringify({
        	"m":"DO",
        	"d": {
        		uuid: uuid,
        		e: owner_email,
        	}
        }));
    }

    close() {
        this.admin_ws.close();
    }
}

module.exports = NetworkMapsAdminLib