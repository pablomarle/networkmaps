const fs = require('fs');

function change_if_exists(settings, initial_settings, key) {
	if(key in initial_settings)
		settings[key] = initial_settings[key];
}

function fill_default_settings(initial_settings) {
	let settings = {
		google_analytics_tag: "",
		serve_static_locally: true,
		timers: {
        	"usertimeout": 3600,
        	"usersavetimeout": 300,
        	"savediagram": 300
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
    		hostname: "localhost",
    		port: 3000
    	},
    	staticserver: {
    		hostname: "",
    		port: ""
    	},
    	users: {
    		path: "/var/lib/networkmaps/users",
    	},
    	diagrams: {
    		path: "/var/lib/networkmaps/diagrams",
    	},
    	sendmail: {
    		queue: "/var/lib/networkmaps/sendmail/queue",
    		sent: "/var/lib/networkmaps/sendmail/sent",
    		server: "",
    		port: "",
    		is_secured: false,
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
			change_if_exists(settings["server"], initial_settings["server"], "hostname");
			change_if_exists(settings["server"], initial_settings["server"], "port");
		}
		if("staticserver" in initial_settings) {
			change_if_exists(settings["staticserver"], initial_settings["staticserver"], "hostname");
			change_if_exists(settings["staticserver"], initial_settings["staticserver"], "port");
		}
		if("users" in initial_settings) {
			change_if_exists(settings["users"], initial_settings["users"], "file");
		}
		if("diagrams" in initial_settings) {
			change_if_exists(settings["diagrams"], initial_settings["diagrams"], "path");
		}
		if("sendmail" in initial_settings) {
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "queue");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "sent");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "server");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "port");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "is_secured");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "user");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "password");
			change_if_exists(settings["sendmail"], initial_settings["sendmail"], "from");
		}
	}

	return settings;
}

function load() {
	let settings = null;

	try {
    	const data = fs.readFileSync('/etc/networkmaps/config.json');
    	settings = JSON.parse(data);

	}
	catch {
	}

	return fill_default_settings(settings);
}

module.exports = load();
