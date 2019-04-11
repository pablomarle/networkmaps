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
        sx: 1, sy: 1, sz: 1,
        color1: 0xffffff, color2: 0xffffff,

        base: base,
    }

    if ((type === "R") || (type === "S") || (type === "LB")) {
        dev.color1 = 0x66aaff;
        dev.color2 = 0x88ccff;
    }
    else if ((type === "ML")) {
        dev.color1 = 0x66aaff;
        dev.color2 = 0xff4444;
    }
    else if ((type === "F")) {
        dev.color1 = 0xbb7766;
        dev.color2 = 0xbb7766;
    }
    else if ((type === "SR") || (type === "ST")) {
        dev.color1 = 0x333333;
        dev.color2 = 0x666666;
    }

    return dev;
}

function createDefaultText(x, z, type, base) {
    return {
        type: "F",
        text: "text",
        height: .3,
        depth:.03,
        color: 0x000000,
        px: x, py: 1, pz: z,
        base: base,
        rx: -Math.PI/4,
        ry: 0,
    }
}

function createDefaultSymbolFlag(x, y, z, base) {
    return {
        type: "F",
        base: base,
        px: x, py: y, pz: z,
        rx: 0, ry: 0, rz: 0,
        sx: 1, sy: 1, sz: 1,
        color: 0xffAA88,

        cd: {
            flagcolor: 0x00ff00,
        }
    }
}

function createDefaultSymbol(type, x, y, z, base) {
    let color = 0xffAA88;
    if(type === "X")
        color = 0xff4444;
    else if(type === "V")
        color = 0x44ff44;
    return {
        type: type,
        base: base,
        px: x, py: y, pz: z,
        rx: 0, ry: 0, rz: 0,
        sx: 1, sy: 1, sz: 1,
        color: color,
    }
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
        case "E":
            DOM.showError("Error Received", message.d)
            break;
    }
}

function process_message_add(data) {
    if((data.v == "L2") && (data.t == "base")) {
        d.wgl.addCubeFloor(data.i, "L2", data.d);
    }
    else if((data.v == "L2") && (data.t == "device")) {
        d.wgl.addDevice(data.i, "L2", data.d);
    }
    else if((data.v == "L2") && (data.t == "link")) {
        d.wgl.addLink(data.i, "L2", data.d);
    }
    else if((data.v == "L2") && (data.t == "joint")) {
        d.wgl.addJoint(data.link_id, data.joint_index, "L2", data.px, data.py, data.pz);
    }
    else if((data.v == "L2") && (data.t == "text")) {
        let mesh = d.wgl.addText(data.i, "L2", data.d);
        WIN_showL2TextWindow("L2", "text", mesh.userData.id, mesh.userData.e,
            (windata) => {
                sendSettings_L2Text("L2", "text", mesh.userData.id, windata);
            });

    }
    else if((data.v == "L2") && (data.t == "symbol")) {
        d.wgl.addSymbol(data.i, "L2", data.d);
    }
}

function process_message_move(data) {
    if(data.t == "joint") {
        let mesh = d.wgl.getMesh(data.v, "link", data.i);
        if(mesh) {
            mesh.userData.e.linedata.points[data.joint_index] = [data.x, data.y, data.z];
            d.wgl.updateLinkGeometry(mesh, data.v);
        }
    }
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
    else if((data.v == "L2") && ((data.t == "device") || (data.t == "symbol"))) {
        d.wgl.resizeMesh(data.v, data.t, data.i, data.x, data.y, data.z);
    }
}

function process_message_settings(data) {
    if((data.v == "L2") && (data.t == "base")) {
        d.wgl.settingsMesh_Base(data.v, data.i, data.name, data.color1, data.color2, data.t1name, data.t2name, data.sy, data.tsx, data.tsy);
    }
    else if((data.v == "L2") && (data.t == "device")) {
        d.wgl.settingsMesh_L2Device(data.i, data.name, data.color1, data.color2, data.ifnaming);
    }
    else if((data.v == "L2") && (data.t == "link")) {
        d.wgl.settingsMesh_L2Link(data.i, data.type, data.order, data.color, data.weight, data.height);
    }
    else if((data.v == "L2") && (data.t == "text")) {
        d.wgl.settingsMesh_L2Text(data.i, data.text, data.py, data.height, data.depth, data.color);
    }
    else if((data.v == "L2") && (data.t == "symbol")) {
        d.wgl.settingsMesh_L2Symbol(data.i, data);
    }
}

function process_message_config(data) {
    if(data.v == "L2") {
        if(data.t == "device") {
            d.wgl.configMesh_L2Device(data.i, data.name, data.vlans, data.vrfs, data.svis, data.los);
        }
        else if(data.t == "link") {
            d.wgl.configMesh_L2Link(data.i, data.ifbindings, data.lag_name, data.lacp, data.transceiver);   
        }
        else if(data.t == "linkdev") {
            d.wgl.configMesh_L2LinkDevice(data.i, data.dev_index, data.function, data.vlans, data.native_vlan, data.subinterfaces);
        }
    }
}

function process_message_delete(data) {
    if(
        (data.v == "L2") && (data.t == "base") ||
        (data.v == "L2") && (data.t == "device") ||
        (data.v == "L2") && (data.t == "link") ||
        (data.v == "L2") && (data.t == "symbol") ||
        (data.v == "L2") && (data.t == "text")
        ) {
        d.wgl.deleteMesh("L2", data.t, data.i)
    }
    else if ((data.v == "L2") && (data.t == "joint"))
        d.wgl.deleteJoint("L2", data.i, data.pi);
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
            color: 0xaaaaaa,
            weight: 0.025,
            height: .25,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendAdd_Joint(link_id, joint_index, px, py, pz) {
    let message = {
        m: "A",
        d: {
            v: d.current_view,
            t: "joint",
            link_id: link_id,
            joint_index: joint_index,
            px: px, py: py, pz: pz,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendAdd_Text(text, type, px, py, pz, rx, ry, height, depth, color, base) {
    let message = {
        m: "A",
        d: {
            t: "text",
            type: type,
            v: d.current_view,
            text: text,
            px: px, py: py, pz: pz,
            rx: rx, ry: ry,
            height: height, depth: depth,
            color: color,
            base: base
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

function sendMoveJoint(view, id, joint_index, coords) {
    let message = {
        m: "M",
        d: {
            v: view,
            t: "joint",
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

function sendSettings_BaseFloor(view, type, id, windata) {
    let message = {
        m: "P",
        d: {
            v: view,
            t: type,
            i: id,

            name: windata.d.name.value,
            color1: parseInt(windata.d.color1.value),
            color2: parseInt(windata.d.color2.value),
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

function sendSettings_L2Device(view, type, id, windata) {
    let message = {
        m: "P",
        d: {
            v: view,
            t: type,
            i: id,

            name: windata.d.name.value,
            color1: parseInt(windata.d.color1.value),
            color2: parseInt(windata.d.color2.value),
            ifnaming: windata.d.ifnaming.value.split(","),
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_L2Device(id, windata) {
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
    let los = JSON.parse(windata.d.los.value);

    for(let x = 0; x < vlans.length; x++)
        message.d.vlans[vlans[x].tag] = { name: vlans[x].name };
    for(let x = 0; x < vrfs.length; x++)
        message.d.vrfs[vrfs[x].rd] = { name: vrfs[x].name };
    for(let x = 0; x < svis.length; x++) {
        let ipv4 = (svis[x].ipv4 === "") ? [] : [svis[x].ipv4];
        let ipv6 = (svis[x].ipv6 === "") ? [] : [svis[x].ipv6];
        message.d.svis[svis[x].tag] = { name: svis[x].name, ipv4: ipv4, ipv6: ipv6 };
    }
    for(let x = 0; x < los.length; x++) {
        let ipv4 = (los[x].ipv4 === "") ? [] : [los[x].ipv4];
        let ipv6 = (los[x].ipv6 === "") ? [] : [los[x].ipv6];
        message.d.los[los[x].id] = { name: los[x].name, ipv4: ipv4, ipv6: ipv6 };
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendConfig_L2Link(id, windata) {
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

function sendConfig_L2LinkDevice(id, dev_index, windata) {
    console.log("Link " + id + " dev index " + dev_index);
    console.log(windata);

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
                    ipv4: [],
                    ipv6: [],
                    vrf: subifs[x].vrf,
                }
                if(subifs[x].ipv4 != "")
                    subif.ipv4.push(subifs[x].ipv4);
                if(subifs[x].ipv6 != "")
                    subif.ipv6.push(subifs[x].ipv6);

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

function sendSettings_L2Link(view, type, id, windata) {
    let message = {
        m: "P",
        d: {
            v: view,
            t: type,
            i: id,

            type: parseInt(windata.d.type.value),
            order: windata.d.order.value,
            color: parseInt(windata.d.color.value),
            weight: parseFloat(windata.d.weight.value),
            height: parseFloat(windata.d.height.value),
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_L2Text(view, type, id, windata) {
    if ((windata.d.text.value.length == 0) || (windata.d.text.value.length >= 64)) {
        DOM.showError("Format Error", "Text field length must be between 1 and 63.")
        return;
    }
    let message = {
        m: "P",
        d: {
            v: view,
            t: type,
            i: id,

            text: windata.d.text.value,
            color: parseInt(windata.d.color.value),
            py: parseFloat(windata.d.py.value),
            height: parseFloat(windata.d.height.value),
            depth: parseFloat(windata.d.height.value)/10,
        }
    }
    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function sendSettings_L2SymbolFlag(view, type, id, windata) {
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

function sendDeleteJoint(view, link_id, point_index) {
    let message = {
        m: "D",
        d: {
            v: view,
            t: "joint",
            i: link_id,
            pi: point_index,
        }
    }

    if(!d.ws.send(message))
        DOM.showError("ERROR", "Error sending update to server.", true);
}

function animate() {
    requestAnimationFrame( animate );
    let needs_redraw = false;

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
    d.wgl.draw();
}

function setBoxPosition(e, px, py, sx, sy) {
    e.style.left = "" + px + "px";
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
    setBoxPosition(d.dom.tool_element_b,    10+48*1, 10, 32, 32);
    setBoxPosition(d.dom.tool_new_b,        10+48*2, 10, 32, 32);

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

    tool.className += " tool-active";
    d.dom.tools.active_t = tool.getAttribute("data-code")
}

function toolbox_click() {
    let newtoolbox = this.getAttribute("data-newtoolbox");

    if(newtoolbox != "") {
        d.dom.tools.active_tb = newtoolbox;
    }
    else {
        toolbox_activatetool(this);
    }
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
        d.wgl.addDevice(id, "L2", e);
    }

    for(let id in d.diagram.L2.link) {
        let e = d.diagram.L2.link[id];
        d.wgl.addLink(id, "L2", e);
    }

    for(let id in d.diagram.L2.text) {
        let e = d.diagram.L2.text[id];
        d.wgl.addText(id, "L2", e);
    }

    for(let id in d.diagram.L2.symbol) {
        let e = d.diagram.L2.symbol[id];
        d.wgl.addSymbol(id, "L2", e);
    }
}

function init_window_addtool(toolbox, tooldesc, isactive = false) {
    let tool;
    let imgname = tooldesc.i;
    let newtoolbox = tooldesc.f;
    let name = tooldesc.n;

    if(newtoolbox){
        tool = DOM.cdiv(toolbox, null, "tool tool-menu");
        tool.setAttribute("data-newtoolbox", newtoolbox);
    }
    else {
        tool = DOM.cdiv(toolbox, null, "tool");
        if(isactive)
            tool.className += " tool-active";        
        tool.setAttribute("data-newtoolbox", "");
    }

    if("d" in tooldesc)
        tool.title = tooldesc.d;

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
        (d.dom.tools.active_t === "CM") || 
        (d.dom.tools.active_t === "CR") || 
        (d.dom.tools.active_t === "CZ")
        ) {
            d.mouseaction = {
                m: d.dom.tools.active_t,
            };
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
    else if (d.dom.tools.active_t.startsWith("AD")) {
        // Add a device
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", objlist[x].mesh.userData.id, 
                    objlist[x].p.x, objlist[x].p.y, objlist[x].p.z);
                d.mouseaction = {
                    m: d.dom.tools.active_t,
                    mesh: d.wgl.addDevice("CURSOR", d.current_view, createDefaultDevice(
                        newcoords.x, newcoords.y, newcoords.z, 
                        d.dom.tools.active_t.substring(2),
                        objlist[x].mesh.userData.id
                    ))
                }
                break;
            }
        }
    }
    else if (d.dom.tools.active_t.startsWith("AL")) {
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
    else if (d.dom.tools.active_t === "AJ") {
        // Add Joint
        for(let x = 0; x < objlist.length; x++) {
            if ((objlist[x].mesh.userData.type === "link") && 
                (objlist[x].mesh.userData.subtype === "segment") &&
                (objlist[x].mesh.userData.e.type == 0)) {
                d.mouseaction = {
                    m: d.dom.tools.active_t,
                    link_id: objlist[x].mesh.userData.id,
                    joint_index: objlist[x].mesh.userData.index,
                    px: objlist[x].p.x,
                    py: objlist[x].p.y,
                    pz: objlist[x].p.z,
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
                    ))
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
                if(symboltype == "F") {
                    d.mouseaction = {
                        m: d.dom.tools.active_t,
                        mesh: d.wgl.addSymbol("CURSOR", d.current_view, createDefaultSymbolFlag(
                            newcoords.x, newcoords.y, newcoords.z, 
                            objlist[x].mesh.userData.id
                        ))
                    }
                }
                else {
                    d.mouseaction = {
                        m: d.dom.tools.active_t,
                        mesh: d.wgl.addSymbol("CURSOR", d.current_view, createDefaultSymbol(
                            symboltype,
                            newcoords.x, newcoords.y, newcoords.z, 
                            objlist[x].mesh.userData.id
                        ))
                    }
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
        if((objlist.length > 0) && ((objlist[0].mesh.userData.type === "device") || (objlist[0].mesh.userData.type === "symbol") || ((objlist[0].mesh.userData.type === "text"))) ) {
            d.mouseaction = {
                m: "EM",
                type: objlist[0].mesh.userData.type,
                mesh: objlist[0].mesh.userData.id,
            }
        }
        else if((objlist.length > 0) && (objlist[0].mesh.userData.type === "link") && 
                (objlist[0].mesh.userData.e.type === 0)) {
            let mesh = d.wgl.getMesh(d.current_view, "link", objlist[0].mesh.userData.id);

            // Find the closest point (if none, nothing has to be done)
            let point_index = d.wgl.findClosestLinkJointIndex(d.current_view, objlist[0].mesh.userData.id, 
                objlist[0].p.x, objlist[0].p.y, objlist[0].p.z);

            if (point_index != -1) {
                d.mouseaction = {
                    m: "EM",
                    mesh: objlist[0].mesh.userData.id,
                    joint_index: point_index,
                    type: "joint",
                }
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
        if((objlist.length > 0) && ((objlist[0].mesh.userData.type === "device") || (objlist[0].mesh.userData.type === "text") || ((objlist[0].mesh.userData.type === "symbol"))) ) {
            v = d.wgl.getMeshRotation(d.current_view, objlist[0].mesh.userData.type, objlist[0].mesh.userData.id)
            d.mouseaction = {
                m: "ER",
                id: objlist[0].mesh.userData.id,
                type: objlist[0].mesh.userData.type,
                rx: v.x, ry: v.y, rz: v.z
            }
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
            (objlist.length > 0) && 
            ((objlist[0].mesh.userData.type === "device") || (objlist[0].mesh.userData.type === "symbol"))
          ) {
            d.mouseaction = {
                m: "EX",
                id: objlist[0].mesh.userData.id,
                type: objlist[0].mesh.userData.type,
                y: d.wgl.getMesh(d.current_view, "device", objlist[0].mesh.userData.id).parent.userData.e.sy,
            }
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
        (d.dom.tools.active_t === "ED") ||
        (d.dom.tools.active_t === "EC") ||
        (d.dom.tools.active_t === "EI")
        ) {
        // Element Delete, settings and data
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
            }
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
    else if (d.dom.tools.active_t === "AJ") {
        sendAdd_Joint(a.link_id, a.joint_index, a.px, a.py, a.pz);
    }
    else if (d.dom.tools.active_t.startsWith("AT")) {
        let mesh = d.wgl.getMesh(d.current_view, "text", "CURSOR");
        sendAdd_Text(
            mesh.userData.e.text,
            mesh.userData.e.type,
            mesh.userData.e.px, mesh.userData.e.py-mesh.parent.userData.e.sy, mesh.userData.e.pz, 
            mesh.userData.e.rx, mesh.userData.e.ry,
            mesh.userData.e.height, mesh.userData.e.depth,
            mesh.userData.e.color,
            mesh.userData.e.base
            );
        d.wgl.deleteMesh(d.current_view, "text", "CURSOR");
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
        if(a.type === "device") {
            sendMove(d.current_view, "device", a.mesh);
        }
        else if(a.type === "text") {
            sendMove(d.current_view, "text", a.mesh);
        }
        else if(a.type === "symbol") {
            sendMove(d.current_view, "symbol", a.mesh);
        }
        else if(a.type === "joint") {
            let m = d.wgl.getMesh(d.current_view, "link", a.mesh)
            sendMoveJoint(d.current_view, a.mesh, a.joint_index, m.userData.e.linedata.points[a.joint_index]);
        }
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
            if (a.obj.mesh.userData.type == "device") {
                WIN_showL2DeviceWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_L2Device("L2", "device", a.obj.mesh.userData.id, windata);
                    },
                    check_ifnaming);
            }
            else if (a.obj.mesh.userData.type == "link") {
                WIN_showL2LinkWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_L2Link("L2", "link", a.obj.mesh.userData.id, windata);
                    });
            }
            else if (a.obj.mesh.userData.type == "text") {
                WIN_showL2TextWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendSettings_L2Text("L2", "text", a.obj.mesh.userData.id, windata);
                    });
            }
            else if (a.obj.mesh.userData.type == "symbol") {
                if(a.obj.mesh.userData.e.type == "F")
                    WIN_showL2SymbolFlagWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                        (windata) => {
                            sendSettings_L2SymbolFlag("L2", "symbol", a.obj.mesh.userData.id, windata);
                        });
            }
        }
    }
    else if(d.dom.tools.active_t === "EI") {
        if ((x == a.x) && (y == a.y)) {
            if (a.obj.mesh.userData.type == "device") {
                WIN_showL2DeviceConfigWindow(d.current_view, a.obj.mesh.userData.type, a.obj.mesh.userData.id, a.obj.mesh.userData.e,
                    (windata) => {
                        sendConfig_L2Device(a.obj.mesh.userData.id, windata);
                    });
            }
            else if (a.obj.mesh.userData.type == "link") {
                let dev1 = d.wgl.getMesh("L2", "device", a.obj.mesh.userData.e.devs[0].id);
                let dev2 = d.wgl.getMesh("L2", "device", a.obj.mesh.userData.e.devs[1].id);
                WIN_showL2LinkConfigWindow(a.obj.mesh.userData.id, a.obj.mesh.userData.e, dev1.userData.e, dev2.userData.e, resolve_ifnaming,
                    (windata) => {
                        sendConfig_L2Link(a.obj.mesh.userData.id, windata);
                    },
                    (index) => {
                        WIN_showL2LinkConfigDeviceWindow(index, a.obj.mesh.userData.id, a.obj.mesh.userData.e, [dev1, dev2][index].userData.e, 
                            (windata) => {
                                sendConfig_L2LinkDevice(a.obj.mesh.userData.id, index, windata);
                            });
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
                    let point_index = d.wgl.findClosestLinkJointIndex(d.current_view, a.obj.mesh.userData.id, 
                        a.obj.p.x, a.obj.p.y, a.obj.p.z);

                    if (point_index != -1)
                        sendDeleteJoint(d.current_view, a.obj.mesh.userData.id, point_index);
                }
            }
            else if (a.obj.mesh.userData.type === "text") {
                sendDelete(a.obj.mesh.userData.type, a.obj.mesh.userData.id);
            }
            else if (a.obj.mesh.userData.type === "symbol") {
                sendDelete(a.obj.mesh.userData.type, a.obj.mesh.userData.id);
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
        d.wgl.moveMesh(d.current_view, "base", "CURSOR", p.x, p.y, p.z);
    }
    else if (d.dom.tools.active_t.startsWith("AD")) {
        let p = d.wgl.pickObject(x, y);
        let mesh = d.wgl.getMesh(d.current_view, "device", "CURSOR");

        for(let x = 0; x < p.length; x++) {
            if (p[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", p[x].mesh.userData.id, p[x].p.x, p[x].p.y, p[x].p.z);
                d.wgl.moveMesh(d.current_view, "device", "CURSOR", newcoords.x, newcoords.y, newcoords.z, p[x].mesh.userData.id);
                break;
            }
        }
    }    
    else if (d.dom.tools.active_t.startsWith("AT")) {
        let p = d.wgl.pickObject(x, y);
        let mesh = d.wgl.getMesh(d.current_view, "text", "CURSOR");

        for(let x = 0; x < p.length; x++) {
            if (p[x].mesh.userData.type === "base") {
                let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", p[x].mesh.userData.id, p[x].p.x, mesh.position.y, p[x].p.z);
                d.wgl.moveMesh(d.current_view, "text", "CURSOR", newcoords.x, newcoords.y, newcoords.z, p[x].mesh.userData.id);
                break;
            }
        }
    }    
    else if (d.dom.tools.active_t.startsWith("AL")) {
        let objlist = d.wgl.pickObject(x, y);
        let mesh = a.cursor;
        let dev2_id = -1;

        // Find if mouse is over a device
        for(let x = 0; x < objlist.length; x++) {
            if (objlist[x].mesh.userData.type === "device") {
                if (a.dev1_id != objlist[x].mesh.userData.id) {
                    dev2_id = objlist[x].mesh.userData.id;
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
            let p = d.wgl.convertMesh2WorldCoordinates(d.current_view, "device", dev2_id, 0, 0, 0);
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
                d.wgl.moveMesh(d.current_view, "symbol", "CURSOR", newcoords.x, newcoords.y, newcoords.z, p[x].mesh.userData.id);
                break;
            }
        }
    }    
    else if(d.dom.tools.active_t === "BM") {
        level = d.mouseaction.level;
        p = d.wgl.pickLevel(x, y, level);
        d.wgl.moveMesh(d.current_view, "base", d.mouseaction.id, 
            p.x - d.mouseaction.diffx, 0, p.z - d.mouseaction.diffz)
    }
    else if(d.dom.tools.active_t === "EM") {
        let objlist = d.wgl.pickObject(x, y);
        if((d.mouseaction.type === "device") || (d.mouseaction.type === "symbol")) {
            let mesh = d.wgl.getMesh(d.current_view, d.mouseaction.type, d.mouseaction.mesh);
            for(let x = 0; x < objlist.length; x++) {
                if(objlist[x].mesh.userData.type == "base") {
                    let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", objlist[x].mesh.userData.id, 
                        objlist[x].p.x, objlist[x].mesh.userData.e.sy, objlist[x].p.z);
                    d.wgl.moveMesh(d.current_view, d.mouseaction.type, d.mouseaction.mesh,
                        newcoords.x, newcoords.y, newcoords.z, 
                        objlist[x].mesh.userData.id);
                    break;
                }
            }
        }
        else if(d.mouseaction.type === "text") {
            let mesh = d.wgl.getMesh(d.current_view, "text", d.mouseaction.mesh);
            for(let x = 0; x < objlist.length; x++) {
                if(objlist[x].mesh.userData.type == "base") {
                    let newcoords = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", objlist[x].mesh.userData.id, 
                        objlist[x].p.x, objlist[x].mesh.userData.e.sy, objlist[x].p.z);
                    d.wgl.moveMesh(d.current_view, "text", d.mouseaction.mesh,
                        newcoords.x, undefined, newcoords.z, 
                        objlist[x].mesh.userData.id);
                    break;
                }
            }
        }
        else if(d.mouseaction.type === "joint") {
            let mesh = d.wgl.getMesh(d.current_view, "link", d.mouseaction.mesh);
            for(let x = 0; x < objlist.length; x++) {
                if(objlist[x].mesh.userData.type == "base") {
                    mesh.userData.e.linedata.points[d.mouseaction.joint_index] = [
                        objlist[x].p.x, objlist[x].p.y + mesh.userData.e.linedata.height , objlist[x].p.z
                    ]
                    d.wgl.updateLinkGeometry(mesh, d.current_view);
                }
            }
        }
    }
    else if(d.dom.tools.active_t === "BR") {
        d.mouseaction.ry = d.mouseaction.ry + (dx * 2 * Math.PI/360 * 5);
        d.wgl.rotateMesh(d.current_view, "base", d.mouseaction.id, d.mouseaction.rx, d.mouseaction.ry, d.mouseaction.rz);
    }
    else if(d.dom.tools.active_t === "ER") {
        if((d.mouseaction.type == "device") || (d.mouseaction.type == "symbol")) {
            d.mouseaction.ry = d.mouseaction.ry + (dx * 2 * Math.PI/360 * 5);
            d.wgl.rotateMesh(d.current_view, d.mouseaction.type, d.mouseaction.id, d.mouseaction.rx, d.mouseaction.ry, d.mouseaction.rz);
        }
        else if(d.mouseaction.type == "text") {
            d.mouseaction.ry = d.mouseaction.ry + (dx * 2 * Math.PI/360 * 5);
            d.mouseaction.rx = d.mouseaction.rx + (dy * 2 * Math.PI/360 * 5);
            if(d.mouseaction.rx > Math.PI/2)
                d.mouseaction.rx = Math.PI/2;
            if(d.mouseaction.rx < -Math.PI/2)
                d.mouseaction.rx = -Math.PI/2;
            d.wgl.rotateMesh(d.current_view, "text", d.mouseaction.id, d.mouseaction.rx, d.mouseaction.ry, d.mouseaction.rz);
        }
    }
    else if(d.dom.tools.active_t === "BX") {
        p = d.wgl.pickLevel(x, y, d.mouseaction.y);
        p = d.wgl.convertWorld2MeshCoordinates(d.current_view, "base", d.mouseaction.id, p.x, p.y, p.z)
        d.wgl.resizeMesh_Base(d.current_view, d.mouseaction.id, 
            Math.abs(p.x * 2), null, Math.abs(p.z * 2))
    }
    else if(d.dom.tools.active_t === "EX") {
        p = d.wgl.pickLevel(x, y, d.mouseaction.y);
        p = d.wgl.convertWorld2MeshCoordinates(d.current_view, d.mouseaction.type, d.mouseaction.id, p.x, p.y, p.z)
        let mesh = d.wgl.getMesh(d.current_view, d.mouseaction.type, d.mouseaction.id);
        let newscale = Math.abs(2*p.x*mesh.scale.x);
        if (Math.abs(p.z) > Math.abs(p.x))
            newscale = Math.abs(2*p.z*mesh.scale.z);
        d.wgl.resizeMesh(d.current_view, d.mouseaction.type, d.mouseaction.id, 
            newscale, newscale, newscale)
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
    d.dom.home.title = "Back to Home Page";

    // Button to change camera type
    d.dom.cam_type = DOM.cimg(b, staticurl + "/static/img/cam3d.png", "camtype", "box toolbutton", null, toggle_cam_type);
    d.dom.cam_type.title = "Change between 2D and 3D views (1)";
    d.dom.cam_type.setAttribute("data-camtype", "3D");

    // Button to change general settings
    d.dom.global_settings = DOM.cimg(b, staticurl + "/static/img/settings_w.png", "global_settings", "box toolbutton", null, () => {
        WIN_showGlobalSettingsWindow(d.wgl.global_settings, {
            show_device_name: (e) => { d.wgl.updateGlobalSettings_show_device_name(e); }
        });
    });
    d.dom.global_settings.title = "Global Settings";

    // Menu to open tools
    d.dom.tool_camera_b = DOM.cimg(b, staticurl + "/static/img/camera.png", "tool_camera_b", "box toolbutton", null, () => {
        d.dom.tools.active_tb = d.dom.tools.active_tb == "camera" ? "" : "camera";
    });
    d.dom.tool_camera_b.title = "Camera Actions";
    
    d.dom.tool_element_b = DOM.cimg(b, staticurl + "/static/img/element.png", "tool_element_b", "box toolbutton", null, () => {
        d.dom.tools.active_tb = d.dom.tools.active_tb == "element" ? "" : "element";
    });
    d.dom.tool_element_b.title = "Element Actions";
    
    d.dom.tool_new_b = DOM.cimg(b, staticurl + "/static/img/new.png", "tool_new_b", "box toolbutton", null, () => {
        d.dom.tools.active_tb = d.dom.tools.active_tb == "new" ? "" : "new";
    });
    d.dom.tool_new_b.title = "New Elements";

    // Toolbox states and dom elements
    d.dom.tools = {
        active_tb: "",
        active_t: "CM",
        toolboxes: {
            camera: {
                init_left: -142, left: -142, width: 128,
                name: "Move Camera",
                components: [
                    {n: "Move",     s: "CM",    i: "cam_move.png",      f: null, d: "Move the view (q)", q: "KeyQ"},
                    {n: "Rotate",   s: "CR",    i: "cam_rotate.png",    f: null, d: "Rotate the view (w)", q: "KeyW"},
                    {n: "Zoom",     s: "CZ",    i: "cam_zoom.png",      f: null, d: "Zoom in and out (e)", q: "KeyE"},
                ]},
            element: {
                init_left: -142, left: -142, width: 128,
                name: "Change Elements",
                components: [
                    {n: "Move",     s: "EM",    i: "move.png",      f: null, d: "Move diagram elements (a)", q: "KeyA"},
                    {n: "Rotate",   s: "ER",    i: "rotate.png",    f: null, d: "Rotate diagram elements (s)", q: "KeyS"},
                    {n: "Resize",   s: "EX",    i: "resize.png",    f: null, d: "Resize diagram elements (d)", q: "KeyD"},
                    {n: "Settings", s: "EC",    i: "settings.png",  f: null, d: "View the settings of an element (z)", q: "KeyZ"},
                    {n: "Config",   s: "EI",    i: "edit.png",      f: null, d: "View config related to a diagram element (x)", q: "KeyX"},
                    {n: "Delete",   s: "ED",    i: "delete.png",    f: null, d: "Delete an element of the diagram (c)", q: "KeyC"},
                    {n: "Base",     s: null,    i: "base.png",      f: "base_change"},
                ]},
            new: {
                init_left: -142, left: -142, width: 128,
                name: "Add New Elements",
                components: [
                    {n: "Device",   s: null,    i: "device_router.png",      f: "new_device" },
                    {n: "Link",     s: null,    i: "link.png",      f: "new_link" },
                    {n: "Base",     s: null,    i: "base.png",    f: "new_base" },
                    {n: "Text",     s: null,    i: "text.png",    f: "new_text" },
                    {n: "Symbol",   s: null,    i: "symbol.png",    f: "new_symbol" },
                ]},
            new_device: {
                init_left: -190, left: -190, width: 170,
                name: "Add Device",
                components: [
                    {n: "Router",   s: "ADR",    i: "device_router.png",      f: null},
                    {n: "Switch",   s: "ADS",    i: "device_switch.png",      f: null},
                    {n: "ML Dev",   s: "ADML",   i: "device_ml.png",      f: null},
                    {n: "Firewall", s: "ADF",    i: "device_firewall.png",      f: null},
                    {n: "Load B",   s: "ADLB",   i: "device_lb.png",      f: null},
                    {n: "Server",   s: "ADSR",   i: "device_server.png",    f: null},
                    {n: "Storage",  s: "ADST",   i: "device_storage.png",    f: null},
                ]},
            new_link: {
                init_left: -190, left: -190, width: 170,
                name: "Add Link",
                components: [
                    {n: "Line",     s: "ALL",    i: "link_line.png",      f: null},
                    {n: "Squared",  s: "ALS",    i: "link_squared.png",      f: null},
                    {n: "Joint",    s: "AJ",     i: "link_joint.png",      f: null},
                ]},
            new_base: {
                init_left: -190, left: -190, width: 170,
                name: "Add Base",
                components: [
                    {n: "Floor",    s: "ABF",    i: "base.png",      f: null},
                ]},
            new_text: {
                init_left: -190, left: -190, width: 170,
                name: "Add Text",
                components: [
                    {n: "Base",     s: "ATB",    i: "text.png",      f: null},
                ]},
            new_symbol: {
                init_left: -190, left: -190, width: 170,
                name: "Add Symbol",
                components: [
                    {n: "Flag",     s: "ASF",    i: "symbol_flag.png",      f: null},
                    {n: "X",        s: "ASX",    i: "symbol_x.png",      f: null},
                    {n: "V",        s: "ASV",    i: "symbol_v.png",      f: null},
                ]},
            base_change: {
                init_left: -142, left: -142, width: 128,
                name: "Change Base",
                components: [
                    {n: "Move",     s: "BM",    i: "move.png",      f: null, d: "Move floors/walls (f)", q: "KeyF"},
                    {n: "Rotate",   s: "BR",    i: "rotate.png",    f: null, d: "Rotate floors/walls (g)", q: "KeyG"},
                    {n: "Resize",   s: "BX",    i: "resize.png",    f: null, d: "Resize floors/walls (h)", q: "KeyH"},
                    {n: "Settings", s: "BC",    i: "settings.png",  f: null, d: "View the settings of floors/walls (v)", q: "KeyV"},
                    {n: "Delete",   s: "BD",    i: "delete.png",    f: null, d: "Delete floors/walls (b)", q: "KeyB"},
                ]},
        }
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

    // Set up WGL
    init_wgl();

    // Initialize the diagram
    init_diagram();

    // Initialize input
    Input_initialize(document.body, null, null, null);
    Input_registerid("page", mousedown, mouseup, mousemove);
    WIN_initialize();
    
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
