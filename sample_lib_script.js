const NetworkMapsLib = require('./networkmapslib');

let SESSION_ID = '83fd7940e85a3a13e5286562044804d0835f27efb4d2aee38f98701cdbdc0b44';
let SERVER = "10.0.0.3";
let PORT = "3000";
let USE_SSL = true;
let USERNAME = "pablo@masshandra.com";
let PASSWORD = "password123";

let DIAGRAM_DATA = [
	{action: "add_device", type: }
]

function edit_diagram(diagram) {
	// This function will create a datacenter network
	exit();
}

function exit() {
	process.exit();
}

function create_diagram(nml) {
	// This function will create a diagram and add some network elements there
	console.log("Creating diagram...");
	nml.add_diagram("Test Auto Diagram", (error, uuid) => {
		if(error) {
			console.log("Error creating diagram: " + error);
			exit();
		}

		console.log("Diagram created. Connecting to diagram...");
		// Once the diagram is created, we set up a websocket to this endpoint to edit it
		nml.setup_diagram_ws(uuid, (error, diagram) => {
			if(error) {
				console.log("Error connecting to new diagram.")
				exit();
			}

			console.log("Connected to diagram.");
			edit_diagram(diagram);
		})
	})
}

function main() {
	// Create the initial connection to networkmaps. We will pass a session id if we already have it.
	// If we don't pass the session_id, or the session_id provided is not valid, networkmaps will
	// generate a new one for us which we can use on later runs to not have to authenticate ourselves every time.
	console.log("Connecting to networkmaps...")
	let nml = new NetworkMapsLib(USE_SSL, SERVER, PORT, {verify_cert:false, session_id: SESSION_ID},
		() => {
			console.log("Connected to networkmaps...")
			if(!nml.authenticated) {
				// The session is not authenticated. let's authenticate ourselves
				console.log("Session not authenticated. Authenticating...");
				nml.login(USERNAME, PASSWORD, (error) => {
					if(error) {
						console.log("Authentication error: " + error);
					}
					else {
						console.log("Session authenticated: " + nml.conn.session_id);
						create_diagram(nml);
					}
				})
			}
			else {
				// Session is authenticated.
				create_diagram(nml);
			}
		},
		() => {
				// This function is called as soon as the socket is closed
				console.log("User socket closed.")
		});
}

main();
/*
nml = new NML(true, "10.0.0.3", "3000", {verify_cert:false, session_id: session_id}, () => {
	nml.setup_diagram_ws("7f49a68dea40395e1705b02eb610a12468d580ec7fe365daf51df02c08c6faeb", (e, d) => {
		d.get_data((error, data) => { if(error) console.log(error); console.log(data)});
	})	
})


const NML = require('./networkmapslib');
let session_id = '83fd7940e85a3a13e5286562044804d0835f27efb4d2aee38f98701cdbdc0b44'
nml = new NML(true, "10.0.0.3", "3000", {verify_cert:false, session_id: session_id}, () => {
	nml.setup_diagram_ws("7f49a68dea40395e1705b02eb610a12468d580ec7fe365daf51df02c08c6faeb", (e, d) => {
		d.settings_base("L2", "0", "AUTO", "g", 0xffaaaa, 0xaaaaff, .5, "b1_t6", "b2_t2", 1, 2, 2,
			(error, data) => { if(error) console.log(error); console.log(data)});
	})	
})

const NML = require('./networkmapslib');
let session_id = '83fd7940e85a3a13e5286562044804d0835f27efb4d2aee38f98701cdbdc0b44'
let diagram = null;
let interval;
nml = new NML(true, "10.0.0.3", "3000", {verify_cert:false, session_id: session_id}, () => {
	nml.setup_diagram_ws("7f49a68dea40395e1705b02eb610a12468d580ec7fe365daf51df02c08c6faeb", (e, d) => {
		diagram = d;
		d.get_data((error, data) => {
			interval = setInterval(
				() => {
					["device", "symbol"].forEach((type) => {
						for(let dev_id in data.L2[type]) {
							d.resize_element("L2", type, dev_id, Math.random()+1, Math.random()+1, Math.random()+1,
								(error, data) => { console.log("Callback result:"); if(error) console.log(error); console.log(data)});
						}					
					})

				},
				1000);
		})
	})	
})
*/