// Shaders
const DEVICE_VERTEX_SHADER = `
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
        vUv = uv;
        vNormal = normalMatrix * normal;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
`

const DEVICE_FRAGMENT_SHADER = `
#if NUM_DIR_LIGHTS > 0
    struct DirectionalLight {
        vec3 direction;
        vec3 color;
        int shadow;
        float shadowBias;
        float shadowRadius;
        vec2 shadowMapSize;
     };
    uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
#endif
    uniform vec3 ambientLightColor;
    
    varying vec2 vUv;
    varying vec3 vNormal;

    uniform sampler2D map;
    uniform vec3 mycolor;

    void main() {
        vec4 textureColor = texture2D(map, vUv);
        vec4 tex_color = vec4(textureColor.r + (1.0-textureColor.r) * mycolor.r, textureColor.g + (1.0-textureColor.g) * mycolor.g, textureColor.b + (1.0-textureColor.b) * mycolor.b, 1.0);
        //vec4 tex_color = texture2D(map, vUv) + vec4(mycolor, 1.0);
        vec4 light = vec4(0, 0, 0, 1.0);
        
        vec3 norm = normalize(vNormal);

        for(int i = 0; i < NUM_DIR_LIGHTS; i++) {
            vec3 lightdir = normalize(directionalLights[i].direction);
            light.rgb += clamp(
                            dot(
                                lightdir,
                                norm
                            ), 
                            0.0, 
                            1.0
                            )
                         * directionalLights[i].color
                         * vec3(1,1,1);
        }

        gl_FragColor = tex_color * (light + vec4(ambientLightColor, 0.0));
    }
`

const PARAMETERS_ELEMENT_CUBE = ["px", "py", "pz", "rx", "ry", "rz", "sx", "sy", "sz", "u1", "u2", "v1", "v2"];

let data_editor = {
    dom: {},
    unsaved_changes: false,
    mouse: {},
};

function draw() {
    if(data_editor.draw_needed) {
        data_editor.renderer.render( data_editor.scene, data_editor.camera );
        data_editor.draw_needed = false;
    }
}

function requestDraw() {
    if(!data_editor.draw_needed) {
        data_editor.draw_needed = true;
        requestAnimationFrame( () => {
            draw();
        });
    }
}

function processLoadedTexture(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;

    requestDraw();
}

function loadTexture(texture_url) {
        let texture = new THREE.TextureLoader().load(texture_url, (t) => {
            processLoadedTexture(t);
        });
        return texture;
}

function $WGL_V3(x,y,z) {return new THREE.Vector3(x,y,z)}
function $WGL_V2(x,y) {return new THREE.Vector2(x,y)}
function $WGL_F3(a,b,c) {return new THREE.Face3(a,b,c)}

function wgl_mousedown(x, y, dx, dy, dom_element) {
    data_editor.mouse.buttondown = true;
}

function wgl_mouseup(x, y, dx, dy, dom_element) {
    data_editor.mouse.buttondown = false;
}

function wgl_mousemove(x, y, dx, dy, dom_element) {
    if(data_editor.mouse.buttondown) {
        data_editor.camera_position.rx -= dy/100;
        data_editor.camera_position.ry -= dx/100;
        update_camera_position();
    }
}

function wgl_mouseout(x, y, dom_element) {
    data_editor.mouse.buttondown = false;
}

function wgl_mousewheel(dx, dy, dom_element) {
    data_editor.camera_position.distance += dy*.2;
    if((data_editor.camera_position.distance < 2) && (dy < 0))
        data_editor.camera_position.distance = 2;
    if((data_editor.camera_position.distance > 20) && (dy > 0))
        data_editor.camera_position.distance = 20;
    
    update_camera_position();
}

function update_camera_position() {
    let euler = new THREE.Euler(data_editor.camera_position.rx, data_editor.camera_position.ry, 0, "YXZ");
    let vector = new THREE.Vector3(0,0, data_editor.camera_position.distance).applyEuler(euler);
    data_editor.camera.position.x = vector.x;
    data_editor.camera.position.y = vector.y;
    data_editor.camera.position.z = vector.z;
    data_editor.camera.rotation.x = data_editor.camera_position.rx;
    data_editor.camera.rotation.y = data_editor.camera_position.ry;
    requestDraw();
}

function init_wgl() {
    let domelement = data_editor.dom.drawing;

    // Renderer
    data_editor.renderer = new THREE.WebGLRenderer({
        antialias:true,
        preserveDrawingBuffer: true,
        alpha: true,
    });
    data_editor.renderer.setSize(domelement.clientWidth, domelement.clientHeight);
    data_editor.renderer.setClearColor(0xf0f0f0, 0);
    domelement.appendChild(data_editor.renderer.domElement);

    // Scene
    data_editor.scene = new THREE.Scene();

    // Camera
    let cam_ratio = domelement.clientWidth / domelement.clientHeight;
    data_editor.camera = new THREE.PerspectiveCamera( 15, cam_ratio, 0.1, 1000 );
    data_editor.camera_position = { rx: -Math.PI/8, ry: Math.PI/4, distance: 8 }
    update_camera_position();
    data_editor.camera.rotation.order="YXZ";

    // Lighting
    data_editor.ambientlight = new THREE.AmbientLight(0xFFFFFF, 0.7);
    data_editor.directionallight = new THREE.DirectionalLight(0xFFFFFF, .4);
    data_editor.directionallight.position.set(40,100,60);

    data_editor.scene.add(data_editor.ambientlight);
    data_editor.scene.add(data_editor.directionallight);

    // Controls
    //Input_initialize(document.body, null, null, null, null);
    //Input_registerid("drawing", wgl_mousedown, wgl_mouseup, wgl_mousemove, wgl_mouseout, wgl_mousewheel);
    Input_initialize(domelement, wgl_mousedown, wgl_mouseup, wgl_mousemove, wgl_mouseout, wgl_mousewheel);

    // Final request draw.
    requestDraw();
}

function WGL_createDeviceMaterial(parameters) {
    let uniforms = THREE.UniformsUtils.merge( [
            THREE.UniformsLib[ "common" ],
            THREE.UniformsLib[ "lights" ],
            {
                mycolor: {type: 'c', value: new THREE.Color() }
            },
        ]);
    uniforms.map.value = parameters.map;
    uniforms.mycolor.value = new THREE.Color(parameters.mycolor);

    let material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: DEVICE_VERTEX_SHADER,
        fragmentShader: DEVICE_FRAGMENT_SHADER,

        lights: true,
    });

    return material;
}

/**
 * Function to remove all dom elements from the draw, edit and config panels
 */
function empty_all() {
    DOM.removeChilds(data_editor.dom.edit, true);
    DOM.removeChilds(data_editor.dom.edit2, true);
    DOM.removeChilds(data_editor.dom.config, true);

    if(data_editor.active_3dshape) {
        data_editor.scene.remove(data_editor.active_3dshape);
        data_editor.active_3dshape = null;
        requestDraw();
    }
    data_editor.dom.drawing_capture.style.display = "none";
}

function mesh_addData(mesh, type, shape_key, subshape_index, element_index, additional_index) {
    mesh.userData.type = type;
    mesh.userData.shape_key = shape_key;
    mesh.userData.subshape_index = subshape_index;
    mesh.userData.element_index = element_index;
    mesh.userData.additional_index = additional_index;
}

function show_vertex_wgl(shape_key, subshape_index, vertex_index, visible) {
    data_editor.active_3dshape.children.forEach((element) => {
        if(
            (element.userData.type === "vertex") &&
            (element.userData.shape_key == shape_key) &&
            (element.userData.subshape_index == subshape_index) &&
            (element.userData.additional_index == vertex_index)
            )
            element.visible = visible;
    });
    requestDraw();
}

function show_shape_wgl(shape_key) {
    if(data_editor.active_3dshape) {
        data_editor.scene.remove(data_editor.active_3dshape);
        data_editor.active_3dshape = null;
    }
    let group = new THREE.Group();
    let shape = data_editor.definition.shapes[shape_key];
    data_editor.active_3dshape = group;
    data_editor.scene.add(group);
    group.position.y = -shape.base_scale[1]/2;

    // Create meshes used to show what vertex is mouseover
    let vertex_texture = new THREE.MeshPhongMaterial( {color: 0x000000} );
    for(let ss_index = 0; ss_index < shape.subshapes.length; ss_index ++) {
        let ss = shape.subshapes[ss_index];
        for(let element_index = 0; element_index < ss.elements.length; element_index ++) {
            let element = ss.elements[element_index];

            if(element.type === "vertex_list") {
                for(let x = 0; x < element.v.length; x++) {
                    let geometry = new THREE.BoxGeometry( .02, .02, .02 );
                    let mesh = new THREE.Mesh(geometry, vertex_texture);
                    mesh.position.x = element.v[x][0] * shape.base_scale[0];
                    mesh.position.y = element.v[x][1] * shape.base_scale[1];
                    mesh.position.z = element.v[x][2] * shape.base_scale[2];
                    group.add(mesh);
                    mesh_addData(mesh, "vertex", shape_key, ss_index, element_index, x);

                    mesh.visible = false;
                }
            }
        }
    }

    // Create Object
    let texture_path = "/3dshapes/" + shapegroup_key + "/";
    for(let ss_index = 0; ss_index < shape.subshapes.length; ss_index ++) {
        let ss = shape.subshapes[ss_index];
        let texture = loadTexture(texture_path + ss.texture);
        let material = WGL_createDeviceMaterial({map: texture, mycolor: ss.color});

        for(let element_index = 0; element_index < ss.elements.length; element_index ++) {
            let element = ss.elements[element_index];
            let g = new THREE.Geometry();

            element = shapetools_generate_as_vertexlist(element);
            
            if(element.type === "vertex_list") {
                for(let x = 0; x < element.v.length; x++) {
                    let v = element.v[x];
                    g.vertices.push($WGL_V3(v[0] * shape.base_scale[0], v[1] * shape.base_scale[1], v[2] * shape.base_scale[2]))
                }
                for(let x = 0; x < element.f.length; x++) {
                    let f = element.f[x];
                    let uv = element.uv[x];
                    g.faces.push($WGL_F3(f[0], f[1], f[2]))
                    g.faceVertexUvs[0].push([ $WGL_V2(uv[0][0], uv[0][1]), $WGL_V2(uv[1][0], uv[1][1]), $WGL_V2(uv[2][0], uv[2][1])])
                }
            }

            let mesh = new THREE.Mesh( g, material );
            mesh_addData(mesh, "element", shape_key, ss_index, element_index, null);

            g.verticesNeedUpdate = true;
            g.elementsNeedUpdate = true;
            g.uvsNeedUpdate = true;

            g.computeBoundingBox();
            g.computeBoundingSphere();
            if(ss.flat_normals) {
                g.computeFaceNormals();
                g.computeFlatVertexNormals();
            }
            else {
                g.computeVertexNormals();
            }

            group.add(mesh);
        }
    }

    requestDraw();
}

/**
 * Function to show the interface to modify a shape
 */
function show_shape() {
    let shape_key = this.getAttribute("data-key");
    let shape = data_editor.definition.shapes[shape_key];

    empty_all();

    let button, element;
    let shape_config = DOM.cdiv(data_editor.dom.config, null, "shape_config");

    // Shape name
    element = DOM.cdiv(shape_config, null, "shape_config_element");
    DOM.clabel(element, null, "shape_config_label", "Name", "shape_name");
    data_editor.dom.config_shape_name = DOM.ci_text(element, "shape_name", "shape_config_input");
    data_editor.dom.config_shape_name.value = shape.name;

    // Shape description
    element = DOM.cdiv(shape_config, null, "shape_config_element");
    DOM.clabel(element, null, "shape_config_label", "Description", "shape_description");
    data_editor.dom.config_shape_description = DOM.ci_text(element, "shape_description", "shape_config_input");
    data_editor.dom.config_shape_description.value = shape.description;

    // Shape type
    element = DOM.cdiv(shape_config, null, "shape_config_element");
    DOM.clabel(element, null, "shape_config_label", "Type", "shape_type");
    data_editor.dom.config_shape_type = DOM.cselect(element, "shape_type", "shape_config_select", [
        ["L3 Device", "l3device"], ["L2 device", "l2device"], ["Basic shape", "basic"],
    ]);
    data_editor.dom.config_shape_type.value = shape.type;

    // Shape base scale
    element = DOM.cdiv(shape_config, null, "shape_config_element");
    DOM.clabel(element, null, "shape_config_label", "Base Scale");

    DOM.clabel(element, null, "shape_config_label_s", "X", "shape_base_x");
    data_editor.dom.config_shape_base_x = DOM.ci_text(element, "shape_base_x", "shape_config_input_s");
    DOM.clabel(element, null, "shape_config_label_s", "Y", "shape_base_y");
    data_editor.dom.config_shape_base_y = DOM.ci_text(element, "shape_base_y", "shape_config_input_s");
    DOM.clabel(element, null, "shape_config_label_s", "Z", "shape_base_z");
    data_editor.dom.config_shape_base_z = DOM.ci_text(element, "shape_base_z", "shape_config_input_s");

    data_editor.dom.config_shape_base_x.value = shape.base_scale[0];
    data_editor.dom.config_shape_base_y.value = shape.base_scale[1];
    data_editor.dom.config_shape_base_z.value = shape.base_scale[2];

    // Apply changes
    element = DOM.cdiv(shape_config, null, "shape_config_element_end");
    button = DOM.cbutton(element, null, "button_mini", "Apply", null, () => {
        if((isNaN(data_editor.dom.config_shape_base_x.value)) || (isNaN(data_editor.dom.config_shape_base_y.value)) || (isNaN(data_editor.dom.config_shape_base_z.value))) {
            DOM.showError("Error", "Base scale have to be floats.");
            return;
        }
        shape.name = data_editor.dom.config_shape_name.value;
        shape.description = data_editor.dom.config_shape_description.value;
        shape.type = data_editor.dom.config_shape_type.value;
        shape.base_scale[0] = parseFloat(data_editor.dom.config_shape_base_x.value);
        shape.base_scale[1] = parseFloat(data_editor.dom.config_shape_base_y.value);
        shape.base_scale[2] = parseFloat(data_editor.dom.config_shape_base_z.value);

        show_shape_wgl(shape_key);

        unsaved_changes();

        draw_definition();
    });

    show_shape_wgl(shape_key);
    data_editor.dom.drawing_capture.style.display = "block";
    data_editor.dom.drawing_capture.setAttribute("data-shape_key", shape_key);
    show_shape_edit(shape_key, 0);
    show_shape_edit(shape_key, 1);
}

function show_shape_vertexlist_insertvertex(ev, data) {
    // Create the dom element
    data.index = parseInt(data.index);
    let dom_list = data_editor.dom["vertex_list_" + data.subshape_index];

    let div3 = DOM.cdiv();
    let l = DOM.clabel(div3, null, "edit_label_s", data.index);
    let px = DOM.ci_text(div3, null, "edit_input_ss"); px.value = 0;
    let py = DOM.ci_text(div3, null, "edit_input_ss"); py.value = 0;
    let pz = DOM.ci_text(div3, null, "edit_input_ss"); pz.value = 0;

    let b1 = DOM.cbutton(div3, null, "button_mini", "+", {shape_key: data.shape_key, subshape_index: data.subshape_index, element_index: data.element_index, index: data.index + 1},
        show_shape_vertexlist_insertvertex);
    let b2 = DOM.cbutton(div3, null, "button_mini", "-", {shape_key: data.shape_key, subshape_index: data.subshape_index, element_index: data.element_index, index: data.index},
        show_shape_vertexlist_deletevertex);

    if(data.index >= dom_list.length) {
        dom_list[0][0].parentNode.appendChild(div3);
        dom_list.push([div3, l, px, py, pz, b1, b2]);
    }
    else {
        dom_list[0][0].parentNode.insertBefore(div3, dom_list[data.index][0]);
        dom_list.splice(data.index, 0, [div3, l, px, py, pz, b1, b2]);
    }

    // Update the indexes of all the elements (labels and buttons)
    for(let x = 0; x < dom_list.length; x++) {
        dom_list[x][1].innerHTML = x;
        dom_list[x][5].setAttribute("data-index", x+1);
        dom_list[x][6].setAttribute("data-index", x);
    }
}

function show_shape_vertexlist_deletevertex(ev, data) {
    let dom_list = data_editor.dom["vertex_list_" + data.subshape_index];
    if(dom_list.length === 1) {
        DOM.showError("Error", "You can't remove the last vertex.");
        return;
    }
    DOM.removeElement(dom_list[data.index][0]);

    dom_list.splice(data.index, 1);

    // Update the indexes of all the elements (labels and buttons)
    for(let x = 0; x < dom_list.length; x++) {
        dom_list[x][1].innerHTML = x;
        dom_list[x][5].setAttribute("data-index", x+1);
        dom_list[x][6].setAttribute("data-index", x);
    }
}

function show_shape_vertexlist_insertface(ev, data) {
    data.index = parseInt(data.index);
    let dom_list = data_editor.dom["face_list_" + data.subshape_index];

    div3 = DOM.cdiv();
    DOM.clabel(div3, null, "edit_label", "V");
    let v1 = DOM.ci_text(div3, null, "edit_input_ss"); v1.value = 0;
    let v2 = DOM.ci_text(div3, null, "edit_input_ss"); v2.value = 0;
    let v3 = DOM.ci_text(div3, null, "edit_input_ss"); v3.value = 0;

    DOM.clabel(div3, null, "edit_label", "UVs");
    let uv0_x = DOM.ci_text(div3, null, "edit_input_ss"); uv0_x.value = 0;
    let uv0_y = DOM.ci_text(div3, null, "edit_input_ss"); uv0_y.value = 0;
    let uv1_x = DOM.ci_text(div3, null, "edit_input_ss"); uv1_x.value = 0;
    let uv1_y = DOM.ci_text(div3, null, "edit_input_ss"); uv1_y.value = 0;
    let uv2_x = DOM.ci_text(div3, null, "edit_input_ss"); uv2_x.value = 0;
    let uv2_y = DOM.ci_text(div3, null, "edit_input_ss"); uv2_y.value = 0;
    let b1 = DOM.cbutton(div3, null, "button_mini", "+", {shape_key: data.shape_key, subshape_index: data.subshape_index, element_index: data.element_index, index: data.index+1}, show_shape_vertexlist_insertface);
    let b2 = DOM.cbutton(div3, null, "button_mini", "-", {shape_key: data.shape_key, subshape_index: data.subshape_index, element_index: data.element_index, index: data.index}, show_shape_vertexlist_deleteface);

    if(data.index >= dom_list.length) {
        dom_list[0][0].parentNode.appendChild(div3);
        dom_list.push([div3, v1, v2, v3, uv0_x, uv0_y, uv1_x, uv1_y, uv2_x, uv2_y, b1, b2]);
    }
    else {
        dom_list[0][0].parentNode.insertBefore(div3, dom_list[data.index][0]);
        dom_list.splice(data.index, 0, [div3, v1, v2, v3, uv0_x, uv0_y, uv1_x, uv1_y, uv2_x, uv2_y, b1, b2]);
    }

    // Update the indexes of all the elements (labels and buttons)
    for(let x = 0; x < dom_list.length; x++) {
        dom_list[x][10].setAttribute("data-index", x+1);
        dom_list[x][11].setAttribute("data-index", x);
    }    
}

function show_shape_vertexlist_deleteface(ev, data) {
    let dom_list = data_editor.dom["face_list_" + data.subshape_index];
    if(dom_list.length === 1) {
        DOM.showError("Error", "You can't remove the last face.");
        return;
    }
    DOM.removeElement(dom_list[data.index][0]);

    dom_list.splice(data.index, 1);

    // Update the indexes of all the elements (labels and buttons)
    for(let x = 0; x < dom_list.length; x++) {
        dom_list[x][10].setAttribute("data-index", x+1);
        dom_list[x][11].setAttribute("data-index", x);
    }
}

function show_shape_vertexlist_apply(ev, data) {
    let dom_list_v = data_editor.dom["vertex_list_" + data.subshape_index];
    let dom_list_f = data_editor.dom["face_list_" + data.subshape_index];
    let vl = [];
    let fl = [];
    let uvl = [];

    let vertex_error = false, face_error = false;
    for(let x = 0; x < dom_list_v.length; x++) {
        let v = [dom_list_v[x][2].value, dom_list_v[x][3].value, dom_list_v[x][4].value];
        vl.push(v);
        for(let i = 0; i < v.length; i++) {
            dom_list_v[x][2+i].style.background = null;
            if(isNaN(v[i])) {
                vertex_error = true;
                dom_list_v[x][2+i].style.background = "#ffc4a8";
                continue;
            }
            v[i] = parseFloat(v[i]);
            if((v[i] < -1) || (v[i] > 1)) {
                vertex_error = true;
                dom_list_v[x][2+i].style.background = "#ffc4a8";
                continue;
            }
        }
    }

    for(let x = 0; x < dom_list_f.length; x++) {
        let f = [dom_list_f[x][1].value, dom_list_f[x][2].value, dom_list_f[x][3].value];
        let uv = [[dom_list_f[x][4].value, dom_list_f[x][5].value], [dom_list_f[x][6].value, dom_list_f[x][7].value], [dom_list_f[x][8].value, dom_list_f[x][9].value]];
        fl.push(f);
        uvl.push(uv);

        for(let i = 0; i < f.length; i++) {
            dom_list_f[x][1+i].style.background = null;
            if(isNaN(f[i])) {
                face_error = true;
                dom_list_f[i][1+i].style.background = "#ffc4a8";
                continue;
            }
            f[i] = parseFloat(f[i]);
            if((!Number.isInteger(f[i])) || (f[i] < 0) || (f[i] >= vl.length) ) {
                face_error = true;
                dom_list_f[x][1+i].style.background = "#ffc4a8";
                continue;                
            }
        }

        for(let i1 = 0; i1 < 3; i1++) {
            for(let i2 = 0; i2 < 2; i2++) {
                dom_list_f[x][4 + i1 * 2 + i2].style.background = null;
                if(isNaN(uv[i1][i2])) {
                    face_error = true;
                    dom_list_f[x][4 + i1 * 2 + i2].style.background = "#ffc4a8";
                    continue;
                }
                uv[i1][i2] = parseFloat(uv[i1][i2]);
            }
        }
    }

    if(vertex_error) {
        DOM.showError("Error", "Some vertex don't have valid values.");
        return;
    }
    if(face_error) {
        DOM.showError("Error", "Some faces don't have valid values.");
        return;
    }

    // Update the subshape element
    data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements[data.element_index].v = vl;
    data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements[data.element_index].f = fl;
    data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements[data.element_index].uv = uvl;

    show_shape_wgl(data.shape_key);
    show_shape_vertexlist(data.shape_key, data.subshape_index, data.element_index);
    unsaved_changes();
}

function show_shape_vertexlist(shape_key, subshape_index, element_index) {
    let div, div2, div3, i;
    let element = data_editor.definition.shapes[shape_key].subshapes[subshape_index].elements[element_index];

    let dom_element = (subshape_index == 0) ? data_editor.dom.edit : data_editor.dom.edit2;
        DOM.removeChilds(dom_element, true);

    DOM.cdiv(dom_element, null, "edit_title", "SubShape " + subshape_index + " element " + element_index);

    // Vertex list
    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "Vertex list (x, y, z)");
    div = DOM.cdiv(dom_element, null, "edit_section");
    div2 = DOM.cdiv(div, null, "vertex_list");

    data_editor.dom["vertex_list_" + subshape_index] = [];
    div3 = DOM.cdiv(div2);
    DOM.cbutton(div3, null, "button_mini", "+", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index, index: 0},
        show_shape_vertexlist_insertvertex);
    for(let x = 0; x < element.v.length; x++) {
        div3 = DOM.cdiv(div2);
        div3.addEventListener("mouseover", () => { show_vertex_wgl(shape_key, subshape_index, x, true); });
        div3.addEventListener("mouseout", () => { show_vertex_wgl(shape_key, subshape_index, x, false); });

        let l = DOM.clabel(div3, null, "edit_label_s", "" + x);
        let px = DOM.ci_text(div3, null, "edit_input_ss"); px.value = element.v[x][0];
        let py = DOM.ci_text(div3, null, "edit_input_ss"); py.value = element.v[x][1];
        let pz = DOM.ci_text(div3, null, "edit_input_ss"); pz.value = element.v[x][2];
        let b1 = DOM.cbutton(div3, null, "button_mini", "+", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index, index: x+1},
            show_shape_vertexlist_insertvertex);
        let b2 = DOM.cbutton(div3, null, "button_mini", "-", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index, index: x},
            show_shape_vertexlist_deletevertex);
        data_editor.dom["vertex_list_" + subshape_index].push([div3, l, px, py, pz, b1, b2]);
    }

    // Faces list
    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "Faces list (v0, v1, v2, uv0_x, uv0_y, uv1_x, uv1_y, uv2_x, uv2_y)");
    div = DOM.cdiv(dom_element, null, "edit_section");
    div2 = DOM.cdiv(div, null, "vertex_list");

    data_editor.dom["face_list_" + subshape_index] = [];
    div3 = DOM.cdiv(div2);
    DOM.cbutton(div3, null, "button_mini", "+", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index, index: 0}, show_shape_vertexlist_insertface);
    for(let x = 0; x < element.f.length; x++) {
        div3 = DOM.cdiv(div2);
        DOM.clabel(div3, null, "edit_label", "V");
        let v1 = DOM.ci_text(div3, null, "edit_input_ss"); v1.value = element.f[x][0];
        let v2 = DOM.ci_text(div3, null, "edit_input_ss"); v2.value = element.f[x][1];
        let v3 = DOM.ci_text(div3, null, "edit_input_ss"); v3.value = element.f[x][2];

        DOM.clabel(div3, null, "edit_label", "UVs");
        let uv0_x = DOM.ci_text(div3, null, "edit_input_ss"); uv0_x.value = element.uv[x][0][0];
        let uv0_y = DOM.ci_text(div3, null, "edit_input_ss"); uv0_y.value = element.uv[x][0][1];
        let uv1_x = DOM.ci_text(div3, null, "edit_input_ss"); uv1_x.value = element.uv[x][1][0];
        let uv1_y = DOM.ci_text(div3, null, "edit_input_ss"); uv1_y.value = element.uv[x][1][1];
        let uv2_x = DOM.ci_text(div3, null, "edit_input_ss"); uv2_x.value = element.uv[x][2][0];
        let uv2_y = DOM.ci_text(div3, null, "edit_input_ss"); uv2_y.value = element.uv[x][2][1];
        let b1 = DOM.cbutton(div3, null, "button_mini", "+", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index, index: x+1}, show_shape_vertexlist_insertface);
        let b2 = DOM.cbutton(div3, null, "button_mini", "-", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index, index: x}, show_shape_vertexlist_deleteface);
        data_editor.dom["face_list_" + subshape_index].push([div3, v1, v2, v3, uv0_x, uv0_y, uv1_x, uv1_y, uv2_x, uv2_y, b1, b2]);
    }

    // Buttons to apply and cancel
    div = DOM.cdiv(dom_element, null, "edit_section_end");
    DOM.cbutton(div, null, "button_mini", "Apply", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, show_shape_vertexlist_apply);
    DOM.cbutton(div, null, "button_mini", "Cancel", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, () => {
        show_shape_edit(shape_key, subshape_index);
    });
    DOM.cbutton(div, null, "button_mini", "Remove Element", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, (ev, data) => {
        data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements.splice(data.element_index, 1);
        show_shape_edit(shape_key, subshape_index);
        show_shape_wgl(shape_key);
        unsaved_changes();
    });
    DOM.cbutton(div, null, "button_mini", "Edit as JSON", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, (ev, data) => {
        show_shape_element_json(data.shape_key, data.subshape_index, data.element_index);
    });
} 

function validate_vertexlist_json(dom_element) {
    let element;
    let result_element = {type: "vertex_list", v: [], f: [], uv: []};

    try {
        element = JSON.parse(dom_element.value)
    }
    catch {
        return null;
    }
    if(element.type === "vertex_list") {
        if(
            (!Array.isArray(element.v)) ||
            (!Array.isArray(element.f)) ||
            (!Array.isArray(element.uv)) ||
            (element.f.length !== element.uv.length)) {
            return null;
        }

        for(let x = 0; x < element.v.length; x++) {
            if((!Array.isArray(element.v[x])) ||
                (element.v[x].length !== 3) ||
                (isNaN(element.v[x][0])) || (isNaN(element.v[x][1])) || (isNaN(element.v[x][2]))) {
                    return null;
            }
            result_element.v.push([parseFloat(element.v[x][0]), parseFloat(element.v[x][1]), parseFloat(element.v[x][2])]);
        }
        for(let x = 0; x < element.f.length; x++) {
            if((!Array.isArray(element.f[x])) ||
                (element.f[x].length !== 3) ||
                (!Number.isInteger(element.f[x][0])) ||
                (!Number.isInteger(element.f[x][1])) ||
                (!Number.isInteger(element.f[x][2])) ||
                (element.f[x][0] < 0) || (element.f[x][0] >= element.v.length) ||
                (element.f[x][1] < 0) || (element.f[x][1] >= element.v.length) ||
                (element.f[x][2] < 0) || (element.f[x][2] >= element.v.length) ) {
                    return null;
            }
            if((!Array.isArray(element.uv[x])) ||
                (element.uv[x].length !== 3) ||
                (!Array.isArray(element.uv[x][0])) ||
                (element.uv[x][0].length !== 2) || (isNaN(element.uv[x][0][0])) || (isNaN(element.uv[x][0][1])) ||
                (element.uv[x][1].length !== 2) || (isNaN(element.uv[x][1][0])) || (isNaN(element.uv[x][1][1])) ||
                (element.uv[x][2].length !== 2) || (isNaN(element.uv[x][2][0])) || (isNaN(element.uv[x][2][1]))) {
                    return null;
            }
            result_element.f.push([element.f[x][0], element.f[x][1], element.f[x][2]]);
            result_element.uv.push([
                [element.uv[x][0][0], element.uv[x][0][1]],
                [element.uv[x][1][0], element.uv[x][1][1]],
                [element.uv[x][2][0], element.uv[x][2][1]]]);
        }

    }
    else
        return null;

    return result_element;
}

function show_shape_element_json_apply(ev, data) {
    let dom_element = data_editor.dom["element_json_" + data.subshape_index];
    
    let new_element = validate_vertexlist_json(dom_element);
    
    if(!new_element) {
        DOM.showError("Invalid JSON", "The text provided is not a valid JSON.");
        return;
    }

    data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements[data.element_index] = new_element;

    show_shape_wgl(data.shape_key);
    unsaved_changes();
}

function show_shape_element_json(shape_key, subshape_index, element_index) {
    let div, div2, div3, i;
    let element = data_editor.definition.shapes[shape_key].subshapes[subshape_index].elements[element_index];

    let dom_element = (subshape_index == 0) ? data_editor.dom.edit : data_editor.dom.edit2;
    DOM.removeChilds(dom_element, true);

    DOM.cdiv(dom_element, null, "edit_title", "SubShape " + subshape_index + " element " + element_index + " JSON");
    data_editor.dom["element_json_" + subshape_index] = DOM.ci_ta(dom_element, null, "edit_input_ta");
    data_editor.dom["element_json_" + subshape_index].value = JSON.stringify(element, null, 2);
    data_editor.dom["element_json_" + subshape_index].addEventListener("keyup", () => {
        if(!validate_vertexlist_json(data_editor.dom["element_json_" + subshape_index]))
            data_editor.dom["element_json_" + subshape_index].style.background = "#ffc4a8";
        else
            data_editor.dom["element_json_" + subshape_index].style.background = null;
    })
    // Buttons to apply and cancel
    div = DOM.cdiv(dom_element, null, "edit_section_end");
    DOM.cbutton(div, null, "button_mini", "Apply", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, show_shape_element_json_apply);
    DOM.cbutton(div, null, "button_mini", "Cancel", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, () => {
        show_shape_edit(shape_key, subshape_index);
    });
}

function show_shape_cube_apply(ev, data) {
    let dom = data_editor.dom["cube_" + data.subshape_index];
    let element = data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements[data.element_index];

    // Check if parameters are valid
    let error = false;
    for(let parameter of PARAMETERS_ELEMENT_CUBE) {
        dom[parameter].style.background = null;
        if(isNaN(dom[parameter].value)) {
            error = true;
            dom[parameter].style.background = "#ffc4a8";
        }
    }
    if(error) {
        DOM.showError("Error", "Invalid parameter(s).");
        return;
    }

    // Copy new parameters
    for(let parameter of PARAMETERS_ELEMENT_CUBE) {
        element[parameter] = parseFloat(dom[parameter].value);
    }

    show_shape_wgl(data.shape_key);
    show_shape_cube(data.shape_key, data.subshape_index, data.element_index);
    unsaved_changes();
}

function show_shape_cube(shape_key, subshape_index, element_index) {
    let div, div2, div3, i;
    let element = data_editor.definition.shapes[shape_key].subshapes[subshape_index].elements[element_index];

    let dom_element = (subshape_index == 0) ? data_editor.dom.edit : data_editor.dom.edit2;
    DOM.removeChilds(dom_element, true);

    DOM.cdiv(dom_element, null, "edit_title", "SubShape " + subshape_index + " element " + element_index);

    // Position
    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "Position (x, y, z)");
    let px = DOM.ci_text(div, null, "edit_input_ss"); px.value = element.px;
    let py = DOM.ci_text(div, null, "edit_input_ss"); py.value = element.py;
    let pz = DOM.ci_text(div, null, "edit_input_ss"); pz.value = element.pz;

    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "Rotation (x, y, z)");
    let rx = DOM.ci_text(div, null, "edit_input_ss"); rx.value = element.rx;
    let ry = DOM.ci_text(div, null, "edit_input_ss"); ry.value = element.ry;
    let rz = DOM.ci_text(div, null, "edit_input_ss"); rz.value = element.rz;

    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "Width");
    let sx = DOM.ci_text(div, null, "edit_input_ss"); sx.value = element.sx;

    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "Height");
    let sy = DOM.ci_text(div, null, "edit_input_ss"); sy.value = element.sy;

    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "Depth");
    let sz = DOM.ci_text(div, null, "edit_input_ss"); sz.value = element.sz;

    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "UV1 (x, y)");
    let u1 = DOM.ci_text(div, null, "edit_input_ss"); u1.value = element.u1;
    let v1 = DOM.ci_text(div, null, "edit_input_ss"); v1.value = element.v1;

    div = DOM.cdiv(dom_element, null, "edit_section");
    DOM.clabel(div, null, "edit_label", "UV2 (x, y)");
    let u2 = DOM.ci_text(div, null, "edit_input_ss"); u2.value = element.u2;
    let v2 = DOM.ci_text(div, null, "edit_input_ss"); v2.value = element.v2;

    data_editor.dom["cube_" + subshape_index] = {
        px: px, py: py, pz: pz, rx: rx, ry: ry, rz: rz,
        sx: sx, sy: sy, sz: sz,
        u1: u1, v1: v1, u2: u2, v2: v2,
    };

    // Buttons to apply and cancel
    div = DOM.cdiv(dom_element, null, "edit_section_end");
    DOM.cbutton(div, null, "button_mini", "Apply", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, show_shape_cube_apply);
    DOM.cbutton(div, null, "button_mini", "Cancel", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, () => {
        show_shape_edit(shape_key, subshape_index);
    });
    DOM.cbutton(div, null, "button_mini", "Remove Element", {shape_key: shape_key, subshape_index: subshape_index, element_index: element_index}, (ev, data) => {
        data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements.splice(data.element_index, 1);
        show_shape_edit(shape_key, subshape_index);
        show_shape_wgl(shape_key);
        unsaved_changes();
    });
}

function show_shape_element(shape_key, subshape_index, element_index) {
    let element = data_editor.definition.shapes[shape_key].subshapes[subshape_index].elements[element_index];
    if(element.type === "vertex_list")
        show_shape_vertexlist(shape_key, subshape_index, element_index);
    else if(element.type === "cube")
        show_shape_cube(shape_key, subshape_index, element_index);
}

function show_shape_edit_enable_subshape(ev, data) {
    let shape_key = data.shape_key;
    data_editor.definition.shapes[shape_key].subshapes.push({
        flat_normals: true,
        texture: data_editor.definition.textures[0],
        color: 0xff0000,
        is_texture_light: true,
        elements: [],
    });
    show_shape_edit(shape_key, 0);
    show_shape_edit(shape_key, 1);
}

function show_shape_edit_addcube(ev, data) {
    let div;

    data_editor.dom.form_container = DOM.cdiv(document.body, "form_container");
    let form = DOM.cdiv(data_editor.dom.form_container, "form");
    let close = DOM.cdiv(form, null, "form_close", "x");
    close.addEventListener("click", () => {DOM.removeElement(data_editor.dom.form_container)});
    DOM.cdiv(form, null, "form_header", "Add Cube");

    div = DOM.cdiv(form, null, "form_section");
    DOM.clabel(div, null, "form_label", "Position");
    data_editor.dom.addcube_px = DOM.ci_text(div, null, "form_input_s");
    data_editor.dom.addcube_py = DOM.ci_text(div, null, "form_input_s");
    data_editor.dom.addcube_pz = DOM.ci_text(div, null, "form_input_s");

    div = DOM.cdiv(form, null, "form_section");
    DOM.clabel(div, null, "form_label", "Rotation");
    data_editor.dom.addcube_rx = DOM.ci_text(div, null, "form_input_s");
    data_editor.dom.addcube_ry = DOM.ci_text(div, null, "form_input_s");
    data_editor.dom.addcube_rz = DOM.ci_text(div, null, "form_input_s");

    div = DOM.cdiv(form, null, "form_section");
    DOM.clabel(div, null, "form_label", "Width");
    data_editor.dom.addcube_sx = DOM.ci_text(div, null, "form_input_s");

    div = DOM.cdiv(form, null, "form_section");
    DOM.clabel(div, null, "form_label", "Height");
    data_editor.dom.addcube_sy = DOM.ci_text(div, null, "form_input_s");

    div = DOM.cdiv(form, null, "form_section");
    DOM.clabel(div, null, "form_label", "Depth");
    data_editor.dom.addcube_sz = DOM.ci_text(div, null, "form_input_s");

    div = DOM.cdiv(form, null, "form_section");
    DOM.clabel(div, null, "form_label", "Texture UV1");
    data_editor.dom.addcube_u1 = DOM.ci_text(div, null, "form_input_s");
    data_editor.dom.addcube_v1 = DOM.ci_text(div, null, "form_input_s");

    div = DOM.cdiv(form, null, "form_section");
    DOM.clabel(div, null, "form_label", "Texture UV2");
    data_editor.dom.addcube_u2 = DOM.ci_text(div, null, "form_input_s");
    data_editor.dom.addcube_v2 = DOM.ci_text(div, null, "form_input_s");

    div = DOM.cdiv(form, null, "form_section");
    data_editor.dom.addcube_asvertexlist = DOM.ci_checkbox(div);
    DOM.clabel(div, null, "form_label", "Add as vertex list");

    data_editor.dom.addcube_px.value = "0";
    data_editor.dom.addcube_py.value = "0";
    data_editor.dom.addcube_pz.value = "0";
    data_editor.dom.addcube_sx.value = "1";
    data_editor.dom.addcube_sy.value = "1";
    data_editor.dom.addcube_sz.value = "1";
    data_editor.dom.addcube_rx.value = "0";
    data_editor.dom.addcube_ry.value = "0";
    data_editor.dom.addcube_rz.value = "0";
    data_editor.dom.addcube_u1.value = "0";
    data_editor.dom.addcube_v1.value = "0";
    data_editor.dom.addcube_u2.value = "1";
    data_editor.dom.addcube_v2.value = "1";

    div = DOM.cdiv(form, null, "form_section");
    let button = DOM.cbutton(div, null, "button", "Create", 
                             {shape_key: data.shape_key, subshape_index: data.subshape_index},
                             (ev, data) => {
        let error = false;

        for(let parameter of PARAMETERS_ELEMENT_CUBE) {
            data_editor.dom["addcube_" + parameter].style.background = null;
            if(isNaN(data_editor.dom["addcube_" + parameter].value)) {
                error = true;
                data_editor.dom["addcube_" + parameter].style.background = "#ffc4a8";
            }
        }
        if(error) {
            DOM.showError("Error", "Invalid parameter(s).");
            return;
        }

        let subshape_element = {
            type: "cube",
        }
        for(let parameter of PARAMETERS_ELEMENT_CUBE) {
            subshape_element[parameter] = parseFloat(data_editor.dom["addcube_" + parameter].value);
        }

        if(data_editor.dom.addcube_asvertexlist.checked) {
            subshape_element = shapetools_generate_as_vertexlist(subshape_element);
        }

        data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements.push(subshape_element);

        show_shape_edit(data.shape_key, data.subshape_index);
        DOM.removeElement(data_editor.dom.form_container);
        show_shape_wgl(data.shape_key);

        unsaved_changes();
    });
}

function show_shape_edit_addelement(ev, data) {
    data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index].elements.push({
        type: "vertex_list",
        v: [[0,0,0]],
        f: [[0,0,0]],
        uv: [[[0,0], [0,0], [0,0]]],
    });

    show_shape_edit(data.shape_key, data.subshape_index);
    unsaved_changes();
}

function show_shape_edit_apply(ev, data) {
    let subshape = data_editor.definition.shapes[data.shape_key].subshapes[data.subshape_index];
    let dom_colorr = data_editor.dom["ss_colorr_" + data.subshape_index];
    let dom_colorg = data_editor.dom["ss_colorg_" + data.subshape_index];
    let dom_colorb = data_editor.dom["ss_colorb_" + data.subshape_index];
    let flat_normals = data_editor.dom["ss_flat_normals_" + data.subshape_index].checked;
    let texture = data_editor.dom["ss_texture_" + data.subshape_index].value;

    let color_r = dom_colorr.value;
    let color_g = dom_colorg.value;
    let color_b = dom_colorb.value;

    if(isNaN(color_r) || isNaN(color_g) || isNaN(color_b)) {
        DOM.showError("Error", "Color should be 3 integers between 0 and 255 each one.");
        return;
    }
    color_r = parseFloat(color_r);
    color_g = parseFloat(color_g);
    color_b = parseFloat(color_b);

    if(
        (!Number.isInteger(color_r)) || (color_r < 0) || (color_r > 255) ||
        (!Number.isInteger(color_g)) || (color_g < 0) || (color_g > 255) ||
        (!Number.isInteger(color_b)) || (color_b < 0) || (color_b > 255)
        ) {
        DOM.showError("Error", "Color should be 3 integers between 0 and 255 each one.");
        return;
    }

    subshape.texture = texture;
    subshape.flat_normals = flat_normals;
    subshape.color = (color_r << 16) | (color_g << 8) | color_b;
    show_shape_wgl(data.shape_key);

    unsaved_changes();
}

/**
 * Function to edit a subshape.
 */
function show_shape_edit(shape_key, subshape_index) {
    let div, i;
    let dom_element = (subshape_index == 0) ? data_editor.dom.edit : data_editor.dom.edit2;
    DOM.removeChilds(dom_element, true);

    DOM.cdiv(dom_element, null, "edit_title", "SubShape " + subshape_index);

    if(subshape_index in data_editor.definition.shapes[shape_key].subshapes) {
        let ss = data_editor.definition.shapes[shape_key].subshapes[subshape_index];
        
        // Flat Normals
        div = DOM.cdiv(dom_element, null, "edit_section");
        DOM.clabel(div, null, "edit_label", "Faces are flat.", "ss_flat_normals_" + subshape_index);
        data_editor.dom["ss_flat_normals_" + subshape_index] = DOM.ci_checkbox(div, null, "ss_flat_normals_" + subshape_index);
        data_editor.dom["ss_flat_normals_" + subshape_index].checked = ss.flat_normals;

        // Texture
        let texture_options = [];
        for(let x = 0; x < data_editor.definition.textures.length; x++)
            texture_options.push([data_editor.definition.textures[x], data_editor.definition.textures[x]]);
        div = DOM.cdiv(dom_element, null, "edit_section");
        DOM.clabel(div, null, "edit_label", "Texture", "ss_texture_" + subshape_index);
        data_editor.dom["ss_texture_" + subshape_index] = DOM.cselect(div, "ss_texture_" + subshape_index, null, texture_options);
        data_editor.dom["ss_texture_" + subshape_index].value = ss.texture;

        // Color
        let r = ss.color >> 16;
        let g = (ss.color >> 8) & 0xff;
        let b = ss.color & 0xff;
        div = DOM.cdiv(dom_element, null, "edit_section");
        DOM.clabel(div, null, "edit_label", "Color");
        DOM.clabel(div, null, "edit_label_s", "Red", "ss_colorr_" + subshape_index);
        data_editor.dom["ss_colorr_" + subshape_index] = DOM.ci_text(div, "ss_colorr_" + subshape_index, "edit_input_s");
        data_editor.dom["ss_colorr_" + subshape_index].value = r;
        DOM.clabel(div, null, "edit_label_s", "Green", "ss_colorg_" + subshape_index);
        data_editor.dom["ss_colorg_" + subshape_index] = DOM.ci_text(div, "ss_colorg_" + subshape_index, "edit_input_s");
        data_editor.dom["ss_colorg_" + subshape_index].value = g;
        DOM.clabel(div, null, "edit_label_s", "Blue", "ss_colorb_" + subshape_index);
        data_editor.dom["ss_colorb_" + subshape_index] = DOM.ci_text(div, "ss_colorb_" + subshape_index, "edit_input_s");
        data_editor.dom["ss_colorb_" + subshape_index].value = b;

        // Apply button
        div = DOM.cdiv(dom_element, null, "edit_section_end");
        DOM.cbutton(div, null, "button_mini", "Apply", {shape_key: shape_key, subshape_index: subshape_index}, show_shape_edit_apply);

        // Elements of this subshape
        div = DOM.cdiv(dom_element, null, "edit_section");
        DOM.clabel(div, null, "edit_label", "Elements");
        for(let x = 0; x < ss.elements.length; x++) {
            DOM.cbutton(div, null, "button_mini", "" + x, {shape_key: shape_key, subshape_index: subshape_index, element_index: x}, (ev, data) => {
                show_shape_element(data.shape_key, data.subshape_index, data.element_index);
            });
        }
        div = DOM.cdiv(dom_element, null, "edit_section");
        DOM.clabel(div, null, "edit_label", "Add Element");
        DOM.cbutton(div, null, "button_mini", "Vertex List", {shape_key: shape_key, subshape_index: subshape_index}, show_shape_edit_addelement);
        DOM.cbutton(div, null, "button_mini", "Cube", {shape_key: shape_key, subshape_index: subshape_index}, show_shape_edit_addcube);
        data_editor.dom["subshape_element_container_" + subshape_index] = DOM.cdiv(div, null, "element_container");

    }
    else {
        DOM.cbutton(dom_element, null, "button_mini", "Enable this subshape", {shape_key: shape_key, subshape_index: subshape_index}, show_shape_edit_enable_subshape);
    }

}

function request_delete_shape(ev) {
    let key = ev.target.parentNode.getAttribute("data-key");
    delete data_editor.definition.shapes[key];
    empty_all();
    draw_definition();
    unsaved_changes();

    ev.stopPropagation();
}

function request_add_shape(ev) {
    // Find an available key
    let key = 0;
    while(key in data_editor.definition.shapes) key++;

    data_editor.definition.shapes[key] = {
        name: "New Shape " + key,
        description: "Description of shape",
        type: "basic",
        base_scale: [1,1,1],
        subshapes: [{
            flat_normals: true,
            texture: data_editor.definition.textures[0],
            color: 0xaaaaaa,
            is_texture_light: true,
            elements: [],
        }]
    };

    draw_definition();
    unsaved_changes();

    ev.stopPropagation();
}

/**
 * Function to show a texture
 */
function show_texture() {
    let index = this.getAttribute("data-index");
    empty_all();

    let height = data_editor.dom.config.offsetHeight - 10;
    let texture_container = DOM.cdiv(data_editor.dom.config, null, "texture_container");
    let texture_path = "/3dshapes/" + shapegroup_key + "/" + data_editor.definition.textures[index];
    let img = DOM.cimg(texture_container, texture_path, null, "texture");
    img.style.width = "" + height + "px";
    img.style.height = "" + height + "px";
    let coords_position = DOM.cdiv(texture_container);
    img.addEventListener("mousemove", (ev) => {
        DOM.removeChilds(coords_position, true);
        DOM.cdiv(coords_position, null, null, "U: " + (Math.floor(10000 * ev.offsetX / height) / 10000 ));
        DOM.cdiv(coords_position, null, null, "V: " + (Math.floor(10000 * (1-(ev.offsetY / height))) / 10000 ));
    });
    img.addEventListener("mouseout", () => { DOM.removeChilds(coords_position, true); });

    // Show the texture on the 3D view as a cube
    let geometry = new THREE.BoxGeometry( 1, 1, 1 );
    let texture = loadTexture(texture_path);
    let material = WGL_createDeviceMaterial({map: texture, mycolor: 0x888888});
    let mesh = new THREE.Mesh( geometry, material );
    data_editor.scene.add(mesh);
    requestDraw();
    data_editor.active_3dshape = mesh;
}

async function request_delete_texture(ev) {
    ev.stopPropagation();
    let index = ev.target.parentNode.getAttribute("data-index");

    try {
        let r = await fetch('/shapegroups/removetexture', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: shapegroup_key,
                filename: data_editor.definition.textures[index],
            }),
        });
        let body = await r.json();
        if(r.status !== 200)
            DOM.showError("Error", "Error removing texture (" + r.status + "): " + body.error);
        else if(body.error) {
            DOM.showError("Error", "Error removing texture: " + body.error);
        }
        else {
            empty_all();
            data_editor.definition.textures.splice(index, 1);
            draw_definition();
        }        
    }
    catch (e) {
        DOM.showError("Error", "Failed to delete file. Connection error.");        
    }
}

async function upload_texture(img_input) {
    let formData = new FormData();
    formData.append("img", img_input);
    try {
        let r = await fetch('/shapegroups/uploadtexture/' + shapegroup_key, {method: "POST", body: formData});
        let body = await r.text();
        if(r.status !== 200)
            DOM.showError("Error", "Error uploading file (" + r.status + "): " + body);
        else {
            empty_all();
            data_editor.definition.textures.push(body);
            draw_definition();
        }
    }
    catch (e) {
        DOM.showError("Error", "Failed to upload file: " + e);
    }
}

function request_add_texture() {
    empty_all();

    let img_input = DOM.ci_f(data_editor.dom.edit);
    img_input.accept="image/x-png,image/gif,image/jpeg";
    img_input.addEventListener("change", () => {
        let file = img_input.files[0];
        DOM.removeChilds(data_editor.dom.edit2, true);
        let height = data_editor.dom.edit2.offsetHeight - 10;
        let img = DOM.c(data_editor.dom.edit2, "img");
        img.style.width = "" + height + "px";
        img.style.height = "" + height + "px";
        img.file = file;

        const reader = new FileReader();
        reader.addEventListener("load", (e) => {
            img.src = e.target.result;
        });
        reader.readAsDataURL(file);        
    });
    DOM.cbutton(data_editor.dom.edit, null, "button_mini", "Upload", null, () => {
        if(img_input.files.length !== 1)
            DOM.showError("Error", "No file selected.");
        else
            upload_texture(img_input.files[0]);
    })
}

function draw_definition() {
    DOM.removeChilds(data_editor.dom.list_shapes, true);
    DOM.removeChilds(data_editor.dom.list_textures, true);
    let definition = data_editor.definition;
    
    for(let key in  definition.shapes) {
        let element = DOM.cdiv(data_editor.dom.list_shapes, null, "shapelist_shape");
        element.addEventListener("click", show_shape);
        element.setAttribute("data-key", key)
        DOM.cdiv(element, null, "shapelist_shape_text", definition.shapes[key].name);
        element = DOM.cbutton(element, null, "button_mini", "X", null, request_delete_shape);
    }
    
    for(let index = 0; index < definition.textures.length; index++) {
        let element = DOM.cdiv(data_editor.dom.list_textures, null, "shapelist_shape");
        element.addEventListener("click", show_texture);
        element.setAttribute("data-index", index)
        DOM.cdiv(element, null, "shapelist_shape_text", definition.textures[index]);
        element = DOM.cbutton(element, null, "button_mini", "X", null, request_delete_texture);
    }
}

async function load_shape_definition() {
    try {
        let r = await fetch("/3dshapes/" + shapegroup_key + "/definition.json", {cache: "no-store"});
        let body = await r.json();
        if(r.status !== 200)
            DOM.showError("Error", "Error loading definition file (" + r.status + ").");
        else if(body.error) {
            DOM.showError("Error", "Error loading definition file: " + body.error);
        }
        else {
            data_editor.definition = body;
            draw_definition();
        }
    }
    catch (e) {
        DOM.showError("Error", "Error loading definition file. Connection error.");
    }
}

async function save_shapes() {
    try {
        let r = await fetch('/shapegroups/update_shapes', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: shapegroup_key,
                shapes: data_editor.definition.shapes,
            }),
        });
        let body = await r.json();
        if(r.status !== 200)
            DOM.showError("Error", "Error updating shapes (" + r.status + ").");
        else if(body.error) {
            DOM.showError("Error", "Error updating shapes: " + body.error);
        }
        else {
            DOM.showError("Saved", "Shapes have been saved.");
            data_editor.dom.save.style.display = "none";
        }
    }
    catch (e) {
        DOM.showError("Error", "Failed to save shapes. Connection error.");        
    }
}

function unsaved_changes() {
    data_editor.unsaved_changes = true;
    data_editor.dom.save.style.display = "block";
}

function create_icon_canvas(src_canvas) {
    let px = 0, py = 0, height = src_canvas.height, width = src_canvas.width;
    if(width > height) {
        px += (width-height)/2;
        width = height;
    }
    if(height > width) {
        py += (height-width)/2;
        height = width;
    }

    let dst_canvas = document.createElement("CANVAS");
    dst_canvas.width = 128;
    dst_canvas.height = 128;
    ctx = dst_canvas.getContext('2d');

    ctx.drawImage(src_canvas, px, py, width, height, 0, 0, 128, 128);

    return dst_canvas;
}
async function capture_shape_icon(ev, data) {
    let shape_key = data.shape_key;
    let canvas = data_editor.renderer.domElement;
    let icon_canvas = create_icon_canvas(canvas);
    icon_canvas.toBlob(async (image) => {
        let formData = new FormData();
        formData.append("img", image);
        try {
            let r = await fetch('/shapegroups/uploadicon/' + shapegroup_key + "/" + shape_key, {method: "POST", body: formData});
            let body = await r.text();
            if(r.status !== 200)
                DOM.showError("Error", "Error uploading file (" + r.status + "): " + body);
            else {
                DOM.showError("Success", "Success uploading icon: " + body);
            }
        }
        catch (e) {
            DOM.showError("Error", "Failed to upload file: " + e);
        }    

    }, "image/png");
}

function init_screen() {
    let body = document.body;
    let ge, div;

    let grid = DOM.cg(document.body, "grid", "full_screen", ["250px", "1.05fr", "0.95fr"], ["45px", "1fr", "1fr"]);

    // Header
    data_editor.dom.header = DOM.cge(grid, "header", null, 1, 4, 1, 2);
    data_editor.dom.home = DOM.cimg(data_editor.dom.header, staticurl + "/static/img/home_b.png", null, "button button-menu", null, () => {
        window.location.href = "/shapegroups";
    });
    data_editor.dom.save = DOM.cbutton(data_editor.dom.header, null, "button", "Save", null, () => {
        data_editor.unsaved_changes = false;
        save_shapes();
    });
    data_editor.dom.save.style.display = "none";

    // Shape navigation
    ge = DOM.cge(grid, null, "navigation", 1, 2, 2, 3);
    div = DOM.cdiv(ge, null, "navigation_title");
    DOM.cdiv(div, null, "navigation_title_text", "Shapes");
    DOM.cbutton(div, null, "button_mini", "Add", null, request_add_shape);
    data_editor.dom.list_shapes = DOM.cdiv(ge, "list_shapes");

    // Texture navigation
    ge = DOM.cge(grid, null, "navigation", 1, 2, 3, 4);
    div = DOM.cdiv(ge, null, "navigation_title");
    DOM.cdiv(div, null, "navigation_title_text", "Textures");
    DOM.cbutton(div, null, "button_mini", "Upload", null, request_add_texture);
    data_editor.dom.list_textures = DOM.cdiv(ge, "list_textures");
    
    // Draving area
    data_editor.dom.drawing = DOM.cge(grid, "drawing", null, 2, 3, 2, 3);
    data_editor.dom.drawing_capture = DOM.cbutton(drawing, null, "button_mini", "Capture as Icon", {shape_key: null}, capture_shape_icon);
    data_editor.dom.drawing_capture.style.display = "none";
    // Config
    data_editor.dom.config = DOM.cge(grid, "config", null, 3, 4, 2, 3);

    // Edit and edit2
    data_editor.dom.edit = DOM.cge(grid, "edit", null, 2, 3, 3, 4);
    data_editor.dom.edit2 = DOM.cge(grid, "edit2", null, 3, 4, 3, 4);
}

function main() {
    init_screen();
    init_wgl();
    load_shape_definition();

    // Unsaved changes function
    window.addEventListener("beforeunload", function (e) {
        if(!data_editor.unsaved_changes)
            return undefined;
        let confirmationMessage = 'There are usaved changes. Are you sure you want to leave?';
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
    });    
}