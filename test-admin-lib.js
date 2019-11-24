const NetworkMapsAdminLib = require("./admin");
let SERVER = "10.0.0.3";
let PORT = "3000";
let USE_SSL = true;
let USERNAME = "admin";
let PASSWORD = "password123";

function do_something(nml) {
	console.log("Doing something");
	nml.change_diagram_ownership('d94d37df5e248a1aa9c3651cf819e5ba156349c8911a52c6fae666287f846159', 'pablo@masshandra.com', (error, data) => {
		if(error) {
			console.log("Call error");
			console.log(error);
		}
		else {
			console.log("Call result");
			console.log(data);
		}
	})
}

let nml = new NetworkMapsAdminLib(USE_SSL, SERVER, PORT, {verify_cert:false}, () => {
	nml.login(USERNAME, PASSWORD, (error) => {
		if(error)
			console.log(error);
		else
			do_something(nml);
	});	
});

