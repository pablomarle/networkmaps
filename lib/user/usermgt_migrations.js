function fix_usermgt_version(usermgt) {
    let migrations = [];
    // Function to do adjustments on usermgt data. This is needed as in some situations, when the source code
    // is updated, we add more functions and the usermgt structure needs to be updated

    // Create the settings section
    if(!("version" in usermgt)) {
        usermgt.version = 1;
        if(!("shape_group_data" in usermgt))
            usermgt.shape_group_data = {
                categories: ["3dshapes", "networking", "clients", "servers", "security"],
                shape_group: {
                    "1": {name: "Shapes",description: "Basic shapes like cubes, spheres, ...",owner: "",public: true,category: "3dshapes",tags: []},
                    "2": {name: "Network",description: "Devices like routers, switches, loadbalancers, ...",owner: "",public: true,category: "networking",tags: []},
                    "3": {name: "Clients",description: "Users, laptops, desktops, printers, offices, ...",owner: "",public: true,category: "clients",tags: []},
                    "4": {name: "Servers",description: "Servers",owner: "",public: true,category: "servers",tags: []},
                    "5": {name: "Security",description: "Security devices like firewalls, antivirus, ...",owner: "",public: true,category: "security",tags: []},
                }
            }
        migrations.push({"from": 0, "to": 1})
    }

    return migrations;
}

module.exports = {
    fix_usermgt_version: fix_usermgt_version,
};