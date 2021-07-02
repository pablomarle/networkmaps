const fs = require('fs');
const net = require('./net');
const l3processor = require('./l3processor');
const etmap_migrations = require('./etmap_migrations');
const validator = require('validator');


function wsSendError(ws, msg_id, message, fatal) {
    let response = {
        m: "E",
        d: {"error": message},
        msg_id: msg_id,
    };
    if(fatal)
        d.fatal = fatal;

    if("nm_data" in ws)
        response.conn_id = ws.nm_data.conn_id;

    ws.send(JSON.stringify(response))
}

class ETMap {
    constructor(name, type, path, uuid, usermgt, savediagram_interval, destroycallback) {
        this.name = name;
        this.type = type;
        this.path = path;
        this.uuid = uuid;
        this.diagram = null;
        this.clients = [];
        this.saveinterval = null;
        this.destroycallback = destroycallback;
        this.savediagram_interval = savediagram_interval;
        this.usermgt = usermgt;
        this.logmessage("Created");
    }

    static defaultDiagram(type) {
        if(type === "basic")
            return {
                version: 3,
                type: "basic",
                settings: {
                    id_gen: 1000,
                    bg_color: 0xf0f0f0,
                    shapes: ["1"],
                },
                L2: {
                    device: {},
                    link: {},
                    base: {
                        "0": {
                            type: "F",
                            name: "Floor",
                            px: 0, py: 0, pz: 0, 
                            rx: 0, ry: 0, rz: 0,
                            sx: 20, sy: .5, sz: 20,
                            color1: 0xffffff,
                            color2: 0xffbbaa,
                            t1name: "b1_t1",
                            t2name: "b2_t1",
                            tsx: 1,
                            tsy: 1,
                            data: [],
                            urls: {},
                        }
                    },
                    text: {},
                    symbol: {},
                },
            }
        if(type === "network")
            return {
                version: 3,
                type: "network",
                settings: {
                    id_gen: 1000,
                    bg_color: 0xf0f0f0,
                    shapes: ["1", "2", "3", "4", "5"],
                },
                L2: {
                    device: {},
                    link: {},
                    base: {
                        "0": {
                            type: "F",
                            name: "Floor",
                            px: 0, py: 0, pz: 0, 
                            rx: 0, ry: 0, rz: 0,
                            sx: 20, sy: .5, sz: 20,
                            color1: 0xffffff,
                            color2: 0xffbbaa,
                            t1name: "b1_t1",
                            t2name: "b2_t1",
                            tsx: 1,
                            tsy: 1,
                            data: [],
                            urls: {},
                        }
                    },
                    text: {},
                    symbol: {},
                },

                L3: {
                    base: {
                        "0": {
                            type: "F",
                            name: "Floor",
                            px: 0, py: 0, pz: 0, 
                            rx: 0, ry: 0, rz: 0,
                            sx: 20, sy: .5, sz: 20,
                            color1: 0xffffff,
                            color2: 0xffbbaa,
                            t1name: "b1_t1",
                            t2name: "b2_t1",
                            tsx: 1,
                            tsy: 1,
                            data: [],
                        }
                    },
                    vrf: {},
                    l2link: {},
                    l2segment: {},
                    interface: {},
                    p2p_interface: {},
                    svi_interface: {},
                    bgp_peering: {},
                    symbol: {},
                    text: {},
                }
            }
    }

    static saveDiagram(path, uuid, diagram, callback) {
        fs.writeFile(path + "/" + uuid + ".json", JSON.stringify(diagram), (err) => {
            if(err) {
                if(callback)
                    callback("Error saving diagram: " + err );
                return;
            }

            if(callback) callback();
        })
    }

    static loadDiagram(type, path, uuid, callback) {
        fs.readFile(path + "/" + uuid + ".json", "utf-8", (err, data) => {
            if(err) {
                // Load default diagram
                console.log("Loaded default diagram of type " + type + ". Couldn't find " + path + "/" + uuid + ".json");
                callback(null, ETMap.defaultDiagram(type));
            }
            else {
                try {
                    let diagram = JSON.parse(data);
                    callback(null, diagram);
                }
                catch(err) {
                    callback("Parse Error");
                }
            }

        });
    }
    
    logmessage(message) {
        console.log("UUID: " + this.uuid + " C: " + this.clients.length + " M: " + message);
    }

    initialize(callback) {
        this.logmessage("Initialize Called");

        ETMap.loadDiagram(this.type, this.path, this.uuid, (err, data) => {
            if(err) {
                callback("Parse Error");
                return;
            }
            this.diagram = data;

            // Fix diagrams based on version
            let migrations = etmap_migrations.fix_diagram_version(this.diagram);
            migrations.forEach((entry) => { console.log("Migration on " + this.uuid + ": " + entry.from + " => " + entry.to)});
            
            // Set timeout to save diagram every 'savediagram' interval.
            this.saveinterval = setInterval(() => {
                this.save(null)
            }, this.savediagram_interval * 1000)

            // Broadcast to all existing clients the diagram and setup ws calls
            for(let x = 0; x < this.clients.length; x++) {
                this.sendInitializeMessage(this.clients[x], -1);

                this.setupWSCalls(this.clients[x]);
            }

            callback(null);
            this.logmessage("Diagram loaded.");
            return;
        })
    }

    destroy() {
        // Clear the save interval
        clearInterval(this.saveinterval);

        // Close all websockets
        for(let x = 0; x < this.clients.length; x++) {
            this.clients[x].close()
        }

        // Save diagrams
        this.save();

        // Callback
        this.destroycallback(this.uuid);
        this.logmessage("Destroyed.");
    }

    save(callback) {
        ETMap.saveDiagram(this.path, this.uuid, this.diagram, (err) => {
            if(err) {
                this.logmessage(err);
                if(callback)
                    callback("Error saving diagram");
                return;
            }

            this.logmessage("Diagram saved");

            if(callback) callback();
        })
    }

    addWS(ws) {
        // Maximum of 10 persons per diagram
        if(this.clients.length > 10) {
            this.logmessage("Maximum number of users reached")
            ws.close();
            return;
        }

        // Add the ws to client list
        this.clients.push(ws);

        // If the diagram is loaded, we send it to the client. If not, there is no need as the function
        // that loads it, will send it to all already connected ones. We will also set up the ws calls only if
        // the diagram is loaded to prevent someone from trying to make changes on the diagram before it's loaded
        if(this.diagram != null) {
            this.sendInitializeMessage(ws, -1);

            // Setup websocket
            this.setupWSCalls(ws);
        }

        this.logmessage("Client added")
    }

    removeWS(ws) {
        for(let x = 0; x < this.clients.length; x++) {
            if (this.clients[x] == ws) {
                this.clients.splice(x, 1);
                break;
            }
        }
        this.logmessage("Client removed")

        if(this.clients.length == 0) {
            this.destroy();
        }
    }

    setupWSCalls(ws) {
        ws.on("message", (message) => {
            this.processMessage(ws, message);
        })

        ws.on("close", () => {
            clearInterval(ws.interval);
            this.removeWS(ws);
        })

        ws.on("error", (error) => {
            console.log("WS ERROR on diagram:")
            console.log(error)
            clearInterval(ws.interval);
            this.removeWS(ws); 
        })

        // PING PONG to detect broken connections
        ws.isAlive = true;
        ws.interval = setInterval(() => {
            if (ws.isAlive === false) {
                this.logmessage("Ping Pong Failed")
                clearInterval(ws.interval);
                //this.removeWS(ws);
                ws.terminate();
                return;
            }

            ws.isAlive = false;
            ws.ping('');

        }, 5000);

        ws.on("pong", () => {
            ws.isAlive = true;
        })
    }

    sendInitializeMessage(ws, msg_id) {
        let userTextures = this.usermgt.getUserTextures(ws.nm_data.sessionid);

        ws.send(JSON.stringify({
                m: "I", 
                d: {n: this.name, d: this.diagram, p: ws.nm_data.permission, ut: userTextures},
                conn_id: ws.nm_data.conn_id,
                msg_id: msg_id,
            }))
    }

    broadcastMessage(source_ws, msg_id, message) {
        message.conn_id = source_ws.nm_data.conn_id;
        message.msg_id = msg_id;
        let jsonmsg = JSON.stringify(message);

        for(let i = 0; i < this.clients.length; i++) {
            this.clients[i].send(jsonmsg);
        }
    }

    processMessage(ws, message) {
        let m;

        try {
            m = JSON.parse(message);
        }
        catch(err) {
            this.logmessage("WS parse error.");
            ws.terminate();
            return;
        }

        let msg_id = -1;
        if("msg_id" in m)
            msg_id = m.msg_id;

        if(["OWNER", "RW"].indexOf(ws.nm_data.permission) === -1) {
            wsSendError(ws, msg_id, "You don't have permissions on this diagram.");
            return;
        }

        if(! (("m" in m) && ("d" in m) && (typeof m.d === "object")) ) {
            this.logmessage("WS msg format error.");
            ws.terminate();
            return;
        }

        switch(m.m) {
            case "A":
                this.processMessage_add(ws, msg_id, m.d);
                break;
            case "M":
                this.processMessage_move(ws, msg_id, m.d);
                break;
            case "R":
                this.processMessage_rotate(ws, msg_id, m.d);
                break;
            case "X":
                this.processMessage_resize(ws, msg_id, m.d);
                break;
            case "P":
                this.processMessage_settings(ws, msg_id, m.d);
                break;
            case "C":
                this.processMessage_config(ws, msg_id, m.d);
                break;
            case "D":
                this.processMessage_delete(ws, msg_id, m.d);
                break;
            case "BG":
                this.processMessage_background(ws, msg_id, m.d);
                break;
            case "DT":
                this.processMessage_data(ws, msg_id, m.d);
                break;
            case "U":
                this.processMessage_url(ws, msg_id, m.d);
                break;
            case "I":
                this.sendInitializeMessage(ws, msg_id);
                break;
            case "S":
                this.processMessage_shapes(ws, msg_id, m.d);
                break;
            default:
                this.logmessage("WS msg type error.");
                ws.terminate();
                return;             
        }
    }

    processMessage_shapes(ws, msg_id, d) {
        if(d.m === "A") {
            // Add new shape group to diagram
            let index = this.diagram.settings.shapes.indexOf(d.id);
            if(index !== -1) {
                    wsSendError(ws, msg_id, "Shape group already added to diagram.")
            }
            else {
                this.usermgt.listShapes(ws.nm_data.sessionid, (error, data) => {
                    if(error) {
                        wsSendError(ws, msg_id, error);
                    }
                    else {
                        if(d.id in data) {
                            this.diagram.settings.shapes.push(d.id);
                            this.broadcastMessage(ws, msg_id, {
                                m: "S",
                                d: {
                                    m: "A",
                                    id: d.id,
                                }
                            })
                        }
                        else {
                            wsSendError(ws, msg_id, "Shape group not found.")
                        }
                    }
                });
            }

        }
        else if(d.m === "D") {
            // Remove shape group from diagram
            let index = this.diagram.settings.shapes.indexOf(d.id);
            if(index === -1) {
                    wsSendError(ws, msg_id, "Shape group not found.")
            }
            else {
                this.diagram.settings.shapes.splice(index,1);
                this.broadcastMessage(ws, msg_id, {
                    m: "S",
                    d: {
                        m: "D",
                        id: d.id,
                    }
                })

            }
        }
        else if(d.m === "L") {
            // List shapes
            this.usermgt.listShapes(ws.nm_data.sessionid, (error, data) => {
                if(error) {
                    wsSendError(ws, msg_id, error)
                }
                else {
                    ws.send(JSON.stringify({
                        m: "S",
                        d: {
                            m: "L",
                            d: data,
                        },
                        msg_id: msg_id,
                    }))
                }
            });
        }
        else {
            this.logmessage("WS shape msg error: " + d);
            ws.terminate();
            return;
        }

    }

    processMessage_add(ws, msg_id,  d) {
        if(d.v === "L2" && d.t === "base") {
            this.addL2Base(ws, msg_id, d);
        }
        else if(d.v === "L3" && d.t === "base") {
            this.addL3Base(ws, msg_id, d);
        }
        else if (d.v === "L2" && d.t === "device") {
            this.addL2Device(ws, msg_id, d);
        }
        else if (d.v === "L2" && d.t === "link") {
            this.addL2Link(ws, msg_id, d);
        }
        else if (d.v === "L2" && d.t === "joint") {
            this.addL2Joint(ws, msg_id, d);
        }
        else if (d.v === "L3" && d.t === "joint") {
            this.addL3Joint(ws, msg_id, d);
        }
        else if (d.v === "L3" && d.t === "bgp_peering") {
            this.addL3BGPPeer(ws, msg_id, d);
        }
        else if (d.t === "text") {
            this.addText(ws, msg_id, d);
        }
        else if (d.t === "symbol") {
            this.addSymbol(ws, msg_id, d);
        }
        else {
            this.logmessage("WS msg error.");
            ws.terminate();
            return;
        }
    }

    processMessage_move(ws, msg_id, d) {
        if(d.t == "base") {
            this.moveBase(ws, msg_id, d.v, d.i, d.x, d.y, d.z);
        }
        else if(d.v == "L2" && d.t == "joint") {
            this.moveL2Joint(ws, msg_id, d.et, d.i, d.joint_index, d.x, d.y, d.z);
        }
        else if(d.v == "L3" && d.t == "joint") {
            this.moveL3Joint(ws, msg_id, d.et, d.i, d.joint_index, d.x, d.y, d.z);
        }
        else if(d.v == "L3" && d.t == "bgp_peering") {
            this.moveBGPPeer(ws, msg_id, d.i, d.curve_x, d.curve_y);
        }
        else {
            this.moveElement(ws, msg_id, d.v, d.t, d.i, d.x, d.y, d.z, d.base);
        }
    }
    processMessage_rotate(ws, msg_id, d) {
        this.rotateElement(ws, msg_id, d.v, d.t, d.i, d.x, d.y, d.z);
    }

    processMessage_resize(ws, msg_id, d) {
        this.resizeElement(ws, msg_id, d.v, d.t, d.i, d.x, d.y, d.z);
    }

    processMessage_settings(ws, msg_id, d) {
        if(((d.v === "L2") || (d.v === "L3")) && d.t == "base") {
            this.settingsBase(ws, msg_id, d.v, d.i, d.name, d.subtype, d.color1, d.color2, d.opacity, d.t1name, d.t2name, d.t1user, d.t2user, d.sy, d.tsx, d.tsy);
        }
        else if(d.v == "L2" && d.t == "device") {
            this.settingsL2Device(ws, msg_id, d.i, d.name, d.description, d.color1, d.color2, d.ifnaming);
        }
        else if(d.v == "L2" && d.t == "link") {
            this.settingsLink(ws, msg_id, d.v, d.t, d.i, d.name, d.description, d.type, d.order, d.color, d.weight, d.height, d.show_direction);
        }
        else if(d.v == "L3" && d.t == "vrf") {
            this.settingsVrf(ws, msg_id, d.i, d.color1, d.color2);
        }
        else if(d.v == "L3" && d.t == "l2segment") {
            this.settingsL2Segment(ws, msg_id, d.i, d.color1);
        }
        else if(d.v == "L3" && d.t == "bgp_peering") {
            this.settingsBGPPeer(ws, msg_id, d.i, d.color);
        }
        else if(d.v == "L3" && ((d.t == "l2link") || (d.t == "interface") || (d.t == "p2p_interface") || (d.t == "svi_interface"))) {
            this.settingsLink(ws, msg_id, d.v, d.t, d.i, d.name, d.description, d.type, d.order, d.color, d.weight, d.height, d.show_direction);
        }
        else if(d.t === "text") {
            this.settingsText(ws, msg_id, d.v, d.i, d.text, d.height, d.py, d.color, d.text_align, 
                d.bg_type, d.bg_show, d.bg_color, d.border_show, d.border_color, d.border_width, d.bg_depth, d.rotation_x);
        }
        else if(d.t == "symbol") {
            this.settingsSymbol(ws, msg_id, d);
        }
        else {
            this.logmessage("WS msg error.");
            ws.terminate();
            return;
        }
    }

    processMessage_config(ws, msg_id, d) {
        if(d.v == "L2") {
            if(d.t === "device") {
                this.configL2Device(ws, msg_id, d);
            }
            else if(d.t === "link") {
                this.configL2Link(ws, msg_id, d);
            }
            else if(d.t === "linkdev") {
                this.configL2LinkDevice(ws, msg_id, d);
            }
            else {
                this.logmessage("WS msg error.");
                ws.terminate();
                return;
            }
        }
        else if(d.v == "L3") {
            if(d.t === "vrf") {
                this.configVRF(ws, msg_id, d);
            }
            else if(d.t === "interface") {
                this.configInterface(ws, msg_id, d);
            }
            else if(d.t === "p2p_interface") {
                this.configP2PInterface(ws, msg_id, d);                
            }
            else if(d.t === "svi_interface") {
                this.configSVIInterface(ws, msg_id, d);
            }
            else if(d.t === "bgp_peering") {
                this.configBGPPeer(ws, msg_id, d);
            }
            else {
                this.logmessage("WS msg error.");
                ws.terminate();
                return;
            }
        }
        else {
            this.logmessage("WS msg error.");
            ws.terminate();
            return;
        }
    }

    processMessage_delete(ws, msg_id, d) {
        if(d.v == "L2" && d.t == "base") {
            this.deleteL2Base(ws, msg_id, d.i);
        }
        else if(d.v == "L3" && d.t == "base") {
            this.deleteL3Base(ws, msg_id, d.i);
        }
        else if(d.v == "L2" && d.t == "device") {
            this.deleteL2Device(ws, msg_id, d.i);
        }
        else if(d.v == "L2" && d.t == "link") {
            this.deleteL2Link(ws, msg_id, d.i);
        }
        else if(d.v == "L2" && d.t == "joint") {
            this.deleteL2Joint(ws, msg_id, d.et, d.i, d.joint_index);
        }
        else if(d.v === "L3" && d.t === "bgp_peering") {
            this.deleteL3BGPPeer(ws, msg_id, d.i);
        }
        else if(d.v == "L3" && d.t == "joint") {
            this.deleteL3Joint(ws, msg_id, d.et, d.i, d.joint_index);
        }
        else if(d.t == "text") {
            this.deleteText(ws, msg_id, d.v, d.i);
        }
        else if(d.t == "symbol") {
            this.deleteSymbol(ws, msg_id, d.v, d.i);
        }
        else {
            this.logmessage("WS msg error.");
            ws.terminate();
            return;
        }
    }

    processMessage_background(ws, msg_id, d) {
        if(!(typeof d.bg_color === "number")) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }
        this.diagram.settings.bg_color = d.bg_color;
        this.broadcastMessage(ws, msg_id, {
            m: "BG",
            d: {
                bg_color: d.bg_color,
            }
        });
    }

    /**
     * Function to process messages received to update the data and infobox settings of an element.
     * On success, the function will broadcast all the clients on this diagram with the changes applied.
     * In case of failure, an error message will be sent to the client.
     */
    processMessage_data(ws, msg_id, d) {
        // Check view and type are correct
        if(!(
            ((d.v === "L2") && (d.t === "base")) ||
            ((d.v === "L2") && (d.t === "device")) ||
            ((d.v === "L2") && (d.t === "link")) ||
            ((d.v === "L2") && (d.t === "text")) ||
            ((d.v === "L2") && (d.t === "symbol")) ||
            ((d.v === "L3") && (d.t === "base")) ||
            ((d.v === "L3") && (d.t === "vrf")) ||
            ((d.v === "L3") && (d.t === "l2segment")) ||
            ((d.v === "L3") && (d.t === "l2link")) ||
            ((d.v === "L3") && (d.t === "interface")) ||
            ((d.v === "L3") && (d.t === "p2p_interface")) ||
            ((d.v === "L3") && (d.t === "svi_interface")) ||
            ((d.v === "L3") && (d.t === "text")) ||
            ((d.v === "L3") && (d.t === "symbol"))
            )) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }
        // Check ID
        if(!(d.i in this.diagram[d.v][d.t])) {
            wsSendError(ws, msg_id, "Invalid ID");
            return;
        }

        let message = {
            m: "DT",
            d: {
                v: d.v,
                t: d.t,
                i: d.i,
            }
        }
        // Check infobox_type
        if("infobox_type" in d) {
            if((d.infobox_type !== "l") && (d.infobox_type !== "d")) {
                wsSendError(ws, msg_id, "Invalid infobox_type");
                return;
            }
        }
        // Check data
        if("data" in d) {
            if(!Array.isArray(d.data)) {
                wsSendError(ws, msg_id, "Invalid data");
                return;
            }
            let error = false;
            d.data.forEach((entry) => {
                if(
                    (!("title" in entry)) ||
                    (typeof entry.title !== "string") ||
                    (entry.title.length > 128) ||
                    (!Array.isArray(entry.text))
                    ) {
                    error = true;
                    return;
                }
                entry.text.forEach((t) => {
                    if((typeof t !== "string") || (t.length > 128))
                        error = true;
                });
            });
            if(error) {
                wsSendError(ws, msg_id, "Invalid data");
                return;
            }
        }

        // Apply infobox_type
        if("infobox_type" in d) {
            this.diagram[d.v][d.t][d.i].infobox_type = d.infobox_type;
            message.d.infobox_type = d.infobox_type;
        }
        // Apply data
        if("data" in d) {
            this.diagram[d.v][d.t][d.i].data = [];
            d.data.forEach((entry) => {
                let final_entry = {
                    title: entry.title,
                    text: [],
                }
                entry.text.forEach((t) => {
                    final_entry.text.push(t);
                });
                this.diagram[d.v][d.t][d.i].data.push(final_entry);
            });
            message.d.data = this.diagram[d.v][d.t][d.i].data;
        }
        
        // Broadcast message to all the clients
        this.broadcastMessage(ws, msg_id, message);
    }

    processMessage_url(ws, msg_id, d) {
        // Check view and type are correct
        if(!(
            ((d.v === "L2") && (d.t === "base")) ||
            ((d.v === "L2") && (d.t === "device")) ||
            ((d.v === "L2") && (d.t === "link")) ||
            ((d.v === "L2") && (d.t === "text")) ||
            ((d.v === "L2") && (d.t === "symbol")) ||
            ((d.v === "L3") && (d.t === "base")) ||
            ((d.v === "L3") && (d.t === "vrf")) ||
            ((d.v === "L3") && (d.t === "l2segment")) ||
            ((d.v === "L3") && (d.t === "interface")) ||
            ((d.v === "L3") && (d.t === "p2p_interface")) ||
            ((d.v === "L3") && (d.t === "svi_interface")) ||
            ((d.v === "L3") && (d.t === "text")) ||
            ((d.v === "L3") && (d.t === "symbol"))
            )) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }
        // Check ID
        if(!(d.i in this.diagram[d.v][d.t])) {
            wsSendError(ws, msg_id, "Invalid ID");
            return;
        }

        if((typeof d.urls) !== "object") {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        let message = {
            m: "U",
            d: {
                v: d.v,
                t: d.t,
                i: d.i,
                urls: {},
            }
        }

        // Verify URLs
        for(let url_name in d.urls) {
            let url = d.urls[url_name];
            if(!validator.isURL(url, {require_protocol:true, protocols: ['http','https','ftp', 'ssh', 'telnet'], require_tld: false})) {
                wsSendError(ws, msg_id, "Invalid URL: " + url);
                return;
            }
            if((url_name.length > 64) || (url_name.length < 1)) {
                wsSendError(ws, msg_id, "Invalid URL name: " + url_name);
                return;
            }
        }

        // Add URLs
        this.diagram[d.v][d.t][d.i].urls = {};
        for(let url_name in d.urls) {
            let url = d.urls[url_name];

            this.diagram[d.v][d.t][d.i].urls[url_name] = url;
            message.d.urls[url_name] = url;
        }

        this.broadcastMessage(ws, msg_id, message);
    }
    /*******************************************************/
    /* Functions to manage base and device L2/L3 objects   */
    /*******************************************************/
    addL2Base(ws, msg_id, d) {
        // Verify Parameters
        if (
                (! (typeof d.px === "number")) ||
                (! (typeof d.py === "number")) ||
                (! (typeof d.pz === "number")) ||
                (! (typeof d.sx === "number")) ||
                (! (typeof d.sy === "number")) ||
                (! (typeof d.sz === "number")) ||
                (! (typeof d.rx === "number")) ||
                (! (typeof d.ry === "number")) ||
                (! (typeof d.rz === "number")) ||
                (! (typeof d.st === "string"))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        // Get a new id
        let newid = this.diagram.settings.id_gen++;

        if((d.st === "F") || (d.st === "W")) {
            this.diagram.L2.base[newid] = {
                type: d.st,
                name: "",
                subtype: "g",
                px: d.px, py: d.py, pz: d.pz, 
                rx: d.rx, ry: d.ry, rz: d.rz,
                sx: d.sx, sy: d.sy, sz: d.sz,
                color1: 0xffffff,
                color2: 0xffbbaa,
                t1name: "b1_t1",
                t2name: "b2_t1",
                tsx: 1,
                tsy: 1,
                infobox_type: "l",
                data: [],
                urls: {},
            }
            this.broadcastMessage(ws, msg_id, {
                m: "A",
                d: {
                    v: "L2",
                    t: "base",
                    i: ""+newid,
                    d: this.diagram.L2.base[newid],
                }
            });
        }
        else {
            wsSendError(ws, msg_id, "Invalid type.");
        }
    }

    addL3Base(ws, msg_id, d) {
        // Verify Parameters
        if (
                (! (typeof d.px === "number")) ||
                (! (typeof d.py === "number")) ||
                (! (typeof d.pz === "number")) ||
                (! (typeof d.sx === "number")) ||
                (! (typeof d.sy === "number")) ||
                (! (typeof d.sz === "number")) ||
                (! (typeof d.rx === "number")) ||
                (! (typeof d.ry === "number")) ||
                (! (typeof d.rz === "number")) ||
                (! (typeof d.st === "string"))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        // Get a new id
        let newid = this.diagram.settings.id_gen++;

        if((d.st === "F") || (d.st === "W")) {
            this.diagram.L3.base[newid] = {
                type: d.st,
                name: "",
                subtype: "g",
                px: d.px, py: d.py, pz: d.pz, 
                rx: d.rx, ry: d.ry, rz: d.rz,
                sx: d.sx, sy: d.sy, sz: d.sz,
                color1: 0xffffff,
                color2: 0xffbbaa,
                t1name: "b1_t1",
                t2name: "b2_t1",
                tsx: 1,
                tsy: 1,
                infobox_type: "l",
                data: [],
                urls: {},
            }
            this.broadcastMessage(ws, msg_id, {
                m: "A",
                d: {
                    v: "L3",
                    t: "base",
                    i: ""+newid,
                    d: this.diagram.L3.base[newid],
                }
            });
        }
        else {
            wsSendError(ws, msg_id, "Invalid type.");
        }
    }

    addL2Device(ws, msg_id, d) {
        // Verify parameters
        if (
                (! (typeof d.px === "number")) ||
                (! (typeof d.py === "number")) ||
                (! (typeof d.pz === "number")) ||
                (! (typeof d.sx === "number")) ||
                (! (typeof d.sy === "number")) ||
                (! (typeof d.sz === "number")) ||
                (! (typeof d.rx === "number")) ||
                (! (typeof d.ry === "number")) ||
                (! (typeof d.rz === "number")) ||
                (! (typeof d.color1 === "number")) ||
                (! (typeof d.color2 === "number")) ||
                (! (typeof d.st === "string")) ||
                (d.st.length > 20) ||
                (! (typeof d.base === "string")) ||
                (! (d.base in this.diagram.L2.base))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        // Get a new id
        let newid = this.diagram.settings.id_gen++;

        this.diagram.L2.device[newid] = {
                type: d.st,
                name: "",
                description: "",
                px: d.px, py: d.py, pz: d.pz, 
                rx: d.rx, ry: d.ry, rz: d.rz,
                sx: d.sx, sy: d.sy, sz: d.sz,
                color1: d.color1,
                color2: d.color2,

                base: d.base,
                data: [],
                infobox_type: "d",
                urls: {},
        }

        // Make sure devices are not added below height of floor.
        if(this.diagram.L2.base[d.base].sy > d.py)
            this.diagram.L2.device[newid].py = this.diagram.L2.base[d.base].sy;
        
        // Only for "network" diagrams
        let l3_changes = [];

        if(this.diagram.type === "network") {
            this.diagram.L2.device[newid].ifnaming = ["Ethernet{1-64}"],
            this.diagram.L2.device[newid].vlans = {},
            this.diagram.L2.device[newid].vrfs = {"0:0": {name: "default"}},
            this.diagram.L2.device[newid].svis = {};
            this.diagram.L2.device[newid].infobox_type = "l";
            l3_changes = l3processor.update_from_l2(this.diagram);
        }

        this.broadcastMessage(ws, msg_id, {
            m: "A",
            d: {
                v: "L2",
                t: "device",
                i: ""+newid,
                d: this.diagram.L2.device[newid],
            },
            l3_changes: l3_changes,
        });
    }

    addL2Link(ws, msg_id, d) {
        // Verify parameters
        if (
                (! (typeof d.type === "number")) ||
                ( (d.type != 0) && (d.type != 1)) ||
                (! (typeof d.color === "number")) ||
                (! (typeof d.weight === "number")) ||
                (d.weight < .001) || (d.weight > .5) ||
                (! (typeof d.height === "number")) ||
                (! (typeof d.dev1_id === "string")) ||
                (! (d.dev1_id in this.diagram.L2.device)) ||
                (! (typeof d.dev2_id === "string")) ||
                (! (d.dev2_id in this.diagram.L2.device))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        // Get a new id
        let newid = this.diagram.settings.id_gen++;

        this.diagram.L2.link[newid] = {
            name: "",
            description: "",
            type: d.type,
            order: "YX",
            devs: [
                {id: d.dev1_id, data: {function: "none", function_data: {}}},
                {id: d.dev2_id, data: {function: "none", function_data: {}}},
            ],
            linedata: {
                weight: d.weight,
                height: d.height,
                color: d.color,
                points: [],
                show_direction: ("show_direction" in d) ? d.show_direction : false,
            },
            infobox_type: "d",
            data: [],
            urls: {},
        }

        let l3_changes = [];
        
        if(this.diagram.type === "network") {
            this.diagram.L2.link[newid].infobox_type = "l";
            // By default if devices connected have a default vrf, we'll configure their side as L3
            // If not, and they have a vlan created, we'll configure them as L2 untagged
            let vrf1 = null;
            let vrf2 = null;
            if(this.diagram.L2.device[d.dev1_id].vrfs) {
                for(let vrf_rd in this.diagram.L2.device[d.dev1_id].vrfs) {
                    if(this.diagram.L2.device[d.dev1_id].vrfs[vrf_rd].name === "default") {
                        vrf1 = vrf_rd;
                        this.diagram.L2.link[newid].devs[0].data.function = "routing";
                        this.diagram.L2.link[newid].devs[0].data.function_data = {
                            subinterfaces: [{
                                vlan_tag: "-1",
                                vrf: vrf1,
                            }]
                        };
                        break;
                    }
                }
            }
            if((vrf1 === null) && (this.diagram.L2.device[d.dev1_id].vlans) && (Object.keys(this.diagram.L2.device[d.dev1_id].vlans).length > 0)) {
                this.diagram.L2.link[newid].devs[0].data.function = "switching";
                this.diagram.L2.link[newid].devs[0].data.function_data = {
                    vlans: [Object.keys(this.diagram.L2.device[d.dev1_id].vlans)[0]],
                    native_vlan: Object.keys(this.diagram.L2.device[d.dev1_id].vlans)[0],
                };            
            }
            if(this.diagram.L2.device[d.dev2_id].vrfs) {
                for(let vrf_rd in this.diagram.L2.device[d.dev2_id].vrfs) {
                    if(this.diagram.L2.device[d.dev2_id].vrfs[vrf_rd].name === "default") {
                        vrf2 = vrf_rd;
                        this.diagram.L2.link[newid].devs[1].data.function = "routing";
                        this.diagram.L2.link[newid].devs[1].data.function_data = {
                            subinterfaces: [{
                                vlan_tag: "-1",
                                vrf: vrf2,
                            }]
                        };
                        break;
                    }
                }
            }
            if((vrf2 === null) && (this.diagram.L2.device[d.dev2_id].vlans) && (Object.keys(this.diagram.L2.device[d.dev2_id].vlans).length > 0)) {
                this.diagram.L2.link[newid].devs[1].data.function = "switching";
                this.diagram.L2.link[newid].devs[1].data.function_data = {
                    vlans: [Object.keys(this.diagram.L2.device[d.dev2_id].vlans)[0]],
                    native_vlan: Object.keys(this.diagram.L2.device[d.dev2_id].vlans)[0],
                };            
            }

            // Update l3 diagram
            l3_changes = l3processor.update_from_l2(this.diagram);
        }

        this.broadcastMessage(ws, msg_id, {
            m: "A",
            d: {
                v: "L2",
                t: "link",
                i: ""+newid,
                d: this.diagram.L2.link[newid],
            },
            l3_changes: l3_changes,
        });
    }

    addL2Joint(ws, msg_id, d) {
        // Verify parameters
        if (
                (d.et !== "link") ||
                (! (typeof d.link_id === "string")) ||
                (! (typeof d.joint_index === "number")) ||
                (! (typeof d.px === "number")) ||
                (! (typeof d.py === "number")) ||
                (! (typeof d.pz === "number")) ||
                (! (d.link_id in this.diagram.L2.link)) ||
                (d.joint_index > this.diagram.L2.link[d.link_id].linedata.points.length) ||
                (d.joint_index < 0)
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram.L2.link[d.link_id].linedata.points.splice(d.joint_index, 0, [d.px, d.py, d.pz])

        this.broadcastMessage(ws, msg_id, {
            m: "A",
            d: {
                v: "L2",
                t: "joint",
                et: "link",
                link_id: d.link_id,
                joint_index: d.joint_index,
                px: d.px, py: d.py, pz: d.pz,
            }
        });

    }

    addL3Joint(ws, msg_id, d) {
        // Verify parameters
        if (
                (! (typeof d.et === "string")) ||
                (! (typeof d.link_id === "string")) ||
                (! (typeof d.joint_index === "number")) ||
                (! (typeof d.px === "number")) ||
                (! (typeof d.py === "number")) ||
                (! (typeof d.pz === "number")) ||
                (["l2link", "interface", "svi_interface", "p2p_interface"].indexOf(d.et) === -1) ||
                (! (d.link_id in this.diagram.L3[d.et])) ||
                (d.joint_index > this.diagram.L3[d.et][d.link_id].linedata.points.length) ||
                (d.joint_index < 0)
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram.L3[d.et][d.link_id].linedata.points.splice(d.joint_index, 0, [d.px, d.py, d.pz])

        this.broadcastMessage(ws, msg_id, {
            m: "A",
            d: {
                v: "L3",
                t: "joint",
                et: d.et,
                link_id: d.link_id,
                joint_index: d.joint_index,
                px: d.px, py: d.py, pz: d.pz,
            }
        });

    }

    addL3BGPPeer(ws, msg_id, d) {
        if(
            (["ipv4", "ipv6"].indexOf(d.transport) === -1) ||
            (!Array.isArray(d.afisafi)) ||
            (typeof d.color !== "number") ||
            (typeof d.curve_x !== "number") ||
            (typeof d.curve_y !== "number")
            ) {
            wsSendError(ws, msg_id, "Invalid parameters");
            return;
        }

        // Check transport IPs
        if((d.transport === "ipv4") && ((!net.isIPv4Address(d.src_ip)) || (!net.isIPv4Address(d.dst_ip)))) {
            wsSendError(ws, msg_id, "Transport IP addresses are not IPv4 (1)");
            return;
        }
        else if((d.transport === "ipv6") && ((!net.isIPv6Address(d.src_ip)) || (!net.isIPv6Address(d.dst_ip)))) {
            wsSendError(ws, msg_id, "Transport IP addresses are not IPv6 (1)");
            return;
        }

        // Check afi/safi
        for(let x = 0; x < d.afisafi.length; x++) {
            if(["ipv4/unicast", "ipv4/multicast", "ipv4/l3vpn", "ipv4/l3vpn-multicast", "ipv4/labeled",
                "ipv6/unicast", "ipv6/multicast", "ipv6/l3vpn", "ipv6/l3vpn-multicast", "ipv6/labeled",
                "l2vpn/vpls", "evpn"].indexOf(d.afisafi[x]) === -1) {
                wsSendError(ws, msg_id, "Invalid AFI/SAFI: " + d.afisafi[x]);
                return;
            }
        }

        // Check if referenced vrfs exist
        if(
                (!(d.src_vrf_id in this.diagram.L3.vrf)) ||
                (!(d.dst_vrf_id in this.diagram.L3.vrf))
            ) {
            wsSendError(ws, msg_id, "SRC/DST vrf don't exist.");
            return;
        }

        // Get a new id
        let newid = this.diagram.settings.id_gen++;

        // Create the bgp peering.
        let new_bgppeer = {
            curve_x: d.curve_x,
            curve_y: d.curve_y,
            color: d.color,
            transport: d.transport,
            afisafi: d.afisafi,
            src_ip: d.src_ip,
            dst_ip: d.dst_ip,
            l3_reference: {
                src_vrf_id: d.src_vrf_id,
                dst_vrf_id: d.dst_vrf_id,                
            }
        }

        this.diagram.L3.bgp_peering[newid] = new_bgppeer;

        this.broadcastMessage(ws, msg_id, {
            m: "A",
            d: {
                v: "L3",
                t: "bgp_peering",
                i: ""+newid,
                d: this.diagram.L3.bgp_peering[newid],
            },
        });        
    }

    addText(ws, msg_id, d) {
        // Verify parameters
        if (
                (! ((d.v === "L2") || (d.v === "L3")) ) ||
                (! (typeof d.base === "string")) ||
                (! (d.base in this.diagram[d.v].base)) ||
                (! (typeof d.px === "number")) ||
                (! (typeof d.py === "number")) ||
                (! (typeof d.pz === "number")) ||
                (! (typeof d.rx === "number")) ||
                (! (typeof d.ry === "number")) ||
                (! (typeof d.text === "string")) ||
                (! (d.text.length < 8192)) ||
                (! (d.text.length > 0)) ||
                (! (typeof d.height === "number")) ||
                (! (typeof d.color === "number")) ||
                (! (typeof d.bg_type === "string")) ||
                (["n", "r", "c", "h", "p"].indexOf(d.bg_type) === -1) ||
                (! (typeof d.text_align === "string")) ||
                (["l", "r", "c"].indexOf(d.text_align) === -1) ||                
                (! (typeof d.bg_color === "number")) ||
                (! (typeof d.border_color === "number")) ||
                (! (typeof d.border_show === "boolean")) ||
                (! (typeof d.bg_show === "boolean")) ||
                (! (typeof d.border_width === "number")) ||
                (d.border_width < .01) || (d.border_width > 1) ||
                (! (typeof d.bg_depth === "number")) ||
                (d.bg_depth < .01) || (d.bg_depth > 1) ||
                (! (typeof d.rotation_x === "number")) ||
                (d.rotation_x < 0) || (d.rotation_x > 90)
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        // Get a new id
        let newid = this.diagram.settings.id_gen++;

        this.diagram[d.v].text[newid] = {
                type: "F",
                text: d.text,
                px: d.px, py: d.py, pz: d.pz, 
                rx: d.rx, ry: d.ry,
                height: d.height,
                color: d.color,
                bg_type: d.bg_type,
                text_align: d.text_align,
                bg_color: d.bg_color,
                border_color: d.border_color,
                border_show: d.border_show,
                bg_show: d.bg_show,
                border_width: d.border_width,
                bg_depth: d.bg_depth,
                rotation_x: d.rotation_x,

                base: d.base,
                infobox_type: "l",
                data: [],
        }
        this.broadcastMessage(ws, msg_id, {
            m: "A",
            d: {
                v: d.v,
                t: "text",
                i: ""+newid,
                d: this.diagram[d.v].text[newid],
            }
        });
    }

    addSymbol(ws, msg_id, d) {
        // Verify parameters
        if (
                (! ((d.v === "L2") || (d.v === "L3")) ) ||
                (! (typeof d.px === "number")) ||
                (! (typeof d.py === "number")) ||
                (! (typeof d.pz === "number")) ||
                (! (typeof d.sx === "number")) ||
                (! (typeof d.sy === "number")) ||
                (! (typeof d.sz === "number")) ||
                (! (typeof d.rx === "number")) ||
                (! (typeof d.ry === "number")) ||
                (! (typeof d.rz === "number")) ||
                (! (typeof d.color === "number")) ||
                (! (typeof d.st === "string")) ||
                (! (typeof d.base === "string")) ||
                (! (d.base in this.diagram[d.v].base))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }
        if (! ["F", "X", "V", "A"].includes(d.st)) {
            wsSendError(ws, msg_id, "Symbol Type Invalid.");
            return;
        }

        let cd = {};
        if (d.st === "F") {
            if((d.cd === undefined) || (d.cd.flagcolor === undefined)) {
                wsSendError(ws, msg_id, "Invalid format (2)");
                return;             
            }
            cd.flagcolor = d.cd.flagcolor;
        }
        if (d.st === "A") {
            if(
                (typeof d.cd !== "object") ||
                (typeof d.cd.head_color !== "number") ||
                (! ["n", "f", "v", "i", "p", "r", "s"].includes(d.cd.head_type)) ||
                (! ["n", "f", "v", "i", "p", "r", "s"].includes(d.cd.tail_type)) ||
                (! ["s", "r"].includes(d.cd.shaft_type)) ||
                (typeof d.cd.head_sx_per !== "number") ||
                (typeof d.cd.head_sy_per !== "number") ||
                (typeof d.cd.head_sz_per !== "number") ||
                (typeof d.cd.tail_sx_per !== "number") ||
                (typeof d.cd.tail_sy_per !== "number") ||
                (typeof d.cd.tail_sz_per !== "number") ||
                (typeof d.cd.shaft_dots !== "number")
                ) {
                wsSendError(ws, msg_id, "Invalid format (2)");
                return;
            }
            cd.head_color = d.cd.head_color;
            cd.head_type = d.cd.head_type;
            cd.tail_type = d.cd.tail_type;
            cd.shaft_type = d.cd.shaft_type;
            cd.head_sx_per = d.cd.head_sx_per;
            cd.head_sy_per = d.cd.head_sy_per;
            cd.head_sz_per = d.cd.head_sz_per;
            cd.tail_sx_per = d.cd.tail_sx_per;
            cd.tail_sy_per = d.cd.tail_sy_per;
            cd.tail_sz_per = d.cd.tail_sz_per;
            cd.shaft_dots = d.cd.shaft_dots;
        }

        // Get a new id
        let newid = this.diagram.settings.id_gen++;

        this.diagram[d.v].symbol[newid] = {
                type: d.st,
                px: d.px, py: d.py, pz: d.pz, 
                rx: d.rx, ry: d.ry, rz: d.rz,
                sx: d.sx, sy: d.sy, sz: d.sz,
                color: d.color,
                cd: cd,

                base: d.base,
                infobox_type: "l",
                data: [],
                urls: {},
        }
        this.broadcastMessage(ws, msg_id, {
            m: "A",
            d: {
                v: d.v,
                t: "symbol",
                i: ""+newid,
                d: this.diagram[d.v].symbol[newid],
            }
        });
    }

    moveBase(ws, msg_id, view, id, px, py, pz) {
        // Verify Parameters
        if((view !==  "L2") && (view !== "L3")) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }
        if (
                (! (typeof px === "number")) ||
                (! (typeof py === "number")) ||
                (! (typeof pz === "number")) ||
                (! (id in this.diagram[view].base))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram[view].base[id].px = px;
        this.diagram[view].base[id].py = py;
        this.diagram[view].base[id].pz = pz;

        this.broadcastMessage(ws, msg_id, {
                m: "M",
                d: {
                    v: view,
                    t: "base",
                    i: id,
                    x: px, y: py, z: pz,
                }           
        })
    }

    moveElement(ws, msg_id, view, type, id, px, py, pz, base) {
        if(
                (
                    ((view === "L2") && (type === "device")) ||
                    ((view === "L2") && (type === "text")) ||
                    ((view === "L2") && (type === "symbol")) ||
                    ((view === "L3") && (type === "l2segment")) ||
                    ((view === "L3") && (type === "vrf")) ||
                    ((view === "L3") && (type === "text")) ||
                    ((view === "L3") && (type === "symbol"))
                ) &&
                (id in this.diagram[view][type]) &&
                (base in this.diagram[view].base)
            ) {

            if(typeof px === "number")
                this.diagram[view][type][id].px = px;
            if(typeof py === "number")
                this.diagram[view][type][id].py = py;
            if(typeof pz === "number")
                this.diagram[view][type][id].pz = pz;

            this.diagram[view][type][id].base = base;

            this.broadcastMessage(ws, msg_id, {
                    m: "M",
                    d: {
                        v: view,
                        t: type,
                        i: id,
                        x: this.diagram[view][type][id].px,
                        y: this.diagram[view][type][id].py,
                        z: this.diagram[view][type][id].pz,
                        base: base
                    }           
            })
        }
        else {
            wsSendError(ws, msg_id, "Invalid format");
            return;            
        }
    }

    moveL2Joint(ws, msg_id, et, id, joint_index, px, py, pz) {
        if (
                (et !== "link") ||
                (! (typeof px === "number")) ||
                (! (typeof py === "number")) ||
                (! (typeof pz === "number")) ||
                (! (typeof joint_index === "number")) ||
                (! (typeof id === "string")) ||
                (! (id in this.diagram.L2.link)) ||
                (joint_index >= this.diagram.L2.link[id].linedata.points.length) ||
                (joint_index < 0)
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram.L2.link[id].linedata.points[joint_index] = [px, py, pz];

        this.broadcastMessage(ws, msg_id, {
                m: "M",
                d: {
                    v: "L2",
                    t: "joint",
                    et: "link",
                    i: id,
                    joint_index: joint_index,
                    x: px, y: py, z: pz,
                }           
        })
    }

    moveL3Joint(ws, msg_id, et, id, joint_index, px, py, pz) {
        if (
                (! (typeof px === "number")) ||
                (! (typeof py === "number")) ||
                (! (typeof pz === "number")) ||
                (! (typeof joint_index === "number")) ||
                (! (typeof id === "string")) ||
                (["l2link", "interface", "svi_interface", "p2p_interface"].indexOf(et) === -1) ||
                (! (id in this.diagram.L3[et])) ||
                (joint_index >= this.diagram.L3[et][id].linedata.points.length) ||
                (joint_index < 0)
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram.L3[et][id].linedata.points[joint_index] = [px, py, pz];

        this.broadcastMessage(ws, msg_id, {
                m: "M",
                d: {
                    v: "L3",
                    t: "joint",
                    et: et,
                    i: id,
                    joint_index: joint_index,
                    x: px, y: py, z: pz,
                }           
        })
    }

    moveBGPPeer(ws, msg_id, id, curve_x, curve_y) {
        if (
                (! (typeof curve_x === "number")) ||
                (! (typeof curve_y === "number")) ||
                (! (typeof id === "string")) ||
                (! (id in this.diagram.L3.bgp_peering))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram.L3.bgp_peering[id].curve_x = curve_x;
        this.diagram.L3.bgp_peering[id].curve_y = curve_y;

        this.broadcastMessage(ws, msg_id, {
                m: "M",
                d: {
                    v: "L3",
                    t: "bgp_peering",
                    i: id,
                    curve_x: curve_x,
                    curve_y: curve_y,
                }
        })
    }

    rotateElement(ws, msg_id, view, type, id, rx, ry, rz) {
        // Verify Parameters
        if(
                (
                    ((view === "L2") && (type === "base")) ||
                    ((view === "L2") && (type === "device")) ||
                    ((view === "L2") && (type === "text")) ||
                    ((view === "L2") && (type === "symbol")) ||
                    ((view === "L3") && (type === "l2segment")) ||
                    ((view === "L3") && (type === "vrf")) ||
                    ((view === "L3") && (type === "base")) ||
                    ((view === "L3") && (type === "text")) ||
                    ((view === "L3") && (type === "symbol"))
                ) &&
                (id in this.diagram[view][type])
            ) {

            if(typeof rx === "number")
                this.diagram[view][type][id].rx = rx;
            if(typeof ry === "number")
                this.diagram[view][type][id].ry = ry;
            if(typeof rz === "number")
                this.diagram[view][type][id].rz = rz;

            this.broadcastMessage(ws, msg_id, {
                    m: "R",
                    d: {
                        v: view,
                        t: type,
                        i: id,
                        x: this.diagram[view][type][id].rx,
                        y: this.diagram[view][type][id].ry,
                        z: this.diagram[view][type][id].rz,
                    }           
            })
        }
        else {
            wsSendError(ws, msg_id, "Invalid format");
            return;            
        }
    }

    resizeElement(ws, msg_id, view, type, id, sx, sy, sz) {
        if(
                (
                    ((view === "L2") && (type === "base")) ||
                    ((view === "L2") && (type === "device")) ||
                    ((view === "L2") && (type === "symbol")) ||
                    ((view === "L3") && (type === "l2segment")) ||
                    ((view === "L3") && (type === "vrf")) ||
                    ((view === "L3") && (type === "base")) ||
                    ((view === "L3") && (type === "symbol"))
                ) &&
                (id in this.diagram[view][type])
            ) {
            if(typeof sx === "number")
                this.diagram[view][type][id].sx = sx;
            if(typeof sy === "number")
                this.diagram[view][type][id].sy = sy;
            if(typeof sz === "number")
                this.diagram[view][type][id].sz = sz;

            this.broadcastMessage(ws, msg_id, {
                    m: "X",
                    d: {
                        v: view,
                        t: type,
                        i: id,
                        x: this.diagram[view][type][id].sx,
                        y: this.diagram[view][type][id].sy,
                        z: this.diagram[view][type][id].sz,
                    }           
            })
        }        
        else {
            wsSendError(ws, msg_id, "Invalid format");
            return;            
        }
    }

    settingsBase(ws, msg_id, view, id, name, subtype, color1, color2, opacity, t1name, t2name, t1user, t2user, sy, tsx, tsy) {
        // Check parameters
        if (
                (! (typeof name === "string")) ||
                (name.length > 128) ||
                (! (typeof subtype === "string")) ||
                (subtype.length > 1) ||
                (["g", "f", "p", "n"].indexOf(subtype) == -1) ||
                (! (typeof color1 === "number")) ||
                (color1 < 0) ||
                (! (typeof color2 === "number")) ||
                (color2 < 0) ||
                (! (typeof opacity === "number")) ||
                (! (typeof sy === "number")) ||
                (! ((typeof tsx === "number") || (tsx === null) )) ||
                (! ((typeof tsy === "number") || (tsy === null) )) ||
                (! (id in this.diagram[view].base))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        if(t1user && (typeof t1user === "string") && (t1user.length === 128)) {
            this.diagram[view].base[id].t1user = t1user;
            delete this.diagram[view].base[id].t1name;
        }
        else if (t1name && (typeof t1name === "string") && (t1name.length < 16)) {
            this.diagram[view].base[id].t1name = t1name;
            delete this.diagram[view].base[id].t1user;            
        }
        else {
            wsSendError(ws, msg_id, "Invalid format t1name");
            return;            
        }

        if(t2user && (typeof t2user === "string") && (t2user.length === 128)) {
            this.diagram[view].base[id].t2user = t2user;
            delete this.diagram[view].base[id].t2name;
        }
        else if (t2name && (typeof t2name === "string") && (t2name.length < 16)) {
            this.diagram[view].base[id].t2name = t2name;
            delete this.diagram[view].base[id].t2user;            
        }
        else {
            wsSendError(ws, msg_id, "Invalid format");
            return;            
        }

        this.diagram[view].base[id].name = name;
        this.diagram[view].base[id].subtype = subtype;
        this.diagram[view].base[id].color1 = color1;
        this.diagram[view].base[id].color2 = color2;
        this.diagram[view].base[id].opacity = opacity;
        let old_sy = this.diagram[view].base[id].sy;
        this.diagram[view].base[id].sy = sy;
        this.diagram[view].base[id].tsx = tsx;
        this.diagram[view].base[id].tsy = tsy;

        // Fix the py of the elements on this base element
        ["device", "l2segment", "vrf", "symbol"].forEach((type) => {
            if(type in this.diagram[view]) {
                for(let element_id in this.diagram[view][type]) {
                    let element = this.diagram[view][type][element_id];
                    if(element.base === id) {
                        element.py = element.py - old_sy + sy;
                    }
                }
            }
        });
        let message = {
            m: "P",
            d: {
                v: view,
                t: "base",
                i: id,
                name: name, subtype: subtype, color1: color1, color2: color2, opacity: opacity, sy:sy, tsx: tsx, tsy: tsy
            }
        }

        if(t1user)
            message.d.t1user = t1user;
        else
            message.d.t1name = t1name;
        if(t2user)
            message.d.t2user = t2user;
        else
            message.d.t2name = t2name;

        this.broadcastMessage(ws, msg_id, message)
    }

    settingsL2Device(ws, msg_id, id, name, description, color1, color2, ifnaming) {
        // Check parameters
        if (
                (! (typeof name === "string")) ||
                (name.length > 128) ||
                (! (typeof description === "string")) ||
                (description.length > 1024) ||
                (! (typeof color1 === "number")) ||
                (color1 < 0) ||
                (! (typeof color2 === "number")) ||
                (color2 < 0) ||
                (! (id in this.diagram.L2.device))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }
        if(this.diagram.type === "network") {
            if(! (Array.isArray(ifnaming))) {
                wsSendError(ws, msg_id, "Invalid format");
                return;
            }
            if(net.resolve_dev_ifnaming(ifnaming) == null) {
                wsSendError(ws, msg_id, "Invalid ifnaming");
                return;             
            }
        }

        this.diagram.L2.device[id].name = name;
        this.diagram.L2.device[id].description = description;
        this.diagram.L2.device[id].color1 = color1;
        this.diagram.L2.device[id].color2 = color2;
        if(this.diagram.type === "network") {
            this.diagram.L2.device[id].ifnaming = ifnaming;
        }

        // Update l3 diagram
        let l3_changes = l3processor.update_from_l2(this.diagram);

        let message = {
            m: "P",
            d: {
                v: "L2",
                t: "device",
                i: id,
                name: name, description: description, color1: color1, color2: color2, ifnaming: ifnaming,
            },
            l3_changes: l3_changes,
        }
        if(this.diagram.type === "network") {
            message.d.ifnaming = ifnaming;
        }

        this.broadcastMessage(ws, msg_id, message);
    }

    settingsVrf(ws, msg_id, id, color1, color2) {
        // Check parameters
        if (
                (! (typeof color1 === "number")) ||
                (! (typeof color2 === "number")) ||
                (! (id in this.diagram.L3.vrf))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram.L3.vrf[id].color1 = color1;
        this.diagram.L3.vrf[id].color2 = color2;

        this.broadcastMessage(ws, msg_id, {
            m: "P",
            d: {
                v: "L3",
                t: "vrf",
                i: id,
                color1: color1, color2: color2,
            },
        })
    }

    settingsL2Segment(ws, msg_id, id, color1) {
        // Check parameters
        if (
                (! (typeof color1 === "number")) ||
                (! (id in this.diagram.L3.l2segment))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram.L3.l2segment[id].color1 = color1;

        this.broadcastMessage(ws, msg_id, {
            m: "P",
            d: {
                v: "L3",
                t: "l2segment",
                i: id,
                color1: color1,
            },
        })
    }

    settingsBGPPeer(ws, msg_id, id, color) {
        // Check parameters
        if (
                (! (typeof color === "number")) ||
                (! (id in this.diagram.L3.bgp_peering))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram.L3.bgp_peering[id].color = color;

        this.broadcastMessage(ws, msg_id, {
            m: "P",
            d: {
                v: "L3",
                t: "bgp_peering",
                i: id,
                color: color,
            },
        })
    }

    settingsLink(ws, msg_id, view, type, id, name, description, link_type, order, color, weight, height, show_direction) {
        if (
                (! (typeof name === "string")) ||
                (name.length > 128) ||
                (! (typeof description === "string")) ||
                (description.length > 1024) ||
                (! (typeof link_type === "number")) ||
                (! (typeof order === "string")) ||
                (! (typeof color === "number")) ||
                (! (typeof weight === "number")) ||
                (! (typeof height === "number")) ||
                (! (view in this.diagram)) ||
                (! (type in this.diagram[view])) ||
                (! (id in this.diagram[view][type])) ||
                (! (typeof show_direction === "boolean"))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram[view][type][id].name = name;
        this.diagram[view][type][id].description = description;
        this.diagram[view][type][id].type = link_type;
        this.diagram[view][type][id].order = order;
        this.diagram[view][type][id].linedata.color = color;
        this.diagram[view][type][id].linedata.weight = weight;
        this.diagram[view][type][id].linedata.height = height;
        this.diagram[view][type][id].linedata.show_direction = show_direction;

        this.broadcastMessage(ws, msg_id, {
            m: "P",
            d: {
                v: view,
                t: type,
                i: id,
                name: name, description: description,
                type: link_type, order: order, color: color, weight: weight, height: height,
                show_direction: show_direction,
            }
        })
    }
    
    settingsText(ws, msg_id, view, id, text, height, py, color, text_align, bg_type, bg_show, bg_color, border_show, border_color, border_width, bg_depth, rotation_x) {
        if((view !== "L2") && (view !== "L3")) {
            wsSendError(ws, msg_id, "Invalid format");
            return;            
        }
        if (
                (! (id in this.diagram[view].text)) ||
                (! (typeof py === "number")) ||
                (! (typeof text === "string")) ||
                (! (text.length > 0)) ||
                (! (text.length < 8192)) ||
                (! (typeof height === "number")) ||
                (! (typeof color === "number")) ||
                (! (typeof bg_type === "string")) ||
                (["l", "r", "c"].indexOf(text_align) === -1) ||
                (! (typeof text_align === "string")) ||
                (["n", "r", "c", "h", "p"].indexOf(bg_type) === -1) ||
                (! (typeof bg_color === "number")) ||
                (! (typeof border_color === "number")) ||
                (! (typeof border_show === "boolean")) ||
                (! (typeof bg_show === "boolean")) ||
                (! (typeof border_width === "number")) ||
                (border_width < .01) || (border_width > 1) ||
                (! (typeof bg_depth === "number")) ||
                (bg_depth < .01) || (bg_depth > 1) ||
                (! (typeof rotation_x === "number")) ||
                (rotation_x < 0) || (rotation_x > 90)
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram[view].text[id].text = text;
        this.diagram[view].text[id].height = height;
        this.diagram[view].text[id].color = color;
        this.diagram[view].text[id].py = py;
        this.diagram[view].text[id].text_align = text_align;
        this.diagram[view].text[id].bg_type = bg_type;
        this.diagram[view].text[id].bg_show = bg_show;
        this.diagram[view].text[id].bg_color = bg_color;
        this.diagram[view].text[id].border_show = border_show;
        this.diagram[view].text[id].border_color = border_color;
        this.diagram[view].text[id].border_width = border_width;
        this.diagram[view].text[id].bg_depth = bg_depth;
        this.diagram[view].text[id].rotation_x = rotation_x;

        this.broadcastMessage(ws, msg_id, {
            m: "P",
            d: {
                v: view,
                t: "text",
                i: id,
                text: text, py: py, color: color, height: height,
                text_align: text_align, bg_type: bg_type, bg_show: bg_show, bg_color: bg_color,
                border_show: border_show, border_color: border_color, border_width: border_width,
                bg_depth: bg_depth, rotation_x: rotation_x,
            }
        })
    }

    settingsSymbolFlag(ws, msg_id, view, id, color, flagcolor) {
        if (
                (! (typeof color === "number")) ||
                (! (typeof flagcolor === "number"))
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }

        this.diagram[view].symbol[id].color = color;
        this.diagram[view].symbol[id].cd.flagcolor = flagcolor;        

        this.broadcastMessage(ws, msg_id, {
            m: "P",
            d: {
                v: view,
                t: "symbol",
                i: id,
                color: color, flagcolor: flagcolor,
            }
        })
    }

    settingsSymbolArrow(ws, msg_id, d) {
        if (
                (! (typeof d.color === "number")) ||
                (! (typeof d.sx === "number")) ||
                (! (typeof d.sz === "number")) ||
                (typeof d.head_color !== "number") ||
                (! ["n", "f", "v", "i", "p", "r", "s"].includes(d.head_type)) ||
                (! ["n", "f", "v", "i", "p", "r", "s"].includes(d.tail_type)) ||
                (! ["s", "r"].includes(d.shaft_type)) ||
                (typeof d.head_sx_per !== "number") ||
                (typeof d.head_sy_per !== "number") ||
                (typeof d.head_sz_per !== "number") ||
                (typeof d.tail_sx_per !== "number") ||
                (typeof d.tail_sy_per !== "number") ||
                (typeof d.tail_sz_per !== "number") ||
                (typeof d.shaft_dots !== "number")
            ) {
            wsSendError(ws, msg_id, "Invalid format");
            return;
        }
        let symbol = this.diagram[d.v].symbol[d.i];
        symbol.sx = d.sx;
        symbol.sz = d.sz;
        symbol.color = d.color;
        symbol.cd.head_color = d.head_color;
        symbol.cd.head_type = d.head_type;
        symbol.cd.tail_type = d.tail_type;
        symbol.cd.shaft_type = d.shaft_type;
        symbol.cd.head_sx_per = d.head_sx_per;
        symbol.cd.head_sy_per = d.head_sy_per;
        symbol.cd.head_sz_per = d.head_sz_per;
        symbol.cd.tail_sx_per = d.tail_sx_per;
        symbol.cd.tail_sy_per = d.tail_sy_per;
        symbol.cd.tail_sz_per = d.tail_sz_per;
        symbol.cd.shaft_dots = d.shaft_dots;

        this.broadcastMessage(ws, msg_id, {
            m: "P",
            d: {
                v: d.v,
                t: "symbol",
                i: d.i,
                sx: d.sx,
                sz: d.sz,
                color: d.color,
                head_color: d.head_color,
                head_type: d.head_type,
                tail_type: d.tail_type,
                shaft_type: d.shaft_type,
                head_sx_per: d.head_sx_per,
                head_sy_per: d.head_sy_per,
                head_sz_per: d.head_sz_per,
                tail_sx_per: d.tail_sx_per,
                tail_sy_per: d.tail_sy_per,
                tail_sz_per: d.tail_sz_per,
                shaft_dots: d.shaft_dots,
            }
        })
    }

    settingsSymbol(ws, msg_id, d) {
        if((d.v !== "L2") && (d.v !== "L3")) {
            wsSendError(ws, msg_id, "Invalid format");
            return;            
        }
        if (! (d.i in this.diagram[d.v].symbol)) {
            wsSendError(ws, msg_id, "Invalid format");
            return; 
        }
        if(this.diagram[d.v].symbol[d.i].type == "F")
            this.settingsSymbolFlag(ws, msg_id, d.v, d.i, d.color, d.flagcolor);
        else if(this.diagram[d.v].symbol[d.i].type == "A")
            this.settingsSymbolArrow(ws, msg_id, d);
        else {
            if (
                    (! (typeof d.color === "number"))
                ) {
                wsSendError(ws, msg_id, "Invalid format");
                return;
            }

            this.diagram[d.v].symbol[d.i].color = d.color;

            this.broadcastMessage(ws, msg_id, {
                m: "P",
                d: {
                    v: d.v,
                    t: "symbol",
                    i: d.i,
                    color: d.color,
                }
            })            
        }
    }

    configL2Device(ws, msg_id, d) {
        if (
                (! (d.i in this.diagram.L2.device))
            ) {
            wsSendError(ws, msg_id, "Device doesn't exist");
            return; 
        }

        if(typeof(d.vlans) !== "object" || typeof(d.vrfs) !== "object" || typeof(d.svis) !== "object") {
            wsSendError(ws, msg_id, "Invalid format");
            return; 
        }
        // Verify correctness of vlans and vrfs
        let vlans = {};
        let vrfs = {};
        let svis = {};
        for(let vlan_tag in d.vlans) {
            let vlan = d.vlans[vlan_tag];
            if(
                    (typeof(vlan) !== "object") ||
                    (isNaN(vlan_tag)) ||
                    (vlan_tag < 0) ||
                    (vlan_tag > 4093) ||
                    (typeof(vlan.name) != "string") ||
                    (vlan.name.length > 32)
                    ) {
                wsSendError(ws, msg_id, "Invalid format (vlans)");
                return;
            }
            vlans[vlan_tag] = { name: vlan.name };
        }
        for(let vrf_rd in d.vrfs) {
            let vrf = d.vrfs[vrf_rd];
            if(
                    (typeof(vrf) !== "object") ||
                    (typeof(vrf.name) != "string") ||
                    (vrf.name.length > 32) ||
                    (vrf_rd.length > 32)
                    ) {
                wsSendError(ws, msg_id, "Invalid format (vrfs)");
                return;
            }
            vrfs[vrf_rd] = { name: vrf.name };
        }
        for(let svi_tag in d.svis) {
            let svi = d.svis[svi_tag];
            if(
                    (typeof(svi) !== "object") ||
                    (isNaN(svi_tag)) ||
                    (svi_tag < 0) ||
                    (svi_tag > 4093) ||
                    (typeof(svi.name) != "string") ||
                    (svi.name.length > 32) ||
                    (typeof(svi.vrf) != "string")
                    ) {
                wsSendError(ws, msg_id, "Invalid format (svis)");
                return;
            }

            // Check vrfs
            if(!(svi.vrf in d.vrfs)) {
                wsSendError(ws, msg_id, "Invalid format (svis vrf)");
                return;
            }

            svis[svi_tag] = { name: svi.name, vrf: svi.vrf};
        }

        this.diagram.L2.device[d.i].vlans = vlans;
        this.diagram.L2.device[d.i].vrfs = vrfs;
        this.diagram.L2.device[d.i].svis = svis;

        // Update l3 diagram
        let l3_changes = l3processor.update_from_l2(this.diagram);

        this.broadcastMessage(ws, msg_id, {
            m: "C",
            d: {
                v: "L2",
                t: "device",
                i: d.i,
                vlans: vlans,
                vrfs: vrfs,
                svis: svis,
            },
            l3_changes: l3_changes,
        });
    }

    configL2Link(ws, msg_id, d) {
        if (! (d.i in this.diagram.L2.link)) {
            wsSendError(ws, msg_id, "Link doesn't exist");
            return;
        }

        let link = this.diagram.L2.link[d.i];

        if(
            (!(link.devs[0].id in this.diagram.L2.device)) ||
            (!(link.devs[1].id in this.diagram.L2.device))
            )
            return wsSendError(ws, msg_id, "Link devices seem to be broken.");

        let dev1 = this.diagram.L2.device[link.devs[0].id];
        let dev2 = this.diagram.L2.device[link.devs[1].id];

        // Check ifbindings are correct
        if(!Array.isArray(d.ifbindings))
            return wsSendError(ws, msg_id, "Incorrect Ifbindings");

        let dev1_ifnames = net.resolve_dev_ifnaming(dev1.ifnaming);
        let dev2_ifnames = net.resolve_dev_ifnaming(dev2.ifnaming);
        if((dev1_ifnames == null) || (dev2_ifnames == null)) {
            return wsSendError(ws, msg_id, "Incorrect devices ifnames.");
        }
        for(let x = 0; x < d.ifbindings.length; x++) {
            if((!Array.isArray(d.ifbindings[x])) ||
                (d.ifbindings[x].length != 2))
                return wsSendError(ws, msg_id, "Incorrect Ifbindings");

            if((dev1_ifnames.indexOf(d.ifbindings[x][0]) == -1) || (dev2_ifnames.indexOf(d.ifbindings[x][1]) == -1))
                return wsSendError(ws, msg_id, "Incorrect Ifbindings");
        }

        // Check lag_name and lacp
        if((!Array.isArray(d.lag_name)) || 
                (d.lag_name.length != 2) || 
                (typeof d.lag_name[0] !== "string") ||
                (typeof d.lag_name[1] !== "string") ||
                (d.lag_name[0].length > 32) ||
                (d.lag_name[1].length > 32) ||
                (typeof d.lacp != "boolean")
            )
            return wsSendError(ws, msg_id, "Incorrect lag names");

        // Check transceiver
        if((typeof d.transceiver != "string") || (d.transceiver.length > 64))
            return wsSendError(ws, msg_id, "Incorrect lag names");

        // Assign values
        let message = {
            m: "C",
            d: {
                v: "L2",
                t: "link",
                i: d.i,
                ifbindings: d.ifbindings,
                transceiver: d.transceiver,
                lag_name: d.lag_name,
                lacp: d.lacp,
            }
        }

        if (! ("phy" in link))
            link.phy = {};

        link.phy.ifbindings = d.ifbindings;
        link.phy.transceiver = d.transceiver;

        link.phy.lag_name = d.lag_name;
        link.phy.lacp = d.lacp;
        
        message.d.lag_name = d.lag_name;
        message.d.lacp = d.lacp;

        // Update l3 diagram
        message.l3_changes = l3processor.update_from_l2(this.diagram);

        this.broadcastMessage(ws, msg_id, message);
    }

    configL2LinkDevice(ws, msg_id, d) {
        if (
                (! (d.i in this.diagram.L2.link))
            ) {
            wsSendError(ws, msg_id, "Link doesn't exist");
            return; 
        }

        let link = this.diagram.L2.link[d.i];
        // Check device index and device linked
        if(
                (typeof d.dev_index !== "number") ||
                (!Number.isInteger(d.dev_index)) ||
                (d.dev_index < 0) ||
                (d.dev_index > 1)
            )
            return wsSendError(ws, msg_id, "Devindex is incorrect (should be 0 or 1).");

        if(!(link.devs[d.dev_index].id in this.diagram.L2.device))
            return wsSendError(ws, msg_id, "Link device seems to be broken.");

        let dev = this.diagram.L2.device[link.devs[d.dev_index].id];
        if(link.devs[d.dev_index].data === undefined)
            link.devs[d.dev_index].data = {
                function: "none",
                function_data: {},
            }
        let link_data = link.devs[d.dev_index].data;

        // Check function passed
        if(d.function === "none") {
            link_data.function = "none";
            link_data.function_data = {};

            // Update l3 diagram
            let l3_changes = l3processor.update_from_l2(this.diagram);

            this.broadcastMessage(ws, msg_id, {
                m: "C",
                d: {
                    v: "L2",
                    t: "linkdev",
                    i: d.i,
                    dev_index: d.dev_index,
                    function: "none",
                },
                l3_changes: l3_changes,
            })
            return;
        }
        else if(d.function === "switching") {
            // Check if vlans are correct and if they are on the devices vlan list
            if(
                (!(Array.isArray(d.vlans))) ||
                (d.vlans.length > 256)
                )
                return wsSendError(ws, msg_id, "Vlans is not a list or it is too long.");
            for(let x = 0; x < d.vlans.length; x++) {
                if(!(d.vlans[x] in dev.vlans))
                    return wsSendError(ws, msg_id, "Vlan not in vlan list: " + d.vlans[x]);
            }
            // Check native vlan
            if((d.native_vlan !== "-1") && (d.vlans.indexOf(d.native_vlan) === -1))
                return wsSendError(ws, msg_id, "Native vlan not in vlan list.");

            // Data is OK, do the assignment
            link_data.function = "switching";
            link_data.function_data = {
                vlans: d.vlans,
                native_vlan: d.native_vlan,
            }

            // Update l3 diagram
            let l3_changes = l3processor.update_from_l2(this.diagram);

            // Broadcast message to all clients
            this.broadcastMessage(ws, msg_id, {
                m: "C",
                d: {
                    v: "L2",
                    t: "linkdev",
                    i: d.i,
                    dev_index: d.dev_index,
                    function: "switching",
                    vlans: d.vlans,
                    native_vlan: d.native_vlan,
                },
                l3_changes: l3_changes,
            })
            return;
        }
        else if(d.function === "routing") {
            // Check if subifs exist
            if((! Array.isArray(d.subinterfaces)) || (d.subinterfaces.length > 256))
                return wsSendError(ws, msg_id, "Subinterfaces is not a list or it is too long.");

            // Chec one by one each subinterface
            for(let x = 0; x < d.subinterfaces.length; x++) {
                let subif = d.subinterfaces[x];
                console.log(subif);

                // Check parameters one by one
                if((isNaN(subif.vlan_tag)) || (subif.vlan_tag < -1) || (subif.vlan_tag  > 4095))
                    return wsSendError(ws, msg_id, "Vlan tag is invalid (should be number between -1 and 4095).");

                if(!(subif.vrf in dev.vrfs))
                    return wsSendError(ws, msg_id, "Invalid vrf id");
            }

            // Everything is alright. do the assignment
            link_data.function = "routing";
            link_data.function_data = {
                subinterfaces: []
            }
            for(let x = 0; x < d.subinterfaces.length; x++) {
                let subif = d.subinterfaces[x];
                link_data.function_data.subinterfaces.push({
                    vlan_tag: subif.vlan_tag,
                    vrf: subif.vrf,
                })
            }
            // Update l3 diagram
            let l3_changes = l3processor.update_from_l2(this.diagram);

            // Broadcast message to all clients
            this.broadcastMessage(ws, msg_id, {
                m: "C",
                d: {
                    v: "L2",
                    t: "linkdev",
                    i: d.i,
                    dev_index: d.dev_index,
                    function: "routing",
                    subinterfaces: link_data.function_data.subinterfaces,
                },
                l3_changes: l3_changes,
            })
            return;
        }
        else
            return wsSendError(ws, msg_id, "Invalid function passed.");
    }

    /**
     * Function to configure a vrf
     */
    configVRF(ws, msg_id, d) {
        if (
                (! (d.i in this.diagram.L3.vrf))
            ) {
            wsSendError(ws, msg_id, "Interface doesn't exist.");
            return; 
        };

        // Verify Parameters
        if(("router_id" in d) && (d.router_id !== null) && (!net.isIPv4Address(d.router_id))) {
            wsSendError(ws, msg_id, "Router ID is invalid.");
            return; 
        }

        if(("asn" in d) && (d.asn !== null) && (!net.isASN(d.asn))) {
            wsSendError(ws, msg_id, "ASN is invalid.");
            return;
        }
        if("los" in d) {
            if(typeof d.los !== "object") {
                wsSendError(ws, msg_id, "Loopbacks are invalid.");
                return;
            }
            for(let lo_name in d.los) {
                if((lo_name.length < 1) || (lo_name > 32)) {
                    wsSendError(ws, msg_id, "Loopback name length invalid: " + lo_name);
                    return;                    
                }
                let lo = d.los[lo_name];
                if((!(Array.isArray(lo.ipv4))) || (!(Array.isArray(lo.ipv6)))) {
                    wsSendError(ws, msg_id, "Loopbacks are invalid.");
                    return;
                }
                let errors = [];
                lo.ipv4.forEach((ip) => { if(!net.getIPv4Interface(ip)) errors.push(ip)});
                lo.ipv6.forEach((ip) => { if(!net.getIPv6Interface(ip)) errors.push(ip)});
                if(errors.length > 0) {
                    wsSendError(ws, msg_id, "Invalid ips: " + errors.join(", "));
                    return;
                }
            }
        }

        // Everything is fine. Update the structure.
        let message = {
            m: "C",
            d: {
                v: "L3",
                t: "vrf",
                i: d.i,
            },
        };
        let vrf = this.diagram.L3.vrf[d.i];
        if(!("routing" in vrf))
            vrf.routing = {};
        if("router_id" in d) {
            vrf.routing.router_id = d.router_id;
            message.d.router_id = d.router_id;
        }
        if("asn" in d) {
            vrf.routing.asn = d.asn;
            message.d.asn = d.asn;
        }
        if("los" in d) {
            vrf.los = {};
            for(let lo_name in d.los) {
                vrf.los[lo_name] = {
                    ipv4: d.los[lo_name].ipv4,
                    ipv6: d.los[lo_name].ipv6,
                }
            }
            message.d.los = vrf.los;
        }

        // Broadcast message to all clients
        this.broadcastMessage(ws, msg_id, message);
    }

    /**
     * Function to configure an interface
     */
    configInterface(ws, msg_id, d) {
        if (
                (! (d.i in this.diagram.L3.interface))
            ) {
            wsSendError(ws, msg_id, "Interface doesn't exist.");
            return; 
        };

        let iface = this.diagram.L3.interface[d.i];
        if(
            (!("ip" in d)) ||
            (!("address" in d.ip)) ||
            (!(Array.isArray(d.ip.address.ipv4))) ||
            (!(Array.isArray(d.ip.address.ipv6)))
            ) {
            wsSendError(ws, msg_id, "Invalid format.");
            return; 
        }

        let ipv4 = [];
        let ipv6 = [];
        let errors = [];

        // Check ipv4
        d.ip.address.ipv4.forEach((ip) => {
            if(net.getIPv4Interface(ip) === undefined) {
                errors.push(ip)
                return;
            }
            ipv4.push(ip);
        })

        // Check ipv6
        d.ip.address.ipv6.forEach((ip) => {
            if(net.getIPv6Interface(ip) === undefined) {
                errors.push(ip)
                return;
            }
            ipv6.push(ip);
        })

        // If there is an error processing any ip, just notify requester
        if(errors.length > 0) {
            wsSendError(ws, msg_id, "Invalid ips: " + errors.join(", "));
            return;
        }

        // Update data
        iface.ip = {
            address: {
                ipv4: ipv4,
                ipv6: ipv6,
            }
        }

        // Broadcast message to all clients
        this.broadcastMessage(ws, msg_id, {
            m: "C",
            d: {
                v: "L3",
                t: "interface",
                i: d.i,
                ip: iface.ip,
            },
        })
        return;
    }

    /**
     * Function to configure a svi interface
     */
    configSVIInterface(ws, msg_id, d) {
        if (
                (! (d.i in this.diagram.L3.svi_interface))
            ) {
            wsSendError(ws, msg_id, "Interface doesn't exist.");
            return; 
        }

        let iface = this.diagram.L3.svi_interface[d.i];
        if(
            (!("ip" in d)) ||
            (!("address" in d.ip)) ||
            (!(Array.isArray(d.ip.address.ipv4))) ||
            (!(Array.isArray(d.ip.address.ipv6)))
            ) {
            wsSendError(ws, msg_id, "Invalid format.");
            return; 
        }

        let ipv4 = [];
        let ipv6 = [];
        let errors = [];

        // Check ipv4
        d.ip.address.ipv4.forEach((ip) => {
            if(net.getIPv4Interface(ip) === undefined) {
                errors.push(ip)
                return;
            }
            ipv4.push(ip);
        })

        // Check ipv6
        d.ip.address.ipv6.forEach((ip) => {
            if(net.getIPv6Interface(ip) === undefined) {
                errors.push(ip)
                return;
            }
            ipv6.push(ip);
        })

        // If there is an error processing any ip, just notify requester
        if(errors.length > 0) {
            wsSendError(ws, msg_id, "Invalid ips: " + errors.join(", "));
            return;
        }

        // Update data
        iface.ip = {
            address: {
                ipv4: ipv4,
                ipv6: ipv6,
            }
        }

        // Broadcast message to all clients
        this.broadcastMessage(ws, msg_id, {
            m: "C",
            d: {
                v: "L3",
                t: "svi_interface",
                i: d.i,
                ip: iface.ip,
            },
        })
        return;
    }

    /**
     * Function to configure a p2p interface
     */
    configP2PInterface(ws, msg_id, d) {
        if (
                (! (d.i in this.diagram.L3.p2p_interface))
            ) {
            wsSendError(ws, msg_id, "Interface doesn't exist.");
            return; 
        }

        let iface = this.diagram.L3.p2p_interface[d.i];
        if(
            (!(Array.isArray(d.ip))) ||
            (d.ip.length != 2) ||
            (!("address" in d.ip[0])) ||
            (!(Array.isArray(d.ip[0].address.ipv4))) ||
            (!(Array.isArray(d.ip[0].address.ipv6))) ||
            (!("address" in d.ip[1])) ||
            (!(Array.isArray(d.ip[1].address.ipv4))) ||
            (!(Array.isArray(d.ip[1].address.ipv6)))
            ) {
            wsSendError(ws, msg_id, "Invalid format.");
            return; 
        }

        let ipv4 = [[], []];
        let ipv6 = [[], []];
        let errors = [];

        for(let dev_id in d.ip) {
            // Check ipv4
            d.ip[dev_id].address.ipv4.forEach((ip) => {
                if(net.getIPv4Interface(ip) === undefined) {
                    errors.push(ip)
                    return;
                }
                ipv4[dev_id].push(ip);
            })

            // Check ipv6
            d.ip[dev_id].address.ipv6.forEach((ip) => {
                if(net.getIPv6Interface(ip) === undefined) {
                    errors.push(ip)
                    return;
                }
                ipv6[dev_id].push(ip);
            })
        }

        // If there is an error processing any ip, just notify requester
        if(errors.length > 0) {
            wsSendError(ws, msg_id, "Invalid ips: " + errors.join(", "));
            return;
        }

        // Update data
        iface.ip = [{
                address: {
                    ipv4: ipv4[0],
                    ipv6: ipv6[0],
                }
            }, {
            address: {
                    ipv4: ipv4[1],
                    ipv6: ipv6[1],
                }
            }];

        // Broadcast message to all clients
        this.broadcastMessage(ws, msg_id, {
            m: "C",
            d: {
                v: "L3",
                t: "p2p_interface",
                i: d.i,
                ip: iface.ip,
            },
        })
    }

    /**
     * Function to configure a bgp peer
     */
    configBGPPeer(ws, msg_id, d) {
        if (
                (! (d.i in this.diagram.L3.bgp_peering))
            ) {
            wsSendError(ws, msg_id, "Interface doesn't exist.");
            return; 
        }

        if(
            (["ipv4", "ipv6"].indexOf(d.transport) === -1) ||
            (!Array.isArray(d.afisafi))
            ) {
            wsSendError(ws, msg_id, "Invalid transport or afi/safi");
            return;
        }

        // Check transport IPs
        if((d.transport === "ipv4") && ((!net.isIPv4Address(d.src_ip)) || (!net.isIPv4Address(d.dst_ip)))) {
            wsSendError(ws, msg_id, "Transport IP addresses are not IPv4 (1)");
            return;
        }
        else if((d.transport === "ipv6") && ((!net.isIPv6Address(d.src_ip)) || (!net.isIPv6Address(d.dst_ip)))) {
            wsSendError(ws, msg_id, "Transport IP addresses are not IPv6 (1)");
            return;
        }

        // Check afi/safi
        for(let x = 0; x < d.afisafi.length; x++) {
            if(["ipv4/unicast", "ipv4/multicast", "ipv4/l3vpn", "ipv4/l3vpn-multicast", "ipv4/labeled",
                "ipv6/unicast", "ipv6/multicast", "ipv6/l3vpn", "ipv6/l3vpn-multicast", "ipv6/labeled",
                "l2vpn/vpls", "evpn"].indexOf(d.afisafi[x]) === -1) {
                wsSendError(ws, msg_id, "Invalid AFI/SAFI: " + d.afisafi[x]);
                return;
            }
        }

        // Update the bgp peer
        let bgp_peering = this.diagram.L3.bgp_peering[d.i];
        bgp_peering.transport = d.transport;
        bgp_peering.src_ip = d.src_ip;
        bgp_peering.dst_ip = d.dst_ip;
        bgp_peering.afisafi = d.afisafi;

        // Broadcast message to all clients
        this.broadcastMessage(ws, msg_id, {
            m: "C",
            d: {
                v: "L3",
                t: "bgp_peering",
                i: d.i,
                transport: bgp_peering.transport,
                src_ip: bgp_peering.src_ip,
                dst_ip: bgp_peering.dst_ip,
                afisafi: bgp_peering.afisafi,
            },
        })
    }

    deleteL2Base(ws, msg_id, id) {
        if(id in this.diagram.L2.base) {
            delete this.diagram.L2.base[id];
            for(let devid in this.diagram.L2.device)
                if(this.diagram.L2.device[devid].base == id)
                    this.deleteL2DeviceAndLinks(devid);
            for(let textid in this.diagram.L2.text)
                if(this.diagram.L2.text[textid].base == id)
                    delete this.diagram.L2.text[textid];
            for(let symbolid in this.diagram.L2.symbol)
                if(this.diagram.L2.symbol[symbolid].base == id)
                    delete this.diagram.L2.symbol[symbolid];

            // Update l3 diagram
            let l3_changes = l3processor.update_from_l2(this.diagram);

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: "L2",
                    t: "base",
                    i: id
                },
                l3_changes: l3_changes,
            });
        }
        else {
            wsSendError(ws, msg_id, "Base Element doesn't exist");
        }
    }

    deleteL3Base(ws, msg_id, id) {
        if(id in this.diagram.L3.base) {
            let is_empty = true;
            for(let vrf_id in this.diagram.L3.vrf) {
                if(this.diagram.L3.vrf[vrf_id].base == id) {
                    is_empty = false;
                    break
                }
            }
            if(is_empty) {
                for(let segment_id in this.diagram.L3.l2segment) {
                    if(this.diagram.L3.l2segment[segment_id].base == id) {
                        is_empty = false;
                        break;
                    }
                }
            }
            if(is_empty) {
                for(let symbol_id in this.diagram.L3.symbol) {
                    if(this.diagram.L3.symbol[symbol_id].base == id) {
                        is_empty = false;
                        break;
                    }
                }
            }
            if(is_empty) {
                for(let text_id in this.diagram.L3.text) {
                    if(this.diagram.L3.text[text_id].base == id) {
                        is_empty = false;
                        break;
                    }
                }
            }
            if(!is_empty) {
                wsSendError(ws, msg_id, "Base Element is not empty.");
                return;
            }
            if(Object.keys(this.diagram.L3.base).length < 2) {
                wsSendError(ws, msg_id, "Can't remove last base element.");
                return;                
            }

            delete this.diagram.L3.base[id];

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: "L3",
                    t: "base",
                    i: id
                },
            });
        }
        else {
            wsSendError(ws, msg_id, "Base Element doesn't exist");
        }
    }

    deleteL2DeviceAndLinks(id) {
        if(id in this.diagram.L2.device) {
            delete this.diagram.L2.device[id];
            for (let linkid in this.diagram.L2.link) {
                for(let x = 0; x < this.diagram.L2.link[linkid].devs.length; x++) {
                    if (this.diagram.L2.link[linkid].devs[x].id == id) {
                        delete this.diagram.L2.link[linkid];
                        break;
                    }
                }
            }
        }
    }

    deleteL2Device(ws, msg_id, id) {
        if(id in this.diagram.L2.device) {
            this.deleteL2DeviceAndLinks(id);

            // Update l3 diagram
            let l3_changes = l3processor.update_from_l2(this.diagram);

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: "L2",
                    t: "device",
                    i: id
                },
                l3_changes: l3_changes,
            });
        }
        else {
            wsSendError(ws, msg_id, "Device doesn't exist");
        }
    }

    deleteL2Link(ws, msg_id, id) {
        if(id in this.diagram.L2.link) {
            delete this.diagram.L2.link[id];

            // Update l3 diagram
            let l3_changes = l3processor.update_from_l2(this.diagram);

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: "L2",
                    t: "link",
                    i: id
                },
                l3_changes: l3_changes,
            });
        }
        else {
            wsSendError(ws, msg_id, "Link doesn't exist");
        }
    }

    deleteL2Joint(ws, msg_id, et, link_id, joint_index) {
        if(
            (et !== "link") ||
            (typeof joint_index === "number") &&
            (typeof link_id === "string") &&
            (link_id in this.diagram.L2.link) &&
            (joint_index < this.diagram.L2.link[link_id].linedata.points.length) &&
            (joint_index >= 0)
            ) {
            this.diagram.L2.link[link_id].linedata.points.splice(joint_index, 1);

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: "L2",
                    t: "joint",
                    et: "link",
                    i: link_id,
                    joint_index: joint_index,
                }
            });
        }
        else {
            wsSendError(ws, msg_id, "Joint doesn't exist");
        }
    }

    deleteL3Joint(ws, msg_id, et, link_id, joint_index) {
        if(
            (typeof joint_index === "number") &&
            (typeof link_id === "string") &&
            (["l2link", "interface", "svi_interface", "p2p_interface"].indexOf(et) !== -1) ||                
            (link_id in this.diagram.L3[et]) &&
            (joint_index < this.diagram.L3[et][link_id].linedata.points.length) &&
            (joint_index >= 0)
            ) {
            this.diagram.L3[et][link_id].linedata.points.splice(joint_index, 1);

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: "L3",
                    et: et,
                    t: "joint",
                    i: link_id,
                    joint_index: joint_index,
                }
            });
        }
        else {
            wsSendError(ws, msg_id, "Joint doesn't exist");
        }
    }

    deleteL3BGPPeer(ws, msg_id, id) {
        if(id in this.diagram.L3.bgp_peering) {
            delete this.diagram.L3.bgp_peering[id];

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: "L3",
                    t: "bgp_peering",
                    i: id
                },
            });
        }
        else {
            wsSendError(ws, msg_id, "BGP Peering doesn't exist");
        }
    }

    deleteText(ws, msg_id, view, id) {
        if((view !== "L2") && (view !== "L3")) {
            wsSendError(ws, msg_id, "Invalid format.");
            return;
        }
        if(id in this.diagram[view].text) {
            delete this.diagram[view].text[id];

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: view,
                    t: "text",
                    i: id
                }
            });
        }
        else {
            wsSendError(ws, msg_id, "Text doesn't exist");
        }
    }

    deleteSymbol(ws, msg_id, view, id) {
        if((view !== "L2") && (view !== "L3")) {
            wsSendError(ws, msg_id, "Invalid format.");
            return;
        }
        if(id in this.diagram[view].symbol) {
            delete this.diagram[view].symbol[id];

            this.broadcastMessage(ws, msg_id, {
                m: "D",
                d: {
                    v: view,
                    t: "symbol",
                    i: id
                }
            });
        }
        else {
            wsSendError(ws, msg_id, "Symbol doesn't exist");
        }
    }
}

module.exports = ETMap;
