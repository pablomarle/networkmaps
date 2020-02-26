const fs = require('fs');

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

function change_if_exists(settings, initial_settings, key, value_if_not) {
	if(key in initial_settings)
		settings[key] = initial_settings[key];
	else if(value_if_not !== undefined)
		settings[key] = value_if_not;
}

function fill_default_settings(initial_settings) {
	let settings = {
		google_analytics_tag: "",
		serve_static_locally: true,
		timers: {
        	"usertimeout": 3600,
        	"usersavetimeout": 300,
        	"savediagram": 300,
        	"ldap_grouprefresh": 600, 	// How often do we reload ldap group membership
    	},
    	use_ssl_socket: false,
    	use_ssl: false,
    	socket: {
    		address: "localhost",
    		port: 3000,
    		cert: "",
    		key: ""
    	},
    	server: {
    		hostname: "",
    		port: 0
    	},
    	staticserver: {
    		hostname: "",
    		port: ""
    	},
    	users: {
    		admin_username: "admin",
    		admin_password: null,
    		allowed_domains: [],
    		register_self: true,
    		path: "/var/lib/networkmaps/users",

			authentication: "local",	// Can be local or ldap

    		// LDAP server
    		ldap: {
    			host: "localhost",
    			port: 389,
    			is_secure: false,
				bind_required: false,
				verify_cert: true,
				search_dn: null,
				search_password: null,
				base_dn: "dc=networkmaps,dc=org",

				objectclass_user: "inetOrgPerson",
				allowed_groups_dn: [],
				group_recursion: 0,

				email_attribute: "mail",
				name_attribute: "givenName",
				lastname_attribute: "sn",
				member_attribute: "member",    			
    		}
    	},
    	diagrams: {
    		path: "/var/lib/networkmaps/diagrams",
    		shapes: "/var/lib/networkmaps/shapes",
    	},
    	sendmail: {
    		queue: "/var/lib/networkmaps/sendmail/queue",
    		sent: "/var/lib/networkmaps/sendmail/sent",
    		server: "",
    		port: "",
    		is_secured: false,
    		verify_ssl_cert: true,
    		user: "",
    		password: "",
    		from: "MaSSHandra.com <noreply@admin.masshandra.com>",
    	},
	};

	if(initial_settings) {
		change_if_exists(settings, initial_settings, "google_analytics_tag");
		change_if_exists(settings, initial_settings, "serve_static_locally");
		if("timers" in initial_settings) {
			change_if_exists(settings["timers"], initial_settings["timers"], "usertimeout");
			change_if_exists(settings["timers"], initial_settings["timers"], "usersavetimeout");
			change_if_exists(settings["timers"], initial_settings["timers"], "savediagram");
			change_if_exists(settings["timers"], initial_settings["timers"], "ldap_grouprefresh");
		}
		change_if_exists(settings, initial_settings, "use_ssl_socket");
		change_if_exists(settings, initial_settings, "use_ssl");
		if("socket" in initial_settings) {
			change_if_exists(settings["socket"], initial_settings["socket"], "address");
			change_if_exists(settings["socket"], initial_settings["socket"], "port");
			change_if_exists(settings["socket"], initial_settings["socket"], "cert");
			change_if_exists(settings["socket"], initial_settings["socket"], "key");
		}
		if("server" in initial_settings) {
			change_if_exists(settings["server"], initial_settings["server"], "hostname", settings["socket"]["address"]);
			change_if_exists(settings["server"], initial_settings["server"], "port", settings["socket"]["port"]);
		}
		else {
			settings["server"]["hostname"] = settings["socket"]["address"];
			settings["server"]["port"] = settings["socket"]["port"];
		}
		if("staticserver" in initial_settings) {
			change_if_exists(settings["staticserver"], initial_settings["staticserver"], "hostname", settings["server"]["hostname"]);
			change_if_exists(settings["staticserver"], initial_settings["staticserver"], "port", settings["server"]["port"]);
		}
		else {
			settings["staticserver"]["hostname"] = settings["server"]["hostname"];
			settings["staticserver"]["port"] = settings["server"]["port"];			
		}
		if("users" in initial_settings) {
			change_if_exists(settings["users"], initial_settings["users"], "file");
    		change_if_exists(settings["users"], initial_settings["users"], "register_self");
    		change_if_exists(settings["users"], initial_settings["users"], "admin_username");
    		change_if_exists(settings["users"], initial_settings["users"], "admin_password");
    		change_if_exists(settings["users"], initial_settings["users"], "allowed_domains");
    		change_if_exists(settings["users"], initial_settings["users"], "authentication");
    		if("ldap" in initial_settings["users"]) {
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "host");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "port");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "is_secure");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "bind_required");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "verify_cert");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "search_dn");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "search_password");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "base_dn");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "objectclass_user");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "allowed_groups_dn");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "group_recursion");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "email_attribute");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "name_attribute");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "lastname_attribute");
    			change_if_exists(settings["users"]["ldap"], initial_settings["users"]["ldap"], "member_attribute");
    		}
		}
		if("diagrams" in initial_settings) {
			change_if_exists(settings["diagrams"], initial_settings["diagrams"], "path");
			change_if_exists(settings["diagrams"], initial_settings["diagrams"], "shapes");
		}
		if("sendmail" in initial_settings) {
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "queue");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "sent");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "server");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "port");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "is_secured");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "verify_ssl_cert");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "user");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "password");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "from");
		}
	}

	return settings;
}

function load() {
	let settings = null;

	let params = process_parameters(process.argv);
	let path = '/etc/networkmaps/config.json';

	if("config" in params.keys) {
		path = params.keys["config"];
		console.log("Config file read from (" + path + ")");
	}
	else {
		console.log("Config file read from default (" + path + ")");
		console.log("Use '--config <path_to_cfg_json>' to change config file location.");
	}

	try {
    	const data = fs.readFileSync(path);
    	settings = JSON.parse(data);
	}
	catch {
	}

	return fill_default_settings(settings);
}

module.exports = load();
