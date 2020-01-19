let d = {}

function createDefaultBaseFloor(x, y, z) {
    return {
        type: "F",
        name: "",
        px: x, py: y, pz: z,
        rx: 0, ry: 0, rz: 0,
        sx: 5, sy: .5, sz: 5,
        color1: 0xffffff,
        color2: 0xffbbaa,
        t1name: "b1_t1",
        t2name: "b2_t1",
        tsx:1, tsy: 1,
        data: [],
    }    
}

function createDefaultDevice(x, y, z, type, base) {
    let dev = {
        type: type, name: "",
        px: x, py: y, pz: z,
        rx: 0, ry: 0, rz: 0,
        sx: d.wgl.global_settings.format.scale, sy: d.wgl.global_settings.format.scale, sz: d.wgl.global_settings.format.scale,
        color1: 0xffffff,
        color2: 0xffffff,

        base: base,
    }

    if((type in GEOMETRY.DEVICE) && ("color" in GEOMETRY.DEVICE[type])) {
        dev.color1 = d.wgl.global_settings.format.use_standard_color ? GEOMETRY.DEVICE[type].color[0] : d.wgl.global_settings.format.color1;
        dev.color2 = d.wgl.global_settings.format.use_standard_color ? GEOMETRY.DEVICE[type].color[1] : d.wgl.global_settings.format.color2;
    }
    else {
        dev.color1 = d.wgl.global_settings.format.color1;
        dev.color2 = d.wgl.global_settings.format.color2;        
    }

    return dev;
}

function createDefaultText(x, z, type, base) {
    return {
        type: "F",
        text: "text",
        height: d.wgl.global_settings.format.use_standard_text ? .3 : d.wgl.global_settings.format.text_height,
        color: d.wgl.global_settings.format.use_standard_color ? 0x000000 : d.wgl.global_settings.format.color1,
        px: x, py: .5, pz: z,
        base: base,
        rx: d.wgl.global_settings.format.use_standard_text ? -Math.PI/4 : d.wgl.global_settings.format.text_rx,
        ry: 0,
        text_align: d.wgl.global_settings.format.use_standard_text ? "l" : d.wgl.global_settings.format.text_align,
        rotation_x: d.wgl.global_settings.format.use_standard_text ? 0 : d.wgl.global_settings.format.text_rotation_x,
        bg_color: d.wgl.global_settings.format.use_standard_text ? 0xffffff : d.wgl.global_settings.format.text_bg_color,
        border_color: d.wgl.global_settings.format.use_standard_text ? 0x000000 : d.wgl.global_settings.format.text_border_color,
        bg_type: d.wgl.global_settings.format.use_standard_text ? "n" : d.wgl.global_settings.format.text_bg_type,
        bg_show: d.wgl.global_settings.format.use_standard_text ? false : d.wgl.global_settings.format.text_bg_show,
        border_show: d.wgl.global_settings.format.use_standard_text ? false : d.wgl.global_settings.format.text_border_show,
        border_width: d.wgl.global_settings.format.use_standard_text ? .1 : d.wgl.global_settings.format.text_border_width,
        bg_depth: d.wgl.global_settings.format.use_standard_text ? .1 : d.wgl.global_settings.format.text_bg_depth,
    }
}

function createDefaultSymbolFlag(x, y, z, base) {
    return {
        type: "F",
        base: base,
        px: x, py: y, pz: z,
        rx: 0, ry: 0, rz: 0,
        sx: d.wgl.global_settings.format.scale, sy: d.wgl.global_settings.format.scale, sz: d.wgl.global_settings.format.scale,
        color: d.wgl.global_settings.format.use_standard_color ? 0xffAA88 : d.wgl.global_settings.format.color1,
        cd: {
            flagcolor: d.wgl.global_settings.format.use_standard_color ? 0x00ff00 : d.wgl.global_settings.format.color2,
        }
    }
}

function createDefaultSymbol(type, x, y, z, base) {
    let color = d.wgl.global_settings.format.color1;
    if(type === "F")
        return createDefaultSymbolFlag(x, y, z, base);
    else if(type === "A")
        return createDefaultSymbolArrow(x, y, z, base);
    else if(type === "X")
        color = d.wgl.global_settings.format.use_standard_color ? 0xff4444 : d.wgl.global_settings.format.color1;
    else if(type === "V")
        color = d.wgl.global_settings.format.use_standard_color ? 0x44ff44 : d.wgl.global_settings.format.color1;

    return {
        type: type,
        base: base,
        px: x, py: y, pz: z,
        rx: 0, ry: 0, rz: 0,
        sx: d.wgl.global_settings.format.scale, sy: d.wgl.global_settings.format.scale, sz: d.wgl.global_settings.format.scale,
        color: color,
    }
}

function createDefaultSymbolArrow(x, y, z, base) {
    return {
        type: "A",
        base: base,
        px: x, py: y, pz: z,
        rx: -Math.PI/2, ry: 0, rz: 0,
        sx: .2, sy: 2, sz: .2,
        color: 0xffaa88,
        cd: {
            shaft_dots: 1,
            head_color: 0xffaa88,
            head_type: "f",
            tail_type: "n",
            shaft_type: "s",
            head_sx_per: 400,
            head_sy_per: 20,
            head_sz_per: 100,
            tail_sx_per: 400,
            tail_sy_per: 20,
            tail_sz_per: 100,
        }
    };
}

function check_ifnaming(value) {
    // Function to check if a string is a valid ifnaming representation (eg Ethernet{1-32}/{1-4} )
    if(resolve_ifnaming(value) == null)
        return false
    return true;
}

function resolve_ifnaming_addstring(current, newstring) {
    let result = [];
    for (let x = 0; x < current.length; x++) {
        result.push(current[x] + newstring);
    }

    return result;
}

function resolve_ifnaming_addrange(current, range) {
    let result = [];

    for (let x = 0; x < current.length; x++) {
        for(let y = range[0]; y < (range[1]+1); y++)
            result.push(current[x] + y);
    }

    return result;
}

function resolve_ifnaming(value) {
    // Function to check if a string is a valud ifnaming representation (eg Ethernet{1-32}/{1-4} )
    let stringsplit = [""];
    let mode = 1;
    let tempstring = "";
    let tempnum = 0;
    let lownum = 0;
    for(let x = 0; x < value.length; x++) {
        let charcode = value.charCodeAt(x);
        if (mode == 1) {
            if(value[x] === "{") {
                stringsplit = resolve_ifnaming_addstring(stringsplit, tempstring);
                tempstring = "";
                mode = 2;
                continue
            }

            if( !((charcode > 32) && (charcode < 48)) &&
                !((charcode > 57) && (charcode < 127))
                )
                return null;

            tempstring = tempstring + value[x];
        }
        else if(mode == 2) {
            if(value[x] == "-") {
                mode = 3;
                lownum = tempnum;
                tempnum = 0;
            }
            else if( !((charcode > 47) && (charcode < 58))) {
                return null;
            }
            else
                tempnum = tempnum*10+charcode - 48;
        }
        else if(mode == 3) {
            if(value[x] == "}") {
                if(lownum > tempnum)
                    return null;
                mode = 1;
                stringsplit = resolve_ifnaming_addrange(stringsplit, [lownum, tempnum]);
                tempnum = 0;
            }
            else if( !((charcode > 47) && (charcode < 58))) {
                return null;
            }
            else
                tempnum = tempnum*10+charcode - 48;
        }
    }

    if(mode != 1)
        return null;

    stringsplit = resolve_ifnaming_addstring(stringsplit, tempstring);

    return stringsplit;
}

function process_message(message) {
    switch(message.m) {
        case "I":
            d.diagram = message.d.d;
            d.name = message.d.n;
            d.permission = message.d.p;
            
            init_window();
            break;
        case "A":
            process_message_add(message.d)
            break;
        case "M":
            process_message_move(message.d)
            break;
        case "R":
            process_message_rotate(message.d)
            break;
        case "X":
            process_message_resize(message.d)
            break;
        case "P":
            process_message_settings(message.d)
            break;
        case "C":
            process_message_config(message.d)
            break;
        case "D":
            process_message_delete(message.d)
            break;
        case "BG":
            d.wgl.settingsBackground(message.d.bg_color)
            break;
        case "DT":
            d.wgl.dataMesh(message.d.v, message.d.t, message.d.i, message.d.infobox_type, message.d.data);
            break;
        case "E":
            DOM.showError("Error Received", message.d.error);
            if(message.d.fatal) {
                DOM.showError("Fatal Error", message.d.error, true);
                d.ws.clear_close_event();
            }
            else {
                DOM.showError("Error Received", message.d.error);
            }
            break;
    }

    if("l3_changes" in message) {
        process_message_l3(message.l3_changes);
    }
}

function process_message_add(data) {
    if(((data.v === "L2") || (data.v === "L3")) && (data.t == "base")) {
        d.wgl.addCubeFloor(data.i, data.v, data.d);
    }
    else if((data.v == "L2") && (data.t == "device")) {
        d.wgl.addDevice(data.t, data.i, "L2", data.d);
    }
    else if((data.v == "L2") && (data.t == "link")) {
        d.wgl.addLink(data.t, data.i, "L2", data.d);
    }
    else if((data.v == "L3") && (data.t == "bgp_peering")) {
        d.wgl.addBGPArrow(data.i, data.d);
    }
    else if(data.t == "joint") {
        d.wgl.addJoint(data.et, data.link_id, data.joint_index, data.v, data.px, data.py, data.pz);
    }
    else if(data.t == "text") {
        let mesh = d.wgl.addText(data.i, data.v, data.d);
        if(d.expecting_text_added) {
            delete d.expecting_text_added
            WIN_showTextWindow(data.v, "text", mesh.userData.id, mesh.userData.e,
                (windata) => {
                    sendSettings_Text(data.v, mesh.userData.id, windata);
                });
        }
    }
    else if(data.t == "symbol") {
        d.wgl.addSymbol(data.i, data.v, data.d);
    }
}

function process_message_move(data) {
    if(data.t == "joint") {
        let mesh = d.wgl.getMesh(data.v, data.et, data.i);
        if(mesh) {
            mesh.userData.e.linedata.points[data.joint_index] = [data.x, data.y, data.z];
            d.wgl.updateLinkGeometry(data.et, mesh, data.v);
        }
    }
    else if(data.t == "bgp_peering") {
        let mesh = d.wgl.getMesh("L3", "bgp_peering", data.i);
        if(mesh) {
            mesh.userData.e.curve_x = data.curve_x;
            mesh.userData.e.curve_y = data.curve_y;
            d.wgl.updateBGPArrowGeometry(mesh);
        }
    }
    else if(data.t === "text")
        d.wgl.moveMesh(data.v, data.t, data.i, data.x, undefined, data.z, data.base);
    else
        d.wgl.moveMesh(data.v, data.t, data.i, data.x, data.y, data.z, data.base);
}

function process_message_rotate(data) {
    d.wgl.rotateMesh(data.v, data.t, data.i, data.x, data.y, data.z);
}

function process_message_resize(data) {
    if((data.v == "L2") && (data.t == "base")) {
        d.wgl.resizeMesh_Base(data.v, data.i, data.x, data.y, data.z);
    }
    else {
        d.wgl.resizeMesh(data.v, data.t, data.i, data.x, data.y, data.z);
    }
}

function process_message_settings(data) {
    if(data.t == "base") {
        d.wgl.settingsMesh_Base(data.v, data.i, data.name, data.subtype, data.color1, data.color2, data.opacity, data.t1name, data.t2name, data.sy, data.tsx, data.tsy);
    }
    else if((data.v == "L2") && (data.t == "device")) {
        d.wgl.settingsMesh_Device(data.i, data.name, data.color1, data.color2, data.ifnaming);
    }
    else if((data.v == "L2") && (data.t == "link")) {
        d.wgl.settingsMesh_Link("L2", "link", data.i, data.type, data.order, data.color, data.weight, data.height);
    }
    else if((data.v == "L3") && (data.t == "vrf")) {
        d.wgl.settingsMesh_Vrf(data.i, data.color1, data.color2);
    }
    else if((data.v == "L3") && (data.t == "l2segment")) {
        d.wgl.settingsMesh_L2Segment(data.i, data.color1);
    }
    else if((data.v == "L3") && (data.t == "bgp_peering")) {
        d.wgl.settingsMesh_BGPPeer(data.i, data.color);
    }
    else if((data.v == "L3") && ((data.t == "l2link") || (data.t == "interface") || (data.t == "svi_interface") || (data.t == "p2p_interface"))) {
        d.wgl.settingsMesh_Link(data.v, data.t, data.i, data.type, data.order, data.color, data.weight, data.height);
    }
    else if(data.t == "text") {
        d.wgl.settingsMesh_Text(data.v, data.i, data.text, data.py, data.height, data.color, data.text_align,
            data.bg_type, data.bg_show, data.bg_color, data.border_show, data.border_color, data.border_width, data.bg_depth, data.rotation_x);
    }
    else if(data.t == "symbol") {
        d.wgl.settingsMesh_Symbol(data.v, data.i, data);
    }
}

function process_message_config(data) {
    if(data.v == "L2") {
        if(data.t == "device") {
            d.wgl.configMesh_L2Device(data.i, data.name, data.vlans, data.vrfs, data.svis);
        }
        else if(data.t == "link") {
            d.wgl.configMesh_L2Link(data.i, data.ifbindings, data.lag_name, data.lacp, data.transceiver);   
        }
        else if(data.t == "linkdev") {
            d.wgl.configMesh_L2LinkDevice(data.i, data.dev_index, data.function, data.vlans, data.native_vlan, data.subinterfaces);
        }
    }
    else if(data.v == "L3") {
        if(data.t == "interface") {
            d.wgl.configMesh_Interface(data.i, data.ip);
        }
        if(data.t == "svi_interface") {
            d.wgl.configMesh_SVIInterface(data.i, data.ip);
        }
        if(data.t == "p2p_interface") {
            d.wgl.configMesh_P2PInterface(data.i, data.ip);
        }
        if(data.t == "vrf") {
            d.wgl.configMesh_Vrf(data.i, data.router_id, data.asn, data.los);
        }
        if(data.t == "bgp_peering") {
            d.wgl.configMesh_BGPPeer(data.i, data.transport, data.src_ip, data.dst_ip, data.afisafi);
        }
    }
}

function process_message_delete(data) {
    if(
        ((data.v == "L2") && (data.t == "base")) ||
        ((data.v == "L2") && (data.t == "device")) ||
        ((data.v == "L2") && (data.t == "link")) ||
        ((data.v == "L3") && (data.t == "bgp_peering")) ||
        (data.t == "symbol") ||
        (data.t == "text")
        ) {
        d.wgl.deleteMesh(data.v, data.t, data.i)
    }
    else if((data.v == "L3") && (data.t == "base")) {
        d.wgl.deleteMesh("L3", data.t, data.i)
    }
    else if (data.t == "joint")
        d.wgl.deleteJoint(data.v, data.et, data.i, data.joint_index);
}

function process_message_l3(l3_changes) {
    l3_changes.forEach((message) => {
        if(message.t === "vrf") {
            if(message.m === "A") {
                // Add vrf
                d.wgl.addDevice("vrf", message.id, "L3", message.data);
            }
            else if(message.m === "D") {
                // Remove vrf
                d.wgl.deleteMesh("L3", "vrf", message.id);
            }
            else if(message.m === "CN") {
                d.wgl.changeNameVRF(message.id, message.data.name);
            }
        }
        else if(message.t === "l2segment") {
            if(message.m === "A") {
                d.wgl.addL2Segment(message.id, message.data);
            }
            else if(message.m === "D") {
                d.wgl.deleteMesh("L3", "l2segment", message.id);
            }
        }
        else if(message.t === "l2link") {
            if(message.m === "A") {
                d.wgl.addLink("l2link", message.id, "L3", message.data);
            }
            else if(message.m === "D") {
                d.wgl.deleteMesh("L3", "l2link", message.id);
            }
        }
        else if(message.t === "interface") {
            if(message.m === "A") {
                d.wgl.addLink("interface", message.id, "L3", message.data);
            }
            else if(message.m === "D") {
                d.wgl.deleteMesh("L3", "interface", message.id);
            }
        }
        else if(message.t === "svi_interface") {
            if(message.m === "A") {
                d.wgl.addLink("svi_interface", message.id, "L3", message.data);
            }
            else if(message.m === "D") {
                d.wgl.deleteMesh("L3", "svi_interface", message.id);
            }
        }
        else if(message.t === "p2p_interface") {
            if(message.m === "A") {
                d.wgl.addLink("p2p_interface", message.id, "L3", message.data);
            }
            else if(message.m === "D") {
                d.wgl.deleteMesh("L3", "p2p_interface", message.id);
            }
        }
        else if(message.t === "bgp_peering") {
            if(message.m === "D") {
                d.wgl.deleteMesh("L3", "bgp_peering", message.id);
            }
        }
    })
}

function sendAdd_BaseFloor(subtype, x, y, z, sx, sy, sz, rx, ry, rz) {
    let message = {
        m: "A",
        d: {
            v: d.current_view,
            t: "base",
            st: subtype,
            px: x, py: y, pz: z,
            sx: sx, sy: sy, sz: sz,
            rx: rx, ry: ry, rz: rz,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendAdd_Device(subtype, x, y, z, sx, sy, sz, rx, ry, rz, color1, color2, base) {
    let message = {
        m: "A",
        d: {
            v: d.current_view,
            t: "device",
            st: subtype,
            px: x, py: y, pz: z,
            sx: sx, sy: sy, sz: sz,
            rx: rx, ry: ry, rz: rz,
            color1: color1, color2: color2,
            base: base,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendAdd_Link(type, dev1_id, dev2_id) {
    let message = {
        m: "A",
        d: {
            v: d.current_view,
            t: "link",
            type: type,
            dev1_id: dev1_id, 
            dev2_id: dev2_id, 
            color: d.wgl.global_settings.format.use_standard_link ? 0x888888 : d.wgl.global_settings.format.link_color,
            weight: d.wgl.global_settings.format.use_standard_link ? 0.025 : d.wgl.global_settings.format.link_weight,
            height: d.wgl.global_settings.format.use_standard_link ? .25 : d.wgl.global_settings.format.link_height,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendAdd_BGPPeering(bgp_peering) {
    bgp_peering.v = "L3";
    bgp_peering.t = "bgp_peering";
    let message = {
        m: "A",
        d: bgp_peering,
    };

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendAdd_Joint(element_type, link_id, joint_index, px, py, pz) {
    let message = {
        m: "A",
        d: {
            v: d.current_view,
            t: "joint",
            et: element_type,
            link_id: link_id,
            joint_index: joint_index,
            px: px, py: py, pz: pz,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendAdd_Text(element) {
    let message = {
        m: "A",
        d: {
            t: "text",
            type: element.type,
            v: d.current_view,
            text: element.text,
            px: element.px, py: element.py, pz: element.pz,
            rx: element.rx, ry: element.ry,
            base: element.base,

            height: element.height, depth: element.depth,
            color: element.color,

            text_align: element.text_align,
            rotation_x: element.rotation_x,
            bg_color: element.bg_color,
            border_color: element.border_color,
            bg_type: element.bg_type,
            bg_show: element.bg_show,
            border_show: element.border_show,
            border_width: element.border_width,
            bg_depth: element.bg_depth,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendAdd_Symbol(subtype, x, y, z, sx, sy, sz, rx, ry, rz, color, cd, base) {
    let message = {
        m: "A",
        d: {
            v: d.current_view,
            t: "symbol",
            st: subtype,
            px: x, py: y, pz: z,
            sx: sx, sy: sy, sz: sz,
            rx: rx, ry: ry, rz: rz,
            color: color, cd: cd,
            base: base,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendMove(view, type, id) {
    let pos = d.wgl.getMeshPosition(view, type, id);
    let message = {
        m: "M",
        d: {
            v: view,
            t: type,
            i: id,
            x: pos.x, y: pos.y, z: pos.z,
        }
    }
    if("base" in pos) {
        message.d.base = pos.base;
    }


    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendMoveBGPPeer(id, curve_x, curve_y) {
    let message = {
        m: "M",
        d: {
            v: "L3",
            t: "bgp_peering",
            i: id,
            curve_x: curve_x,
            curve_y: curve_y,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendMoveJoint(view, element_type, id, joint_index, coords) {
    let message = {
        m: "M",
        d: {
            v: view,
            t: "joint",
            et: element_type,
            i: id,
            joint_index: joint_index,
            x: coords[0], y: coords[1], z: coords[2],
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendRotate(view, type, id) {
    let r = d.wgl.getMeshRotation(view, type, id);
    let message = {
        m: "R",
        d: {
            v: view,
            t: type,
            i: id,
            x: r.x, y: r.y, z: r.z,
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendResize(view, type, id) {
    let s = d.wgl.getMeshSize(view, type, id);
    let message = {
        m: "X",
        d: {
            v: view,
            t: type,
            i: id,
            x: s.x, y: s.y, z: s.z,
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_Background(windata) {
    let message = {
        m: "BG",
        d: {
            bg_color: parseInt(windata.d.bg_color.value),
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_BaseFloor(view, type, id, windata) {
    let message = {
        m: "P",
        d: {
            v: view,
            t: type,
            i: id,

            name: windata.d.name.value,
            subtype: windata.d.subtype.value,
            color1: parseInt(windata.d.color1.value),
            color2: parseInt(windata.d.color2.value),
            opacity: parseFloat(windata.d.opacity.value),
            t1name: windata.d.t1name.value,
            t2name: windata.d.t2name.value,
            sy: parseFloat(windata.d.sy.value),
            tsx: 1/parseFloat(windata.d.tsx_i.value),
            tsy: 1/parseFloat(windata.d.tsy_i.value),
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendMessageSettings_Device(id, name, color1, color2, ifnaming) {
    let message = {
        m: "P",
        d: {
            v: "L2",
            t: "device",
            i: id,

            name: name,
            color1: color1,
            color2: color2,
            ifnaming: ifnaming,
        }        
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_Device(id, windata) {
    sendMessageSettings_Device(id,
        windata.d.name.value,
        parseInt(windata.d.color1.value),
        parseInt(windata.d.color2.value),
        windata.d.ifnaming.value.split(","));

}

function sendConfig_Device(id, windata) {
    let message = {
        m: "C",
        d: {
            v: "L2",
            t: "device",
            i: id,

            vlans: {},
            vrfs: {},
            svis: {},
            los: {},
        }
    }
    let vlans = JSON.parse(windata.d.vlans.value);
    let vrfs = JSON.parse(windata.d.vrfs.value);
    let svis = JSON.parse(windata.d.svis.value);

    for(let x = 0; x < vlans.length; x++)
        message.d.vlans[vlans[x].tag] = { name: vlans[x].name };
    for(let x = 0; x < vrfs.length; x++)
        message.d.vrfs[vrfs[x].rd] = { name: vrfs[x].name };
    for(let x = 0; x < svis.length; x++) {
        message.d.svis[svis[x].tag] = { name: svis[x].name, vrf: svis[x].vrf };
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_Link(id, windata) {
    let message = {
        m: "C",
        d: {
            v: "L2",
            t: "link",
            i: id,

            ifbindings: [],
            lag_name: [windata.d.lag_name1.value, windata.d.lag_name2.value],
            lacp: (windata.d.lacp.value == "yes" ? true : false),
            transceiver: windata.d.transceiver.value,
        }
    }
    let ifbindings = JSON.parse(windata.d.ifbindings.value);
    for(let x = 0; x < ifbindings.length; x++) {
        if((ifbindings[x].dev1 !== "") && (ifbindings[x].dev2 !== ""))
        message.d.ifbindings.push([ifbindings[x].dev1, ifbindings[x].dev2])
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_LinkDevice(id, dev_index, windata) {
    let message = {
        m: "C",
        d: {
            v: "L2",
            t: "linkdev",
            i: id,
            dev_index: dev_index,

            function: windata.d.function.value,
        }
    }

    if(windata.d.function.value == "routing") {
        message.d.subinterfaces = [];

        let subifs = JSON.parse(windata.d.subinterfaces.value);
        for(let x = 0; x < subifs.length; x++) {
            if((subifs[x].vlan_tag != "") && (subifs[x].vrf != "")) {
                let subif = {
                    vlan_tag: subifs[x].vlan_tag,
                    vrf: subifs[x].vrf,
                }

                message.d.subinterfaces.push(subif);
            }
        }
    }

    if(windata.d.function.value == "switching") {
        message.d.vlans = [];
        message.d.native_vlan = "-1";
        let vlans = JSON.parse(windata.d.vlans.value);

        for(let x = 0; x < vlans.length; x++) {
            if(vlans[x].vlan_id != "") {
                message.d.vlans.push(vlans[x].vlan_id);
                if(vlans[x].tagged == "no") {
                    if(message.d.native_vlan != "-1") {
                        DOM.showError("ERROR", "There is more than one native vlan.");
                        return;
                    }
                    message.d.native_vlan = vlans[x].vlan_id;
                }

            }
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_Interface(id, windata) {
    let message = {
        m: "C",
        d: {
            v: "L3",
            t: "interface",
            i: id,
            ip: { address: { ipv4: [], ipv6: []}}
        }
    }

    // Parse ipv4 and ipv6 address from the data
    let ipv4 = JSON.parse(windata.d.ipv4_address.value);
    let ipv6 = JSON.parse(windata.d.ipv6_address.value);

    ipv4.forEach((ip) => {
        if(ip.ipv4 !== "") message.d.ip.address.ipv4.push(ip.ipv4);
    });
    ipv6.forEach((ip) => {
        if(ip.ipv6 !== "") message.d.ip.address.ipv6.push(ip.ipv6);
    });

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_SVIInterface(id, windata) {
    let message = {
        m: "C",
        d: {
            v: "L3",
            t: "svi_interface",
            i: id,
            ip: { address: { ipv4: [], ipv6: []}}
        }
    }

    // Parse ipv4 and ipv6 address from the data
    let ipv4 = JSON.parse(windata.d.ipv4_address.value);
    let ipv6 = JSON.parse(windata.d.ipv6_address.value);

    ipv4.forEach((ip) => {
        if(ip.ipv4 !== "") message.d.ip.address.ipv4.push(ip.ipv4);
    });
    ipv6.forEach((ip) => {
        if(ip.ipv6 !== "") message.d.ip.address.ipv6.push(ip.ipv6);
    });

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_P2PInterface(id, windata) {
    let message = {
        m: "C",
        d: {
            v: "L3",
            t: "p2p_interface",
            i: id,
            ip: [{ address: { ipv4: [], ipv6: []}}, { address: { ipv4: [], ipv6: []}}]
        }
    }

    // Parse ipv4 and ipv6 address from the data
    let ipv4 = [JSON.parse(windata.d.ipv4_address_0.value), JSON.parse(windata.d.ipv4_address_1.value)];
    let ipv6 = [JSON.parse(windata.d.ipv6_address_0.value), JSON.parse(windata.d.ipv6_address_1.value)];

    for(let x = 0; x < 2; x++) {
        ipv4[x].forEach((ip) => {
            if(ip.ipv4 !== "") message.d.ip[x].address.ipv4.push(ip.ipv4);
        });
        ipv6[x].forEach((ip) => {
            if(ip.ipv6 !== "") message.d.ip[x].address.ipv6.push(ip.ipv6);
        });
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_Vrf(id, windata) {
    let message = {
        m: "C",
        d: {
            v: "L3",
            t: "vrf",
            i: id,
            router_id: (windata.d.router_id.value === "") ? null : windata.d.router_id.value,
            asn: (windata.d.asn.value === "") ? null : windata.d.asn.value,
            los: {},
        }
    }

    let lo_data = JSON.parse(windata.d.los.value);
    lo_data.forEach((lo) => {
        message.d.los[lo.name] = {
            ipv4: (lo.ipv4 === "") ? [] : [lo.ipv4],
            ipv6: (lo.ipv6 === "") ? [] : [lo.ipv6],
        }
    });

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_BGPPeer(id, windata) {
    let message = {
        m: "C",
        d: {
            v: "L3",
            t: "bgp_peering",
            i: id,
            transport: windata.d.transport.value,
            src_ip: windata.d.src_ip.value,
            dst_ip: windata.d.dst_ip.value,
            afisafi: [],
        }
    }

    let afisafi_list = JSON.parse(windata.d.afisafi.value);
    afisafi_list.forEach((afisafi_dict) => {
        message.d.afisafi.push(afisafi_dict.afisafi)
    });

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendMessageSettings_Link(view, type, id, line_type, order, color, weight, height) {
    let message = {
        m: "P",
        d: {
            v: view,
            t: type,
            i: id,

            type: line_type,
            order: order,
            color: color,
            weight: weight,
            height: height,
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_Link(view, type, id, windata) {
    sendMessageSettings_Link(view, type, id,
        parseInt(windata.d.type.value),
        windata.d.order.value,
        parseInt(windata.d.color.value),
        parseFloat(windata.d.weight.value),
        parseFloat(windata.d.height.value));
}

function sendMessageSettings_Vrf(id, color1, color2) {
    let message = {
        m: "P",
        d: {
            v: "L3",
            t: "vrf",
            i: id,

            color1: color1,
            color2: color2,
        }        
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_Vrf(id, windata) {
    sendMessageSettings_Vrf(id,
        parseInt(windata.d.color1.value),
        parseInt(windata.d.color2.value));
}

function sendMessageSettings_BGPPeer(id, color) {
    let message = {
        m: "P",
        d: {
            v: "L3",
            t: "bgp_peering",
            i: id,

            color: color,
        }        
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_BGPPeer(id, windata) {
    sendMessageSettings_BGPPeer(id,
        parseInt(windata.d.color.value));
}

function sendMessageSettings_L2Segment(id, color1) {
    let message = {
        m: "P",
        d: {
            v: "L3",
            t: "l2segment",
            i: id,

            color1: color1,
        }        
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_L2Segment(id, windata) {
    sendMessageSettings_L2Segment(id,
        parseInt(windata.d.color1.value));
}

function sendMessageSettings_L2Link(id, type, order, color, weight, height) {
    let message = {
        m: "P",
        d: {
            v: "L3",
            t: "l2link",
            i: id,

            type: type,
            order: order,
            color: color,
            weight: weight,
            height: height,
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_L2Link(id, windata) {
    sendMessageSettings_L2Link(id,
        parseInt(windata.d.type.value),
        windata.d.order.value,
        parseInt(windata.d.color.value),
        parseFloat(windata.d.weight.value),
        parseFloat(windata.d.height.value));
}

function sendMessageSettings_Text(view, id, data) {
    let message = {
        m: "P",
        d: {
            v: view,
            t: "text",
            i: id,

            text: data.text,
            color: data.color,
            py: data.py,
            height: data.height,
            text_align: data.text_align,
            bg_type: data.bg_type,
            bg_color: data.bg_color,
            bg_show: data.bg_show,
            border_color: data.border_color,
            border_show: data.border_show,
            border_width: data.border_width,
            bg_depth: data.bg_depth,
            rotation_x: data.rotation_x,
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_Text(view, id, windata) {
    if (windata.d.text.value.length == 0) {
        DOM.showError("Format Error", "Empty text field not allowed.")
        return;
    }
    sendMessageSettings_Text(view, id, {
        text: windata.d.text.value,
        color: parseInt(windata.d.color.value),
        py: parseFloat(windata.d.py.value),
        height: parseFloat(windata.d.height.value),
        text_align: windata.d.text_align.value,
        bg_type: windata.d.bg_type.value,
        bg_color: parseInt(windata.d.bg_color.value),
        bg_show: windata.d.bg_show.checked,
        border_color: parseInt(windata.d.border_color.value),
        border_show: windata.d.border_show.checked,
        border_width: parseFloat(windata.d.border_width.value),
        bg_depth: parseFloat(windata.d.bg_depth.value),
        rotation_x: parseFloat(windata.d.rotation_x.value),
    });
}

function sendSettings_SymbolFlag(view, type, id, windata) {
    let message = {
        m: "P",
        d: {
            v: view,
            t: type,
            i: id,

            color: parseInt(windata.d.color.value),
            flagcolor: parseInt(windata.d.flagcolor.value),
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_SymbolArrow(view, type, id, windata) {
    let message = {
        m: "P",
        d: {
            v: view,
            t: type,
            i: id,

            sx: parseFloat(windata.d.sx.value),
            sz: parseFloat(windata.d.sz.value),
            color: parseInt(windata.d.color.value),
            head_color: parseInt(windata.d.head_color.value),
            head_type: windata.d.head_type.value,
            tail_type: windata.d.tail_type.value,
            shaft_type: windata.d.shaft_type.value,
            head_sx_per: parseInt(windata.d.head_sx_per.value),
            head_sy_per: parseInt(windata.d.head_sy_per.value),
            head_sz_per: parseInt(windata.d.head_sz_per.value),
            tail_sx_per: parseInt(windata.d.tail_sx_per.value),
            tail_sy_per: parseInt(windata.d.tail_sy_per.value),
            tail_sz_per: parseInt(windata.d.tail_sz_per.value),
            shaft_dots: parseInt(windata.d.shaft_dots.value),
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendData(windata) {
    let message = {
        m: "DT",
        d: {
            v: windata.obj.view,
            t: windata.obj.type,
            i: windata.obj.id,

            infobox_type: windata.d.infobox_type.value,
            data: [],
        }
    }

    let data_dl = JSON.parse(windata.d.data.value);

    if(data_dl.length > 0) {
        let current = {title: data_dl[0].title, text: [data_dl[0].text]};
        message.d.data.push(current);

        for(let x = 1; x < data_dl.length; x++) {
            if(data_dl[x].title == "") {
                current.text.push(data_dl[x].text);
            }
            else {
                current = {title: data_dl[x].title, text: [data_dl[x].text]};
                message.d.data.push(current);
            }
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);    
}

function sendDelete(type, id) {
    let message = {
        m: "D",
        d: {
            v: d.current_view,
            t: type,
            i: id,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendDeleteJoint(view, element_type, link_id, joint_index) {
    let message = {
        m: "D",
        d: {
            v: view,
            t: "joint",
            et: element_type,
            i: link_id,
            joint_index: joint_index,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function animate() {
    let needs_redraw = false;

    // Infobox
    if(d.dom.infobox_data.show && (d.dom.infobox_data.transparency < .05)) {
        DOM.show(d.dom.infobox);
        d.dom.infobox_data.transparency = .05;
        d.dom.infobox.style.opacity = d.dom.infobox_data.transparency;
        needs_redraw = true;
    }
    else if(d.dom.infobox_data.show && (d.dom.infobox_data.transparency < 1)) {
        d.dom.infobox_data.transparency += .05;
        d.dom.infobox.style.opacity = d.dom.infobox_data.transparency;
        needs_redraw = true;
    }
    else if((!d.dom.infobox_data.show) && (d.dom.infobox_data.transparency < .05)) {
        DOM.hide(d.dom.infobox);
        d.dom.infobox_data.transparency = 0;
    }
    else if((!d.dom.infobox_data.show) && (d.dom.infobox_data.transparency > 0)) {
        d.dom.infobox_data.transparency -= .05;
        d.dom.infobox.style.opacity = d.dom.infobox_data.transparency;
        needs_redraw = true;
    }

    // Animate DOM elements if needed
    for(toolboxname in d.dom.tools.toolboxes) {
        let toolbox = d.dom.tools.toolboxes[toolboxname];
        if((toolboxname != d.dom.tools.active_tb) && (toolbox.left > toolbox.init_left)) {
            needs_redraw = true;
            toolbox.left -= 8;
        }
    }
    for(toolboxname in d.dom.tools.toolboxes) {
        let toolbox = d.dom.tools.toolboxes[toolboxname];
        if(!needs_redraw && (toolboxname == d.dom.tools.active_tb) && (toolbox.left < 10)) {
            needs_redraw = true;
            toolbox.left += 8;            
        }
    }

    if(needs_redraw)
        position_elements(false);

    // Animate wgl if needed
    //d.wgl.draw();

    if(needs_redraw)
        requestAnimationFrame( animate );
}

/*
    This function will clear the contents of the infobox and will hide it
*/
function infobox_clear() {
    d.dom.infobox_data.show = false;
    animate();
}

function infobox_show(text) {
    DOM.removeChilds(d.dom.infobox, true);
    if(text.title) DOM.cdiv(d.dom.infobox, null, "box_info_title", text.title);
    if(text.content) text.content.forEach((p) => {
        if(p.type === "head")
            DOM.cdiv(d.dom.infobox, null, "box_info_subtitle", p.text);
        else if(p.type === "head2")
            DOM.cdiv(d.dom.infobox, null, "box_info_subtitle2", p.text);
        else if(p.type === "text")
            DOM.cdiv(d.dom.infobox, null, "box_info_text", p.text);
        else if(p.type === "text2")
            DOM.cdiv(d.dom.infobox, null, "box_info_text2", p.text);
    })
    d.dom.infobox_data.show = true;
    animate();
}

function infobox_show_element(obj) {
    if(obj.userData.e && (obj.userData.e.infobox_type === "d")) {
        infobox_show_element_data(obj);
        return;
    }
    if(obj.userData.type === "device")
        infobox_show_device(obj);
    else if(obj.userData.type === "link")
        infobox_show_link(obj);
    else if(obj.userData.type === "text")
        infobox_show({title: "Text"});
    else if(obj.userData.type === "symbol")
        infobox_show({title: "Symbol"});
    else if(obj.userData.type === "l2segment")
        infobox_show_l2segment(obj);
    else if(obj.userData.type === "l2link")
        infobox_show({title: "L2 Link"});
    else if(obj.userData.type === "vrf")
        infobox_show_vrf(obj);
    else if(obj.userData.type === "interface")
        infobox_show_interface(obj);
    else if(obj.userData.type === "p2p_interface")
        infobox_show_p2pinterface(obj);
    else if(obj.userData.type === "svi_interface")
        infobox_show_sviinterface(obj);
    else if(obj.userData.type === "bgp_peering")
        infobox_show_bgppeering(obj);
}

function infobox_show_element_data(obj) {
    if(obj.userData.e.data) {
        let infobox_data = {
            title: "Data",
            content: [],
        }

        obj.userData.e.data.forEach((entry) => {
            if(entry.title !== "")
                infobox_data.content.push({type: "head", text: entry.title});
            entry.text.forEach((text) => {
                infobox_data.content.push({type: "text", text: text});
            })
        })
        // Show the infobox
        infobox_show(infobox_data);
    }
}

function infobox_show_device(obj) {
    let infobox_data = {
        title: (obj.userData.e.name !== "") ? obj.userData.e.name : "Device",
        content: [],
    };
    // Add vlans to the infobox
    let hasvlan = false;
    for(let vlan_tag in obj.userData.e.vlans) {
        if(!hasvlan) {
            hasvlan = true;
            infobox_data.content.push({type: "head", text: "Vlans"});
        }
        infobox_data.content.push({type: "text", text: vlan_tag + ": " + obj.userData.e.vlans[vlan_tag].name});
    }
    // Add vrfs to the infobox
    let hasvrf = false;
    for(let rd in obj.userData.e.vrfs) {
        if(!hasvrf) {
            hasvrf = true;
            infobox_data.content.push({type: "head", text: "VRFs"});
        }
        infobox_data.content.push({type: "text", text: rd + ": " + obj.userData.e.vrfs[rd].name});
    }

    // Add links to the infobox
    let hasinterface = false;
    let linklist = d.wgl.findLinksOfDevice(obj.userData.id, d.wgl.scene.L2);
    for(let x = 0; x < linklist.length; x++) {
        // For each link:

        // Add Interfaces label if it hasn't been added
        if(!hasinterface) {
            hasinterface = true;
            infobox_data.content.push({type: "head", text: "Interfaces"});
        }

        // Find the index of the device (0 or 1) on this link
        let dev_index = 0;
        if(linklist[x].userData.e.devs[1].id === obj.userData.id)
            dev_index = 1;

        // Check if interface names have been defined
        if(linklist[x].userData.e.phy && linklist[x].userData.e.phy.ifbindings && (linklist[x].userData.e.phy.ifbindings.length > 0)) {
            // If they have been defined, go through each interface and add it to the infobox
            let po_data = "";
            if(linklist[x].userData.e.phy.ifbindings.length > 1)
                po_data = " (" + linklist[x].userData.e.phy.lag_name[dev_index] + ")";
            let function_data = "";
            if(linklist[x].userData.e.devs[dev_index].data.function === "switching")
                function_data = " (L2. Vlans: " + linklist[x].userData.e.devs[dev_index].data.function_data.vlans.join(",") + ")";
            else if(linklist[x].userData.e.devs[dev_index].data.function === "routing")
                function_data = " (L3)";

            for(let y = 0; y < linklist[x].userData.e.phy.ifbindings.length; y++) {
                infobox_data.content.push({type: "text", text: linklist[x].userData.e.phy.ifbindings[y][dev_index] + po_data + function_data});
            }
        }
        else {
            // If interface names haven't been defined, we show an unnamend interface
            let function_data = "";
            if(linklist[x].userData.e.devs[dev_index].data.function === "switching")
                function_data = " (L2. Vlans: " + linklist[x].userData.e.devs[dev_index].data.function_data.vlans.join(",") + ")";
            else if(linklist[x].userData.e.devs[dev_index].data.function === "routing")
                function_data = " (L3)";

            infobox_data.content.push({type: "text", text: "Unnamed" + function_data});
        }
    }
    // Add loopback and svi interfaces
    ["svis", "los"].forEach((iftype) => {
        hasinterface = false;
        for(let id in obj.userData.e[iftype]) {
            if(!hasinterface) {
                hasinterface = true;
                if(iftype === "los")
                    infobox_data.content.push({type: "head", text: "Loopbacks"});
                else
                    infobox_data.content.push({type: "head", text: "SVIs"});
            }
            infobox_data.content.push({type: "text", text: id + ": " + obj.userData.e[iftype][id].name + " (vrf " + obj.userData.e[iftype][id].vrf + ")"});
        }
    });

    // Show the infobox
    infobox_show(infobox_data);
}

function infobox_show_link(obj) {
    let infobox_data = {
        title: "Link",
        content: []
    };

    let dev0 = d.wgl.getMesh("L2", "device", obj.userData.e.devs[0].id);
    let dev1 = d.wgl.getMesh("L2", "device", obj.userData.e.devs[1].id);
    let devnames = ["Device 1", "Device 2"];
    if(dev0.userData.e.name !== "")
        devnames[0] = dev0.userData.e.name;
    if(dev1.userData.e.name !== "")
        devnames[1] = dev1.userData.e.name;
    infobox_data.title = devnames[0] + " <-> " + devnames[1];

    // Physical settings:
    if(obj.userData.e.phy) {
        if(obj.userData.e.phy.transceiver) {
            infobox_data.content.push({type: "head", text: "Link type."});
            infobox_data.content.push({type: "text", text: obj.userData.e.phy.transceiver});
        }

        if(obj.userData.e.phy.ifbindings && (obj.userData.e.phy.ifbindings.length > 0))
            for(let dev_index in devnames) {
                infobox_data.content.push({type: "head", text: devnames[dev_index] + " interfaces."});
                obj.userData.e.phy.ifbindings.forEach((ifset) => {
                    infobox_data.content.push({type: "text", text: ifset[dev_index]});
                });
            }
    }
    // Config settings
    for(let dev_index in devnames) {
        if(obj.userData.e.devs[dev_index].data.function === "switching") {
            infobox_data.content.push({type: "head", text: devnames[dev_index] + " is L2. VLANs:"});
            infobox_data.content.push({type: "text", text: obj.userData.e.devs[dev_index].data.function_data.vlans.join(",")});
        }
        else if(obj.userData.e.devs[dev_index].data.function === "routing") {
            infobox_data.content.push({type: "head", text: devnames[dev_index] + " is L3. Subinterfaces:"});
            for(let subifindex in obj.userData.e.devs[dev_index].data.function_data.subinterfaces) {
                let subif = obj.userData.e.devs[dev_index].data.function_data.subinterfaces[subifindex];
                if(subif.vlan_tag === "-1")
                    infobox_data.content.push({type: "text", text: "Untagged (vrf: " + subif.vrf + ")"});
                else
                    infobox_data.content.push({type: "text", text: subif.vlan_tag + " (vrf: " + subif.vrf + ")"});
            }
        }
    }
    infobox_show(infobox_data);
}

function infobox_show_vrf(obj) {
    let infobox_data = {
        title: "Vrf " + obj.userData.e.name,
        content: [{type: "head", text: "Interfaces"}]
    };

    let interfaces = d.wgl.findLinksOfVrf(obj.userData.id);

    // SVI Interfaces
    for(let id in interfaces.svi_interface) {
        let iface = interfaces.svi_interface[id].userData.e;
        let device = d.wgl.getMesh("L2", "device", iface.l2_reference.device_id);
        let name = device.userData.e.svis[iface.l2_reference.svi_id].name;
        let ipv4 = "";
        let ipv6 = "";
        if(iface.ip) {
            if(iface.ip.address.ipv4.length > 0)
                ipv4 = iface.ip.address.ipv4[0] + " ";
            if(iface.ip.address.ipv6.length > 0)
                ipv6 = iface.ip.address.ipv6[0] + " ";
        }
        infobox_data.content.push({type: "text", text: name + " " + ipv4 + ipv6});
    }

    // Interfaces
    for(let id in interfaces.interface) {
        let iface = interfaces.interface[id].userData.e;
        let link = d.wgl.getMesh("L2", "link", iface.l2_reference.link_id);
        let dev_index = 0;
        if(link.userData.e.devs[1].data.function == "routing")
            dev_index = 1;
        let name = "unnamed";
        if(link.userData.e.phy) {
            if(link.userData.e.phy.ifbindings.length > 1)
                name = link.userData.e.phy.lag_name[dev_index];
            else if(link.userData.e.phy.ifbindings.length == 1)
                name = link.userData.e.phy.ifbindings[0][dev_index];
        }
        name += (iface.l2_reference.vlan_tag !== "-1") ? "." + iface.l2_reference.vlan_tag : "";

        let ipv4 = "";
        let ipv6 = "";
        if(iface.ip) {
            if(iface.ip.address.ipv4.length > 0)
                ipv4 = iface.ip.address.ipv4[0] + " ";
            if(iface.ip.address.ipv6.length > 0)
                ipv6 = iface.ip.address.ipv6[0] + " ";
        }
        infobox_data.content.push({type: "text", text: name + " " + ipv4 + ipv6});
    }

    // P2P Interfaces
    for(let id in interfaces.p2p_interface) {
        let iface = interfaces.p2p_interface[id].userData.e;
        let link = d.wgl.getMesh("L2", "link", iface.l2_reference.link_id);
        let dev_index = 0;
        if(link.userData.e.devs[1].id === obj.userData.e.l2_reference.device_id)
            dev_index = 1;
        let name = "unnamed";
        if(link.userData.e.phy) {
            if(link.userData.e.phy.ifbindings.length > 1)
                name = link.userData.e.phy.lag_name[dev_index];
            else if(link.userData.e.phy.ifbindings.length == 1)
                name = link.userData.e.phy.ifbindings[0][dev_index];
        }
        name += (iface.l2_reference.vlan_tag !== "-1") ? "." + iface.l2_reference.vlan_tag : "";

        let ipv4 = "";
        let ipv6 = "";
        if(iface.ip) {
            if(iface.ip[dev_index].address.ipv4.length > 0)
                ipv4 = iface.ip[dev_index].address.ipv4[0] + " ";
            if(iface.ip[dev_index].address.ipv6.length > 0)
                ipv6 = iface.ip[dev_index].address.ipv6[0] + " ";
        }
        infobox_data.content.push({type: "text", text: name + " " + ipv4 + ipv6});
    }

    // Loopbacks
    if("los" in obj.userData.e)
        for(let name in obj.userData.e.los) {
            let ipv4 = "";
            let ipv6 = "";
            if(obj.userData.e.los[name].ipv4.length > 0)
                ipv4 = obj.userData.e.los[name].ipv4[0];
            if(obj.userData.e.los[name].ipv6.length > 0)
                ipv6 = obj.userData.e.los[name].ipv6[0];
            infobox_data.content.push({type: "text", text: name + " " + ipv4 + ipv6});
        }
    infobox_show(infobox_data);
}

function infobox_show_interface(obj) {
    let infobox_data = {
        title: "Interface",
        content: []
    };

    let link = d.wgl.getMesh("L2", "link", obj.userData.e.l2_reference.link_id);
    let dev_index  = 0;
    if(link.userData.e.devs[1].data.function === "routing")
        dev_index = 1;

    let device = d.wgl.getMesh("L2", "device", link.userData.e.devs[dev_index].id);
    let name = "unnamed";
    if(link.userData.e.phy) {
        if(link.userData.e.phy.ifbindings.length > 1)
            name = link.userData.e.phy.lag_name[dev_index];
        else if(link.userData.e.phy.ifbindings.length == 1)
            name = link.userData.e.phy.ifbindings[0][dev_index];
    }
    name += (obj.userData.e.l2_reference.vlan_tag !== "-1") ? "." + obj.userData.e.l2_reference.vlan_tag : "";

    infobox_data.title = device.userData.e.name + " " + name;

    if(obj.userData.e.ip) {
        if(obj.userData.e.ip.address.ipv4.length > 0) {
            infobox_data.content.push({type: "head", text: "IPv4"});
            obj.userData.e.ip.address.ipv4.forEach((ip) => {infobox_data.content.push({type: "text", text: ip})});
        }
        if(obj.userData.e.ip.address.ipv6.length > 0) {
            infobox_data.content.push({type: "head", text: "IPv6"});
            obj.userData.e.ip.address.ipv6.forEach((ip) => {infobox_data.content.push({type: "text", text: ip})});
        }
    }

    infobox_show(infobox_data);
}

function infobox_show_sviinterface(obj) {
    let infobox_data = {
        title: "SVI Interface",
        content: []
    };

    let device = d.wgl.getMesh("L2", "device", obj.userData.e.l2_reference.device_id);
    let name = device.userData.e.svis[obj.userData.e.l2_reference.svi_id].name;

    infobox_data.title = device.userData.e.name + " " + name;
    
    if(obj.userData.e.ip) {
        if(obj.userData.e.ip.address.ipv4.length > 0) {
            infobox_data.content.push({type: "head", text: "IPv4"});
            obj.userData.e.ip.address.ipv4.forEach((ip) => {infobox_data.content.push({type: "text", text: ip})});
        }
        if(obj.userData.e.ip.address.ipv6.length > 0) {
            infobox_data.content.push({type: "head", text: "IPv6"});
            obj.userData.e.ip.address.ipv6.forEach((ip) => {infobox_data.content.push({type: "text", text: ip})});
        }
    }

    infobox_show(infobox_data);
}

function infobox_show_p2pinterface(obj) {
    let infobox_data = {
        title: "P2P Interface",
        content: []
    };

    let link = d.wgl.getMesh("L2", "link", obj.userData.e.l2_reference.link_id);

    for(let dev_index = 0; dev_index < 2; dev_index++) {
        let device = d.wgl.getMesh("L2", "device", link.userData.e.devs[dev_index].id);

        let name = "unnamed";
        if(link.userData.e.phy) {
            if(link.userData.e.phy.ifbindings.length > 1)
                name = link.userData.e.phy.lag_name[dev_index];
            else if(link.userData.e.phy.ifbindings.length == 1)
                name = link.userData.e.phy.ifbindings[0][dev_index];
        }
        name += (obj.userData.e.l2_reference.vlan_tag !== "-1") ? "." + obj.userData.e.l2_reference.vlan_tag : "";

        infobox_data.content.push({type: "head", text: device.userData.e.name + " " + name});
        if(obj.userData.e.ip) {
            if(obj.userData.e.ip[dev_index].address.ipv4.length > 0) {
                infobox_data.content.push({type: "head2", text: "IPv4"});
                obj.userData.e.ip[dev_index].address.ipv4.forEach((ip) => {infobox_data.content.push({type: "text2", text: ip})});
            }
            if(obj.userData.e.ip[dev_index].address.ipv6.length > 0) {
                infobox_data.content.push({type: "head2", text: "IPv6"});
                obj.userData.e.ip[dev_index].address.ipv6.forEach((ip) => {infobox_data.content.push({type: "text2", text: ip})});
            }
        }
    }

    infobox_show(infobox_data);
}

function infobox_show_l2segment(obj) {
    let device = d.wgl.getMesh("L2", "device", obj.userData.e.l2_reference.device_id);

    let interfaces = d.wgl.findLinksOfVrf(obj.userData.id);

    let infobox_data = {
        title: device.userData.e.vlans[obj.userData.e.l2_reference.vlan_id].name + " @ " + device.userData.e.name,
        content: [],
    };

    infobox_show(infobox_data);
}

function infobox_show_bgppeering(obj) {
    // BGP Peering VRFs and IPs
    let e = obj.userData.e;
    let vrf1, vrf2;
    vrf1 = d.wgl.getMesh("L3", "vrf", e.l3_reference.src_vrf_id).userData.e;
    vrf2 = d.wgl.getMesh("L3", "vrf", e.l3_reference.dst_vrf_id).userData.e;

    let infobox_data = {
        content: [],
    };

    if(vrf1.routing && vrf2.routing) {
        if(vrf1.routing.asn === vrf2.routing.asn)
            infobox_data.title = "IBGP Peering";
        else
            infobox_data.title = "EBGP Peering";
    }
    else
        infobox_data.title = "BGP Peering.";

    infobox_data.content.push({type: "head2", text: "Vrf " + vrf1.name});
    if(vrf1.routing && vrf1.routing.asn)
        infobox_data.content.push({type: "text", text: e.src_ip + " (ASN: " + vrf1.routing.asn + ")"});
    else
        infobox_data.content.push({type: "text", text: e.src_ip});


    infobox_data.content.push({type: "head2", text: "Vrf " + vrf2.name});
    if(vrf2.routing && vrf2.routing.asn)
        infobox_data.content.push({type: "text", text: e.dst_ip + " (ASN: " + vrf2.routing.asn + ")"});
    else
        infobox_data.content.push({type: "text", text: e.dst_ip});

    // AFI/SAFI
    infobox_data.content.push({type: "head2", text: "AFI/SAFI"});
    e.afisafi.forEach((af) => {
        infobox_data.content.push({type: "text", text: af});
    })
    infobox_show(infobox_data);
}

function setBoxPosition(e, px, py, sx, sy) {
    e.style.left = "" + px + "px";
    e.style.top = "" + py + "px";
    if(sx) e.style.width = "" + sx + "px";
    if(sy) e.style.height = "" + sy + "px";
}

function setBoxPositionRight(e, px, py, sx, sy) {
    e.style.right = "" + px + "px";
    e.style.top = "" + py + "px";
    if(sx) e.style.width = "" + sx + "px";
    if(sy) e.style.height = "" + sy + "px";
}

function position_elements(wglneeded=true) {
    let sx = window.innerWidth;
    let sy = window.innerHeight;

    // Home button
    setBoxPosition(d.dom.home, sx-42, 10, 32, 32);
    // Camera type button
    setBoxPosition(d.dom.cam_type, sx-90, 10, 32, 32);
    // Global Settings button
    setBoxPosition(d.dom.global_settings, sx-138, 10, 32, 32);
    
    // Tool buttons
    setBoxPosition(d.dom.tool_camera_b,     10+48*0, 10, 32, 32);
    if(d.permission !== "RO") {
        setBoxPosition(d.dom.tool_element_b,    10+48*1, 10, 32, 32);
        setBoxPosition(d.dom.tool_new_b,        10+48*2, 10, 32, 32);
    }

    // Tools
    for(toolboxname in d.dom.tools.toolboxes) {
        let toolbox = d.dom.tools.toolboxes[toolboxname];
        setBoxPosition(toolbox.dom, toolbox.left, 64, toolbox.width);
    }

    // The diagram page
    setBoxPosition(d.dom.page, 4, 4, sx-8, sy-24);

    // Tabs of the diagram including title
    setBoxPosition(d.dom.tab_l2, 6, sy-20, 100, 16);
    setBoxPosition(d.dom.tab_l3, 110, sy-20, 100, 16);
    setBoxPosition(d.dom.title, sx-208, sy-36, 200, 16);

    // Info box
    setBoxPositionRight(d.dom.infobox, 10, 60);
    //infobox_clear();

    // Redraw webgl
    if(wglneeded)
        d.wgl.resize();
}

function toolbox_activatetool(tool) {
    for(toolboxname in d.dom.tools.toolboxes) {
        let toolbox = d.dom.tools.toolboxes[toolboxname];
        for(let x = 0; x < toolbox.components.length; x++) {
            let tool = toolbox.components[x];
            if(tool.dom.getAttribute("data-newtoolbox") == "")
                tool.dom.className = "tool";
        }
    }

    let code = tool.getAttribute("data-code");
    if(code === "FW")
        WIN_showFormatSettingsColor(d.wgl.global_settings.format, (win) => { d.wgl.updateFormatSettingsColor(win) });
    else if(code === "FT")
        WIN_showFormatSettingsText(d.wgl.global_settings.format, (win) => { d.wgl.updateFormatSettingsText(win) });
    else if(code === "FL")
        WIN_showFormatSettingsLink(d.wgl.global_settings.format, (win) => { d.wgl.updateFormatSettingsLink(win) });
    else {
        tool.className += " tool-active";
        d.dom.tools.active_t = code;
    }
}

function toolbox_click() {
    let newtoolbox = this.getAttribute("data-newtoolbox");

    if(newtoolbox != "") {
        d.dom.tools.active_tb = newtoolbox;
    }
    else {
        toolbox_activatetool(this);
    }

    animate();
}

function toggle_cam_type() {
    let current_cam = d.wgl.toggleCamera();
    let camdiv = document.getElementById("camtype");
    if(current_cam === "persp") {
        camdiv.setAttribute("data-camtype", "3D");
        camdiv.src = staticurl + "/static/img/cam3d.png"
    }
    else {
        camdiv.setAttribute("data-camtype", "2D");
        camdiv.src = staticurl + "/static/img/cam2d.png"
    }
}

function set_current_view(view) {
    if(view == "L2") {
        d.dom.tab_l2.className = "box tab_s";
        d.dom.tab_l3.className = "box tab";
    }
    else if (view == "L3") {
        d.dom.tab_l2.className = "box tab";
        d.dom.tab_l3.className = "box tab_s";
    }
    else
        return;

    d.wgl.setView(view);
    d.current_view = view;

}
function init_wgl() {
    WGL_initialize();

    // Create the object.
    d.wgl = new WGL(d.dom.page);
    d.wgl.setView("L2");
}

function init_diagram() {
    // Background
    d.wgl.setBGColor(d.diagram.settings.bg_color);
    // ********************************
    // Draw the L2 diagram
    // ********************************
    for(let id in d.diagram.L2.base) {
        let e = d.diagram.L2.base[id];
        if(e.type == "F")
            d.wgl.addCubeFloor(id, "L2", e);
    }
    for(let id in d.diagram.L2.device) {
        let e = d.diagram.L2.device[id];
        d.wgl.addDevice("device", id, "L2", e);
    }

    for(let id in d.diagram.L2.link) {
        let e = d.diagram.L2.link[id];
        d.wgl.addLink("link", id, "L2", e);
    }

    for(let id in d.diagram.L2.text) {
        let e = d.diagram.L2.text[id];
        d.wgl.addText(id, "L2", e);
    }

    for(let id in d.diagram.L2.symbol) {
        let e = d.diagram.L2.symbol[id];
        d.wgl.addSymbol(id, "L2", e);
    }

    // ********************************
    // Draw the L3 diagram
    // ********************************
    for(let id in d.diagram.L3.base) {
        let e = d.diagram.L3.base[id];
        if(e.type == "F")
            d.wgl.addCubeFloor(id, "L3", e);
    }
    for(let id in d.diagram.L3.vrf) {
        let e = d.diagram.L3.vrf[id];
        d.wgl.addDevice("vrf", id, "L3", e);
    }
    for(let id in d.diagram.L3.l2segment) {
        let e = d.diagram.L3.l2segment[id];
        d.wgl.addL2Segment(id, e);
    }
    for(let id in d.diagram.L3.l2link) {
        let e = d.diagram.L3.l2link[id];
        d.wgl.addLink("l2link", id, "L3", e);
    }
    for(let id in d.diagram.L3.p2p_interface) {
        let e = d.diagram.L3.p2p_interface[id];
        d.wgl.addLink("p2p_interface", id, "L3", e);
    }
    for(let id in d.diagram.L3.svi_interface) {
        let e = d.diagram.L3.svi_interface[id];
        d.wgl.addLink("svi_interface", id, "L3", e);
    }
    for(let id in d.diagram.L3.interface) {
        let e = d.diagram.L3.interface[id];
        d.wgl.addLink("interface", id, "L3", e);
    }
    for(let id in d.diagram.L3.bgp_peering) {
        let e = d.diagram.L3.bgp_peering[id];
        d.wgl.addBGPArrow(id, e);
    }
    for(let id in d.diagram.L3.text) {
        let e = d.diagram.L3.text[id];
        d.wgl.addText(id, "L3", e);
    }
    for(let id in d.diagram.L3.symbol) {
        let e = d.diagram.L3.symbol[id];
        d.wgl.addSymbol(id, "L3", e);
    }
}

function init_window_addtool(toolbox, tooldesc, isactive = false) {
    let tool;
    let imgname = tooldesc.i;
    let newtoolbox = tooldesc.f;
    let name = tooldesc.n;

    if(newtoolbox) {
        tool = DOM.cdiv(toolbox, null, "tool tool-menu");
        tool.setAttribute("data-newtoolbox", newtoolbox);
    }
    else {
        tool = DOM.cdiv(toolbox, null, "tool");
        if(isactive)
            tool.className += " tool-active";        
        tool.setAttribute("data-newtoolbox", "");
    }

    if("d" in tooldesc) {
        WIN_addBasicMouseDescriptionActions(tool, tooldesc.d);
    }

    tool.setAttribute("data-code", tooldesc.s)

    DOM.cimg(tool, staticurl + "/static/img/" + imgname, null, "toolimg");
    DOM.cdiv(tool, null, "tooltext", name);

    tool.addEventListener("click", toolbox_click);
    
    return tool
}

function mousedown(x, y, dx, dy, dom_element) {
    // Make focus element lose focus 
    let f_el = document.querySelector( ':focus' );
    if( f_el ) f_el.blur();
    
    let objlist = d.wgl.pickObject(x, y);
    let pos, v;

    d.mouseaction = {
        m: "INVALID"
    }

    if(
        (
            (d.dom.tools.active_t === "CM") || 
            (d.dom.tools.active_t === "CR") || 
            (d.dom.tools.active_t === "CZ")
        )
        ) {
            d.mouseaction = {
                m: d.dom.tools.active_t,
            };
    }
    else if(d.permission === "RO") {
        // Do nothings
    }
    else if (d.dom.tools.active_t === "ABF") {
        // Add Floor
        let p = d.wgl.pickLevel(x, y, 0);
        if(p) {
            d.mouseaction = {
                m: "ABF",
                mesh: d.wgl.addCubeFloor("CURSOR", d.current_view, createDefaultBaseFloor(p.x, p.y, p.z))
            }
        }
    }
    else if (d.dom.tools.active_t.startsWith("AD") && (d.current_view === "L2")) {
        // Add a device
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", objlist[x].mesh.userData.id, 
                    objlist[x].p.x, objlist[x].p.y, objlist[x].p.z);
                d.mouseaction = {
                    m: d.dom.tools.active_t,
                    mesh: d.wgl.addDevice("device", "CURSOR", d.current_view, createDefaultDevice(
                        newcoords.x, newcoords.y, newcoords.z, 
                        d.dom.tools.active_t.substring(2),
                        objlist[x].mesh.userData.id
                    ), true)
                }
                break;
            }
        }
    }
    else if (d.dom.tools.active_t.startsWith("AL") && (d.current_view === "L2")) {
        // Add a link
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "device") {
                let newcoords = d.wgl.convertMesh2WorldCoordinates(d.current_view, "device", objlist[x].mesh.userData.id, 0,0,0);
                //let parent = objlist[x].mesh.parent;
                d.mouseaction = {
                    m: d.dom.tools.active_t,
                    dev1_id: objlist[x].mesh.userData.id,
                    cursor: d.wgl.addLine("CURSOR", "L2", {
                        x1: newcoords.x,
                        y1: newcoords.y + .25,
                        z1: newcoords.z, 
                        x2: objlist[x].p.x,
                        y2: objlist[x].p.y,
                        z2: objlist[x].p.z, 
                        color: 0x888888, radius:.05
                      }),
                }
            }
        }
    }
    else if ((d.dom.tools.active_t === "ARB") && (d.current_view === "L3")) {
        // Add a BGP Peer
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "vrf") {
                let newcoords = d.wgl.convertMesh2WorldCoordinates(d.current_view, "vrf", objlist[x].mesh.userData.id, 0,0,0);
                //let parent = objlist[x].mesh.parent;
                d.mouseaction = {
                    m: d.dom.tools.active_t,
                    dev1_id: objlist[x].mesh.userData.id,
                    cursor: d.wgl.addLine("CURSOR", d.current_view, {
                        x1: newcoords.x,
                        y1: newcoords.y + .25,
                        z1: newcoords.z, 
                        x2: objlist[x].p.x,
                        y2: objlist[x].p.y,
                        z2: objlist[x].p.z, 
                        color: 0x888888, radius:.05
                      }),
                }
            }
        }
    }
    else if (d.dom.tools.active_t === "AJ") {
        // Add Joint
        for(let x = 0; x < objlist.length; x++) {
            if (["link", "l2link", "interface", "svi_interface", "p2p_interface"].indexOf(objlist[x].mesh.userData.type) !== -1) {
                if((objlist[x].mesh.userData.subtype === "segment") && (objlist[x].mesh.userData.e.type == 0)) {
                    d.mouseaction = {
                        m: d.dom.tools.active_t,
                        element_type: objlist[x].mesh.userData.type,
                        link_id: objlist[x].mesh.userData.id,
                        joint_index: objlist[x].mesh.userData.index,
                        px: objlist[x].p.x,
                        py: objlist[x].p.y,
                        pz: objlist[x].p.z,
                    }
                }
            }
        }
    }
    else if (d.dom.tools.active_t.startsWith("AT")) {
        // Add a text
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", objlist[x].mesh.userData.id, 
                    objlist[x].p.x, objlist[x].p.y, objlist[x].p.z);
                d.mouseaction = {
                    m: d.dom.tools.active_t,
                    mesh: d.wgl.addText("CURSOR", d.current_view, createDefaultText(
                        newcoords.x, newcoords.z, 
                        d.dom.tools.active_t.substring(2),
                        objlist[x].mesh.userData.id
                    ), true)
                }
                break;
            }
        }
    }    
    else if (d.dom.tools.active_t.startsWith("AS")) {
        // Add a symbol
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", objlist[x].mesh.userData.id, 
                    objlist[x].p.x, objlist[x].p.y, objlist[x].p.z);
                let symboltype = d.dom.tools.active_t.substring(2);
                d.mouseaction = {
                    m: d.dom.tools.active_t,
                    mesh: d.wgl.addSymbol("CURSOR", d.current_view, createDefaultSymbol(
                        symboltype,
                        newcoords.x, newcoords.y, newcoords.z, 
                        objlist[x].mesh.userData.id
                    ), true)
                }
                break;
            }
        }
    }
    else if (d.dom.tools.active_t === "BM") {
        // Move base
        if((objlist.length > 0) && (objlist[0].mesh.userData.type == "base")) {
            pos = d.wgl.getMeshPosition(d.current_view, "base", objlist[0].mesh.userData.id)
            d.mouseaction = {
                m: "BM",
                id: objlist[0].mesh.userData.id,
                diffx: objlist[0].p.x - pos.x,
                diffy: objlist[0].p.y - pos.y,
                diffz: objlist[0].p.z - pos.z,
                level: objlist[0].p.y,
            }
        }
    }
    else if (d.dom.tools.active_t === "EM") {
        // Move Element
        if((objlist.length > 0) && (["device", "symbol", "text", "vrf", "l2segment"].indexOf(objlist[0].mesh.userData.type) !== -1)) {
            d.mouseaction = {
                m: "EM",
                type: objlist[0].mesh.userData.type,
                mesh: objlist[0].mesh.userData.id,
            }
        }
        else if((objlist.length > 0) && (objlist[0].mesh.userData.type === "bgp_peering")) {
            d.mouseaction = {
                m: "EM",
                type: objlist[0].mesh.userData.type,
                mesh: objlist[0].mesh.userData.id,
                curve_x: objlist[0].mesh.userData.e.curve_x,
                curve_y: objlist[0].mesh.userData.e.curve_y,
                mouse_px: x,
                mouse_py: y,
            }
            console.log(objlist[0].mesh.userData.e.px)
        }
        else if((objlist.length > 0) && (["link", "l2link", "interface", "svi_interface", "p2p_interface"].indexOf(objlist[0].mesh.userData.type) !== -1) && 
                (objlist[0].mesh.userData.e.type === 0)) {
            let mesh = d.wgl.getMesh(d.current_view, objlist[0].mesh.userData.type, objlist[0].mesh.userData.id);

            // Find the closest point (if none, nothing has to be done)
            let point_index = d.wgl.findClosestLinkJointIndex(d.current_view, objlist[0].mesh.userData.type, objlist[0].mesh.userData.id, 
                objlist[0].p.x, objlist[0].p.y, objlist[0].p.z);

            if (point_index != -1) {
                d.mouseaction = {
                    m: "EM",
                    mesh: objlist[0].mesh.userData.id,
                    joint_index: point_index,
                    type: "joint",
                    element_type: objlist[0].mesh.userData.type,
                }
            }
        }
    }
    else if (d.dom.tools.active_t === "EMV") {
        // Move Element
        if((objlist.length > 0) && (["symbol", "device", "vrf", "l2segment"].indexOf(objlist[0].mesh.userData.type) !== -1)) {
            let mesh = d.wgl.getMesh(d.current_view, objlist[0].mesh.userData.type, objlist[0].mesh.userData.id);
            d.mouseaction = {
                m: "EMV",
                mesh: mesh,
                base_y: mesh.position.y,
                py: y,
            }
        }
    }
    else if (d.dom.tools.active_t === "BR") {
        // Rotate base
        if((objlist.length > 0) && (objlist[0].mesh.userData.type === "base")) {
            v = d.wgl.getMeshRotation(d.current_view, "base", objlist[0].mesh.userData.id)
            d.mouseaction = {
                m: "BR",
                id: objlist[0].mesh.userData.id,
                rx: v.x, ry: v.y, rz: v.z
            }
        }
    }
    else if (d.dom.tools.active_t === "ER") {
        // Rotate element
        if((objlist.length > 0) && (
                (objlist[0].mesh.userData.type === "device") || 
                (objlist[0].mesh.userData.type === "text") || 
                (objlist[0].mesh.userData.type === "symbol") ||
                (objlist[0].mesh.userData.type === "vrf") ||
                (objlist[0].mesh.userData.type === "l2segment")
                    ))  {
            v = d.wgl.getMeshRotation(d.current_view, objlist[0].mesh.userData.type, objlist[0].mesh.userData.id)
            d.mouseaction = {
                m: "ER",
                id: objlist[0].mesh.userData.id,
                type: objlist[0].mesh.userData.type,
                rx: v.x, ry: v.y, rz: v.z
            }
            if(objlist[0].mesh.userData.type === "symbol")
                d.mouseaction.subtype = objlist[0].mesh.userData.e.type;            
        }
    }
    else if (d.dom.tools.active_t  === "BX") {
        // Scale base
        if((objlist.length > 0) && (objlist[0].mesh.userData.type === "base")) {
            d.mouseaction = {
                m: "BX",
                id: objlist[0].mesh.userData.id,
                y: objlist[0].p.y,
            }
        }
    }
    else if (d.dom.tools.active_t  === "EX") {
        // Scale element
        if(
            (objlist.length > 0) && (
                (objlist[0].mesh.userData.type === "device") ||
                (objlist[0].mesh.userData.type === "symbol") ||
                (objlist[0].mesh.userData.type === "l2segment") ||
                (objlist[0].mesh.userData.type === "vrf")
            )) {
            d.mouseaction = {
                m: "EX",
                id: objlist[0].mesh.userData.id,
                type: objlist[0].mesh.userData.type,
                y: d.wgl.getMesh(d.current_view, objlist[0].mesh.userData.type, objlist[0].mesh.userData.id).parent.userData.e.sy,
            }
            if(objlist[0].mesh.userData.type === "symbol")
                d.mouseaction.subtype = objlist[0].mesh.userData.e.type;
        }
    }

    else if (
            (d.dom.tools.active_t === "BD") || 
            (d.dom.tools.active_t === "BC")
        ) {
        // Base Delete and settings action
        if((objlist.length > 0) && (objlist[0].mesh.userData.type === "base")) {
            d.mouseaction = {
                m: d.dom.tools.active_t,
                obj: objlist[0],
                x: x,
                y: y,
            }
        }
    }
    else if (
        (
            (d.dom.tools.active_t === "ED") ||
            (d.dom.tools.active_t === "EC") ||
            (d.dom.tools.active_t === "EI")
        ) && (d.current_view === "L2")
        ) {
        // L2 Element Delete, settings, config
        if( (objlist.length > 0) && ((objlist[0].mesh.userData.type === "device") || 
                                     (objlist[0].mesh.userData.type === "link") ||
                                     (objlist[0].mesh.userData.type === "symbol") ||
                                     (objlist[0].mesh.userData.type === "text")
                                     )) {
            d.mouseaction = {
                m: d.dom.tools.active_t,
                obj: objlist[0],
                x: x,
                y: y,
                view: "L2",
            }
        }
        else if((objlist.length == 0) && (d.dom.tools.active_t === "EC")) {
            d.mouseaction = {
                m: d.dom.tools.active_t,
                obj: null,
                x: x,
                y: y,
                view: "L2",
            }
        }
    }
    else if (
        (
            (d.dom.tools.active_t === "ED") ||
            (d.dom.tools.active_t === "EC") ||
            (d.dom.tools.active_t === "EI")
        ) && (d.current_view === "L3")
        ) {
        // L3 Element Delete, settings
        if( (objlist.length > 0) && ((objlist[0].mesh.userData.type === "symbol") || 
                                     (objlist[0].mesh.userData.type === "text") ||
                                     (objlist[0].mesh.userData.type === "vrf") ||
                                     (objlist[0].mesh.userData.type === "l2segment") ||
                                     (objlist[0].mesh.userData.type === "l2link") ||
                                     (objlist[0].mesh.userData.type === "interface") ||
                                     (objlist[0].mesh.userData.type === "p2p_interface") ||
                                     (objlist[0].mesh.userData.type === "svi_interface") ||
                                     (objlist[0].mesh.userData.type === "bgp_peering")
                                     )) {
            d.mouseaction = {
                m: d.dom.tools.active_t,
                obj: objlist[0],
                x: x,
                y: y,
                view: "L3",
            }
        }
    }
    else if(
            (d.dom.tools.active_t === "EDT") && 
            (objlist.length > 0) &&
            (
                (objlist[0].mesh.userData.type === "symbol") || 
                (objlist[0].mesh.userData.type === "text") ||
                (objlist[0].mesh.userData.type === "vrf") ||
                (objlist[0].mesh.userData.type === "l2segment") ||
                (objlist[0].mesh.userData.type === "l2link") ||
                (objlist[0].mesh.userData.type === "interface") ||
                (objlist[0].mesh.userData.type === "p2p_interface") ||
                (objlist[0].mesh.userData.type === "svi_interface") ||
                (objlist[0].mesh.userData.type === "device") ||
                (objlist[0].mesh.userData.type === "link") ||
                (objlist[0].mesh.userData.type === "base")
            )) {
        d.mouseaction = {
            m: d.dom.tools.active_t,
            obj: objlist[0],
            x: x,
            y: y,
        }        
    }
    else if ((objlist.length > 0) && ((d.dom.tools.active_t === "FC") || (d.dom.tools.active_t === "FP"))) {
        d.mouseaction = {
            m: d.dom.tools.active_t,
            obj: objlist[0],
            x: x,
            y: y,
        }        
    }
}

function mouseup(x, y, dx, dy, dom_element) {
    let objlist = d.wgl.pickObject(x, y);
    let pos;
    let a = d.mouseaction;

    d.mouseaction = {
        m: "INVALID"
    }

    if(d.dom.tools.active_t != a.m)
        return;

    if(d.dom.tools.active_t === "ABF") {
        let mesh = d.wgl.getMesh(d.current_view, "base", "CURSOR");
        sendAdd_BaseFloor("F", mesh.position.x, mesh.position.y, mesh.position.z, 
                          mesh.userData.e.sx, mesh.userData.e.sy, mesh.userData.e.sz, 
                          mesh.userData.e.rx, mesh.userData.e.ry, mesh.userData.e.rz);
        d.wgl.deleteMesh(d.current_view, "base", "CURSOR");
    }
    else if (d.dom.tools.active_t.startsWith("AD")) {
        let mesh = d.wgl.getMesh(d.current_view, "device", "CURSOR");
        sendAdd_Device(mesh.userData.e.type, 
            mesh.userData.e.px, mesh.userData.e.py, mesh.userData.e.pz, 
            mesh.userData.e.sx, mesh.userData.e.sy, mesh.userData.e.sz, 
            mesh.userData.e.rx, mesh.userData.e.ry, mesh.userData.e.rz,
            mesh.userData.e.color1, mesh.userData.e.color2,
            mesh.userData.e.base 
            );
        d.wgl.deleteMesh(d.current_view, "device", "CURSOR");
    }
    else if (d.dom.tools.active_t.startsWith("AL")) {
        d.wgl.deleteMesh(d.current_view, "line", "CURSOR");

        // Add a link
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "device") {
                let dev2_id = objlist[0].mesh.userData.id;
                
                let type = 0;
                if(d.dom.tools.active_t[2] === "S")
                    type = 1;

                if (a.dev1_id != dev2_id) {
                    sendAdd_Link(type, a.dev1_id, dev2_id);
                }
                break;
            }
        }
    }
    else if (d.dom.tools.active_t === "ARB") {
        d.wgl.deleteMesh(d.current_view, "line", "CURSOR");

        // Add a bgp peer
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "vrf") {
                let dev2_id = objlist[0].mesh.userData.id;
                
                if (a.dev1_id != dev2_id) {
                    let data = d.wgl.findBGPPeerData(a.dev1_id, dev2_id);
                    sendAdd_BGPPeering(data);
                }
                break;
            }
        }
    }
    else if (d.dom.tools.active_t === "AJ") {
        sendAdd_Joint(a.element_type, a.link_id, a.joint_index, a.px, a.py, a.pz);
    }
    else if (d.dom.tools.active_t.startsWith("AT")) {
        let mesh = d.wgl.getMesh(d.current_view, "text", "CURSOR");
        sendAdd_Text(mesh.userData.e);
        d.wgl.deleteMesh(d.current_view, "text", "CURSOR");
        d.expecting_text_added = true;   // Flag set to know that when we receive a message to add text, we have to open the settings window.
    }
    else if (d.dom.tools.active_t.startsWith("AS")) {
        let mesh = d.wgl.getMesh(d.current_view, "symbol", "CURSOR");
        sendAdd_Symbol(mesh.userData.e.type, 
            mesh.userData.e.px, mesh.userData.e.py, mesh.userData.e.pz, 
            mesh.userData.e.sx, mesh.userData.e.sy, mesh.userData.e.sz, 
            mesh.userData.e.rx, mesh.userData.e.ry, mesh.userData.e.rz,
            mesh.userData.e.color, mesh.userData.e.cd,
            mesh.userData.e.base 
            );
        d.wgl.deleteMesh(d.current_view, "symbol", "CURSOR");
    }
    else if(d.dom.tools.active_t === "BM") {
        sendMove(d.current_view, "base", a.id);
    }
    else if(d.dom.tools.active_t === "EM") {
        if((a.type === "device") || (a.type === "text") || (a.type === "symbol") || (a.type === "l2segment") || (a.type === "vrf")) {
            sendMove(d.current_view, a.type, a.mesh);
        }
        else if(a.type === "bgp_peering") {
            let m = d.wgl.getMesh(d.current_view, a.type, a.mesh);
            sendMoveBGPPeer(a.mesh, m.userData.e.curve_x, m.userData.e.curve_y);
        }
        else if(a.type === "joint") {
            let m = d.wgl.getMesh(d.current_view, a.element_type, a.mesh)
            sendMoveJoint(d.current_view, a.element_type, a.mesh, a.joint_index, m.userData.e.linedata.points[a.joint_index]);
        }
    }    
    else if(d.dom.tools.active_t === "EMV") {
        sendMove(d.current_view, a.mesh.userData.type, a.mesh.userData.id);
    }    
    else if(d.dom.tools.active_t === "BR") {
        sendRotate(d.current_view, "base", a.id);
    }
    else if(d.dom.tools.active_t === "ER") {
        sendRotate(d.current_view, a.type, a.id);
    }
    else if(d.dom.tools.active_t === "BX") {
        sendResize(d.current_view, "base", a.id);
    }
    else if(d.dom.tools.active_t === "EX") {
        sendResize(d.current_view, a.type, a.id);
    }
    else if(d.dom.tools.active_t === "BC") {
        if ((x == a.x) && (y == a.y)) {
            if(d.current_view === "L2")
                WIN_showBaseElementWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_BaseFloor("L2", "base", a.obj.mesh.userData.id, windata)
                    });
            else if(d.current_view === "L3")
                WIN_showBaseElementWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_BaseFloor("L3", "base", a.obj.mesh.userData.id, windata)
                    });
        }
    }
    else if(d.dom.tools.active_t === "EC") {
        if ((x == a.x) && (y == a.y)) {
            if(a.obj === null) {
                WIN_showBackgroundSettings(d.diagram.settings, (windata) => {
                    sendSettings_Background(windata);
                });
            }
            else if (a.obj.mesh.userData.type == "device") {
                WIN_showL2DeviceWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_Device(a.obj.mesh.userData.id, windata);
                    },
                    check_ifnaming);
            }
            else if (a.obj.mesh.userData.type == "link") {
                WIN_showLinkWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_Link(a.view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, windata);
                    });
            }
            else if (a.obj.mesh.userData.type == "vrf") {
                WIN_showVrfWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_Vrf(a.obj.mesh.userData.id, windata);
                    });
            }
            else if (a.obj.mesh.userData.type == "bgp_peering") {
                WIN_showBGPPeerWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_BGPPeer(a.obj.mesh.userData.id, windata);
                    });
            }
            else if (a.obj.mesh.userData.type == "l2segment") {
                WIN_showL2SegmentWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_L2Segment(a.obj.mesh.userData.id, windata);
                    });
            }
            else if ((a.obj.mesh.userData.type == "l2link") || (a.obj.mesh.userData.type == "interface") || (a.obj.mesh.userData.type == "p2p_interface") || (a.obj.mesh.userData.type == "svi_interface")) {
                WIN_showLinkWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_Link(a.view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, windata);
                    });
            }
            else if (a.obj.mesh.userData.type == "text") {
                if(d.current_view === "L2")
                    WIN_showTextWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                        (windata) => {
                            sendSettings_Text("L2", a.obj.mesh.userData.id, windata);
                        });
                else if(d.current_view === "L3")
                    WIN_showTextWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                        (windata) => {
                            sendSettings_Text("L3", a.obj.mesh.userData.id, windata);
                        });
            }
            else if (a.obj.mesh.userData.type == "symbol") {
                if(a.obj.mesh.userData.e.type == "F") {
                    let view = d.current_view;
                    WIN_showSymbolFlagWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                        (windata) => {
                            sendSettings_SymbolFlag(view, "symbol", a.obj.mesh.userData.id, windata);
                        });
                }
                else if(a.obj.mesh.userData.e.type == "A") {
                    let view = d.current_view;
                    WIN_showSymbolArrowWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                        (windata) => {
                            sendSettings_SymbolArrow(view, "symbol", a.obj.mesh.userData.id, windata);
                        });
                }
            }
        }
    }
    else if(d.dom.tools.active_t === "EDT") {
        if ((x == a.x) && (y == a.y)) {
            WIN_showData(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                (windata) => {
                    sendData(windata);
                }
            );
        }
    }
    else if(d.dom.tools.active_t === "EI") {
        if ((x == a.x) && (y == a.y)) {
            if (a.obj.mesh.userData.type == "device") {
                WIN_showDeviceConfigWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendConfig_Device(a.obj.mesh.userData.id, windata);
                    });
            }
            else if (a.obj.mesh.userData.type == "link") {
                let dev1 = d.wgl.getMesh("L2", "device", a.obj.mesh.userData.e.devs[0].id);
                let dev2 = d.wgl.getMesh("L2", "device", a.obj.mesh.userData.e.devs[1].id);
                WIN_showLinkConfigWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e, dev1.userData.e, dev2.userData.e, resolve_ifnaming,
                    (windata) => {
                        sendConfig_Link(a.obj.mesh.userData.id, windata);
                    },
                    (index) => {
                        WIN_showLinkConfigDeviceWindow(index, a.obj.mesh.userData.id, a.obj.mesh.userData.e, [dev1, dev2][index].userData.e, 
                            (windata) => {
                                sendConfig_LinkDevice(a.obj.mesh.userData.id, index, windata);
                            });
                    });
            }
            else if(a.obj.mesh.userData.type == "interface") {
                WIN_showInterfaceConfigWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendConfig_Interface(a.obj.mesh.userData.id, windata);
                    });
            }
            else if(a.obj.mesh.userData.type == "svi_interface") {
                WIN_showSVIInterfaceConfigWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendConfig_SVIInterface(a.obj.mesh.userData.id, windata);
                    });
            }
            else if(a.obj.mesh.userData.type == "p2p_interface") {
                let vrf1 = d.wgl.getMesh("L3", "vrf", a.obj.mesh.userData.e.l3_reference.src_vrf_id);
                let vrf2 = d.wgl.getMesh("L3", "vrf", a.obj.mesh.userData.e.l3_reference.dst_vrf_id);
                WIN_showP2PInterfaceConfigWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e, vrf1.userData.e, vrf2.userData.e,
                    (windata) => {
                        sendConfig_P2PInterface(a.obj.mesh.userData.id, windata);
                    });
            }
            else if(a.obj.mesh.userData.type == "vrf") {
                WIN_showVrfConfigWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendConfig_Vrf(a.obj.mesh.userData.id, windata);
                    });
            }
            else if(a.obj.mesh.userData.type == "bgp_peering") {
                let src_vrf = d.wgl.getMesh("L3", "vrf", a.obj.mesh.userData.e.l3_reference.src_vrf_id);
                let dst_vrf = d.wgl.getMesh("L3", "vrf", a.obj.mesh.userData.e.l3_reference.dst_vrf_id);
                let src_ips = d.wgl.findIPsOfVrf(a.obj.mesh.userData.e.l3_reference.src_vrf_id);
                let dst_ips = d.wgl.findIPsOfVrf(a.obj.mesh.userData.e.l3_reference.dst_vrf_id);
                WIN_showBGPPeerConfigWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e, src_vrf.userData.e, dst_vrf.userData.e, src_ips, dst_ips,
                    (windata) => {
                        sendConfig_BGPPeer(a.obj.mesh.userData.id, windata);
                    });
            }
        }
    }
    else if(d.dom.tools.active_t === "BD") {
        if ((x == a.x) && (y == a.y))
            sendDelete(a.obj.mesh.userData.type, a.obj.mesh.userData.id);
    }
    else if (d.dom.tools.active_t === "ED") {
        if ((x == a.x) && (y == a.y)) {
            if (a.obj.mesh.userData.type === "device") {
                sendDelete(a.obj.mesh.userData.type, a.obj.mesh.userData.id);
            }
            else if (a.obj.mesh.userData.type === "link") {
                if (a.obj.mesh.userData.e.linedata.points.length == 0) {
                    sendDelete(a.obj.mesh.userData.type, a.obj.mesh.userData.id);       
                }
                else {
                    let point_index = d.wgl.findClosestLinkJointIndex(d.current_view, "link", a.obj.mesh.userData.id, 
                        a.obj.p.x, a.obj.p.y, a.obj.p.z);

                    if (point_index != -1)
                        sendDeleteJoint(d.current_view, "link", a.obj.mesh.userData.id, point_index);
                }
            }
            else if (["l2link", "interface", "svi_interface", "p2p_interface"].indexOf(a.obj.mesh.userData.type) !== -1) {
                if (a.obj.mesh.userData.e.linedata.points.length > 0) {
                    let point_index = d.wgl.findClosestLinkJointIndex(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, 
                        a.obj.p.x, a.obj.p.y, a.obj.p.z);

                    if (point_index != -1)
                        sendDeleteJoint(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, point_index);
                }
            }
            else if(a.obj.mesh.userData.type === "bgp_peering") {
                sendDelete(a.obj.mesh.userData.type, a.obj.mesh.userData.id);
            }
            else if (a.obj.mesh.userData.type === "text") {
                sendDelete(a.obj.mesh.userData.type, a.obj.mesh.userData.id);
            }
            else if (a.obj.mesh.userData.type === "symbol") {
                sendDelete(a.obj.mesh.userData.type, a.obj.mesh.userData.id);
            }
        }
    }
    else if(d.dom.tools.active_t === "FC") {
        if ((x == a.x) && (y == a.y)) {
            if((a.obj.mesh.userData.type === "device") || (a.obj.mesh.userData.type === "vrf")) {
                d.wgl.global_settings.format.color1 = a.obj.mesh.userData.e.color1;
                d.wgl.global_settings.format.color2 = a.obj.mesh.userData.e.color2;
                d.wgl.global_settings.format.scale = a.obj.mesh.userData.e.sx;
            }
            else if((a.obj.mesh.userData.type === "link") || (a.obj.mesh.userData.type === "p2p_interface") || 
                (a.obj.mesh.userData.type === "svi_interface") || (a.obj.mesh.userData.type === "interface") || 
                (a.obj.mesh.userData.type === "l2link")) {
                d.wgl.global_settings.format.link_color = a.obj.mesh.userData.e.linedata.color;
                d.wgl.global_settings.format.link_height = a.obj.mesh.userData.e.linedata.height;
                d.wgl.global_settings.format.link_weight = a.obj.mesh.userData.e.linedata.weight;
            }
            else if(a.obj.mesh.userData.type === "text") {
                d.wgl.global_settings.format.text_color = a.obj.mesh.userData.e.color;
                if(a.obj.mesh.userData.e.rx !== undefined) d.wgl.global_settings.format.text_rx = a.obj.mesh.userData.e.rx;
                if(a.obj.mesh.userData.e.height !== undefined) d.wgl.global_settings.format.text_height = a.obj.mesh.userData.e.height;
                if(a.obj.mesh.userData.e.text_align !== undefined) d.wgl.global_settings.format.text_align = a.obj.mesh.userData.e.text_align;
                if(a.obj.mesh.userData.e.rotation_x !== undefined) d.wgl.global_settings.format.text_rotation_x = a.obj.mesh.userData.e.rotation_x;
                if(a.obj.mesh.userData.e.bg_color !== undefined) d.wgl.global_settings.format.text_bg_color = a.obj.mesh.userData.e.bg_color;
                if(a.obj.mesh.userData.e.border_color !== undefined) d.wgl.global_settings.format.text_border_color = a.obj.mesh.userData.e.border_color;
                if(a.obj.mesh.userData.e.bg_type !== undefined) d.wgl.global_settings.format.text_bg_type = a.obj.mesh.userData.e.bg_type;
                if(a.obj.mesh.userData.e.bg_show !== undefined) d.wgl.global_settings.format.text_bg_show = a.obj.mesh.userData.e.bg_show;
                if(a.obj.mesh.userData.e.border_show !== undefined) d.wgl.global_settings.format.text_border_show = a.obj.mesh.userData.e.border_show;
                if(a.obj.mesh.userData.e.bg_depth !== undefined) d.wgl.global_settings.format.text_bg_depth = a.obj.mesh.userData.e.bg_depth;
            }
            else if(a.obj.mesh.userData.type === "l2segment") {
                d.wgl.global_settings.format.color1 = a.obj.mesh.userData.e.color1;
            }
        }
    }
    else if(d.dom.tools.active_t === "FP") {
        if ((x == a.x) && (y == a.y)) {
            if(a.obj.mesh.userData.type === "device") {
                sendMessageSettings_Device(a.obj.mesh.userData.id,
                    a.obj.mesh.userData.e.name,
                    d.wgl.global_settings.format.color1,
                    d.wgl.global_settings.format.color2,
                    a.obj.mesh.userData.e.ifnaming);
            }
            else if((a.obj.mesh.userData.type === "link") ||
                    (a.obj.mesh.userData.type === "l2link") ||
                    (a.obj.mesh.userData.type === "interface") ||
                    (a.obj.mesh.userData.type === "svi_interface") ||
                    (a.obj.mesh.userData.type === "p2p_interface")) {
                sendMessageSettings_Link(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id,
                    a.obj.mesh.userData.e.type,
                    a.obj.mesh.userData.e.order,
                    d.wgl.global_settings.format.link_color,
                    d.wgl.global_settings.format.link_weight,
                    d.wgl.global_settings.format.link_height);
            }
            if(a.obj.mesh.userData.type === "vrf") {
                sendMessageSettings_Vrf(a.obj.mesh.userData.id,
                    d.wgl.global_settings.format.color1,
                    d.wgl.global_settings.format.color2);
            }
            if(a.obj.mesh.userData.type === "l2segment") {
                sendMessageSettings_L2Segment(a.obj.mesh.userData.id,
                    d.wgl.global_settings.format.color1);
            }
            else if(a.obj.mesh.userData.type === "text") {
                let format_data = d.wgl.global_settings.format;
                sendMessageSettings_Text(d.current_view, a.obj.mesh.userData.id, {
                    text: a.obj.mesh.userData.e.text,
                    color: format_data.text_color,
                    py: a.obj.mesh.userData.e.py,
                    height: format_data.text_height,
                    depth: format_data.text_depth,
                    text_align: format_data.text_align,
                    bg_type: format_data.text_bg_type,
                    bg_color: format_data.text_bg_color,
                    bg_show: format_data.text_bg_show,
                    border_color: format_data.text_border_color,
                    border_show: format_data.text_border_show,
                    border_width: format_data.text_border_width,
                    bg_depth: format_data.text_bg_depth,
                    rotation_x: format_data.text_rotation_x,
                });
            }
        }
    }
}

function mousemove(x, y, dx, dy, dom_element) {
    let p, level;
    let a = d.mouseaction;

    if(d.dom.tools.active_t != d.mouseaction.m)
        return;

    if(d.dom.tools.active_t === "CM") {
        d.wgl.moveCamera(dx, dy);
    }
    else if(d.dom.tools.active_t === "CR") {
        d.wgl.rotateCamera(-dx, -dy);
    }
    else if(d.dom.tools.active_t === "CZ") {
        d.wgl.zoomCamera(dy);
    }
    else if(d.dom.tools.active_t === "ABF") {
        p = d.wgl.pickLevel(x, y, 0);
        d.wgl.moveMesh(d.current_view, "base", "CURSOR", p.x, p.y, p.z, null, true);
    }
    else if (d.dom.tools.active_t.startsWith("AD")) {
        let p = d.wgl.pickObject(x, y);
        let mesh = d.wgl.getMesh(d.current_view, "device", "CURSOR");

        for(let x = 0; x < p.length; x++) {
            if (p[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", p[x].mesh.userData.id, p[x].p.x, p[x].p.y, p[x].p.z);
                d.wgl.moveMesh(d.current_view, "device", "CURSOR", newcoords.x, undefined, newcoords.z, p[x].mesh.userData.id, true);
                break;
            }
        }
    }    
    else if (d.dom.tools.active_t.startsWith("AT")) {
        let p = d.wgl.pickObject(x, y);
        let mesh = d.wgl.getMesh(d.current_view, "text", "CURSOR");

        for(let x = 0; x < p.length; x++) {
            if (p[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", p[x].mesh.userData.id, p[x].p.x, p[x].p.y, p[x].p.z);
                d.wgl.moveMesh(d.current_view, "text", "CURSOR", newcoords.x, undefined, newcoords.z, p[x].mesh.userData.id, true);
                break;
            }
        }
    }    
    else if ((d.dom.tools.active_t.startsWith("AL")) || (d.dom.tools.active_t === "ARB")) {
        let objlist = d.wgl.pickObject(x, y);
        let mesh = a.cursor;
        let dev2_id = -1;
        let dev2_type = null;

        // Find if mouse is over a device or a vrf
        for(let x = 0; x < objlist.length; x++) {
            if ((objlist[x].mesh.userData.type === "device") || (objlist[x].mesh.userData.type === "vrf")) {
                if (a.dev1_id != objlist[x].mesh.userData.id) {
                    dev2_id = objlist[x].mesh.userData.id;
                    dev2_type = objlist[x].mesh.userData.type;
                }
                break;
            }
        }

        if(dev2_id == -1) {
            if(objlist.length > 0) {
                mesh.userData.e.x2 = objlist[0].p.x;
                mesh.userData.e.y2 = objlist[0].p.y;
                mesh.userData.e.z2 = objlist[0].p.z;
                mesh.userData.e.color = 0xff0000;
                d.wgl.updateLine(mesh);
                d.wgl.updateLineColor(mesh);
            }
        }
        else {
            let p = d.wgl.convertMesh2WorldCoordinates(d.current_view, dev2_type, dev2_id, 0, 0, 0);
            mesh.userData.e.x2 = p.x;
            mesh.userData.e.y2 = p.y + .25;
            mesh.userData.e.z2 = p.z;
            mesh.userData.e.color = 0x00ff00;
            d.wgl.updateLine(mesh);
            d.wgl.updateLineColor(mesh);            
        }
    }
    else if (d.dom.tools.active_t.startsWith("AS")) {
        let p = d.wgl.pickObject(x, y);
        let mesh = d.wgl.getMesh(d.current_view, "symbol", "CURSOR");

        for(let x = 0; x < p.length; x++) {
            if (p[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", p[x].mesh.userData.id, p[x].p.x, p[x].p.y, p[x].p.z);
                d.wgl.moveMesh(d.current_view, "symbol", "CURSOR", newcoords.x, newcoords.y, newcoords.z, p[x].mesh.userData.id, true);
                break;
            }
        }
    }    
    else if(d.dom.tools.active_t === "BM") {
        level = d.mouseaction.level;
        p = d.wgl.pickLevel(x, y, level);
        d.wgl.moveMesh(d.current_view, "base", d.mouseaction.id, 
            p.x - d.mouseaction.diffx, 0, p.z - d.mouseaction.diffz, null, true);
    }
    else if(d.dom.tools.active_t === "EM") {
        let objlist = d.wgl.pickObject(x, y);
        if((d.mouseaction.type === "device") || (d.mouseaction.type === "symbol") || (d.mouseaction.type === "vrf") || (d.mouseaction.type === "l2segment")) {
            let mesh = d.wgl.getMesh(d.current_view, d.mouseaction.type, d.mouseaction.mesh);
            for(let x = 0; x < objlist.length; x++) {
                if(objlist[x].mesh.userData.type == "base") {
                    let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", objlist[x].mesh.userData.id, 
                        objlist[x].p.x, objlist[x].mesh.userData.e.sy, objlist[x].p.z);
                    d.wgl.moveMesh(d.current_view, d.mouseaction.type, d.mouseaction.mesh,
                        newcoords.x, undefined, newcoords.z, 
                        objlist[x].mesh.userData.id, true);
                    break;
                }
            }
        }
        else if(d.mouseaction.type === "bgp_peering") {
            let mesh = d.wgl.getMesh(d.current_view, "bgp_peering", d.mouseaction.mesh);
            mesh.userData.e
            let diff_x = d.mouseaction.mouse_px - x;
            let diff_y = d.mouseaction.mouse_py - y;
            mesh.userData.e.curve_x = d.mouseaction.curve_x + diff_x/25;
            mesh.userData.e.curve_y = d.mouseaction.curve_y + diff_y/25;

            if(mesh.userData.e.curve_x > 4) mesh.userData.e.curve_x = 4;
            if(mesh.userData.e.curve_x < -4) mesh.userData.e.curve_x = -4;
            if(mesh.userData.e.curve_y > 16) mesh.userData.e.curve_y = 16;
            if(mesh.userData.e.curve_y < 0) mesh.userData.e.curve_y = 0;

            d.wgl.updateBGPArrowGeometry(mesh);
        }
        else if(d.mouseaction.type === "text") {
            let mesh = d.wgl.getMesh(d.current_view, "text", d.mouseaction.mesh);
            for(let x = 0; x < objlist.length; x++) {
                if(objlist[x].mesh.userData.type == "base") {
                    let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", objlist[x].mesh.userData.id, 
                        objlist[x].p.x, objlist[x].mesh.userData.e.sy, objlist[x].p.z);
                    d.wgl.moveMesh(d.current_view, "text", d.mouseaction.mesh,
                        newcoords.x, undefined, newcoords.z, 
                        objlist[x].mesh.userData.id, true);
                    break;
                }
            }
        }
        else if(d.mouseaction.type === "joint") {
            let mesh = d.wgl.getMesh(d.current_view, d.mouseaction.element_type, d.mouseaction.mesh);
            for(let x = 0; x < objlist.length; x++) {
                if(objlist[x].mesh.userData.type == "base") {
                    let point_vector = new THREE.Vector3(objlist[x].p.x, objlist[x].p.y + mesh.userData.e.linedata.height , objlist[x].p.z);
                    d.wgl.alignVectorToGrid(point_vector);
                    mesh.userData.e.linedata.points[d.mouseaction.joint_index] = [
                        point_vector.x, point_vector.y, point_vector.z
                    ]
                    d.wgl.updateLinkGeometry(d.mouseaction.element_type, mesh, d.current_view);
                    break;
                }
            }
        }
    }
    else if(d.dom.tools.active_t === "EMV") {
        if(["symbol", "device", "vrf", "l2segment"].indexOf(d.mouseaction.mesh.userData.type) !== -1) {
            d.wgl.moveMesh(d.current_view, d.mouseaction.mesh.userData.type, d.mouseaction.mesh.userData.id, 
                undefined, d.mouseaction.base_y + (d.mouseaction.py - y) * .05, undefined, null, true);
        }
    }
    else if(d.dom.tools.active_t === "BR") {
        d.mouseaction.ry = d.mouseaction.ry + (dx * 2 * Math.PI/360 * 5);
        d.wgl.rotateMesh(d.current_view, "base", d.mouseaction.id, d.mouseaction.rx, d.mouseaction.ry, d.mouseaction.rz, true);
    }
    else if(d.dom.tools.active_t === "ER") {
        if((d.mouseaction.type == "symbol") && (d.mouseaction.subtype == "A")) {
            d.mouseaction.ry = d.mouseaction.ry + (dx * 2 * Math.PI/360 * 1);
            d.mouseaction.rx = d.mouseaction.rx - (dy * 2 * Math.PI/360 * 1);
            if(d.mouseaction.rx < -Math.PI/2)
                d.mouseaction.rx = -Math.PI/2;
            if(d.mouseaction.rx > 0)
                d.mouseaction.rx = 0;
            d.wgl.rotateMesh(d.current_view, d.mouseaction.type, d.mouseaction.id, d.mouseaction.rx, d.mouseaction.ry, d.mouseaction.rz, true);
        }
        if((d.mouseaction.type == "device") || (d.mouseaction.type == "symbol") || (d.mouseaction.type == "l2segment") || (d.mouseaction.type == "vrf")) {
            d.mouseaction.ry = d.mouseaction.ry + (dx * 2 * Math.PI/360 * 5);
            d.wgl.rotateMesh(d.current_view, d.mouseaction.type, d.mouseaction.id, d.mouseaction.rx, d.mouseaction.ry, d.mouseaction.rz, true);
        }
        else if(d.mouseaction.type == "text") {
            d.mouseaction.ry = d.mouseaction.ry + (dx * 2 * Math.PI/360 * 5);
            d.mouseaction.rx = d.mouseaction.rx + (dy * 2 * Math.PI/360 * 5);
            if(d.mouseaction.rx > Math.PI/2)
                d.mouseaction.rx = Math.PI/2;
            if(d.mouseaction.rx < -Math.PI/2)
                d.mouseaction.rx = -Math.PI/2;
            d.wgl.rotateMesh(d.current_view, "text", d.mouseaction.id, d.mouseaction.rx, d.mouseaction.ry, d.mouseaction.rz, true);
        }
    }
    else if(d.dom.tools.active_t === "BX") {
        p = d.wgl.pickLevel(x, y, d.mouseaction.y);
        p = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", d.mouseaction.id, p.x, p.y, p.z)
        d.wgl.resizeMesh_Base(d.current_view, d.mouseaction.id, 
            Math.abs(p.x * 2), null, Math.abs(p.z * 2), true)
    }
    else if(d.dom.tools.active_t === "EX") {
        p = d.wgl.pickLevel(x, y, d.mouseaction.y);
        p = d.wgl.convertWorld2MeshCoordinates(d.current_view, d.mouseaction.type, d.mouseaction.id, p.x, p.y, p.z);
        let mesh = d.wgl.getMesh(d.current_view, d.mouseaction.type, d.mouseaction.id);
        let newscale = Math.abs(2*p.x*mesh.scale.x);
        if (Math.abs(p.z) > Math.abs(p.x))
            newscale = Math.abs(2*p.z*mesh.scale.z);
        if(d.mouseaction.type === "l2segment")
            d.wgl.resizeMesh(d.current_view, d.mouseaction.type, d.mouseaction.id, 
                newscale, null, null, true);
        else if((d.mouseaction.type == "symbol") && (d.mouseaction.subtype == "A")) {
            d.wgl.resizeMesh(d.current_view, d.mouseaction.type, d.mouseaction.id, 
                null, Math.abs(2*p.y*mesh.scale.y)*.5, null, true);
        }
        else
            d.wgl.resizeMesh(d.current_view, d.mouseaction.type, d.mouseaction.id, 
                newscale, newscale, newscale, true);
    }
}

function mouseover(x, y, dom_element) {
    let p = d.wgl.pickObject(x, y);
    if(p.length > 0) {
        let obj = p[0].mesh;
        if((d.mouseover === null) || (d.mouseover.view !== d.current_view) || (d.mouseover.type !== obj.userData.type) || (d.mouseover.id !== obj.userData.id)) {
            if(d.mouseover !== null)
                infobox_clear();
            d.mouseover = {
                view: d.current_view,
                type: obj.userData.type,
                id: obj.userData.id,
            }
            infobox_show_element(obj);
        }
        return;
    }
    else if(d.mouseover !== null) {
        infobox_clear();
        d.mouseover = null;
    }
}

function keypress(ev) {
    // Check if the request is to change the camera type
    if(ev.code == "Digit1") {
        toggle_cam_type();
        return;
    }
    // Check on the tools if any has the code of the event assigned
    for(toolboxname in d.dom.tools.toolboxes) {
        let toolbox = d.dom.tools.toolboxes[toolboxname];
        for(let x = 0; x < toolbox.components.length; x++) {
            let tool = toolbox.components[x];
            if(("q" in tool) && (tool.q == ev.code)) {
                
                toolbox_activatetool(tool.dom);
                return;
            }
        }
    }
}

function init_window() {
    // **********************************************
    // Add DOM elements
    d.dom = {}
    let b = document.body;
    let div;

    d.dom.page = DOM.cdiv(b, "page", "box white");
    d.dom.tab_l2 = DOM.cdiv(b, "tab_l2", "box tab_s", "L2 Diagram");
    d.dom.tab_l2.addEventListener("click", () => { 
        set_current_view("L2")
    });
    d.dom.tab_l3 = DOM.cdiv(b, "tab_l3", "box tab", "L3 Diagram");
    d.dom.tab_l3.addEventListener("click", () => { 
        set_current_view("L3")
    });
    d.dom.title = DOM.cdiv(b, "title", "box_ns", d.name);

    // Home button
    d.dom.home = DOM.cimg(b, staticurl + "/static/img/home.png", "home", "box toolbutton", null, () => { window.location.href = "/";});
    WIN_addBasicMouseDescriptionActions(d.dom.home, "Back to Home Page");

    // Button to change camera type
    d.dom.cam_type = DOM.cimg(b, staticurl + "/static/img/cam3d.png", "camtype", "box toolbutton", null, toggle_cam_type);
    WIN_addBasicMouseDescriptionActions(d.dom.cam_type, "Change between 2D and 3D views (1)");
    d.dom.cam_type.setAttribute("data-camtype", "3D");

    // Button to change general settings
    d.dom.global_settings = DOM.cimg(b, staticurl + "/static/img/settings_w.png", "global_settings", "box toolbutton", null, () => {
        WIN_showGlobalSettingsWindow(d.wgl.global_settings, {
            show_device_name: (e) => { d.wgl.updateGlobalSettings_show_device_name(e); },
            grid_change: (active, x, y, z, angle, resize) => { d.wgl.updateGlobalSettings_grid(active, x, y, z, angle, resize); },
            cast_shadow: (cast_shadow) => { d.wgl.setCastShadow(cast_shadow)},
        });
    });
    WIN_addBasicMouseDescriptionActions(d.dom.global_settings, "Global Settings");


    // Set up WGL
    init_wgl();

    // Initialize the diagram
    init_diagram();

    // Menu to open tools
    d.dom.tool_camera_b = DOM.cimg(b, staticurl + "/static/img/camera.png", "tool_camera_b", "box toolbutton", null, () => {
        d.dom.tools.active_tb = d.dom.tools.active_tb == "camera" ? "" : "camera";
        animate();
    });
    WIN_addBasicMouseDescriptionActions(d.dom.tool_camera_b, "Camera Actions. Move, rotate or zoom the view.");
    
    if(d.permission !== "RO") {
        d.dom.tool_element_b = DOM.cimg(b, staticurl + "/static/img/element.png", "tool_element_b", "box toolbutton", null, () => {
            d.dom.tools.active_tb = d.dom.tools.active_tb == "element" ? "" : "element";
            animate();
        });
        WIN_addBasicMouseDescriptionActions(d.dom.tool_element_b, "Element Actions. Modify the existing elements of the diagram.");
        
        d.dom.tool_new_b = DOM.cimg(b, staticurl + "/static/img/new.png", "tool_new_b", "box toolbutton", null, () => {
            if(d.current_view == "L2")
                d.dom.tools.active_tb = d.dom.tools.active_tb == "new" ? "" : "new";
            else if(d.current_view == "L3")
                d.dom.tools.active_tb = d.dom.tools.active_tb == "new_l3" ? "" : "new_l3";
            animate();
        });
        WIN_addBasicMouseDescriptionActions(d.dom.tool_new_b, "New Elements. Add new elements, connections and symbols.");
    }

    // Info box.
    d.dom.infobox = DOM.cdiv(b, null, "box_info", "");
    d.dom.infobox_data = {transparency: 0, show: false};

    // Toolbox states and dom elements
    d.dom.tools = {
        active_tb: "",
        active_t: "CM",
        toolboxes: MENU.toolboxes,
    }
    for(toolboxname in d.dom.tools.toolboxes) {
        let toolbox = d.dom.tools.toolboxes[toolboxname];
        toolbox.dom = DOM.cdiv(b, null, "box toolbox");
        DOM.cdiv(toolbox.dom, null, "tooltitle", toolbox.name);
        for(let x = 0; x < toolbox.components.length; x++) {
            let tool = toolbox.components[x];
            tool.dom = init_window_addtool(toolbox.dom, tool, tool.s === d.dom.tools.active_t);
        }
    }

    // Initialize input
    Input_initialize(document.body, null, null, null);
    Input_registerid("page", mousedown, mouseup, mousemove, mouseover);
    WIN_initialize();
    d.mouseaction = {
        m: "INVALID"
    }
    d.mouseover = null;

    
    // Rest of functions
    window.addEventListener("resize", position_elements);
    window.addEventListener("keypress", keypress);
    position_elements();
    set_current_view("L2");

    animate();
}

function main() {
    d.ws = new WS(process_message, () => {
        DOM.showError("Socket Error", "Socket disconnected unexpectedly.", true);
    });
}
