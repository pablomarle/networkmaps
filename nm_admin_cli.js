#!/usr/bin/node
const NetworkMapsAdminLib = require("./networkmapsadminlib.js");

function process_parameters(argv) {
	let params = {
		"words": [],
		"keys": {},
		"flags": [],
	}

	for(let x = 2; x < argv.length; x++) {
		if(argv[x].startsWith("--")) {
			let key = argv[x].substr(2);
			x++;
			if(x >= argv.length)
				return null;
			let value = argv[x];
			params.keys[key] = value;
		}
		else if(argv[x].startsWith("-")) {
			params.flags.push(argv[x].substr(1))
		}
		else
			params.words.push(argv[x])
	}

	return params; 
}

function display_help_message() {
	console.log(`NetworkMaps Admin CLI. Developed by Pablo Martin Leon.
Usage: nm_admin_cli.js <options> <command> <arguments>
Mandatory options:
	--server <server>: server name or ip.
	--port <port>: port where the server is listening
	--session <session_id>: session id to be used. We get this session on the login call (on login call, this parameters is not mandatory).
Optional Options:
	-t: use ssl/tls.
	-n: don't verify server certificate
Commands:
	nm_admin_cli.js help
		Display this message.

	nm_admin_cli.js <options> login <admin_user> <admin_password>
		Authenticate and create a session with the server. Will return the session id that can be used in subsecuent calls.

	nm_admin_cli.js <options> logout
		Logout the session. Recommended to run this command once the session is not needed anymore.

	nm_admin_cli.js <options> get_users
		Get a JSON string with all the users and their data.

	nm_admin_cli.js <options> get_diagrams
		Get a JSON string with all the diagrams and their data.

	nm_admin_cli.js <options> get_sessions
		Get a JSON string with all the sessions and their data.

	nm_admin_cli.js <options> add_user <email> <name> <lastname> <password>
		Create a user with the parameters provided.

	nm_admin_cli.js <options> change_user_data <email> <name> <lastname>
		Change the name and lastname of a user identified by email.

	nm_admin_cli.js <options> change_user_password <email> <password>
		Change user password.

	nm_admin_cli.js <options> delete_user <email>
		Delete user identified by 'email'.

	nm_admin_cli.js <options> delete_diagram <uuid>
		Delete diagram 'uuid'.

	nm_admin_cli.js <options> change_diagram_ownership <uuid> <email>
		Change the owner of diagram 'uuid' to 'email'.

Sample:
	Login:
		nm_admin_cli.js --server 10.0.0.1 --port 443 -t login admin my_password

		This call will give us a session ID that we can use later on other calls.

	Add User:
		nm_admin_cli.js --server 10.0.0.1 --port 443 --session f7da3c65b07aca17ccc1a37a36c6c7b47df2363d8523d9347adf127f49b2e543 -t add_user john@somedomain.com John Smith john_password
`
	)
}

function login(nml, admin_name, admin_password) {
	console.log("Session ID: " + nml.conn.session_id)
	if(nml.authenticated === false) {
		nml.login(admin_name, admin_password, (error) => {
			if(error)
				console.log("There was an error: " + error);
			else
				console.log("Authentication successful.")

			nml.close();
		})
	}
	else {
		console.log("Session already authenticated.");
		nml.close();
	}
}

function logout(nml) {
	console.log("Session ID: " + nml.conn.session_id)
	nml.logout(() => {
		console.log("Session logged out.");
		nml.close();
	})
}

function get_users(nml) {
	nml.get_users((error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log(JSON.stringify(data));
		nml.close();
	})
}

function get_diagrams(nml) {
	nml.get_diagrams((error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log(JSON.stringify(data));
		nml.close();
	})
}

function get_sessions(nml) {
	nml.get_sessions((error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log(JSON.stringify(data));
		nml.close();
	})
}

function add_user(nml, email, name, lastname, password) {
	nml.add_user(email, name, lastname, password, (error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log("Success");
		nml.close();
	})
}

function change_user_data(nml, email, name, lastname) {
	nml.change_user_data(email, name, lastname, (error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log("Success");
		nml.close();
	})
}

function change_user_password(nml, email, password) {
	nml.change_user_password(email, password, (error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log("Success");
		nml.close();
	})
}

function delete_user(nml, email) {
	nml.delete_user(email, (error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log("Success");
		nml.close();
	})
}

function delete_diagram(nml, uuid) {
	nml.delete_diagram(uuid, (error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log("Success");
		nml.close();
	})
}

function change_diagram_ownership(nml, uuid, email) {
	nml.change_diagram_ownership(uuid, email, (error, data) => {
		if(error)
			console.log("Error: " + error);
		else
			console.log("Success");
		nml.close();
	})
}

function main() {
	let params = process_parameters(process.argv);
	if(params == null) {
		console.log("Invalid parameters.");
		return;
	}

	// Help
	if((params.words.length === 0) || (params.words[0] === "help")) {
		display_help_message();
		return;
	}

	let command = params.words[0];

	if(("server" in params.keys) && ("port" in params.keys) && (("session" in params.keys) || (command === "login"))) {
		let use_ssl = (params.flags.indexOf("t") !== -1) ? true : false;
		let options = {
			verify_cert: (params.flags.indexOf("n") !== -1) ? false : true,
		}
		if("session" in params.keys)
			options.session_id = params.keys.session;

		let ready_callback = null;
		if((command === "login") && (params.words.length === 3)) {
			ready_callback = (error) => {
				login(nml, params.words[1], params.words[2]);
			};
		}
		else if((command === "logout") && (params.words.length === 1)) {
			ready_callback = (error) => {
				logout(nml);
			};
		}
		else if((command === "get_users") && (params.words.length === 1)) {
			ready_callback = (error) => {
				get_users(nml);
			};
		}
		else if((command === "get_diagrams") && (params.words.length === 1)) {
			ready_callback = (error) => {
				get_diagrams(nml);
			};
		}
		else if((command === "get_sessions") && (params.words.length === 1)) {
			ready_callback = (error) => {
				get_sessions(nml);
			};
		}
		else if((command === "add_user") && (params.words.length === 5)) {
			ready_callback = (error) => {
				add_user(nml, params.words[1], params.words[2], params.words[3], params.words[4]);
			};
		}
		else if((command === "change_user_data") && (params.words.length === 4)) {
			ready_callback = (error) => {
				change_user_data(nml, params.words[1], params.words[2], params.words[3]);
			};
		}
		else if((command === "change_user_password") && (params.words.length === 3)) {
			ready_callback = (error) => {
				change_user_password(nml, params.words[1], params.words[2]);
			};
		}
		else if((command === "delete_user") && (params.words.length === 2)) {
			ready_callback = (error) => {
				delete_user(nml, params.words[1]);
			};
		}
		else if((command === "delete_diagram") && (params.words.length === 2)) {
			ready_callback = (error) => {
				delete_diagram(nml, params.words[1]);
			};
		}
		else if((command === "change_diagram_ownership") && (params.words.length === 3)) {
			ready_callback = (error) => {
				change_diagram_ownership(nml, params.words[1], params.words[2]);
			};
		}
		else {
			display_help_message();
			return;
		}
		let nml = new NetworkMapsAdminLib(use_ssl, params.keys.server, params.keys.port, options, ready_callback);
	}
	else {
		display_help_message();
		return;
	}
}

main();