const NetworkMapsLib = require('./networkmapslib');

let SESSION_ID = '246e38d5755421ee8c2d17873dc21419cb71e7d9d620a3445491bac08972999a';
let SERVER = "10.0.0.3";
let PORT = "3000";
let USE_SSL = true;
let USERNAME = "pablo@masshandra.com";
let PASSWORD = "password123";

let step = 0;
let substep = 0;
let dev_index = {};
let base_index = [];

function edit_diagram(diagram) {
	// This function will create a datacenter network
	if(step > 5) {
		console.log("End");
		exit();
	}

	if(step == 0) { // Add bases
		console.log("Adding base " + substep);
		if(substep == 0) {
			diagram.resize_element("L2", "base", "0", 62, .5, 3);
		}
		
		let angle = substep/16*2*Math.PI;
		let radius = (120 * ((substep%2)*.2+.8));
		let px = Math.cos(angle) * radius;
		let pz = Math.sin(angle) * radius;
		diagram.add_base("L2", px, 0, pz, 64, .5, 3, 0,-angle+Math.PI/2,0, "F", (error, data) => {
			if(error) {
				console.log("ERROR 0");
				console.log(error);
				exit();
			};
			base_index.push(data.i);
			substep++;
			if(substep >= 16) {
				substep = 0;
				step++;
			}
			setTimeout(() => {edit_diagram(diagram)}, 1000);
		});
	}
	if(step == 1) { // Add spines
		console.log("Adding Spine " + substep)
		diagram.add_device("R", -6 + substep*4, 16, 0, 1,1,1, 0,0,0, 0x66aaff, 0x88ccff, "0", (error, data) => {
			if(error) {
				console.log("ERROR 1");
				console.log(error);
				exit();
			};
			console.log("Configuring Spine " + substep);
			dev_index["spine_" + substep] = data.i;
			diagram.settings_device(data.i, "Spine " + substep, 0xbb0000, 0x990000, ["Ethernet{1-32}/{1-4}", "Ethernet{33-34}", "Management{1-1}"], (error, data) => {
				if(error) {
					console.log("ERROR 2");
					console.log(error);
					exit();
				}
				substep++;
				if(substep > 3) {
					substep = 0;
					step++;
				}
				setTimeout(() => {edit_diagram(diagram)}, 1000);
			});
		});
	}
	if(step == 2) { // Add fabrics
		let pod = Math.floor(substep/4);
		let fabric = substep%4;
		console.log("Adding Fabric " + "P" + pod + "F" + fabric)
		diagram.add_device("R", -6 + fabric*4, 16, 0, 1,1,1, 0,0,0, 0x66aaff, 0x88ccff, base_index[pod], (error, data) => {
			if(error) {
				console.log("ERROR 1");
				console.log(error);
				exit();
			};
			console.log("Configuring Fabric " + "P" + pod + "F" + fabric);
			dev_index["p" + pod + "f" + fabric] = data.i;
			diagram.settings_device(data.i, "P" + pod + "F" + fabric, 0x017f04, 0x016f04, ["Ethernet{1-32}/{1-4}", "Ethernet{33-34}", "Management{1-1}"], (error, data) => {
				if(error) {
					console.log("ERROR 2");
					console.log(error);
					exit();
				}
				substep++;
				if(substep >= 16*4) {
					substep = 0;
					step++;
				}
				setTimeout(() => {edit_diagram(diagram)}, 50);
			});
		});
	}

	if(step == 3) { // Add ToRs
		let pod = Math.floor(substep/16);
		let tor = substep%16;
		console.log("Adding Tor " + "P" + pod + "T" + tor)
		diagram.add_device("R", -30 + tor*4, .5, 0, 1,1,1, 0,0,0, 0x66aaff, 0x88ccff, base_index[pod], (error, data) => {
			if(error) {
				console.log("ERROR 1");
				console.log(error);
				exit();
			};
			console.log("Configuring Tor " + "P" + pod + "T" + tor);
			dev_index["p" + pod + "t" + tor] = data.i;
			diagram.settings_device(data.i, "P" + pod + "T" + tor, 0x66aaff, 0x88ccff, ["Ethernet{1-32}/{1-4}", "Ethernet{33-34}", "Management{1-1}"], (error, data) => {
				if(error) {
					console.log("ERROR 2");
					console.log(error);
					exit();
				}
				substep++;
				if(substep >= 16*16) {
					substep = 0;
					step++;
				}
				setTimeout(() => {edit_diagram(diagram)}, 50);
			});
		});
	}
	if(step == 4) { // Link spines with fabrics
		let spine = Math.floor(substep / 16);
		let pod = substep % 16;
		let spine_id = dev_index["spine_" + spine];
		let fabric_id = dev_index["p" + pod + "f" + spine];
		console.log("Linking Spine " + spine + " with Fabric " + "p" + pod + "f" + spine);
		diagram.add_link(spine_id, fabric_id, 0, 0x000000, .025, .25, (error, data) => {
			if(error) {
				console.log("ERROR 3");
				console.log(error);
				exit();
			};
			substep++;
			if(substep >= 16*4) {
				substep = 0;
				step++;
			}
			setTimeout(() => {edit_diagram(diagram)}, 100);
		})
	}
	if(step == 5) { // Link fabrics with tors
		let fabric = substep%4;
		let pod = Math.floor(Math.floor(substep / 4) / 16);
		let tor = Math.floor(substep / 4) % 16;
		let tor_id = dev_index["p" + pod + "t" + tor];
		let fabric_id = dev_index["p" + pod + "f" + fabric];
		console.log("Linking Fabric " + "p" + pod + "f" + fabric + " with ToR " + "p" + pod + "t" + tor);
		diagram.add_link(fabric_id, tor_id, 0, 0x888888, .025, .25, (error, data) => {
			if(error) {
				console.log("ERROR 4");
				console.log(error);
				exit();
			};
			substep++;
			if(substep >= 16*16*4) {
				substep = 0;
				step++;
			}
			setTimeout(() => {edit_diagram(diagram)}, 100);
		})
	}
}

function exit() {
	process.exit();
}

function create_diagram(nml) {
	// This function will create a diagram and add some network elements there
	console.log("Creating diagram...");
	nml.list_diagrams((error, data) => {
		if(error) {
			console.log("Error listing diagrams: " + error);
			exit();
		}
		for(let x = 0; x < data.length; x++) {
			if(data[x].name === "Test Auto Diagram") {
				console.log("Deleting " + data[x].uuid);
				nml.delete_diagram(data[x].uuid);
			}
		}
	})
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
			setTimeout(() => {edit_diagram(diagram)}, 10000);
		}, () => {
			console.log("Diagram closed unexpectedly.");
			exit();
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
