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

function wgl_mouseout(x, y, dom_element) {
    data_editor.mouse.buttondown = false;
}

function init_wgl() {
    let domelement = data_editor.dom.drawing;

    // Renderer
    data_editor.renderer = new THREE.WebGLRenderer({
        antialias:true,
    });
    data_editor.renderer.setSize(domelement.clientWidth, domelement.clientHeight);
    data_editor.renderer.setClearColor(0xf0f0f0);
    domelement.appendChild(data_editor.renderer.domElement);

    // Scene
    data_editor.scene = new THREE.Scene();

    // Camera
    let cam_ratio = domelement.clientWidth / domelement.clientHeight;
    data_editor.camera = new THREE.PerspectiveCamera( 15, cam_ratio, 0.1, 1000 );
    data_editor.camera_position = { rx: -Math.PI/8, ry: Math.PI/4, distance: 10 }
    update_camera_position();
    data_editor.camera.rotation.order="YXZ";

    // Lighting
    data_editor.ambientlight = new THREE.AmbientLight(0xFFFFFF, 0.7);
    data_editor.directionallight = new THREE.DirectionalLight(0xFFFFFF, .4);
    data_editor.directionallight.position.set(40,100,60);

    data_editor.scene.add(data_editor.ambientlight);
    data_editor.scene.add(data_editor.directionallight);

    // Controls
    Input_initialize(document.body, null, null, null);
    Input_registerid("drawing", wgl_mousedown, wgl_mouseup, wgl_mousemove, wgl_mouseout);

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

function xmlhttp_call(method, url, data, function_result, function_error) {
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open(method, url, true);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    if(data)
        xmlhttp.send(JSON.stringify(data));
    else
        xmlhttp.send();
    xmlhttp.onreadystatechange = () => {
        if(xmlhttp.readyState == 4) {
            if(xmlhttp.status == 200)
                function_result(JSON.parse(xmlhttp.responseText));
            else
                function_error(xmlhttp.status);
        }
    };    
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
}

function mesh_addData(mesh, type, shape_key, subshape_index, element_index, additional_index) {
    mesh.userData.type = type;
    mesh.userData.shape_key = shape_key;
    mesh.userData.subshape_index = subshape_index;
    mesh.userData.element_index = element_index;
    mesh.userData.additional_index = additional_index;
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

    // Create vertex
    let vertex_texture = new THREE.MeshPhongMaterial( {color: 0x880000} );
    for(let ss_index = 0; ss_index < shape.subshapes.length; ss_index ++) {
        let ss = shape.subshapes[ss_index];
        for(let element_index = 0; element_index < ss.elements.length; element_index ++) {
            let element = ss.elements[element_index];

            for(let x = 0; x < element.v.length; x++) {
                let geometry = new THREE.BoxGeometry( .05, .05, .05 );
                let mesh = new THREE.Mesh(geometry, vertex_texture);
                mesh.position.x = element.v[x][0] * shape.base_scale[0];
                mesh.position.y = element.v[x][1] * shape.base_scale[1];
                mesh.position.z = element.v[x][2] * shape.base_scale[2];
                group.add(mesh);
                mesh_addData(mesh, "vertex", shape_key, ss_index, element_index, x);
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
    element = DOM.cdiv(shape_config, null, "shape_config_element");
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

        data_editor.unsaved_changes = true;
        data_editor.dom.save.style.display = "block";

        draw_definition();
    });

    show_shape_wgl(shape_key);
}

function request_delete_shape(ev) {
    let id = this.parentNode.getAttribute("data-key");
    alert("request_delete_shape not implemented: " + key);
    ev.stopPropagation();
}

function request_add_shape() {
    alert("request_add_shape not implemented.");
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
    let index = this.parentNode.getAttribute("data-index");

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

function init_screen() {
    let body = document.body;
    let ge, div;

    let grid = DOM.cg(document.body, "grid", "full_screen", ["250px", "1fr", "1fr"], ["45px", "1fr", "1fr"]);

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

    // Config
    data_editor.dom.config = DOM.cge(grid, "config", null, 3, 4, 2, 3);

    // Edit and edit2
    data_editor.dom.edit = DOM.cge(grid, "edit", null, 2, 3, 3, 4);
    data_editor.dom.edit2 = DOM.cge(grid, "edit2", null, 3, 4, 3, 4);
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

function load_shape_definition() {
    xmlhttp_call("GET", "/3dshapes/" + shapegroup_key + "/definition.json", null, (definition) => {
        data_editor.definition = definition;
        draw_definition();
    }, (status) => {
        DOM.showError("Error", "Error loading definition file");
    })
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