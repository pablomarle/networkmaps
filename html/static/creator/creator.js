let wgl;
let staticurl = "";
let s = [[], []];

function deg2rad(angle) {
    return angle/360*2*Math.PI;
}

function move(g, px, py, pz) {
    g.v.forEach((e) => {
        e[0] = e[0] + px;
        e[1] = e[1] + py;
        e[2] = e[2] + pz;
    })
}

function scale(g, sx, sy, sz) {
    g.v.forEach((e) => {
        e[0] = e[0] * sx;
        e[1] = e[1] * sy;
        e[2] = e[2] * sz;
    })
}

function rotate(g, rx, ry, rz) {
    let ax = new THREE.Vector3(1,0,0);
    let ay = new THREE.Vector3(0,1,0);
    let az = new THREE.Vector3(0,0,1);
    g.v.forEach((e) => {
        let v = new THREE.Vector3(e[0], e[1], e[2]);
        v.applyAxisAngle(ax, deg2rad(rx));
        v.applyAxisAngle(ay, deg2rad(ry));
        v.applyAxisAngle(az, deg2rad(rz));
        e[0] = v.x;
        e[1] = v.y;
        e[2] = v.z;
    })
}

function createCylinder(circ_points, rb, rt) {
    let v = [];
    let f = [];
    let uv = [];

    // Side faces
    for(let x = 0; x < circ_points + 1; x++) {
        let angle = x / circ_points * Math.PI * 2;
        v.push([Math.cos(angle) * rt, 1, Math.sin(angle) * rt]);
        v.push([Math.cos(angle) * rb, 0, Math.sin(angle) * rb]);
    }

    for(let x = 0; x < circ_points; x++) {
        let tx1 = x / circ_points * Math.PI;
        let tx2 = (x+1) / circ_points * Math.PI;
        f.push([x*2, x*2+3, x*2+1]);
        f.push([x*2, x*2+2, x*2+3]);
        uv.push([[tx1, 0], [tx2, 1], [tx1, 1]]);
        uv.push([[tx1, 0], [tx2, 0], [tx2, 1]]);
    }

    let base_index = v.length;
    
    for(let x = 0; x < circ_points + 1; x++) {
        let angle = x / circ_points * Math.PI * 2;
        v.push([Math.cos(angle) * rt, 1, Math.sin(angle) * rt]);
        v.push([Math.cos(angle) * rb, 0, Math.sin(angle) * rb]);
    }

    // Add top and bottom faces
    let tx0 = 1, ty0 = .5
    for(let x = 1; x < circ_points; x++) {
        let angle1 = x / circ_points * Math.PI * 2;
        let angle2 = (x+1) / circ_points * Math.PI * 2;
        let tx1 = Math.cos(angle1) * .5 + .5;
        let ty1 = -Math.sin(angle1) * .5 + .5;
        let tx2 = Math.cos(angle2) * .5 + .5;
        let ty2 = -Math.sin(angle2) * .5 + .5;
        f.push([base_index + 0, base_index + x*2+2, base_index + x*2]);
        uv.push([[tx0, ty0], [tx2, ty2], [tx1, ty1]]);
        f.push([base_index + 1, base_index + x*2+1, base_index + x*2+3]);
        uv.push([[tx0, ty0], [tx1, ty1], [tx2, ty2]]);
    }

    return {v: v, f: f, uv: uv}
}

function createAnnularCylinder(circ_points, r1, r2) {
    let v = [];
    let f = [];
    let uv = [];
    for(let x = 0; x < circ_points + 1; x++) {
        let angle = x / circ_points * Math.PI * 2;
        v.push([Math.cos(angle) * r1, 1, Math.sin(angle) * r1]);
        v.push([Math.cos(angle) * r2, 1, Math.sin(angle) * r2]);
    }
    for(let x = 0; x < circ_points + 1; x++) {
        let angle = x / circ_points * Math.PI * 2;
        v.push([Math.cos(angle) * r2, 1, Math.sin(angle) * r2]);
        v.push([Math.cos(angle) * r2, 0, Math.sin(angle) * r2]);
    }
    for(let x = 0; x < circ_points + 1; x++) {
        let angle = x / circ_points * Math.PI * 2;
        v.push([Math.cos(angle) * r2, 0, Math.sin(angle) * r2]);
        v.push([Math.cos(angle) * r1, 0, Math.sin(angle) * r1]);
    }
    for(let x = 0; x < circ_points + 1; x++) {
        let angle = x / circ_points * Math.PI * 2;
        v.push([Math.cos(angle) * r1, 0, Math.sin(angle) * r1]);
        v.push([Math.cos(angle) * r1, 1, Math.sin(angle) * r1]);
    }
    let txdiff = 2*Math.PI * r2/circ_points;
    for(let m = 0; m < 4; m++) {
        let base_index = m*(circ_points+1) * 2;
        for(let x = 0; x < circ_points; x++) {
            f.push([base_index + x*2, base_index + (x+1)*2 + 1, base_index + x*2+1]);
            f.push([base_index + x*2, base_index + (x+1)*2, base_index + (x+1)*2 + 1]);
            if((m%2) == 1) {
                uv.push([[txdiff*x, 0], [txdiff*(x+1), 1], [txdiff*x, 1]]);
                uv.push([[txdiff*x, 0], [txdiff*(x+1), 0], [txdiff*(x+1), 1]]);
            }
            else {
                uv.push([[txdiff*x, 0], [txdiff*(x+1), r2-r1], [txdiff*x, r2-r1]]);
                uv.push([[txdiff*x, 0], [txdiff*(x+1), 0], [txdiff*(x+1), r2-r1]]);
            }
        }
    }
    return {v: v, f: f, uv: uv}
}

function createCube(sx2, sy2, sz2) {
    let v = [
        [-.5, 0, -.5],
        [.5, 0, -.5],
        [.5*sx2, 0, .5*sz2],
        [-.5*sx2, 0, .5*sz2],
        [-.5, 1, -.5],
        [.5, 1, -.5],
        [.5*sx2, sy2, .5*sz2],
        [-.5*sx2, sy2, .5*sz2],
    ];
    let f = [
        [0,1,2], [0,2,3],
        [4,6,5], [4,7,6],
        [0,5,1], [0,4,5],
        [1,6,2], [1,5,6],
        [2,7,3], [2,6,7],
        [3,4,0], [3,7,4],
    ];
    let uv = [
        [[0,1], [1,1], [1,0]], [[0,1], [1,0], [0,0]],
        [[0,1], [1,0], [1,1]], [[0,1], [0,0], [1,0]],

        [[0,0], [1,1], [1,0]], [[0,0], [0,1], [1,1]],
        [[0,0], [1,1], [1,0]], [[0,0], [0,1], [1,1]],
        [[0,0], [1,1], [1,0]], [[0,0], [0,1], [1,1]],
        [[0,0], [1,1], [1,0]], [[0,0], [0,1], [1,1]],
    ]

    return {v: v, f: f, uv: uv}
}

function createPrysm(steps) {
    let v = [];
    let f = [];
    let uv = [];

    for(let x = 0; x < steps+1; x++) {
        let a_i = -x * 2 * Math.PI / steps;
        v.push([
            .5 * Math.cos(a_i),
            0,
            .5 * Math.sin(a_i)
        ]);
    }
    for(let x = 0; x < steps+1; x++) {
        let a_i = -x * 2 * Math.PI / steps;
        v.push([
            0,
            1,
            0
        ]);
    }

    for(let x = 0; x < steps; x++) {
        f.push([x, x+1, (steps+1)+x+1]);
        f.push([x, (steps+1)+x+1, (steps+1)+x]);
        uv.push([[x/steps, 1], [(x+1)/steps, 1], [(x+1)/steps, 0]])
        uv.push([[x/steps, 1], [(x+1)/steps, 0], [x/steps, 0]])
    }
    for(let x = 2; x < steps; x++) {
        f.push([0, x, x-1]);
        uv.push([[0,0],[0,0],[0,0]]);
    }
    return {v: v, f: f, uv: uv}
}

function createSphere(stepsH, stepsV) {
    let v = [];
    let f = [];
    let uv = [];
    for(let j = 0; j < ((stepsV/2)+1); j++) {
        let a_j = Math.PI/2 - j*2*Math.PI / stepsV
        for(let i = 0; i < stepsH + 1; i++) {
            let a_i = -i * 2 * Math.PI / stepsH;
            v.push([
                .5 * Math.cos(a_i) * Math.cos(a_j),
                .5 + -.5 * Math.sin(a_j),
                .5 * Math.sin(a_i) * Math.cos(a_j)
            ])
        }
    }

    for(let j = 0; j < ((stepsV/2)); j++) {
        for(let i = 0; i < stepsH; i++) {
            f.push([j*(stepsH+1)+i, j*(stepsH+1)+i+1, (j+1)*(stepsH+1)+i+1]);
            f.push([j*(stepsH+1)+i, (j+1)*(stepsH+1)+i+1, (j+1)*(stepsH+1)+i]);
            uv.push([ 
                [i/stepsH+.5, j*2/stepsV], 
                [(i+1)/stepsH+.5, j*2/stepsV], 
                [(i+1)/stepsH+.5, (j+1)*2/stepsV] 
                ]);
            uv.push([ 
                [i/stepsH+.5, j*2/stepsV], 
                [(i+1)/stepsH+.5, (j+1)*2/stepsV], 
                [i/stepsH+.5, (j+1)*2/stepsV] 
                ]);
        }
    }

    return {v: v, f: f, uv: uv}
}

function createSemiSphere(stepsH, stepsV) {
    let v = [];
    let f = [];
    let uv = [];
    for(let j = 0; j < stepsV; j++) {
        let a_j = -Math.PI/2 + Math.PI/2 * j/(stepsV-1);
        for(let i = 0; i < stepsH + 1; i++) {
            let a_i = i * 2 * Math.PI / stepsH;
            v.push([
                .5 * Math.cos(a_i) * Math.cos(a_j),
                -.5 * Math.sin(a_j),
                .5 * Math.sin(a_i) * Math.cos(a_j)
            ])
        }
    }

    for(let j = 0; j < stepsV-1; j++) {
        for(let i = 0; i < stepsH; i++) {
            f.push([j*(stepsH+1)+i, j*(stepsH+1)+i+1, (j+1)*(stepsH+1)+i+1]);
            f.push([j*(stepsH+1)+i, (j+1)*(stepsH+1)+i+1, (j+1)*(stepsH+1)+i]);
            uv.push([ 
                [1-i/stepsH+.5, 1-j/stepsV], 
                [1-(i+1)/stepsH+.5, 1-j/stepsV], 
                [1-(i+1)/stepsH+.5, 1-(j+1)/stepsV] 
                ]);
            uv.push([ 
                [1-i/stepsH+.5, 1-j/stepsV], 
                [1-(i+1)/stepsH+.5, 1-(j+1)/stepsV], 
                [1-i/stepsH+.5, 1-(j+1)/stepsV] 
                ]);
        }
    }

    // Base
    let base = v.length;
    for(let i = 0; i < stepsH + 1; i++) {
        let a_i = i * 2 * Math.PI / stepsH;
        v.push([
            .5 * Math.cos(a_i),
            0,
            .5 * Math.sin(a_i)
        ])
    }
    for(let i = 0; i < stepsH-2; i++) {
        f.push([base, base+i+1, base+i+2]);
        uv.push([ 
            [1,.5],
            [.5 + .5 * Math.cos((i+1)*2*Math.PI/stepsH), .5 + .5 * Math.sin((i+1)*2*Math.PI/stepsH)], 
            [.5 + .5 * Math.cos((i+2)*2*Math.PI/stepsH), .5 + .5 * Math.sin((i+2)*2*Math.PI/stepsH)] 
            ]);
    }

    return {v: v, f: f, uv: uv}
}

function combine(g1, g2) {
    let result = {v:[], f:[], uv:[]}
    let l = [g1, g2];
    l.forEach((g) => {
        let base_index = result.v.length;
        
        for(let x = 0; x < g.v.length; x++) {
            result.v.push([g.v[x][0], g.v[x][1], g.v[x][2]]);
        }

        for(let x = 0; x < g.f.length; x++) {
            result.f.push([base_index + g.f[x][0], base_index + g.f[x][1], base_index + g.f[x][2]]);
        }
        for(let x = 0; x < g.uv.length; x++) {
            result.uv.push([ [g.uv[x][0][0], g.uv[x][0][1]], [g.uv[x][1][0], g.uv[x][1][1]], [g.uv[x][2][0], g.uv[x][2][1]] ]);
        }
    });

    return result;
}

function generate_geometry() {
    let color1 = document.getElementById("color1").value;
    let color2 = document.getElementById("color2").value;
    let texture1 = document.getElementById("texture1").value;
    let texture2 = document.getElementById("texture2").value;
    let g = {v:[], f:[], uv:[]}
    for(let x = 0; x < 2; x++) {
        let og = {v:[], f:[], uv:[]}
        let shape_list = s[x];
        if(shape_list.length == 0)
            continue

        for(let y = 0; y < shape_list.length; y++) {
            let entry = shape_list[y];
            let ng;
            if(entry.type == "sphere") {
                ng = createSphere(entry.e1, entry.e2);
                scale(ng, entry.sx, entry.sy, entry.sz);
                rotate(ng, entry.rx, entry.ry, entry.rz);
                move(ng, entry.px, entry.py, entry.pz);
            }
            else if(entry.type == "sphere2") {
                ng = createSemiSphere(entry.e1, entry.e2);
                scale(ng, entry.sx, entry.sy, entry.sz);
                rotate(ng, entry.rx, entry.ry, entry.rz);
                move(ng, entry.px, entry.py, entry.pz);
            }
            else if(entry.type == "prysm") {
                ng = createPrysm(entry.e1);
                scale(ng, entry.sx, entry.sy, entry.sz);
                rotate(ng, entry.rx, entry.ry, entry.rz);
                move(ng, entry.px, entry.py, entry.pz);
            }
            else if(entry.type == "cube") {
                ng = createCube(entry.e1, entry.e2, entry.e3);
                scale(ng, entry.sx, entry.sy, entry.sz);
                rotate(ng, entry.rx, entry.ry, entry.rz);
                move(ng, entry.px, entry.py, entry.pz);
            }
            else if(entry.type == "cylinder") {
                ng = createCylinder(entry.e1, entry.e2, entry.e3);
                scale(ng, entry.sx, entry.sy, entry.sz);
                rotate(ng, entry.rx, entry.ry, entry.rz);
                move(ng, entry.px, entry.py, entry.pz);
            }
            else if(entry.type == "acylinder") {
                ng = createAnnularCylinder(entry.e1, entry.e2, entry.e3);
                scale(ng, entry.sx, entry.sy, entry.sz);
                rotate(ng, entry.rx, entry.ry, entry.rz);
                move(ng, entry.px, entry.py, entry.pz);
            }
            else
                continue

            og = combine(og, ng);
        }
        g.v.push(og.v);
        g.f.push(og.f);
        g.uv.push(og.uv);
    }
    g.base_scale = [1,1,1];
    g.flat_normals = document.getElementById("flat_normals").value == "flat";
    g.texture = [texture1, texture2];
    g.color = [parseInt(color1), parseInt(color2)];
    GEOMETRY.DEVICE.UNK = g;

    let result = document.getElementById("result_cell");
    DOM.removeChilds(result, true);
    DOM.cdiv(result, null, null, JSON.stringify(g));

    wgl.deleteMesh("L2", "device", "TEST");
    wgl.addDevice("TEST", "L2", {
        type: "UNK", name: "",
        px: 0, py: 4, pz: 0,
        rx: 0, ry: 0, rz: 0,
        sx: 1, sy: 1, sz: 1,
        color1: color1, color2: color2,

        base: "BASE",       
    });
    wgl.draw();    
}

function remove_shape() {
    let shape = this.getAttribute("data-s");
    let index = this.getAttribute("data-i");

    s[shape].splice(index, 1);
    draw_shape_data();
}

function draw_shape_data() {
    for(let x = 0; x < 2; x++) {
        let shape_list = s[x];
        let container = document.getElementById("shape_" + x);

        DOM.removeChilds(container, true);
        for(let y = 0; y < shape_list.length; y++) {
            let entry = shape_list[y];
            let entry_div = DOM.cdiv(container, null, "form_horizontal");
            DOM.cdiv(entry_div, null, "data", entry.type);
            DOM.cdiv(entry_div, null, "data", "P(" + entry.px + ", " + entry.py + ", " + entry.pz + ")");
            DOM.cdiv(entry_div, null, "data", "S(" + entry.sx + ", " + entry.sy + ", " + entry.sz + ")");
            DOM.cdiv(entry_div, null, "data", "R(" + entry.rx + ", " + entry.ry + ", " + entry.rz + ")");
            let button = DOM.cbutton(entry_div, null, null, "Remove", {"s": x, "i": y}, remove_shape);
        }
    }

    generate_geometry();
}

function apply_extra_options(options) {
    for(let x = 1; x < 4; x++) {
        if(options[x-1] == null) {
            document.getElementById("extra" + x).style.display = "none";
        }
        else {
            document.getElementById("extra" + x).style.display = "block";
            document.getElementById("extra" + x + "_label").innerHTML = options[x-1][0];
            document.getElementById("extra" + x + "_input").value = options[x-1][1];
        }
    }
}
function update_extra_options() {
    let type = document.getElementById("s_type").value;
    if(type == "acylinder") {
        apply_extra_options([
            ["Num Points", 32],
            ["R. Int", .5],
            ["R. Ext", .6],
            ]);
    }
    else if(type == "cylinder") {
        apply_extra_options([
            ["Num Points", 32],
            ["R. Bottom", .5],
            ["R. Top", .5],
            ]);        
    }
    else if(type == "sphere") {
        apply_extra_options([
            ["N Points H", 16],
            ["N Points V", 16],
            null])
    }
    else if(type == "sphere2") {
        apply_extra_options([
            ["N Points H", 16],
            ["N Points V", 8],
            null])
    }
    else if(type == "prysm") {
        apply_extra_options([
            ["N Points", 32],
            null, null])
    }
    else if(type == "cube") {
        apply_extra_options([
            ["SX2", 1],
            ["SY2", 1],
            ["SZ2", 1]
            ]);        
    }
    else {
        apply_extra_options([null, null, null]);
    }
}
function main() {
    wgl = new WGL(document.getElementById("draw_cell"));
    wgl.addCubeFloor("BASE", "L2", {
        type: "F",
        name: "",
        px: 0, py: 0, pz: 0,
        rx: 0, ry: 0, rz: 0,
        sx: 5, sy: .5, sz: 5,
        color1: 0xffffff,
        color2: 0xffbbaa,
        t1name: "b1_t1",
        t2name: "b2_t1",
        tsx:1, tsy: 1,
        data: [],       
    });
    wgl.addDevice("TEST", "L2", {
        type: "UNK", name: "",
        px: 0, py: 4, pz: 0,
        rx: 0, ry: 0, rz: 0,
        sx: 1, sy: 1, sz: 1,
        color1: 0x66aaff, color2: 0xff4444,

        base: "BASE",       
    });
    wgl.setCamera(3, 6, 6, deg2rad(-40), deg2rad(25), 0);

    setInterval(() => {
        wgl.updateDeviceGeometry("TEST", "L2");
        wgl.draw();
    }, 1000);

    /*let g1 = createSphere();
    let g2 = createPrysm();
    g1 = combine(g1, g2);
    GEOMETRY.DEVICE.UNK = g1;
    GEOMETRY.DEVICE.UNK.base_scale = [1,1,1];
    GEOMETRY.DEVICE.UNK.flat_normals = false; */

    let add = document.getElementById("s_add");
    add.addEventListener("click", () => {
        let shape = document.getElementById("s_id").value;
        let type = document.getElementById("s_type").value;
        let px = parseFloat(document.getElementById("s_px").value);
        let py = parseFloat(document.getElementById("s_py").value);
        let pz = parseFloat(document.getElementById("s_pz").value);
        let sx = parseFloat(document.getElementById("s_sx").value);
        let sy = parseFloat(document.getElementById("s_sy").value);
        let sz = parseFloat(document.getElementById("s_sz").value);
        let rx = parseFloat(document.getElementById("s_rx").value);
        let ry = parseFloat(document.getElementById("s_ry").value);
        let rz = parseFloat(document.getElementById("s_rz").value);
        let e1 = parseFloat(document.getElementById("extra1_input").value);
        let e2 = parseFloat(document.getElementById("extra2_input").value);
        let e3 = parseFloat(document.getElementById("extra3_input").value);

        s[shape].push({
            type: type,
            px: px,
            py: py,
            pz: pz,
            sx: sx,
            sy: sy,
            sz: sz,
            rx: rx,
            ry: ry,
            rz: rz,
            e1: e1,
            e2: e2,
            e3: e3,
        });

        draw_shape_data();
    });

    document.getElementById("camera_1").addEventListener("click", () => {
        wgl.setCamera(3, 6, 6, deg2rad(-40), deg2rad(25), 0);
    })
    document.getElementById("camera_2").addEventListener("click", () => {
        wgl.setCamera(-3, 6, 6, deg2rad(-40), deg2rad(-25), 0);
    })
    document.getElementById("camera_3").addEventListener("click", () => {
        wgl.setCamera(-3, 6, -6, deg2rad(-40), deg2rad(205), 0);
    })
    document.getElementById("camera_4").addEventListener("click", () => {
        wgl.setCamera(3, 6, -6, deg2rad(-40), deg2rad(-205), 0);
    })

    document.getElementById("flat_normals").addEventListener("change", draw_shape_data);
    document.getElementById("s_type").addEventListener("change", update_extra_options);
    update_extra_options();
}
