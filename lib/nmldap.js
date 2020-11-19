let ldap = require('ldapjs');

class NMLDAPError extends Error {
    constructor(message) {
        super(message);
        this.name = "NMLDAPError";
    }
};

class NMLDAP {
    /** Constructor
     *  Parameters:
     *      options: object containint:
     *          host: ip or name of the servers
     *          port: port where it is listening
     *          is_secure: use ldaps or ldap.
     *          verify_cert: verify server certificate
     *          bind_required: does the ldap server require a bind for searching
     *          search_dn: dn used to bind if bind is required for searches
     *          search_password: password of search_dn
     *          base_dn: base dn where to look for users
     *          email_attribute:
     *          name_attribute:
     *          lastname_attribute:
     *          member_attribute:
     *          
     */ 
    constructor(options) {
        this.url = (options.is_secure) ? "ldaps://" : "ldap://";
        this.url += options.host + ":" + options.port;
        this.bind_required = options.bind_required;
        this.search_dn = options.search_dn;
        this.search_password = options.search_password;
        this.base_dn = options.base_dn;
        this.objectclass_user = options.objectclass_user;
        this.allowed_groups_dn = options.allowed_groups_dn;
        this.group_recursion = options.group_recursion;

        this.email_attribute = options.email_attribute;
        this.name_attribute = options.name_attribute;
        this.lastname_attribute = options.lastname_attribute;
        this.member_attribute = options.member_attribute;
        this.verify_cert = options.verify_cert;
        this.lastclient = null;

        this.group_members = new Set();
    }

    createClient(callback) {
        let client = ldap.createClient({
            url: this.url,
            tlsOptions: {
                rejectUnauthorized: this.verify_cert
            },
            timeout: 10000,
            connectTimeout: 10000,
        });
        this.lastclient = client;

        client.on("error", (err) => {
            callback(new NMLDAPError("LDAP ERROR: " + err));
            this.destroyClient(client);
        });

        client.on("connect", () => {
            if(this.bind_required) {
                client.bind(this.search_dn, this.search_password, (err) => {
                    if(err) {
                        callback(new NMLDAPError("LDAP BIND ERROR: " + err));
                        this.destroyClient(client);
                    }
                    else {
                        callback(null, client)
                    }
                });
            }
            else
                callback(null, client);
        })
    }

    destroyClient(client) {
        client.unbind();
        client.destroy();
    }

    _emailSearch(client, email, callback) {
        client.search(this.base_dn,
            {
                attributes: [this.email_attribute, this.name_attribute, this.lastname_attribute, "uid"],
                scope: "sub",
                filter: "(&(" + this.email_attribute + "=" + email + ")(objectclass=" + this.objectclass_user + "))",
            }, (err, res) => {
                if(err) {
                    callback(new NMLDAPError("LDAP Authentication Error: " + err));
                    return;
                }

                let result_list = [];
                res.on('searchEntry', (entry) => {
                    result_list.push(entry.object)
                });
                res.on('error', (error) => {
                    callback(new NMLDAPError("LDAP Search Error: " + error));
                });

                res.on('end', (result) => {
                    callback(null, result_list);
                })
            }
        );
    }

    emailSearch(email, callback) {
        this.createClient((err, client) => {
            if(err) {
                callback(err);
                return;
            }


            this._emailSearch(client, email, (err, entry_list) => {
                if(err) {
                    callback(err);
                    this.destroyClient(client);
                    return;
                }

                if(entry_list.length === 0) {
                    callback(new NMLDAPError("LDAP User " + email + "not found."));
                    this.destroyClient(client);
                    return;
                }
                if(entry_list.length !== 1) {
                    callback(new NMLDAPError("LDAP email query for " + email + " returned more than one entry."));
                    this.destroyClient(client);
                    return;
                }

                let dn = entry_list[0].dn;
                if((this.allowed_groups_dn.length > 0) && (!(this.group_members.has(dn))) && (!(this.group_members.has(entry_list[0].uid)))) {
                    callback(new NMLDAPError("LDAP dn " + dn + " (" + email + ") not in allowed groups."));
                    this.destroyClient(client);
                    return;                    
                }
                this.destroyClient(client);

                callback(null, {
                    name: entry_list[0][this.name_attribute],
                    lastname: entry_list[0][this.lastname_attribute],
                    name: entry_list[0][this.name_attribute],
                });
            });
        });
    }

    emailAuthenticate(email, password, callback) {
        this.createClient((err, client) => {
            if(err) {
                callback(err);
                return;
            }
            this._emailSearch(client, email, (err, entry_list) => {
                if(err) {
                    callback(err);
                    this.destroyClient(client);
                    return;
                }

                if(entry_list.length === 0) {
                    callback(new NMLDAPError("LDAP User " + email + "not found."));
                    this.destroyClient(client);
                    return;
                }
                if(entry_list.length !== 1) {
                    callback(new NMLDAPError("LDAP email query for " + email + " returned more than one entry."));
                    this.destroyClient(client);
                    return;
                }

                let dn = entry_list[0].dn;
                if((this.allowed_groups_dn.length > 0) && (!(this.group_members.has(dn))) && (!(this.group_members.has(entry_list[0].uid)))) {
                    callback(new NMLDAPError("LDAP dn " + dn + " (" + email + ") not in allowed groups."));
                    this.destroyClient(client);
                    return;                    
                }

                client.bind(dn, password, (err) => {
                    if(err) {
                        callback(err);
                    }
                    else
                        callback(null, {
                            name: entry_list[0][this.name_attribute],
                            lastname: entry_list[0][this.lastname_attribute],
                            name: entry_list[0][this.name_attribute],
                        });

                    this.destroyClient(client);
                })
            });
        });
    }

    update_group_members(callback) {
        this.temp_group_members = new Set();
        this.createClient((err, client) => {
            if(err) {
                callback([err]);
                return;
            }

            let group_count = this.allowed_groups_dn.length;
            let err_list = [];
            this.allowed_groups_dn.forEach((groupdn) => {
                this.get_group_members_rec(client, groupdn, this.group_recursion, (err) => {
                    group_count--;
                    if(err) {
                        err_list.push.apply(err_list, err);

                    }

                    if(group_count === 0) {
                        this.destroyClient(client);
                        if(err_list.length > 0) {
                            callback(err_list);
                        }
                        else {
                            this.group_members = this.temp_group_members;
                            callback();
                        }
                    }
                })
            });
        });
    }

    get_group_members_rec(client, groupdn, recursion_level, callback) {
        client.search(groupdn,
            {
                attributes: [this.member_attribute],
                scope: "base",
            }, (err, res) => {
                if(err) {
                    callback([err]);
                    return;
                }

                let result_list = [];
                res.on('searchEntry', (entry) => {
                    result_list.push(entry.object)
                });

                res.on('error', (error) => {
                    callback([new NMLDAPError("LDAP Search Error: " + error)]);
                });

                res.on('end', (result) => {
                    if(result_list.length !== 1) {
                        callback([new NMLDAPError("Query for group " + groupdn + " returned " + result_list.length + " entries.")]);
                        return;
                    }
                    let member_list = [];

                    if(this.member_attribute in result_list[0]) {
                        if(!Array.isArray(result_list[0][this.member_attribute]))
                            result_list[0][this.member_attribute] = [result_list[0][this.member_attribute]];
                        result_list[0][this.member_attribute].forEach((member) => {
                            this.temp_group_members.add(member);
                            member_list.push(member)
                        });
                    }
                    if((recursion_level === 0) || (member_list.length === 0)) {
                        callback(null);
                        return;
                    }
                    else {
                        let group_count = member_list.length;
                        let err_list = [];
                        member_list.forEach((groupdn) => {
                            this.get_group_members_rec(client, groupdn, recursion_level-1, (err) => {
                                group_count--;
                                if(err) {
                                    err_list.push.apply(err_list, err);

                                }

                                if(group_count === 0) {
                                    if(err_list.length > 0) {
                                        callback(err_list);
                                    }
                                    else {
                                        callback();
                                    }
                                }
                            })
                        });
                    }
                })
            }
        );
    }
}

module.exports = NMLDAP;