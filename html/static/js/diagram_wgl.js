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


// Shortcut
function $WGL_V3(x,y,z) {return new THREE.Vector3(x,y,z)}
function $WGL_V2(x,y) {return new THREE.Vector2(x,y)}
function $WGL_F3(a,b,c) {return new THREE.Face3(a,b,c)}

function WGL_initialize() {
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
function WGL_loadFont(url, obj) {
    obj.font = new THREE.FontLoader().parse(WGL_FONT);
}

// Class
class WGL {
    constructor(domelement) {
        this.global_settings = {
            show_device_name: true,
            cast_shadow: true,
            grid: {
                active: true,
                x: .5,
                y: .5,
                z: .5,
                angle: 15,
                resize: .25,
            },
            highlight_depth: 1,
            format: {
                use_standard_color: true,
                color1: 0x888888,
                color2: 0x444444,
                scale: 1,

                use_standard_link: true,
                link_weight: 0.025,
                link_height: .25,
                link_color: 0x888888,
                
                use_standard_text: true,
                text_color: 0x000000,
                text_rx: -Math.PI/4,
                text_height: .3,
                text_align: "l",
                text_rotation_x: 0,
                text_bg_color: 0xffffff,
                text_border_color: 0x000000,
                text_bg_type: "n",
                text_bg_show: false,
                text_border_show: false,
                text_border_width: .1,
                text_bg_depth: .1,
                text_rotation_x: 0,
            }
        }
        this.highlighted = [];
        this.selected = [];
        this.selected_type = null;

        this.domelement = domelement;
        this.scene = {
            L2: new THREE.Scene(),
            L3: new THREE.Scene(),
        };
        this.view = "L2";

        let cam_ratio = domelement.clientWidth / domelement.clientHeight;
        
        let initial_ortho_size = 7;

        this.camera = {
            L2: {
                persp: new THREE.PerspectiveCamera( 15, cam_ratio, 0.1, 1000 ),
                ortho: new THREE.OrthographicCamera( -initial_ortho_size * cam_ratio, initial_ortho_size * cam_ratio, initial_ortho_size, -initial_ortho_size, 1, 200),
                ortho_size: initial_ortho_size,
            },
            L3: {
                persp: new THREE.PerspectiveCamera( 15, cam_ratio, 0.1, 1000 ),
                ortho: new THREE.OrthographicCamera( -initial_ortho_size * cam_ratio, initial_ortho_size * cam_ratio, initial_ortho_size, -initial_ortho_size, 1, 200),
                ortho_size: initial_ortho_size,
            },
            current: "persp",
        }

        this.camera.L2.persp.position.y = 50;
        this.camera.L2.persp.position.z = 50;
        this.camera.L2.persp.rotation.x = -Math.PI/4.0;
        this.camera.L2.persp.rotation.order="YXZ";

        this.camera.L3.persp.position.y = 50;
        this.camera.L3.persp.position.z = 50;
        this.camera.L3.persp.rotation.x = -Math.PI/4.0;
        this.camera.L3.persp.rotation.order="YXZ";

        this.camera.L2.ortho.position.y = 30;
        this.camera.L2.ortho.rotation.x = -Math.PI/2.0;
        this.camera.L2.ortho.rotation.order="YXZ";

        this.camera.L3.ortho.position.y = 30;
        this.camera.L3.ortho.rotation.x = -Math.PI/2.0;
        this.camera.L3.ortho.rotation.order="YXZ";

        this.renderer = new THREE.WebGLRenderer( {
            antialias:true,
        });
        this.renderer.setClearColor(0xf0f0f0);
        this.renderer.setSize( domelement.clientWidth, domelement.clientHeight );
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        // Lighting
        this.ambientlightL2 = new THREE.AmbientLight(0xFFFFFF, 0.7);
        this.directionallightL2 = new THREE.DirectionalLight(0xFFFFFF, .4);
        this.directionallightL2.castShadow = this.global_settings.cast_shadow;
        this.directionallightL2.position.set(40,100,60);
        this.directionallightL2.shadow.camera.left = -50;
        this.directionallightL2.shadow.camera.right = 50;
        this.directionallightL2.shadow.camera.bottom = -50;
        this.directionallightL2.shadow.camera.top = 50;
        this.directionallightL2.shadow.camera.far = 200;
        this.directionallightL2.shadow.mapSize.width = 4096;
        this.directionallightL2.shadow.mapSize.height = 4096;
        this.scene.L2.add(this.ambientlightL2);
        this.scene.L2.add(this.directionallightL2);
        
        this.ambientlightL3 = new THREE.AmbientLight(0xFFFFFF, 0.7);
        this.directionallightL3 = new THREE.DirectionalLight(0xFFFFFF, .4);
        this.directionallightL3.castShadow = this.global_settings.cast_shadow;
        this.directionallightL3.position.set(40,100,60);
        this.directionallightL3.shadow.camera.left = -50;
        this.directionallightL3.shadow.camera.right = 50;
        this.directionallightL3.shadow.camera.bottom = -50;
        this.directionallightL3.shadow.camera.top = 50;
        this.directionallightL3.shadow.camera.far = 200;
        this.directionallightL3.shadow.mapSize.width = 4096;
        this.directionallightL3.shadow.mapSize.height = 4096;
        this.scene.L3.add(this.ambientlightL3);
        this.scene.L3.add(this.directionallightL3);

        domelement.appendChild( this.renderer.domElement );

        this.raycaster = new THREE.Raycaster();
        this.pickvector = $WGL_V2(0,0);
        
        this.tempVector = $WGL_V3(0,0,0);
        this.tempVector2 = $WGL_V3(0,0,0);
        this.tempVector3 = $WGL_V3(0,0,0);

        this.font = new THREE.FontLoader().parse(WGL_FONT);
        this.namematerial = new THREE.MeshStandardMaterial({color: 0x000000});

        this.cached_textures = {};

        this.selectMesh_material = new THREE.LineBasicMaterial( {
            color: 0x4488ff,
            linewidth: 1,
        });

        //var helper = new THREE.CameraHelper( this.directionallightL2.shadow.camera );
        //this.scene.L2.add(helper);
        this.requestDraw();
    }

    generateSelectGeometry(mesh) {
        // Find bounding box
        let x1 = -.1, x2 = .1, y1 = 0, y2 = .1, z1 = -.1, z2 = .1;
        for(let child of mesh.children) {
            if(child.geometry.boundingBox) {
                if(child.geometry.boundingBox.min.x < x1) x1 = child.geometry.boundingBox.min.x;
                if(child.geometry.boundingBox.min.y < y1) y1 = child.geometry.boundingBox.min.y;
                if(child.geometry.boundingBox.min.z < z1) z1 = child.geometry.boundingBox.min.z;
                if(child.geometry.boundingBox.max.x > x2) x2 = child.geometry.boundingBox.max.x;
                if(child.geometry.boundingBox.max.y > y2) y2 = child.geometry.boundingBox.max.y;
                if(child.geometry.boundingBox.max.z > z2) z2 = child.geometry.boundingBox.max.z;
            }
        }
        x1 -= .1, z1 -= .1, x2 += .1, y2 += .1, z2 += .1;
        let geometry = new THREE.BufferGeometry();
        let vertices = new Float32Array( [
            x1, y1, z2, x2, y1, z2,
            x2, y2, z2, x1, y2, z2,
            x1, y1, z1, x2, y1, z1,
            x2, y2, z1, x1, y2, z1,
        ] );
        let index = [
            0, 1, 1, 2, 2, 3, 3, 0,
            4, 5, 5, 6, 6, 7, 7, 4,
            0, 4, 1, 5, 2, 6, 3, 7,
        ];
        geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        geometry.setIndex(index);
        return geometry;
    }

    select_find(view, type, id) {
        for(let x = 0; x < this.selected.length; x++) {
            let element = this.selected[x];
            if((element.view === view) && (element.type === type) && (element.id === id))
                return x;
        }
        return -1;
    }

    select(view, type, id, data, multiselect) {
        if(!multiselect)
            this.deselect_all();
        else {
            // On multiselect, we can only select objects of the same type, so if the 
            // first object is not the same type, we deselect everything
            if((this.selected.length > 0) && (this.selected[0].type !== type))
                this.deselect_all();
        }
        if(this.select_find(view, type, id) !== -1) {
            return;
        }

        let mesh = this.getMesh(view, type, id);
        if(!mesh)
            return;

        if(["device", "vrf", "symbol", "l2segment"].indexOf(type) !== -1) {
            this.highlight(view, type, id, "select");

            let geometry = this.generateSelectGeometry(mesh);
            let selectMesh = new THREE.LineSegments( geometry, this.selectMesh_material );
            mesh.add(selectMesh);
            selectMesh.userData.type = type;
            selectMesh.userData.id = id;
            selectMesh.userData.submesh = "select";
            selectMesh.userData.e = mesh.userData.e;
            this.selected.push({
                view: view, type: type, id: id, mesh: selectMesh, data: data,
            });
            this.selected_type = type;
        }
        else if(type === "text") {
            let geometry = this.generateSelectGeometry(mesh);
            let selectMesh = new THREE.LineSegments( geometry, this.selectMesh_material );
            mesh.add(selectMesh);
            selectMesh.userData.type = type;
            selectMesh.userData.id = id;
            selectMesh.userData.submesh = "select";
            selectMesh.userData.e = mesh.userData.e;
            this.selected.push({
                view: view, type: type, id: id, mesh: selectMesh, data: data,
            });
            this.selected_type = type;            
        }
        this.requestDraw();
    }

    deselect(view, type, id) {
        let index = this.select_find(view, type, id);
        if(index === -1)
            return;

        let element = this.selected[index];
        this.selected.splice(index, 1);
        
        if(element.mesh)
            element.mesh.parent.remove(element.mesh);

        if(this.selected.length === 0)
            this.selected_type = null;

        this.dehighlight(view, type, id, "select");
        this.requestDraw();
    }

    deselect_all() {
        while(this.selected.length > 0) {
            this.deselect(this.selected[0].view, this.selected[0].type, this.selected[0].id);
        }
    }

    highlight_find(view, type, id, tag) {
        for(let x = 0; x < this.highlighted.length; x++) {
            if((this.highlighted[x].view === view) && 
                    (this.highlighted[x].type === type) && 
                    (this.highlighted[x].id === id) && 
                    ((this.highlighted[x].tag === tag) || (!tag)) ) {
                return x;
            }
        }
        return -1;
    }

    highlight_color(color) {
        if((color.r < .5) && (color.g < .5) && (color.b < .5)) {
            color.r = 1;
            color.g = color.g + .4;
            color.b = color.b + .4;
        }
        else {
            color.r = 1;
            color.g = color.g / 4;
            color.b = color.b / 4;
        }
    }

    find_device_neighbors(dev_id, depth) {
        let new_devices = [dev_id];
        let next_devices = [];
        let all_devices = {};
        depth -= 1;
        all_devices[dev_id] = depth;

        while(depth > 0) {
            depth -= 1;
            for(let dev_id of new_devices) {
                let listlinks = this.findLinksOfDevice(dev_id, this.scene["L2"]);
                for(let link of listlinks) {
                    let other_id = link.userData.e.devs[0].id;
                    if(other_id === dev_id)
                        other_id = link.userData.e.devs[1].id;

                    if(!(other_id in all_devices)) {
                        next_devices.push(other_id);
                        all_devices[other_id] = depth;
                    }
                }
            }
            new_devices = next_devices;
            next_devices = [];
        }
        return all_devices;
    }

    highlight(view, type, id, tag, ignoreChildren) {
        let mesh = this.getMesh(view, type, id);
        if(!mesh)
            return;
        
        let index = this.highlight_find(view, type, id, tag);
        if(index !== -1) {
            return;
        }

        if(["link", "interface", "p2p_interface", "svi_interface"].includes(type)) {
            let highlight_entry = {
                view: view,
                type: type,
                id: id,
                tag: tag,
            }

            this.highlighted.push(highlight_entry);

            for(let child of mesh.children) {
                this.highlight_color(child.material.color);
            }

            if((!ignoreChildren) && (type === "link")) {
                this.highlight(view, "device", mesh.userData.e.devs[0].id, tag, true);
                this.highlight(view, "device", mesh.userData.e.devs[1].id, tag, true);
            }
        }
        else if(["vrf", "symbol"].includes(type)) {
            let highlight_entry = {
                view: view,
                type: type,
                id: id,
                tag: tag,
            }

            this.highlighted.push(highlight_entry);

            for(let child of mesh.children) {
                if((child.userData.submesh == 1) || (child.userData.submesh == 2) || (child.userData.submesh == 3)) {
                    this.highlight_color(child.material.uniforms.mycolor.value);
                }
            }

            if(type === "vrf") {
                let links = this.findLinksOfVrf(id);
                for(let if_type in links) {
                    for(let if_id in links[if_type]) {
                        this.highlight(view, if_type, if_id, tag);
                    }
                }
            }
        }
        else if(type === "device") {
            let neighbors = this.find_device_neighbors(id, this.global_settings.highlight_depth);
            if(ignoreChildren) {
                neighbors = {};
                neighbors[id] = .5;
            }
            console.log("Highlight")
            console.log(neighbors);
            for(let neighbor in neighbors) {
                if(this.highlight_find(view, "device", neighbor, tag) !== -1)
                    continue;

                let mesh = this.getMesh(view, "device", neighbor);

                this.highlighted.push({
                    view: view,
                    type: type,
                    id: neighbor,
                    tag: tag,
                });
                for(let child of mesh.children) {
                    if((child.userData.submesh == 1) || (child.userData.submesh == 2)) {
                        this.highlight_color(child.material.uniforms.mycolor.value);
                    }
                }
                if((!ignoreChildren) && (neighbors[neighbor] >= 0)) {
                    let listlinks = this.findLinksOfDevice(neighbor, this.scene[view]);
                    for(let link of listlinks) {
                        this.highlight(view, "link", link.userData.id, tag, true);
                    }
                }
            }
        }
        this.requestDraw();
    }

    dehighlight(view, type, id, tag, ignoreChildren) {
        let mesh = this.getMesh(view, type, id);
        if(!mesh) {
            return;
        }

        if(["link", "interface", "p2p_interface", "svi_interface"].includes(type)) {
            console.log("Dehighlight link " + id);
            let index = this.highlight_find(view, type, id, tag);
            if(index === -1) {
                return;
            }
            this.highlighted.splice(index, 1);
            if(this.highlight_find(view, type, id) === -1)
                this.updateLinkGeometry(type, mesh, view);

            if((!ignoreChildren) && (type === "link")) {
                this.dehighlight(view, "device", mesh.userData.e.devs[0].id, tag, true);
                this.dehighlight(view, "device", mesh.userData.e.devs[1].id, tag, true);
            }
        }
        else if(["vrf", "symbol"].includes(type)) {
            let index = this.highlight_find(view, type, id, tag);
            if(index === -1) {
                return;
            }
            this.highlighted.splice(index, 1);
            if(this.highlight_find(view, type, id) === -1) {
                if(type === "symbol")
                    this.updateSymbolColor(type, id, view);
                else
                    this.updateDeviceColor(type, id, view);
            }

            if(type === "vrf") {
                let links = this.findLinksOfVrf(id);
                for(let if_type in links) {
                    for(let if_id in links[if_type]) {
                        this.dehighlight(view, if_type, if_id, tag);
                    }
                }
            }
        }
        else if(type === "device") {
            let neighbors = this.find_device_neighbors(id, this.global_settings.highlight_depth);
            if(ignoreChildren) {
                neighbors = {};
                neighbors[id] = .5;
            }
            console.log("Dehighlight")
            console.log(neighbors);
            for(let neighbor in neighbors) {
                let index = this.highlight_find(view, "device", neighbor, tag);
                if(index === -1) {
                    continue;
                }
                this.highlighted.splice(index, 1)[0];

                if(this.highlight_find(view, "device", neighbor) === -1) {
                    this.updateDeviceColor("device", neighbor, view);
                }

                if((!ignoreChildren) && (neighbors[neighbor] >= 0)) {
                    let listlinks = this.findLinksOfDevice(neighbor, this.scene[view]);
                    for(let link of listlinks) {
                        this.dehighlight(view, "link", link.userData.id, tag, true);
                    }
                }
            }
        }

        this.requestDraw();
    }

    setBGColor(color) {
        this.renderer.setClearColor(color);
        this.requestDraw();
    }

    setCastShadow(cast_shadow) {
        this.global_settings.cast_shadow = cast_shadow;
        this.directionallightL2.castShadow = cast_shadow;
        this.directionallightL3.castShadow = cast_shadow;
        this.requestDraw();
    }

    setHighlightDepth(depth) {
        this.global_settings.highlight_depth = depth;
    }

    resize() {
        let cam_ratio = this.domelement.clientWidth / this.domelement.clientHeight;
        this.camera.L2.persp.aspect = cam_ratio;
        this.camera.L2.persp.updateProjectionMatrix();
        
        this.camera.L3.persp.aspect = cam_ratio;
        this.camera.L3.persp.updateProjectionMatrix();
        
        this.camera.L2.ortho.left = -this.camera.L2.ortho_size * cam_ratio;
        this.camera.L2.ortho.right = this.camera.L2.ortho_size * cam_ratio;
        this.camera.L2.ortho.updateProjectionMatrix();

        this.camera.L3.ortho.left = -this.camera.L3.ortho_size * cam_ratio;
        this.camera.L3.ortho.right = this.camera.L3.ortho_size * cam_ratio;
        this.camera.L3.ortho.updateProjectionMatrix();
        
        this.renderer.setSize(this.domelement.clientWidth, this.domelement.clientHeight)
        this.requestDraw();
    }

    setView(view) {
        this.view = view;
        this.adjustLabelsToCamera();
        this.requestDraw();
    }

    draw() {
        if(this.draw_needed) {
            this.renderer.render( this.scene[this.view], this.camera[this.view][this.camera.current] );
            this.draw_needed = false;
        }
    }

    requestDraw() {
        if(!this.draw_needed) {
            this.draw_needed = true;
            requestAnimationFrame( () => {
                this.draw();
            });
        }
    }

    processLoadedTexture(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 4;

        this.requestDraw();
    }

    loadTexture(texture_url) {
        if(texture_url in this.cached_textures)
            return this.cached_textures[texture_url];
        else {
            this.cached_textures[texture_url] = new THREE.TextureLoader().load(texture_url, (t) => {
                this.processLoadedTexture(t);
            });
            return this.cached_textures[texture_url];
        }
    }

    settingsBackground(bg_color) {
        this.setBGColor(bg_color);
    }

    // ***********************************************
    // Functions to add/remove shapes to the GEOMETRIES structure
    // and update the diagrams
    // ***********************************************
    addShapes(geometry_type, shapegroup_id, shape_data) {
        for(let shape_id in shape_data.shapes) {
            let to_update = [];
            let dev_type = shapegroup_id + "_" + shape_id;
            GEOMETRY[geometry_type][dev_type] = shape_data.shapes[shape_id];

            if(geometry_type === "DEVICE") {
                // Mark devices that need to be updated
                this.scene.L2.children.forEach((base_element) => {
                    if(base_element.userData.type === "base") {
                        base_element.children.forEach((meshgroup) => {
                            if((meshgroup.userData.type === "device") && (meshgroup.userData.e.type === dev_type)) {
                                to_update.push(meshgroup);
                            }
                        })
                    }
                });
                // Mark vrfs that need to be updated
                this.scene.L3.children.forEach((base_element) => {
                    if(base_element.userData.type === "base") {
                        base_element.children.forEach((meshgroup) => {
                            if((meshgroup.userData.type === "vrf") && (meshgroup.userData.e.type === dev_type)) {
                                to_update.push(meshgroup);
                            }
                        })
                    }
                });
            }
            // Remove and re add devices and vrfs
            to_update.forEach((meshgroup) => {
                let base_element = meshgroup.parent;
                base_element.remove(meshgroup);
                this.addDevice(meshgroup.userData.type, meshgroup.userData.id, (meshgroup.userData.type === "device") ? "L2" : "L3", meshgroup.userData.e, false);
            });
        }
    }

    removeShapes(geometry_type, shapegroup_id) {
        for(let dev_type in GEOMETRY[geometry_type]) {
            if(dev_type.split("_")[0] === shapegroup_id) {
                let to_update = [];
                delete GEOMETRY[geometry_type][dev_type];           
                if(geometry_type === "DEVICE") {
                    // Mark devices that need to be updated
                    this.scene.L2.children.forEach((base_element) => {
                        if(base_element.userData.type === "base") {
                            base_element.children.forEach((meshgroup) => {
                                if((meshgroup.userData.type === "device") && (meshgroup.userData.e.type === dev_type)) {
                                    to_update.push(meshgroup);
                                }
                            })
                        }
                    });
                    // Mark vrfs that need to be updated
                    this.scene.L3.children.forEach((base_element) => {
                        if(base_element.userData.type === "base") {
                            base_element.children.forEach((meshgroup) => {
                                if((meshgroup.userData.type === "vrf") && (meshgroup.userData.e.type === dev_type)) {
                                    to_update.push(meshgroup);
                                }
                            })
                        }
                    });
                }
                // Remove and re add devices and vrfs
                to_update.forEach((meshgroup) => {
                    let base_element = meshgroup.parent;
                    base_element.remove(meshgroup);
                    this.addDevice(meshgroup.userData.type, meshgroup.userData.id, (meshgroup.userData.type === "device") ? "L2" : "L3", meshgroup.userData.e, false);
                });
            }
        }
    }

    // ***********************************************
    // Camera Functions
    // ***********************************************
    setCamera(px, py, pz, rx, ry, rz) {
        let ac = this.camera[this.view][this.camera.current];
        ac.position.x = px;
        ac.position.y = py;
        ac.position.z = pz;
        ac.rotation.x = rx;
        ac.rotation.y = ry;
        ac.rotation.z = rz;
        
        this.requestDraw();
    }
    moveCamera(dx, dy) {
        let ac = this.camera[this.view][this.camera.current];
        let sin = Math.sin(ac.rotation.y);
        let cos = Math.cos(ac.rotation.y);
        ac.position.x -= dx * .1 * cos + dy * .1 * sin;
        ac.position.z -= -dx * .1 * sin + dy * .1 * cos;

        this.requestDraw();
    }

    moveCameraToElement(e) {
        let ac = this.camera[this.view][this.camera.current];
        e.getWorldPosition(this.tempVector);
        if(this.camera.current === "ortho") {
            ac.position.x = this.tempVector.x;
            ac.position.z = this.tempVector.z;
        }
        else {
            ac.position.x = this.tempVector.x;
            ac.position.y = this.tempVector.y + 30;
            ac.position.z = this.tempVector.z + 30;
            ac.rotation.y = 0;
            ac.rotation.x = -Math.PI/4;
        }

        this.requestDraw();
    }

    positionCameraAroundElement(e, distance, rx, ry) {
        let ac = this.camera[this.view][this.camera.current];
        e.getWorldPosition(this.tempVector);
        if(this.camera.current === "ortho") {
            ac.position.x = this.tempVector.x;
            ac.position.z = this.tempVector.z;
        }
        else {
            ac.position.x = 0;
            ac.position.y = 0;
            ac.position.z = distance;
            let e = new THREE.Euler(-rx, ry, 0, "YXZ");
            ac.position.applyEuler(e).add(this.tempVector);
            ac.rotation.y = ry;
            ac.rotation.x = -rx;
        }

        this.requestDraw();
    }

    adjustLabelsToCamera() {
        let angle = this.camera[this.view][this.camera.current].rotation.y;
        let view = this.scene[this.view];

        view.children.forEach((base_element) => {
            if(base_element.userData.type === "base") {
                base_element.children.forEach((device) => {
                    if((device.userData.type === "device") || (device.userData.type === "vrf") || (device.userData.type === "l2segment"))
                        this.adjustDeviceNameRotation(device);
                })
            }
        })

        this.requestDraw();
    }

    rotateCamera(dx, dy) {
        let ac = this.camera[this.view][this.camera.current];

        if(this.camera.current == "persp") {
            ac.rotation.y += dx/200.0;
            ac.rotation.x += dy/200.0;
            if (ac.rotation.x > Math.PI*.5)
                ac.rotation.x = Math.PI*.5
            if (ac.rotation.x < -Math.PI*.5)
                ac.rotation.x = -Math.PI*.5

        }
        else {
            ac.rotation.y += dx/200.0;
        }

        this.adjustLabelsToCamera();
        this.requestDraw();
    }

    rotateCameraAround(dx, dy, mesh) {
        if(this.camera.current != "persp")
            return this.rotateCamera(dx, dy);

        let angle_x = dy/200.0;
        let angle_y = dx/200.0;
        let up = new THREE.Vector3(0,1,0);
        let h = new THREE.Vector3(1,0,0);
        let d = new THREE.Vector3(0,0,1);

        let ac = this.camera[this.view][this.camera.current];
        let mesh_position = this.tempVector2;
        mesh.getWorldPosition(mesh_position);
        this.tempVector.subVectors(ac.position, mesh_position);

        let flatvector = this.tempVector3.copy(this.tempVector);
        flatvector.y = 0;

        let rotation_y = flatvector.angleTo(d);
        if(this.tempVector.x < 0)
            rotation_y = -rotation_y;
        
        let rotation_x = this.tempVector.angleTo(up);
        if ((rotation_x < 0.05) && (angle_x < 0))
            angle_x = 0;
        
        this.tempVector.applyAxisAngle(up, -rotation_y);
        this.tempVector.applyAxisAngle(h, angle_x);
        this.tempVector.applyAxisAngle(up, angle_y + rotation_y);

        this.tempVector.add(mesh_position);

        ac.position.copy(this.tempVector);
        ac.rotation.y += angle_y;
        ac.rotation.x += angle_x;

        this.adjustLabelsToCamera();
        this.requestDraw();
    }

    zoomCamera(dy, mesh) {
        let ac = this.camera[this.view][this.camera.current];

        if(this.camera.current == "persp") {
            if(mesh) {
                this.tempVector = ac.position.clone();
                mesh.getWorldPosition(this.tempVector2);
                this.tempVector.negate().add(this.tempVector2).normalize().multiplyScalar(-.2 * dy);
                ac.position.add(this.tempVector);
            }
            else
                ac.translateZ(dy*.1);
        }
        else {
            this.camera[this.view].ortho_size += dy*.1;
            if(this.camera[this.view].ortho_size < 1)
                this.camera[this.view].ortho_size = 1;
            if(this.camera[this.view].ortho_size > this.domelement.clientHeight*.1)
                this.camera[this.view].ortho_size = this.domelement.clientHeight*.1;
            
            let os = this.camera[this.view].ortho_size;

            let cam_ratio = this.domelement.clientWidth / this.domelement.clientHeight;

            ac.left = -this.camera[this.view].ortho_size * cam_ratio;
            ac.right = this.camera[this.view].ortho_size * cam_ratio;
            ac.top = this.camera[this.view].ortho_size;
            ac.bottom = -this.camera[this.view].ortho_size;
            ac.updateProjectionMatrix();
        }
        this.requestDraw();
    }

    toggleCamera() {
        this.camera.current = this.camera.current == "ortho" ? "persp" : "ortho"
        
        this.adjustLabelsToCamera();

        this.requestDraw();

        return this.camera.current;
    }


    findMesh(type, id, basemesh) {
        for(let x = 0; x < basemesh.children.length; x++) {
            let c = basemesh.children[x];
            if((c.userData.type === type) && (c.userData.id === id))
                return c;

            let r = this.findMesh(type, id, c);
            if(r)
                return r
        }

        return null
    }

    findMeshByName(type, name, basemesh) {
        let result = [];

        for(let x = 0; x < basemesh.children.length; x++) {
            let c = basemesh.children[x];
            if((c.userData.type === type) && (c.userData.e.name.toLowerCase().indexOf(name.toLowerCase()) !== -1))
                result.push(c);
            else {
                let r = this.findMeshByName(type, name, c);
                if(r.length > 0)
                    result.push(...r);
            }
        }

        return result
    }

    findLinksOfDevice(devid, basemesh) {
        let meshlist = []
        for(let x = 0; x < basemesh.children.length; x++) {
            let c = basemesh.children[x];
            if(c.userData.type === "link") {
                for(let y = 0; y < c.userData.e.devs.length; y++) {
                    if (c.userData.e.devs[y].id == devid) {
                        meshlist.push(c);
                        break;
                    }
                }
            }
        }
        return meshlist;
    }

    findLinksOfBase(base, basemesh) {
        let linklist = {
            link: {},
            l2link: {},
            interface: {},
            svi_interface: {},
            p2p_interface: {}
        };
        let devids = new Set();
        let vrfids = new Set();
        let l2segmentids = new Set();

        base.children.forEach((element) => {
            if(element.userData.type === "device")
                devids.add(element.userData.id);
            if(element.userData.type === "l2segment")
                l2segmentids.add(element.userData.id);
            if(element.userData.type === "vrf")
                vrfids.add(element.userData.id);
        });

        basemesh.children.forEach((c) => {
            if(c.userData.type === "link") {
                for(let y = 0; y < c.userData.e.devs.length; y++) {
                    if (devids.has(c.userData.e.devs[y].id)) {
                        linklist.link[c.userData.id] = c;
                        break;
                    }
                }
            }
            else if((c.userData.type === "l2link") && ( 
                l2segmentids.has(c.userData.e.l3_reference.src_l2segment_id) || 
                l2segmentids.has(c.userData.e.l3_reference.dst_l2segment_id) 
                ))
                linklist.l2link[c.userData.id] = c;
            else if((c.userData.type === "interface") && ( 
                vrfids.has(c.userData.e.l3_reference.vrf_id) || 
                l2segmentids.has(c.userData.e.l3_reference.l2segment_id) 
                ))
                linklist.interface[c.userData.id] = c;
            else if((c.userData.type === "svi_interface") && ( 
                vrfids.has(c.userData.e.l3_reference.vrf_id) || 
                l2segmentids.has(c.userData.e.l3_reference.l2segment_id) 
                ))
                linklist.svi_interface[c.userData.id] = c;
            else if((c.userData.type === "p2p_interface") && ( 
                vrfids.has(c.userData.e.l3_reference.src_vrf_id) || 
                vrfids.has(c.userData.e.l3_reference.dst_vrf_id) 
                ))
                linklist.p2p_interface[c.userData.id] = c;
        });

        return linklist;
    }

    findLinksOfL2Segment(id) {
        let linklist = {
            l2link: {},
            interface: {},
            svi_interface: {},
        };

        for(let x = 0; x < this.scene.L3.children.length; x++) {
            let element = this.scene.L3.children[x];
            if((element.userData.type == "l2link") && (
                    (element.userData.e.l3_reference.src_l2segment_id === id) ||
                    (element.userData.e.l3_reference.dst_l2segment_id === id)
                ))
                linklist.l2link[element.userData.id] = element;
            else if((element.userData.type == "interface") && (element.userData.e.l3_reference.l2segment_id === id))
                linklist.interface[element.userData.id] = element;
            else if((element.userData.type == "svi_interface") && (element.userData.e.l3_reference.l2segment_id === id))
                linklist.svi_interface[element.userData.id] = element;
        }

        return linklist;
    }

    findIPsOfVrf(id) {
        let vrf = this.getMesh("L3", "vrf", id);
        let ips = {
            "ipv4": [],
            "ipv6": [],
        }
        if(!vrf)
            return ips;

        // Find ips on interfaces
        let links = this.findLinksOfVrf(id);
        for(let if_type in links) {
            for(let if_id in links[if_type]) {
                let ip_data;
                let link = links[if_type][if_id];
                if("ip" in link.userData.e) {
                    if(if_type === "p2p_interface") {
                        if(link.userData.e.l3_reference.src_vrf_id === id)
                            ip_data = link.userData.e.ip[0];
                        else
                            ip_data = link.userData.e.ip[1];
                    }
                    else
                        ip_data = link.userData.e.ip;
                }
                else
                    continue;

                ["ipv4", "ipv6"].forEach((af) => {
                    ip_data.address[af].forEach((ip) => {
                        ips[af].push(ip)
                    })
                });
            }
        }

        // Find ips on lo interfaces
        if("los" in vrf.userData.e) {
            for(let if_name in vrf.userData.e.los) {
                ["ipv4", "ipv6"].forEach((af) => {
                    vrf.userData.e.los[if_name][af].forEach((ip) => {
                        ips[af].push(ip)
                    });
                });
            }
        }
        return ips;
    }

    findLinksOfVrf(id) {
        let linklist = {
            p2p_interface: {},
            interface: {},
            svi_interface: {},
        };

        for(let x = 0; x < this.scene.L3.children.length; x++) {
            let element = this.scene.L3.children[x];
            if((element.userData.type == "p2p_interface") && (
                    (element.userData.e.l3_reference.src_vrf_id === id) ||
                    (element.userData.e.l3_reference.dst_vrf_id === id)
                ))
                linklist.p2p_interface[element.userData.id] = element;
            else if((element.userData.type == "interface") && (element.userData.e.l3_reference.vrf_id === id))
                linklist.interface[element.userData.id] = element;
            else if((element.userData.type == "svi_interface") && (element.userData.e.l3_reference.vrf_id === id))
                linklist.svi_interface[element.userData.id] = element;
        }

        return linklist;
    }

    findBGPPeersOfVrf(id) {
        let bgp_peer_list = [];
        for(let x = 0; x < this.scene.L3.children.length; x++) {
            let element = this.scene.L3.children[x];
            if(element.userData.type === "bgp_peering") {
                if((element.userData.e.l3_reference.src_vrf_id === id) || (element.userData.e.l3_reference.dst_vrf_id === id)) {
                    bgp_peer_list.push(element);
                }
            }
        }

        return bgp_peer_list;
    }
    findClosestLinkJointIndex(view, element_type, linkid, x, y, z) {
        let mesh = this.getMesh(view, element_type, linkid);
        let distance = 10000;
        let index = -1;
        for(let i = 0; i < mesh.userData.e.linedata.points.length; i++) {
            let point = mesh.userData.e.linedata.points[i];
            let newdistance = (point[0]-x)*(point[0]-x)+(point[1]-y)*(point[1]-y)+(point[2]-z)*(point[2]-z);
            if ( newdistance < distance) {
                distance = newdistance;
                index = i;
            }
        }
        return index;
    }

    /**
     * Function to compute what l2 segments are connected together (l2 domains)
     */
     findL2Domains() {
        let l2segment_domain = {};
        let l2domains = {};
        let l2links = [];
        let id = 0;
        this.scene.L3.children.forEach((parent_element) => {
            if(parent_element.userData.type === "base") {
                parent_element.children.forEach((element) => {
                    if(element.userData.type == "l2segment") {
                        l2segment_domain[element.userData.id] = id;
                        l2domains[id] = [element.userData.id];
                        id++;
                    }
                });
            }
            else if(parent_element.userData.type === "l2link") {
                l2links.push(parent_element.userData);
            }
        });

        l2links.forEach((l2link) => {
            let dst_domain = l2segment_domain[l2link.e.l3_reference.dst_l2segment_id];
            let src_domain = l2segment_domain[l2link.e.l3_reference.src_l2segment_id];
            if(src_domain !== dst_domain) {
                l2domains[dst_domain].forEach((l2segment_id) => {
                    l2segment_domain[l2segment_id] = src_domain;
                    l2domains[src_domain].push(l2segment_id);
                });
                delete l2domains[dst_domain];
                /*
                for(let l2segment_id in l2segment_domain) {
                    if(l2segment_domain[l2segment_id] === dst_domain) l2segment_domain[l2segment_id] = src_domain;
                }*/
            }
        });

        return [l2segment_domain, l2domains];
     }

    /**
     * Function to fill transport and ip addressing on the return structure of function findBGPPeerData
     */
    findBGPPeerData_createStruct(vrf1_id, vrf2_id, src_if, dst_if) {
        let result_data = {
            src_vrf_id: vrf1_id,
            dst_vrf_id: vrf2_id,
            curve_x: 0,
            curve_y: 4,
            color: 0xff0000,
        };

        let addressing = [];
        // First of all, if src is interface and dst is svi, we invert it
        if((src_if.type === "interface") && (dst_if.type === "svi_interface")) {
            let tmp = dst_if;
            dst_if = src_if;
            src_if = tmp;
        }

        // Check what type of peering we are looking at and start filling result data
        if((src_if.type === "vrf") && (dst_if.type === "vrf")) {
            let src_lo = null, dst_lo = null;

            if("los" in src_if.e) {
                let keys = Object.keys(src_if.e.los)
                if(keys.length > 0) {
                    src_lo = keys[0];
                    addressing.push(src_if.e.los[src_lo]);
                }
            }
            else
                addressing.push(null);

            if("los" in dst_if.e) {
                let keys = Object.keys(dst_if.e.los)
                if(keys.length > 0) {
                    dst_lo = keys[0];
                    addressing.push(dst_if.e.los[dst_lo]);
                }
            }
            else
                addressing.push(null);
        }

        else if(src_if.type === "p2p_interface") {
            if(src_if.e.l3_reference.src_vrf_id === vrf1_id) {
                addressing.push(("ip" in src_if.e) ? src_if.e.ip[0].address : null);
                addressing.push(("ip" in src_if.e) ? src_if.e.ip[1].address : null);
            }
            else {
                addressing.push(("ip" in src_if.e) ? src_if.e.ip[1].address : null);
                addressing.push(("ip" in src_if.e) ? src_if.e.ip[0].address : null);                
            }
        }
        else if((src_if.type === "svi_interface") && (dst_if.type === "svi_interface")) {
            addressing.push(("ip" in src_if.e) ? src_if.e.ip.address : null);
            addressing.push(("ip" in dst_if.e) ? dst_if.e.ip.address : null);
        }
        else if((src_if.type === "svi_interface") && (dst_if.type === "interface")) {
            addressing.push(("ip" in src_if.e) ? src_if.e.ip.address : null);
            addressing.push(("ip" in dst_if.e) ? dst_if.e.ip.address : null);
        }
        else if((src_if.type === "interface") && (dst_if.type === "interface")) {
            addressing.push(("ip" in src_if.e) ? src_if.e.ip.address : null);
            addressing.push(("ip" in dst_if.e) ? dst_if.e.ip.address : null);
        }
        else {
            return null
        }

        // Fill transport and ips
        if((addressing[0]) && (addressing[1]) && (addressing[0].ipv4.length > 0) && (addressing[1].ipv4.length > 0)) {
            result_data.src_ip = addressing[0].ipv4[0].split("/")[0];
            result_data.dst_ip = addressing[1].ipv4[0].split("/")[0];
            result_data.afisafi = ["ipv4/unicast"];
            result_data.transport = "ipv4";
        }
        else if((addressing[0]) && (addressing[1]) && (addressing[0].ipv6.length > 0) && (addressing[1].ipv6.length > 0)) {
            result_data.src_ip = addressing[0].ipv6[0].split("/")[0];
            result_data.dst_ip = addressing[1].ipv6[0].split("/")[0];
            result_data.afisafi = ["ipv6/unicast"];
            result_data.transport = "ipv6";
        }
        else {
            result_data.src_ip = "0.0.0.0";
            result_data.dst_ip = "0.0.0.0";
            result_data.afisafi = ["ipv4/unicast"];
            result_data.transport = "ipv4";
        }
        return result_data;
    }

    /**
     * Function to find what is the best type of bgp peering between 2 vrfs
     */
    findBGPPeerData(vrf1_id, vrf2_id) {
        let result_data = null;

        let vrf1 = this.findMesh("vrf", vrf1_id, this.scene.L3);
        let vrf2 = this.findMesh("vrf", vrf2_id, this.scene.L3);
        if((vrf1 === null) || (vrf2 === null))
            return null;

        // Check if these two vrfs have the same asn. If so, we'll do a loopback to loopback bgp peering if loopbacks exist.
        // If loopbacks don't exist, we'll do an unknown
        let asn1 = (vrf1.userData.e.routing && vrf1.userData.e.routing.asn) ? vrf1.userData.e.routing.asn : "";
        let asn2 = (vrf2.userData.e.routing && vrf2.userData.e.routing.asn) ? vrf2.userData.e.routing.asn : "";
        if(asn1 === asn2) {
            result_data = this.findBGPPeerData_createStruct(vrf1_id, vrf2_id, vrf1.userData, vrf2.userData);
            return result_data;
        }

        // Check if there is a p2pinterface between the two vrfs
        // on this same pass, for efficiency, we'll collect the list of interfaces of each vrf
        let interfaces = [[], []];
        this.scene.L3.children.forEach((element) => {
            if(element.userData.type === "p2p_interface") {
                if(
                    ((element.userData.e.l3_reference.src_vrf_id === vrf1_id) && (element.userData.e.l3_reference.dst_vrf_id === vrf2_id)) ||
                    ((element.userData.e.l3_reference.src_vrf_id === vrf2_id) && (element.userData.e.l3_reference.dst_vrf_id === vrf1_id))
                    )
                    result_data = this.findBGPPeerData_createStruct(vrf1_id, vrf2_id, element.userData, null);
            }
            else if((element.userData.type === "interface") || (element.userData.type === "svi_interface")) {
                if(element.userData.e.l3_reference.vrf_id === vrf1_id)
                    interfaces[0].push(element.userData);
                else if(element.userData.e.l3_reference.vrf_id === vrf2_id)
                    interfaces[1].push(element.userData);
            }
        })

        if(result_data !== null)
            return result_data;

        // Check if the two elements have interfaces connected to the same l2segment
        let [l2segment_domain, l2domains] = this.findL2Domains();
        interfaces[0].forEach((dev1_if) => {
            interfaces[1].forEach((dev2_if) => {
                if(l2segment_domain[dev1_if.e.l3_reference.l2segment_id] === l2segment_domain[dev2_if.e.l3_reference.l2segment_id])
                    result_data = this.findBGPPeerData_createStruct(vrf1_id, vrf2_id, dev1_if, dev2_if);
            })
        });

        if(result_data !== null)
            return result_data;

        // If none of these match, we'll greate a bgp peering without interfaces
        // (from loopbacks if they exist).
        if((vrf1 !== null) && (vrf2 !== null))
            result_data = this.findBGPPeerData_createStruct(vrf1_id, vrf2_id, vrf1.userData, vrf2.userData);

        return result_data;
    }

    getMesh(view, type, id) {
        return this.findMesh(type, id, this.scene[view]);
    }

    getMeshByName(view, type, name) {
        return this.findMeshByName(type, name, this.scene[view]);
    }

    getMeshPosition(view, type, id) {
        let mesh = this.findMesh(type, id, this.scene[view]);
        let r = {x: mesh.position.x, y: mesh.position.y, z: mesh.position.z};
        if(mesh.userData.type === "text")
            r.y = mesh.userData.e.py;
        if("base" in mesh.userData.e)
            r.base = mesh.userData.e.base;

        return r;
    }

    getMeshRotation(view, type, id) {
        return this.findMesh(type, id, this.scene[view]).rotation;
    }

    getMeshSize(view, type, id) {
        let o = this.findMesh(type, id, this.scene[view])
        this.tempVector.x = o.userData.e.sx;
        this.tempVector.y = o.userData.e.sy;
        this.tempVector.z = o.userData.e.sz;
        return this.tempVector;
    }

    moveMesh(view, type, id, x, y, z, base, alignToGrid) {
        let mesh = this.findMesh(type, id, this.scene[view]);
        let base_y = undefined;

        if(mesh) {
            if(x !== undefined) {
                mesh.position.x = x;
            }
            if(y !== undefined) {
                base_y = 0;

                mesh.position.y = y;

                // Make sure y is never below base of element
                if(mesh.userData.e.base !== undefined) {
                    let basemesh = this.findMesh("base", (base != null) ? base : mesh.userData.e.base, this.scene[view]);
                    if(y < basemesh.userData.e.sy) {
                        mesh.position.y = basemesh.userData.e.sy;
                    }
                    base_y = basemesh.userData.e.sy;
                }
            }
            if(z !== undefined) {
                mesh.position.z = z;
            }

            if(alignToGrid) {
                this.alignVectorToGrid(mesh.position, base_y);
            }

            if(x !== undefined)
                mesh.userData.e.px = mesh.position.x;
            if(y !== undefined) {
                if(mesh.userData.type == "text") {
                    let basemesh = this.findMesh("base", mesh.userData.e.base, this.scene[view]);
                    mesh.userData.e.py = mesh.position.y - basemesh.userData.e.sy;
                }
                else
                    mesh.userData.e.py = mesh.position.y;
            }
            if(z !== undefined)
                mesh.userData.e.pz = mesh.position.z;

            if(base != null) {
                let old_base = mesh.userData.e.base;
                mesh.userData.e.base = base;
                let basemesh = this.findMesh("base", base, this.scene[view]);
                basemesh.add(mesh);
                if(type == "text")
                    mesh.position.y = basemesh.userData.e.sy + mesh.userData.e.py;
                else if(old_base !== base) {
                    mesh.position.y = basemesh.userData.e.sy;
                    mesh.userData.e.py = mesh.position.y;
                }

            }

            mesh.updateMatrixWorld();

            if(type === "device") {
                let listlinks = this.findLinksOfDevice(id, this.scene[view]);
                for (let x = 0; x < listlinks.length; x++) {
                    this.updateLinkGeometry("link", listlinks[x], view);
                }
                // In case of devices, we have to adjust the rotation of the name to face the camera
                // in this case, this is only a problem if the device is changing base
                this.adjustDeviceNameRotation(mesh);
            }
            else if(type === "base") {
                let links = this.findLinksOfBase(mesh, this.scene[view]);
                for(let link_type in links)
                    for(let link_id in links[link_type])
                        this.updateLinkGeometry(link_type, links[link_type][link_id], view);
            }
            else if(type === "l2segment") {
                let links = this.findLinksOfL2Segment(id);
                for(let link_type in links) {
                    for(let link_id in links[link_type]) {
                        this.updateLinkGeometry(link_type, links[link_type][link_id], view);
                    }
                }
            }
            else if(type === "vrf") {
                let links = this.findLinksOfVrf(id);
                for(let link_type in links) {
                    for(let link_id in links[link_type]) {
                        this.updateLinkGeometry(link_type, links[link_type][link_id], view);
                    }
                }
                let bgp_peers = this.findBGPPeersOfVrf(id);
                bgp_peers.forEach((bgp_peer) => {
                    this.updateBGPArrowGeometry(bgp_peer);
                })
            }

            this.requestDraw();
        }
    }

    rotateMesh(view, type, id, rx, ry, rz, alignToGrid) {
        let mesh = this.findMesh(type, id, this.scene[view]);
        let grid_angle = this.global_settings.grid.angle * Math.PI / 180;
        if(mesh) {
            if(rx !== undefined) {
                mesh.rotation.x = rx;
                if(alignToGrid && this.global_settings.grid.active)
                    mesh.rotation.x = Math.round(mesh.rotation.x / grid_angle) * grid_angle;
                mesh.userData.e.rx = mesh.rotation.x;
            }
            if(ry !== undefined) {
                mesh.rotation.y = ry;
                if(alignToGrid && this.global_settings.grid.active)
                    mesh.rotation.y = Math.round(mesh.rotation.y / grid_angle) * grid_angle;
                mesh.userData.e.ry = mesh.rotation.y;
            }
            if(rz !== undefined) {
                mesh.rotation.z = rz;
                if(alignToGrid && this.global_settings.grid.active)
                    mesh.rotation.z = Math.round(mesh.rotation.z / grid_angle) * grid_angle;
                mesh.userData.e.rz = mesh.rotation.z;
            }

            mesh.updateMatrixWorld();

            if(type == "base") {
                let links = this.findLinksOfBase(mesh, this.scene[view]);
                for(let link_type in links)
                    for(let link_id in links[link_type])
                        this.updateLinkGeometry(link_type, links[link_type][link_id], view);
                this.adjustLabelsToCamera();
            }
            if((type === "device") || (type === "vrf")) {
                // In case of devices, we have to adjust the rotation of the name to face the camera
                this.adjustDeviceNameRotation(mesh);
            }
            else if(type === "l2segment") {
                let links = this.findLinksOfL2Segment(id);
                for(let link_type in links) {
                    for(let link_id in links[link_type]) {
                        this.updateLinkGeometry(link_type, links[link_type][link_id], view);
                    }
                }
                this.adjustDeviceNameRotation(mesh);
            }

            this.requestDraw();
        }

    }

    resizeMesh(view, type, id, sx, sy, sz, alignToGrid) {
        let mesh = this.findMesh(type, id, this.scene[view]);
        let resize_step = this.global_settings.grid.resize;
        if(mesh) {
            if (sx != null) {
                if(alignToGrid && this.global_settings.grid.active)
                    sx = Math.round(sx / resize_step) * resize_step;
                if(sx >= .1)
                    mesh.userData.e.sx = sx;
            }
            if (sy != null) {
                if(alignToGrid && this.global_settings.grid.active)
                    sy = Math.round(sy / resize_step) * resize_step;
                if(sy >= .1)
                    mesh.userData.e.sy = sy;
            }
            if (sz != null) {
                if(alignToGrid && this.global_settings.grid.active)
                    sz = Math.round(sz / resize_step) * resize_step;
                if(sz >= .1)
                    mesh.userData.e.sz = sz;
            }
            if((type === "device") || (type === "vrf")) {
                this.updateDeviceGeometry(type, id, view);
                this.addDeviceName(mesh);
            }
            else if(type == "symbol") {
                this.updateSymbolGeometry(mesh);
            }
            else if(type == "l2segment")
                this.updateL2SegmentGeometry(mesh);

            this.requestDraw();
        }
    }

    resizeMesh_Base(view, id, sx, sy, sz, alignToGrid) {
        let mesh = this.findMesh("base", id, this.scene[view]);
        let resize_step = this.global_settings.grid.resize;
        
        if(mesh) {
            if (sx != null) {
                if(alignToGrid && this.global_settings.grid.active)
                    sx = Math.round(sx / resize_step) * resize_step;
                if(sx < 1) sx = 1;
                mesh.userData.e.sx = sx;
            }
            if (sy != null) {
                if(alignToGrid && this.global_settings.grid.active)
                    sy = Math.round(sy / resize_step) * resize_step;
                if(sy < .5) sy = .5;
                mesh.userData.e.sy = sy;
            }
            if (sz != null) { 
                if(alignToGrid && this.global_settings.grid.active)
                    sz = Math.round(sz / resize_step) * resize_step;
                if(sz < 1) sz = 1;
                mesh.userData.e.sz = sz;
            }
            this.updateCubeFloorGeometry(id, view);         
        }   
    }

    settingsMesh_Base(view, id, name, subtype, color1, color2, opacity, t1name, t2name, t1user, t2user, sy, tsx, tsy) {
        let mesh = this.findMesh("base", id, this.scene[view]);

        if (mesh) {
            let old_sy = mesh.userData.e.sy;
            mesh.userData.e.name = name;
            mesh.userData.e.subtype = subtype;
            mesh.userData.e.color1 = color1;
            mesh.userData.e.color2 = color2;
            mesh.userData.e.opacity = opacity;

            if(t1user) {
                mesh.userData.e.t1user = t1user;
                delete mesh.userData.e.t1name;
            }
            else {
                mesh.userData.e.t1name = t1name;
                delete mesh.userData.e.t1user;
            }

            if(t2user) {
                mesh.userData.e.t2user = t2user;
                delete mesh.userData.e.t2name;
            }
            else {
                mesh.userData.e.t2name = t2name;
                delete mesh.userData.e.t2user;
            }

            mesh.userData.e.sy = sy;
            mesh.userData.e.tsx = tsx;
            mesh.userData.e.tsy = tsy;
            this.updateCubeFloorGeometry(id, view);
            this.updateCubeFloorTextures(id, view);

            for(let x = 0; x < mesh.children.length; x++) {
                if(["device", "symbol", "l2segment", "vrf"].indexOf(mesh.children[x].userData.type) !== -1) {
                    mesh.children[x].position.y = mesh.children[x].position.y - old_sy + sy;

                    if(mesh.children[x].userData.type === "device") {
                        let listlinks = this.findLinksOfDevice(mesh.children[x].userData.id, this.scene[view]);
                        for (let x = 0; x < listlinks.length; x++) {
                            this.updateLinkGeometry("link", listlinks[x], view);
                        }
                    }
                    else if(mesh.children[x].userData.type === "l2segment") {
                        let links = this.findLinksOfL2Segment(mesh.children[x].userData.id);
                        for(let link_type in links) {
                            for(let link_id in links[link_type]) {
                                this.updateLinkGeometry(link_type, links[link_type][link_id], view);
                            }
                        }
                    }
                    else if(mesh.children[x].userData.type === "vrf") {
                        let links = this.findLinksOfVrf(mesh.children[x].userData.id);
                        for(let link_type in links) {
                            for(let link_id in links[link_type]) {
                                this.updateLinkGeometry(link_type, links[link_type][link_id], view);
                            }
                        }
                    }
                    
                }
                else if(mesh.children[x].userData.type == "text") {
                    mesh.children[x].position.y = sy + mesh.children[x].userData.e.py;
                }
                else if(mesh.children[x].userData.type == "symbol") {
                    mesh.children[x].position.y = sy;
                }
            }
        }
    }

    settingsMesh_Device(id, name, description, color1, color2, ifnaming) {
        let mesh = this.findMesh("device", id, this.scene["L2"]);
        if(mesh) {
            mesh.userData.e.name = name;
            mesh.userData.e.description = description;
            mesh.userData.e.color1 = color1;
            mesh.userData.e.color2 = color2;
            mesh.userData.e.ifnaming = ifnaming
            this.updateDeviceColor("device", id, "L2");
            this.addDeviceName(mesh);
        }
    }

    settingsMesh_Vrf(id, color1, color2) {
        let mesh = this.findMesh("vrf", id, this.scene["L3"]);
        if(mesh) {
            mesh.userData.e.color1 = color1;
            mesh.userData.e.color2 = color2;
            this.updateDeviceColor("vrf", id, "L3");
        }
    }

    settingsMesh_L2Segment(id, color1) {
        let mesh = this.findMesh("l2segment", id, this.scene["L3"]);
        if(mesh) {
            mesh.userData.e.color1 = color1;
            this.updateL2SegmentColor(id);
        }
    }

    settingsMesh_BGPPeer(id, color) {
        let mesh = this.findMesh("bgp_peering", id, this.scene["L3"]);
        if(mesh) {
            mesh.userData.e.color = color;
            this.updateBGPArrowColor(mesh);
        }
    }

    settingsMesh_Link(view, type, id, name, description, link_type, order, color, weight, height, show_direction) {
        let mesh = this.findMesh(type, id, this.scene[view]);
        if(mesh) {
            mesh.userData.e.name = name;
            mesh.userData.e.description = description;
            mesh.userData.e.type = link_type;
            mesh.userData.e.order = order;
            mesh.userData.e.linedata.color = color;
            mesh.userData.e.linedata.weight = weight;
            mesh.userData.e.linedata.height = height;
            mesh.userData.e.linedata.show_direction = show_direction;
            this.updateLinkGeometry(type, mesh, view);
        }
    }

    settingsMesh_Text(view, id, text, py, height, color, text_align, bg_type, bg_show, bg_color, border_show, border_color, border_width, bg_depth, rotation_x) {
        let mesh = this.findMesh("text", id, this.scene[view]);
        let textMesh = null, bgMesh = null, borderMesh = null, boundingMesh = null;
        for(let x = 0; x < mesh.children.length; x++) {
            if(mesh.children[x].userData.subtype === "text")
                textMesh = mesh.children[x];
            if(mesh.children[x].userData.subtype === "bg")
                bgMesh = mesh.children[x];
            if(mesh.children[x].userData.subtype === "border")
                borderMesh = mesh.children[x];
            if(mesh.children[x].userData.subtype === "bounding")
                boundingMesh = mesh.children[x];
        }
        if(mesh) {
            mesh.userData.e.text = text;
            mesh.userData.e.py = py;
            mesh.userData.e.height = height;
            mesh.userData.e.color = color;
            mesh.userData.e.text_align = text_align;
            mesh.userData.e.bg_type = bg_type;
            mesh.userData.e.bg_show = bg_show;
            mesh.userData.e.bg_color = bg_color;
            mesh.userData.e.border_show = border_show;
            mesh.userData.e.border_color = border_color;
            mesh.userData.e.border_width = border_width;
            mesh.userData.e.bg_depth = bg_depth;
            mesh.userData.e.rotation_x = rotation_x;

            textMesh.geometry = this.createTextGeometry(text, height, text_align, rotation_x);
            [bgMesh.geometry, borderMesh.geometry, boundingMesh.geometry] = this.createTextBGGeometry(textMesh.geometry, mesh.userData.e);

            textMesh.material = new THREE.MeshPhongMaterial({color: color, side: THREE.DoubleSide});
            bgMesh.material = new THREE.MeshPhongMaterial({color: bg_color});
            borderMesh.material = new THREE.MeshPhongMaterial({color: border_color});

            mesh.position.y = py + mesh.parent.userData.e.sy;

            this.requestDraw();
        }
    }

    settingsMesh_Symbol(view, id, data) {
        let mesh = this.findMesh("symbol", id, this.scene[view]);
        if(mesh) {
            if(mesh.userData.e.type == "F") {
                mesh.userData.e.color = data.color;
                mesh.userData.e.cd.flagcolor = data.flagcolor;
                this.updateSymbolColor("symbol", id, view);
            }
            else if(mesh.userData.e.type == "A") {
                mesh.userData.e.color = data.color;
                mesh.userData.e.sx = data.sx;
                mesh.userData.e.sz = data.sz;
                mesh.userData.e.cd.head_color = data.head_color;
                mesh.userData.e.cd.head_type = data.head_type;
                mesh.userData.e.cd.tail_type = data.tail_type;
                mesh.userData.e.cd.shaft_type = data.shaft_type;
                mesh.userData.e.cd.head_sx_per = data.head_sx_per;
                mesh.userData.e.cd.head_sy_per = data.head_sy_per;
                mesh.userData.e.cd.head_sz_per = data.head_sz_per;
                mesh.userData.e.cd.tail_sx_per = data.tail_sx_per;
                mesh.userData.e.cd.tail_sy_per = data.tail_sy_per;
                mesh.userData.e.cd.tail_sz_per = data.tail_sz_per;
                mesh.userData.e.cd.shaft_dots = data.shaft_dots;
                this.updateSymbolColor("symbol", id, view);
                this.updateSymbolGeometry(mesh);
            }
            else {
                mesh.userData.e.color = data.color;
                this.updateSymbolColor("symbol", id, view);                
            }
        }
    }

    configMesh_L2Device(id, name, vlans, vrfs, svis, los) {
        let mesh = this.findMesh("device", id, this.scene["L2"]);
        if(mesh) {
            mesh.userData.e.vlans = vlans;
            mesh.userData.e.vrfs = vrfs;
            mesh.userData.e.svis = svis;
        }
    }

    configMesh_L2Link(id, ifbindings, lag_name, lacp, transceiver) {
        let mesh = this.findMesh("link", id, this.scene["L2"]);
        if(mesh) {
            if(!("phy" in mesh.userData.e)) {
                mesh.userData.e.phy = {};
            }
            mesh.userData.e.phy.ifbindings = ifbindings;
            mesh.userData.e.phy.lag_name = lag_name;
            mesh.userData.e.phy.lacp = lacp;
            mesh.userData.e.phy.transceiver = transceiver;
        }
    }

    configMesh_L2LinkDevice(id, dev_index, if_function, vlans, native_vlan, subinterfaces) {
        let mesh = this.findMesh("link", id, this.scene["L2"]);
        if(mesh) {
            if(!("data" in mesh.userData.e.devs[dev_index])) {
                mesh.userData.e.devs[dev_index].data = {
                    function: "none", function_data: {}
                };
            }
            
            mesh.userData.e.devs[dev_index].data.function = if_function;
            if(if_function == "switching") {
                mesh.userData.e.devs[dev_index].data.function_data = {
                    vlans: vlans,
                    native_vlan: native_vlan,
                }
            }
            else if(if_function == "routing") {
                mesh.userData.e.devs[dev_index].data.function_data = {
                    subinterfaces: subinterfaces
                }
            }
            else
                mesh.userData.e.devs[dev_index].data.function_data = {};    
        }       
    }

    configMesh_Interface(id, ip) {
        let mesh = this.findMesh("interface", id, this.scene["L3"]);
        if(mesh) {
            mesh.userData.e.ip = ip;
        }
    }

    configMesh_SVIInterface(id, ip) {
        let mesh = this.findMesh("svi_interface", id, this.scene["L3"]);
        if(mesh) {
            mesh.userData.e.ip = ip;
        }
    }

    configMesh_P2PInterface(id, ip) {
        let mesh = this.findMesh("p2p_interface", id, this.scene["L3"]);
        if(mesh) {
            mesh.userData.e.ip = ip;
        }
    }

    configMesh_Vrf(id, router_id, asn, los) {
        let mesh = this.findMesh("vrf", id, this.scene["L3"]);
        if(mesh) {
            if(!("routing" in mesh.userData.e))
                mesh.userData.e.routing = {};
            mesh.userData.e.routing.router_id = router_id;
            mesh.userData.e.routing.asn = asn;
            mesh.userData.e.los = los;
        }
    }

    configMesh_BGPPeer(id, transport, src_ip, dst_ip, afisafi) {
        let mesh = this.findMesh("bgp_peering", id, this.scene["L3"]);
        if(mesh) {
            mesh.userData.e.transport = transport;
            mesh.userData.e.src_ip = src_ip;
            mesh.userData.e.dst_ip = dst_ip;
            mesh.userData.e.afisafi = afisafi;
        }
    }

    dataMesh(view, type, id, infobox_type, data) {
        let mesh = this.findMesh(type, id, this.scene[view]);
        if(mesh) {
            if(infobox_type !== undefined)
                mesh.userData.e.infobox_type = infobox_type;
            if(data !== undefined)
                mesh.userData.e.data = data;
        }
    }

    urlMesh(view, type, id, urls) {
        let mesh = this.findMesh(type, id, this.scene[view]);
        if(mesh) {
            mesh.userData.e.urls = urls;
        }
    }

    deleteMesh(view, type, id) {
        let mesh = this.findMesh(type, id, this.scene[view]);
        while(mesh) {
            mesh.parent.remove(mesh);

            if (type == "device") {
                let listlinks = this.findLinksOfDevice(id, this.scene[view]);
                for (let x = 0; x < listlinks.length; x++) {
                    listlinks[x].parent.remove(listlinks[x]);
                }
            }
            mesh = this.findMesh(type, id, this.scene[view]);
        }
        this.requestDraw();
    }

    deleteJoint(view, element_type, link_id, joint_index) {
        let mesh = this.findMesh(element_type, link_id, this.scene[view]);
        if(mesh) {
            mesh.userData.e.linedata.points.splice(joint_index, 1);
            this.updateLinkGeometry(element_type, mesh, view);
        }
    }

    changeNameVRF(id, newname) {
        let mesh = this.findMesh("vrf", id, this.scene.L3);
        if(mesh) {
            mesh.userData.e.name = newname;
            this.addDeviceName(mesh);
        }
    }

    changeNameL2Segment(id, newname) {
        let mesh = this.findMesh("l2segment", id, this.scene.L3);
        if(mesh) {
            mesh.userData.e.name = newname;
            this.addDeviceName(mesh, .2);
        }
    }

    pickObject(x, y) {
        this.pickvector.x = ((x-this.domelement.offsetLeft) / this.domelement.clientWidth) * 2 - 1;
        this.pickvector.y = ((-y+this.domelement.offsetTop) / this.domelement.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera( this.pickvector, this.camera[this.view][this.camera.current] );

        let intersects = this.raycaster.intersectObjects( this.scene[this.view].children, true );

        let result = [];

        for ( let i = 0; i < intersects.length; i++ ) {
            if(("id" in intersects[i].object.userData) && (intersects[i].object.userData.submesh !== "select")) {
                result.push( {
                    view: this.view, 
                    p: intersects[i].point,
                    mesh: intersects[i].object,
                });
            }
        }

        return result;
    }
    
    pickLevel(x,y, height) {
        this.pickvector.x = (x / this.domelement.clientWidth) * 2 - 1;
        this.pickvector.y = (-y / this.domelement.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera( this.pickvector, this.camera[this.view][this.camera.current] );

        let plane = new THREE.Plane($WGL_V3(0,1,0), -height);

        this.raycaster.ray.intersectPlane( plane , this.tempVector);
        return this.tempVector;
    }

    convertWorld2MeshCoordinates(view, type, id, x, y, z) {
        let mesh = this.findMesh(type, id, this.scene[view]);

        this.tempVector.set(x,y,z);
        mesh.worldToLocal(this.tempVector);

        return this.tempVector;
    }

    convertMesh2WorldCoordinates(view, type, id, x, y, z) {
        let mesh = this.findMesh(type, id, this.scene[view]);

        this.tempVector.set(x,y,z);
        mesh.localToWorld(this.tempVector);

        return this.tempVector;
    }

    updateGlobalSettings_show_device_name(show_device_name) {
        this.global_settings.show_device_name = show_device_name;
        
        // Update visibilit of device names
        for(let view in this.scene) {
            for(let x = 0; x < this.scene[view].children.length; x++) {
                let be = this.scene[view].children[x];
                if (be.userData.type === "base") {
                    for(let y = 0; y < be.children.length; y++) {
                        if((be.children[y].userData.type === "device") || (be.children[y].userData.type === "vrf") || (be.children[y].userData.type === "l2segment")) {
                            this.updateDeviceNameVisibility(be.children[y]);
                        }
                    }
                }
            }
        }

        this.requestDraw();
    }

    updateGlobalSettings_grid(active, x, y, z, angle, resize) {
        this.global_settings.grid.active = active;
        this.global_settings.grid.x = parseFloat(x);
        this.global_settings.grid.y = parseFloat(y);
        this.global_settings.grid.z = parseFloat(z);
        this.global_settings.grid.angle = parseFloat(angle);
        this.global_settings.grid.resize = parseFloat(resize);
    }

    updateFormatSettingsColor(win) {
        this.global_settings.format.color1 = parseInt(win.color1.value);
        this.global_settings.format.color2 = parseInt(win.color2.value);
        this.global_settings.format.use_standard_color = !win.use_standard_color.checked;
    }

    updateFormatSettingsText(win) {
        this.global_settings.format.use_standard_text = !win.use_standard_text.checked;
        this.global_settings.format.text_color = parseInt(win.color.value);
        this.global_settings.format.text_height = parseFloat(win.height.value);
        this.global_settings.format.text_align = win.text_align.value;
        this.global_settings.format.text_bg_type = win.bg_type.value;
        this.global_settings.format.text_bg_color = parseInt(win.bg_color.value);
        this.global_settings.format.text_bg_show = win.bg_show.checked;
        this.global_settings.format.text_border_color = parseInt(win.border_color.value);
        this.global_settings.format.text_border_show = win.border_show.checked;
        this.global_settings.format.text_border_width = parseFloat(win.border_width.value);
        this.global_settings.format.text_bg_depth = parseFloat(win.bg_depth.value);
        this.global_settings.format.text_rotation_x = parseFloat(win.rotation_x.value);
    }

    updateFormatSettingsLink(win) {
        this.global_settings.format.use_standard_link = !win.use_standard_link.checked;
        this.global_settings.format.link_color = parseInt(win.color.value);
        this.global_settings.format.link_height = parseFloat(win.height.value);
        this.global_settings.format.link_weight = parseFloat(win.weight.value);
        this.global_settings.format.link_show_direction = win.show_direction.checked;
    }

    alignVectorToGrid(vector, base_y) {
        if(this.global_settings.grid.active) {
            vector.x = Math.round(vector.x / this.global_settings.grid.x) * this.global_settings.grid.x;
            vector.z = Math.round(vector.z / this.global_settings.grid.z) * this.global_settings.grid.z;

            if(base_y !== undefined) {
                let temp_y = vector.y - base_y;
                temp_y = Math.round(temp_y / this.global_settings.grid.y) * this.global_settings.grid.y;
                vector.y = temp_y + base_y;
            }
        }
    }

    // ***********************************************
    // Functions to create/update meshes
    // ***********************************************
    createMeshGroup(data) {
        let group = new THREE.Group();
        let mesh_list = [];
        for(let x = 0; x < data.num_submesh; x++) {
            let geometry = new THREE.Geometry();
            let texture = this.loadTexture(data.texture[x]);
            let material = WGL_createDeviceMaterial({map: texture, mycolor: data.color[x]});
            let mesh = new THREE.Mesh( geometry, material );
            group.add(mesh);

            mesh.userData.id = data.id;
            mesh.userData.type = data.type;
            mesh.userData.e = data.e;
            mesh.userData.submesh = data.submesh_id[x];
            mesh.castShadow = true;
        }


        group.userData.id = data.id;
        group.userData.type = data.type;
        group.userData.e = data.e;
        group.rotation.order="YXZ"

        if(data.base) {
            let basemesh = this.findMesh("base", data.base, this.scene[data.view]);
            basemesh.add(group);
        }
        else {
            this.scene[data.view].add(group);
        }

        if("px" in data.e) {
            this.moveMesh(data.view, data.type, data.id, data.e.px, data.e.py, data.e.pz, null, data.alignToGrid);
        }
        if("rx" in data.e) {
            group.rotation.x = data.e.rx;
            group.rotation.y = data.e.ry;
            group.rotation.z = data.e.rz;
        }
        group.updateMatrixWorld();

        return group;
    }

    findMeshesOfGroup(meshgroup) {
        let m1 = null, m2 = null, m3 = null;
        for(let x = 0; x < meshgroup.children.length; x++) {
            if (meshgroup.children[x].userData.submesh === 1)
                m1 = meshgroup.children[x];
            else if (meshgroup.children[x].userData.submesh === 2)
                m2 = meshgroup.children[x];
            else if (meshgroup.children[x].userData.submesh === 3)
                m3 = meshgroup.children[x];
        }

        return [m1, m2, m3];
    }

    addListVertex(l, vl) {
        for(let x = 0; x < vl.length; x++) {
            l.push($WGL_V3(vl[x][0], vl[x][1], vl[x][2]));
        }
    }

    addListFaces(l, l2, fl, uvl) {
        for(let x = 0; x < fl.length; x++) {
            l.push($WGL_F3(fl[x][0], fl[x][1],fl[x][2]))
            l2.push([
                $WGL_V2(uvl[x][0][0], uvl[x][0][1]),
                $WGL_V2(uvl[x][1][0], uvl[x][1][1]),
                $WGL_V2(uvl[x][2][0], uvl[x][2][1]),
                ])
        }
    }

    addCubeToGeometry(g, x1, x2, y1, y2, z1, z2, tu1, tu2, tv1, tv2) {
        let v = g.vertices;
        let f = g.faces;
        let uv = g.faceVertexUvs[0];
        let i = v.length;

        this.addListVertex(v, [
            [x2, y1, z1], [x1,y1,z1], [x1, y1, z2], [x2, y1, z2],
            [x2, y2, z1], [x1,y2,z1], [x1, y2, z2], [x2, y2, z2],
            ]);
        this.addListFaces(f, uv,
            [
                [i, i+1, i+5], [i, i+5, i+4],
                [i+1, i+2, i+6], [i+1, i+6, i+5],
                [i+2, i+3, i+7], [i+2, i+7, i+6],
                [i+3, i, i+4], [i+3, i+4, i+7],
                [i, i+2, i+1], [i, i+3, i+2],
                [i+4, i+5, i+6], [i+4, i+6, i+7],
            ],
            [ 
                [[tu1, tv1], [tu2, tv1], [tu2, tv2]], [[tu1, tv1], [tu2, tv2], [tu1, tv2]], 
                [[tu1, tv1], [tu2, tv1], [tu2, tv2]], [[tu1, tv1], [tu2, tv2], [tu1, tv2]], 
                [[tu1, tv1], [tu2, tv1], [tu2, tv2]], [[tu1, tv1], [tu2, tv2], [tu1, tv2]], 
                [[tu1, tv1], [tu2, tv1], [tu2, tv2]], [[tu1, tv1], [tu2, tv2], [tu1, tv2]], 
                [[tu1, tu1], [tu2, tu2], [tu2, tu1]], [[tu1, tu1], [tu1, tu2], [tu2, tu2]], 
                [[tu1, tu1], [tu2, tu1], [tu2, tu2]], [[tu1, tu1], [tu2, tu2], [tu1, tu2]], 
            ]);
    }

    setGeometryUpdated(geometry_list, flat_normals) {
        for(let x = 0; x < geometry_list.length; x++) {
            geometry_list[x].verticesNeedUpdate = true;
            geometry_list[x].elementsNeedUpdate = true;
            geometry_list[x].uvsNeedUpdate = true;

            geometry_list[x].computeBoundingBox();
            geometry_list[x].computeBoundingSphere();
            if(flat_normals) {
                geometry_list[x].computeFaceNormals();
                geometry_list[x].computeFlatVertexNormals();
            }
            else {
                geometry_list[x].computeVertexNormals();
            }
        }

        this.requestDraw();
    }

    updateCubeFloorGeometry_height_float(g, w2, h, b, d2, tu1, tv1) {
        let v = g.vertices;
        let f = g.faces;
        let uv = g.faceVertexUvs[0];

        v.push($WGL_V3( -w2,    h,      d2));
        v.push($WGL_V3( w2,     h,      d2));
        v.push($WGL_V3( w2,     h,      -d2));
        v.push($WGL_V3( -w2,    h,      -d2));

        v.push($WGL_V3( -w2-.10,    h-.05,  d2+.10));
        v.push($WGL_V3( w2+.10,     h-.05,  d2+.10));
        v.push($WGL_V3( w2+.10,     h-.05,  -d2-.10));
        v.push($WGL_V3( -w2-.10,    h-.05,  -d2-.10));

        v.push($WGL_V3( -w2-.10,    b,  d2+.10));
        v.push($WGL_V3( w2+.10,     b,  d2+.10));
        v.push($WGL_V3( w2+.10,     b,  -d2-.10));
        v.push($WGL_V3( -w2-.10,    b,  -d2-.10));

        for(let i = 0; i < 8; i+=4) {
            let tv = .1;
            if(i > 0)
                tv = h-b;
            for(let x = 0; x < 4; x++) {
                let x1 = i + x;
                let x2 = i + (x+1)%4;
                let tf=.5;
                f.push($WGL_F3(x1, 4+x2,   x2));
                f.push($WGL_F3(x1, 4+x1, 4+x2));
                uv.push([$WGL_V2(0,tv*tf), $WGL_V2(w2*tf*2,0), $WGL_V2(w2*tf*2,tv*tf)] )
                uv.push([$WGL_V2(0,tv*tf), $WGL_V2(0,0), $WGL_V2(w2*tf*2,0)] )
            }
        }
        f.push($WGL_F3(8, 10, 9));
        uv.push([$WGL_V2(0,0), $WGL_V2(tu1, tv1), $WGL_V2(0,tv1)])
        f.push($WGL_F3(8, 11, 10));
        uv.push([$WGL_V2(0,0), $WGL_V2(tu1, 0), $WGL_V2(tu1,tv1)])
    }

    updateCubeFloorGeometry_height_platform(g, w2, h, b, d2, tu1, tv1) {
        this.updateCubeFloorGeometry_height_float(g, w2, h, b, d2, tu1, tv1);

        // Add 4 columns to the geometry
        let col_x = w2*.89;
        let col_w = w2*.1;
        let col_z = d2*.89;
        let col_d = d2*.1;
        this.addCubeToGeometry(g, -col_x-col_w, -col_x+col_w, 0, h-.1, -col_z-col_d, -col_z+col_d, 0, col_w, 0, h*.5);
        this.addCubeToGeometry(g, -col_x-col_w, -col_x+col_w, 0, h-.1, col_z-col_d, col_z+col_d, 0, col_w, 0, h*.5);
        this.addCubeToGeometry(g, col_x-col_w, col_x+col_w, 0, h-.1, -col_z-col_d, -col_z+col_d, 0, col_w, 0, h*.5);
        this.addCubeToGeometry(g, col_x-col_w, col_x+col_w, 0, h-.1, col_z-col_d, col_z+col_d, 0, col_w, 0, h*.5);
    }

    updateCubeFloorGeometry(id, sceneid) {
        let meshgroup = this.findMesh("base", id, this.scene[sceneid]);
        let m = this.findMeshesOfGroup(meshgroup);
        let g = [m[0].geometry, m[1].geometry]
        let subtype = meshgroup.userData.e.subtype;
        let sx = meshgroup.userData.e.sx;
        let sz = meshgroup.userData.e.sz;
        let h = meshgroup.userData.e.sy;

        let tu1, tv1;
        if(meshgroup.userData.e.tsx === null) {
            tu1 = 1;
        }
        else
            tu1 = sx * meshgroup.userData.e.tsx;

        if(meshgroup.userData.e.tsy === null)
            tv1 = 1;
        else
            tv1 = sz * meshgroup.userData.e.tsy;

        let w2 = sx/2.0;
        let d2 = sz/2.0;

        // The flat surface
        g[0].vertices = [];
        g[0].faces = []
        g[0].faceVertexUvs[0] = []
        let v1 = g[0].vertices;
        let f1 = g[0].faces;
        let uv1 = g[0].faceVertexUvs[0];

        v1.push($WGL_V3(-w2, h, d2));
        v1.push($WGL_V3(w2, h, d2));
        v1.push($WGL_V3(w2, h, -d2));
        v1.push($WGL_V3(-w2, h, -d2));

        f1.push($WGL_F3(0,1,2));
        uv1.push([$WGL_V2(0,0), $WGL_V2(tu1,0), $WGL_V2(tu1,tv1)])
        f1.push($WGL_F3(0,2,3));
        uv1.push([$WGL_V2(0,0), $WGL_V2(tu1,tv1), $WGL_V2(0,tv1)])

        // The elevation part
        g[1].vertices = [];
        g[1].faces = [];
        g[1].faceVertexUvs[0] = [];

        if(subtype == "n") {}
        else if(subtype == "f") {
            this.updateCubeFloorGeometry_height_float(g[1], w2, h, h-.1, d2, tu1, tv1);
        }
        else if(subtype == "p") {
            this.updateCubeFloorGeometry_height_platform(g[1], w2, h, h-.1, d2, tu1, tv1);
        }
        else
            this.updateCubeFloorGeometry_height_float(g[1], w2, h, 0, d2, tu1, tv1);

        // Set the right render order on geometry 0 as it might have transparencies
        m[0].renderOrder = meshgroup.userData.e.sy;
        m[1].renderOrder = meshgroup.userData.e.sy;
        // Mark vertex, faces, normals as updated and compute bounding boxes
        this.setGeometryUpdated(g, true);
    }

    updateCubeFloorTextures(id, sceneid) {
        let meshgroup = this.findMesh("base", id, this.scene[sceneid]);
        let m = this.findMeshesOfGroup(meshgroup);

        let color1 = meshgroup.userData.e.color1;
        let color2 = meshgroup.userData.e.color2;
        let t1name = meshgroup.userData.e.t1name;
        let t2name = meshgroup.userData.e.t2name;
        let t1user = meshgroup.userData.e.t1user;
        let t2user = meshgroup.userData.e.t2user;

        let texture1, texture2;
        if(t1user)
            texture1 = new THREE.TextureLoader().load( appserver + "/usertexture/" + t1user + ".png", (t) => {this.processLoadedTexture(t)} );
        else
            texture1 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + t1name + ".png", (t) => {this.processLoadedTexture(t)} );

        if(t2user)
            texture2 = new THREE.TextureLoader().load( appserver + "/usertexture/" + t2user + ".png", (t) => {this.processLoadedTexture(t)} );
        else
            texture2 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + t2name + ".png", (t) => {this.processLoadedTexture(t)} );

        //let material1 = new THREE.MeshLambertMaterial({map: texture1})
        //let material2 = new THREE.MeshLambertMaterial({map: texture2})
        let material1 = new THREE.MeshStandardMaterial({map: texture1, bumpMap: texture1, metalness:.05, bumpScale:.2, transparent: true})
        let material2 = new THREE.MeshStandardMaterial({map: texture2, bumpMap: texture2, metalness:.05, bumpScale:.2, transparent: true})

        material1.opacity = (meshgroup.userData.e.opacity) ? meshgroup.userData.e.opacity : 1;
        material2.opacity = (meshgroup.userData.e.opacity) ? meshgroup.userData.e.opacity : 1;

        material1.color.r = (color1 >> 16) / 256;
        material1.color.g = ((color1 >> 8) & 0xFF) / 256;
        material1.color.b = (color1 & 0xFF) / 256;

        material2.color.r = (color2 >> 16) / 256;
        material2.color.g = ((color2 >> 8) & 0xFF) / 256;
        material2.color.b = (color2 & 0xFF) / 256;

        m[0].material = material1;
        m[1].material = material2;

        this.requestDraw();
    }

    addCubeFloor(id, sceneid, e) {
        let geometry1 = new THREE.Geometry();
        let geometry2 = new THREE.Geometry();

        let texture1, texture2;
        if(e.t1user)
            texture1 = new THREE.TextureLoader().load( appserver + "/usertexture/" + e.t1user + ".png", (t) => {this.processLoadedTexture(t)} );
        else
            texture1 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + e.t1name + ".png", (t) => {this.processLoadedTexture(t)} );

        if(e.t2user)
            texture2 = new THREE.TextureLoader().load( appserver + "/usertexture/" + e.t2user + ".png", (t) => {this.processLoadedTexture(t)} );
        else
            texture2 = new THREE.TextureLoader().load( staticurl + "/static/textures/" + e.t2name + ".png", (t) => {this.processLoadedTexture(t)} );
        
        let material1 = new THREE.MeshStandardMaterial({map: texture1, bumpMap: texture1, metalness:.05, bumpScale:.2, transparent: true})
        let material2 = new THREE.MeshStandardMaterial({map: texture2, bumpMap: texture2, metalness:.05, bumpScale:.2, transparent: true})

        material1.opacity = (e.opacity) ? e.opacity : 1;
        material2.opacity = (e.opacity) ? e.opacity : 1;

        material1.color.r = (e.color1 >> 16) / 256;
        material1.color.g = ((e.color1 >> 8) & 0xFF) / 256;
        material1.color.b = (e.color1 & 0xFF) / 256;
        material2.color.r = (e.color2 >> 16) / 256;
        material2.color.g = ((e.color2 >> 8) & 0xFF) / 256;
        material2.color.b = (e.color2 & 0xFF) / 256;

        let mesh1 = new THREE.Mesh( geometry1, material1 );
        mesh1.userData.submesh = 1;     
        let mesh2 = new THREE.Mesh( geometry2, material2 );
        mesh2.userData.submesh = 2;

        let group = new THREE.Group();

        group.add(mesh1);
        group.add(mesh2);

        mesh1.userData.id = id;
        mesh1.userData.type = "base";
        mesh1.userData.e = e;
        mesh2.userData.id = id;
        mesh2.userData.type = "base";
        mesh2.userData.e = e;
        group.userData.id = id;
        group.userData.type = "base";
        group.userData.e = e;

        this.scene[sceneid].add(group);

        this.updateCubeFloorGeometry(id, sceneid);

        group.position.x = e.px;
        group.position.y = e.py;
        group.position.z = e.pz;
        group.rotation.x = e.rx;
        group.rotation.y = e.ry;
        group.rotation.z = e.rz;

        group.updateMatrixWorld();

        mesh1.receiveShadow = true;
        mesh2.receiveShadow = true;
        group.receiveShadow = true;
        mesh1.castShadow = true;
        mesh2.castShadow = true;

        return id;
    }

    updateStandardGeometry(meshgroup, geometry_type) {
        let template_geometry = this.getDeviceTemplate(geometry_type, meshgroup.userData.e.type);

        let m = this.findMeshesOfGroup(meshgroup);
        let g = [];
        m.forEach((e) => {
            if(e !== null)
                g.push(e.geometry);
            else
                g.push(null);
        })

        for(let g_index = 0; g_index < 2; g_index++) {
            if(g[g_index] === null)
                continue;
            g[g_index].vertices = [];
            g[g_index].faces = [];
            g[g_index].faceVertexUvs[0] = [];

            let v = g[g_index].vertices
            let f = g[g_index].faces;
            let uv = g[g_index].faceVertexUvs[0];

            let vertex_base_index = 0;

            template_geometry.subshapes[g_index].elements.forEach((template_element) => {
                template_element = shapetools_generate_as_vertexlist(template_element);
                if(template_element.type === "vertex_list") {
                    for(let i = 0; i < template_element.v.length; i++) {
                        let tv = template_element.v[i];
                        v.push($WGL_V3(
                            tv[0] * meshgroup.userData.e.sx * template_geometry.base_scale[0],
                            tv[1] * meshgroup.userData.e.sy * template_geometry.base_scale[1],
                            tv[2] * meshgroup.userData.e.sz * template_geometry.base_scale[2]
                            ));
                    }
                    for(let i = 0; i < template_element.f.length; i++) {
                        let tf = template_element.f[i];
                        let tuv = template_element.uv[i];
                        f.push($WGL_F3(tf[0] + vertex_base_index, tf[1] + vertex_base_index, tf[2] + vertex_base_index))
                        uv.push([
                            $WGL_V2(tuv[0][0], tuv[0][1]),
                            $WGL_V2(tuv[1][0], tuv[1][1]),
                            $WGL_V2(tuv[2][0], tuv[2][1]),
                            ])
                    }

                    vertex_base_index += template_element.v.length;
                }
            })
            this.setGeometryUpdated([g[g_index]], template_geometry.subshapes[g_index].flat_normals);
        }
    }

    updateDeviceGeometry(type, id, sceneid) {
        let meshgroup = this.findMesh(type, id, this.scene[sceneid]);

        this.updateStandardGeometry(meshgroup, "DEVICE");
    }

    updateDeviceColor(type, id, sceneid) {
        let meshgroup = this.findMesh(type, id, this.scene[sceneid]);
        let m = this.findMeshesOfGroup(meshgroup);

        let color = [meshgroup.userData.e.color1, meshgroup.userData.e.color2];

        
        for(let x = 0; x < 2; x++) {
            if(m[x] !== null) {
                m[x].material.uniforms.mycolor.value.r = (color[x] >> 16) / 256;
                m[x].material.uniforms.mycolor.value.g = ((color[x] >> 8) & 0xFF) / 256;
                m[x].material.uniforms.mycolor.value.b = (color[x] & 0xFF) / 256;
            }
        }
        
        this.requestDraw();
    }

    getDeviceTextureByType(type, index) {
        if(type in GEOMETRY.DEVICE) {
            if(index in GEOMETRY.DEVICE[type].subshapes)
                return GEOMETRY.DEVICE[type].subshapes[index].texture;
            else
                return null;
        }
        else {
            if(index in GEOMETRY.DEVICE["UNKNOWN"].subshapes)
                return GEOMETRY.DEVICE["UNKNOWN"].subshapes[index].texture;
            else
                return null;
        }
    }

    getDeviceTemplate(geometry_type, type) {
        if(type in GEOMETRY[geometry_type]) {
            return GEOMETRY[geometry_type][type];
        }
        else {
            return GEOMETRY[geometry_type]["UNKNOWN"];
        }       
    }

    addDevice(type, id, sceneid, e, alignToGrid) {
        let device_template = this.getDeviceTemplate("DEVICE", e.type);
        let shape_group = e.type.split("_")[0];
        let textures = [];
        let submesh_id = [];
        let texture_base_path = "/3dshapes/" + shape_group + "/";
        if(shape_group < 1000) {
            texture_base_path = staticurl + "/static/shapes/" + shape_group + "/";
        }
        for(let x = 0; x < device_template.subshapes.length; x++)  {
            textures.push(texture_base_path + device_template.subshapes[x].texture);
            submesh_id.push(x+1);
        }
        let group = this.createMeshGroup({
            view: sceneid,
            type: type,
            id: id,
            e: e,
            base: e.base,
            num_submesh: device_template.subshapes.length,
            texture: textures, 
            submesh_id: submesh_id,
            color: [e.color1, e.color2],
            alignToGrid: alignToGrid,
        });

        this.updateDeviceGeometry(type, id, sceneid);
        this.updateDeviceColor(type, id, sceneid);

        // Name
        this.addDeviceName(group);
        return id;
    }

    updateDeviceNameVisibility(group) {
        for(let x = 0; x < group.children.length; x++) {
            if (group.children[x].userData.submesh === "name") {
                group.children[x].visible = this.global_settings.show_device_name;
                break;
            }
        }
    }

    addDeviceName(group, size) {
        if(!size)
            size = .3;
        let name = group.userData.e.name;

        let m = null;
        let height = 0;
        for(let x = 0; x < group.children.length; x++) {
            if (group.children[x].userData.submesh === "name") {
                m = group.children[x];
            }
            else if ([1,2,3].indexOf(group.children[x].userData.submesh) !== -1) {
                if(group.children[x].geometry.boundingBox.max.y > height)
                    height = group.children[x].geometry.boundingBox.max.y;
            }
        }
        if(m !== null) {
            group.remove(m);
        }

        if(name == "")
            return;

        let g = this.createTextGeometry(name, size, "c")

        let material = this.namematerial;
        let mesh = new THREE.Mesh(g, material);
        mesh.userData.id = group.userData.id;
        mesh.userData.type = group.userData.type;
        mesh.userData.e = group.userData.e;
        mesh.userData.submesh = "name";

        mesh.position.x = 0;
        mesh.position.y = height+.5;
        mesh.position.z = 0;
        mesh.rotation.order = "YXZ";
        mesh.rotation.x = this.camera[this.view][this.camera.current].rotation.x;

        group.add(mesh);

        this.adjustDeviceNameRotation(group);

        mesh.visible = this.global_settings.show_device_name;

        this.requestDraw();
    }

    adjustDeviceNameRotation(device) {
        device.children.forEach((label) => {
            if(label.userData.submesh === "name") {
                label.rotation.y = this.camera[this.view][this.camera.current].rotation.y - device.rotation.y - device.parent.rotation.y; 
                label.rotation.x = this.camera[this.view][this.camera.current].rotation.x;
            }
        })
    }

    updateLinkSegmentGeometryLine(g, x1, y1, z1, x2, y2, z2, radius, show_direction) {
        g.vertices = [];
        g.faces = [];
        g.faceVertexUvs[0] = [];

        let dir_vector = new THREE.Vector3(x2-x1, y2-y1, z2-z1);
        let length = dir_vector.length();

        let vl = [];
        let fl = [];
        let uvl = [];
        let w2 = 2*Math.PI/8;
        for(let y = 0; y < 2; y++) 
            for(let x = 0; x < 8; x++) {
                vl.push([
                        Math.sin(x*2*Math.PI/8)*radius, 
                        Math.cos(x*2*Math.PI/8)*radius,
                        y*length,
                    ]);
            }
        for(let x = 0; x < 8; x++) {
            let x2 = (x+1)%8;
            fl.push([ x, x+8, x2+8]);
            fl.push([ x, x2+8, x2]);
            uvl.push([ [0,0], [0,length], [w2,length] ]);
            uvl.push([ [0,0], [w2,length], [w2,0] ]);
        }
        // Add directional arrow
        if(show_direction) {
            vl.push([0, 0, length/2+radius*6]);
            vl.push([radius*8, 0, length/2-radius*6]);
            vl.push([-radius*8, 0, length/2-radius*6]);
            fl.push([16,17,18]);
            uvl.push([ [0,0], [0,0], [0,0] ]);
        }

        // Create vertex list
        this.addListVertex(g.vertices, vl);
        this.addListFaces(g.faces, g.faceVertexUvs[0], fl, uvl);

        g.lookAt(dir_vector);

        this.setGeometryUpdated([g], false);
    }

    addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x2, y2, z2, material, index) {
        let g = new THREE.Geometry();
        this.updateLinkSegmentGeometryLine(g, x1, y1, z1, x2, y2, z2, e.linedata.weight, e.linedata.show_direction);
        let m = new THREE.Mesh(g, material);
        m.position.x = x1; m.position.y = y1; m.position.z = z1;

        m.userData.id = id;
        m.userData.type = type;
        m.userData.subtype = "segment";
        m.userData.index = index;
        m.userData.e = e
        m.castShadow = true;
        meshgroup.add(m);
    }

    addLinkJoint(type, id, e, meshgroup, x, y, z, material, index) {
        let g = new THREE.SphereGeometry(e.linedata.weight*1.0, 10,10);
        let m = new THREE.Mesh(g, material);
        m.position.x = x, m.position.y = y, m.position.z = z;
        m.userData.id = id;
        m.userData.type = type;
        m.userData.subtype = "joint";
        m.userData.joint_index = index;
        m.userData.e = e
        meshgroup.add(m);       
    }

    updateLinkGeometry(type, meshgroup, sceneid) {
        meshgroup.children = [];
        
        let e = meshgroup.userData.e;
        let id = meshgroup.userData.id;

        let material = new THREE.MeshPhongMaterial({color: e.linedata.color});

        let dev1 = null;
        let dev2 = null;
        if(type === "link") {
            dev1 = this.findMesh("device", e.devs[0].id, this.scene[sceneid]);
            dev2 = this.findMesh("device", e.devs[1].id, this.scene[sceneid]);
        }
        else if(type === "l2link") {
            dev1 = this.findMesh("l2segment", e.l3_reference.src_l2segment_id, this.scene[sceneid]);
            dev2 = this.findMesh("l2segment", e.l3_reference.dst_l2segment_id, this.scene[sceneid]);
        }
        else if(type === "interface") {
            dev1 = this.findMesh("vrf", e.l3_reference.vrf_id, this.scene[sceneid]);
            dev2 = this.findMesh("l2segment", e.l3_reference.l2segment_id, this.scene[sceneid]);
        }
        else if(type === "svi_interface") {
            dev1 = this.findMesh("vrf", e.l3_reference.vrf_id, this.scene[sceneid]);
            dev2 = this.findMesh("l2segment", e.l3_reference.l2segment_id, this.scene[sceneid]);
        }
        else if(type === "p2p_interface") {
            dev1 = this.findMesh("vrf", e.l3_reference.src_vrf_id, this.scene[sceneid]);
            dev2 = this.findMesh("vrf", e.l3_reference.dst_vrf_id, this.scene[sceneid]);
        }

        dev1.getWorldPosition(this.tempVector);
        let x1 = this.tempVector.x;
        let y1 = this.tempVector.y+e.linedata.height;
        let z1 = this.tempVector.z;
        let points = e.linedata.points;
        
        dev2.getWorldPosition(this.tempVector);
        let x2 = this.tempVector.x;
        let y2 = this.tempVector.y+e.linedata.height;
        let z2 = this.tempVector.z;
        if((type === "interface") || (type === "svi_interface")) {
            // For L2segments, find the final point of contact
            let quaternion = new THREE.Quaternion();
            dev2.getWorldQuaternion(quaternion);
            this.tempVector.set(x1-x2, y1-y2, z1-z2).applyQuaternion(quaternion.conjugate());
            if(this.tempVector.z < 0)
                this.tempVector.z = -this.tempVector.z;
            this.tempVector.z += 1;
            this.tempVector.x = this.tempVector.x*dev2.userData.e.sx / (this.tempVector.z + (dev2.userData.e.sx));
            this.tempVector.y = 0;
            this.tempVector.z = 0;
            if(this.tempVector.x > (dev2.userData.e.sx/2))
                this.tempVector.x = dev2.userData.e.sx/2;
            if(this.tempVector.x < -(dev2.userData.e.sx/2))
                this.tempVector.x = -dev2.userData.e.sx/2;
            this.tempVector.applyQuaternion(quaternion.conjugate());
            x2 = x2 + this.tempVector.x;
            z2 = z2 + this.tempVector.z;
        }


        if(e.type == 0) {
            for(let x = 0; x < points.length; x++) {
                // Create intermediate link segmnets
                this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, points[x][0], points[x][1], points[x][2], material, x);

                // Create joint
                this.addLinkJoint(type, id, e, meshgroup, points[x][0], points[x][1], points[x][2], material, x);

                x1 = points[x][0]; y1 = points[x][1]; z1 = points[x][2];
            }

            // Create last segment
            this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x2, y2, z2, material, points.length);

        }
        else if (e.type == 1) {
            for(let x = 0; x < 2; x++) {
                if ((e.order[x] == "X") && (x1 !== x2)) {
                    this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x2, y1, z1, material, 0);
                    if ((x1 !== x2) || (y1 !== y2) || (z1 !== z2))
                        this.addLinkJoint(type, id, e, meshgroup, x2, y1, z1, material, 0);
                    x1 = x2;
                }
                else if ((e.order[x] == "Y") && (y1 !== y2)) {
                    this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x1, y2, z1, material, 0);
                    if ((x1 !== x2) || (y1 !== y2) || (z1 !== z2))
                        this.addLinkJoint(type, id, e, meshgroup, x1, y2, z1, material, 0);
                    y1 = y2;
                }
                else if ((e.order[x] == "Z") && (z1 !== z2)) {
                    this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x1, y1, z2, material, 0);
                    if ((x1 !== x2) || (y1 !== y2) || (z1 !== z2))
                        this.addLinkJoint(type, id, e, meshgroup, x1, y1, z2, material, 0);
                    z1 = z2;
                }
            }
            if ((x1 !== x2) || (y1 !== y2) || (z1 !== z2))
                this.addLinkSegment(type, id, e, meshgroup, x1, y1, z1, x2, y2, z2, material, 0);
        }
    }

    addLink(type, id, sceneid, e) {
        let meshgroup = new THREE.Group ();

        meshgroup.userData.id = id;
        meshgroup.userData.type = type;
        meshgroup.userData.e = e

        this.updateLinkGeometry(type, meshgroup, sceneid);

        this.scene[sceneid].add(meshgroup);

        return meshgroup;
    }

    addJoint(type, link_id, joint_index, sceneid, px, py, pz) {
        let link = this.getMesh(sceneid, type, link_id);
        link.userData.e.linedata.points.splice(joint_index, 0, [px, py, pz]);
        d.wgl.updateLinkGeometry(type, link, sceneid);
    }

    updateLine(mesh) {
        let e = mesh.userData.e;
        mesh.position.x = e.x1;
        mesh.position.y = e.y1;
        mesh.position.z = e.z1;
        this.updateLinkSegmentGeometryLine(mesh.geometry, e.x1, e.y1, e.z1, e.x2, e.y2, e.z2, e.radius, false);
    }

    updateLineColor(mesh) {
        if (mesh.material.color.getHex() != mesh.userData.e.color) {
            mesh.material.color.set(mesh.userData.e.color);
            mesh.material.needsUpdate = true;
        }
    }

    addLine(id, sceneid, e) {
        let material = new THREE.MeshStandardMaterial({color: e.color});
        let g = new THREE.Geometry();
        let mesh = new THREE.Mesh(g, material);
        mesh.userData.id = id;
        mesh.userData.type = "line";
        mesh.userData.e = e;
        this.updateLine(mesh);

        this.scene[sceneid].add(mesh);

        return mesh;
    }

    emptyTextBuffer() {
        if(this.font === null)
            return;

        while(this.textBuffer.length > 0) {
            let textdata = this.textBuffer.pop();
            this[textdata[0]](textdata[1]);
        }
    }

    alignText(geometry, alignment) {
        geometry.computeBoundingBox();

        let b = geometry.boundingBox;
        if(alignment === "center")
            geometry.translate(
                -b.min.x - (b.max.x-b.min.x)/2,
                0,
                -b.min.z - (b.max.z-b.min.z)/2
            );
        else if (alignment === "left")
            geometry.translate(
                -b.min.x,
                0,
                -b.min.z - (b.max.z-b.min.z)/2
            );
        else if (alignment === "right")
            geometry.translate(
                -b.max.x,
                0,
                -b.min.z - (b.max.z-b.min.z)/2
            );

        this.requestDraw();
    }

    createTextGeometry(text, height, alignment, rotationX) {
        /*
        let g = new THREE.TextGeometry(text, {
            font: this.font,
            size: height,
            height: depth,
            curveSegments: 2,
            bevelEnabled: false,
        });
        this.alignText(g, alignment);

        return g;
        */
        if(!rotationX)
            rotationX = 0;

        let finalGeometry = new THREE.Geometry();
        let text_break = text.split("\n");
        text_break.forEach((line) => {
            let shapes = this.font.generateShapes( line, height, 2 );
            let geometry = new THREE.ShapeGeometry( shapes, 4 );
            if(alignment == "c") this.alignText(geometry, "center");
            if(alignment == "l") this.alignText(geometry, "left");
            if(alignment == "r") this.alignText(geometry, "right");
            geometry.rotateX(rotationX * Math.PI/180);
            finalGeometry.translate(0, height*1.2, 0);

            finalGeometry.merge(geometry);
        })
        

        finalGeometry.computeVertexNormals();
        finalGeometry.computeFlatVertexNormals();

        return finalGeometry;
    }

    createTextBGGeometry_addFaces(g, vertex_per_face, segments, isClosed) {
        let facelist = [];
        let uvlist = [];
        if(isClosed)
        for(let x = 0; x < vertex_per_face - 2; x++) {
            facelist.push([0, x+1, x+2]);
            uvlist.push([[0,0],[0,0],[0,0]]);
            facelist.push([vertex_per_face * segments, vertex_per_face * segments + x+2, vertex_per_face * segments + x+1]);
            uvlist.push([[0,0],[0,0],[0,0]]);
        }
        
        for(let y = 0; y < segments; y++) {
            for(let x = 0; x < vertex_per_face; x++) {
                let x2 = (x+1) % vertex_per_face;
                facelist.push([y * vertex_per_face + x, (y+1) * vertex_per_face + x2, y * vertex_per_face + x2]);
                uvlist.push([[0,0],[0,0],[0,0]]);
                facelist.push([y * vertex_per_face + x, (y+1) * vertex_per_face + x, (y+1) * vertex_per_face + x2]);
                uvlist.push([[0,0],[0,0],[0,0]]);
            }   
        }

        this.addListFaces(g.faces, g.faceVertexUvs[0], facelist, uvlist);

        g.computeVertexNormals();
        g.computeFlatVertexNormals();
    }

    createTextBGGeometry(text_geometry, e) {
        text_geometry.computeBoundingBox();
        let b = text_geometry.boundingBox;
        let bg_g = new THREE.Geometry();
        let border_g = new THREE.Geometry();
        let bounding_g = new THREE.Geometry();
        let xmin = b.min.x - e.height/2;
        let xmax = b.max.x + e.height/2;
        let ymin = b.min.y - e.height/2;
        let ymax = b.max.y + e.height/2;
        let zmin = b.min.z;
        let zmax = b.max.z;
        let CB = e.border_width*.2;

        this.addListVertex(bounding_g.vertices, [[xmin, ymin, zmin], [xmax, ymin, zmin], [xmax, ymax, zmin], [xmin, ymax, zmin]]);
        this.addListFaces(bounding_g.faces, bounding_g.faceVertexUvs[0], [[0,1,2],[0,2,3]], [[[0,0],[0,0],[0,0]], [[0,0],[0,0],[0,0]]]);

        if(e.bg_show) {
            if(e.bg_type === "r") {
                this.addListVertex(bg_g.vertices, [
                    [xmin, ymin, zmin - e.bg_depth+.01], [xmax, ymin, zmin - e.bg_depth+.01], [xmax, ymax, zmin - e.bg_depth+.01], [xmin, ymax, zmin - e.bg_depth+.01],
                    [xmin, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
                ]);
                this.createTextBGGeometry_addFaces(bg_g, 4, 1, true);
            }
            if(e.bg_type === "c") {
                let vertexlist = [];
                let xsize = (xmax-xmin)*.707;
                let ysize = (ymax-ymin)*.707;
                let displacex = xmax - (xmax-xmin)/2;
                let displacey = ymax - (ymax-ymin)/2;
                let num_points = 32;
                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin - e.bg_depth+.01]);
                }
                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin - e.bg_depth]);
                }
                this.addListVertex(bg_g.vertices, vertexlist);
                this.createTextBGGeometry_addFaces(bg_g, num_points, 1, true);
            }
            if(e.bg_type === "h") {
                let diffx = xmax-xmin;
                let diffy = ymax-ymin;
                let xmed = xmin + (xmax-xmin)/2;
                let ymed = ymin + (ymax-ymin)/2;

                this.addListVertex(bg_g.vertices, [
                    [xmed-diffx, ymed, zmin - e.bg_depth+.01], [xmed, ymed-diffy, zmin - e.bg_depth+.01], [xmed+diffx, ymed, zmin - e.bg_depth+.01], [xmed, ymed+diffy, zmin - e.bg_depth+.01],
                    [xmed-diffx, ymed, zmin - e.bg_depth], [xmed, ymed-diffy, zmin - e.bg_depth], [xmed+diffx, ymed, zmin - e.bg_depth], [xmed, ymed+diffy, zmin - e.bg_depth],
                ]);
                this.createTextBGGeometry_addFaces(bg_g, 4, 1, true);
            }
            if(e.bg_type === "p") {
                let diffy = ymax-ymin;
                this.addListVertex(bg_g.vertices, [
                    [xmin-diffy, ymin, zmin - e.bg_depth+.01], [xmax, ymin, zmin - e.bg_depth+.01], [xmax+diffy, ymax, zmin - e.bg_depth+.01], [xmin, ymax, zmin - e.bg_depth+.01],
                    [xmin-diffy, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax+diffy, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
                ]);
                this.createTextBGGeometry_addFaces(bg_g, 4, 1, true);
            }
        }
        if(e.border_show) {
            if(e.bg_type === "r") {
                this.addListVertex(border_g.vertices, [
                    [xmin, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
                    [xmin, ymin, zmin], [xmax, ymin, zmin], [xmax, ymax, zmin], [xmin, ymax, zmin],
                    [xmin-CB, ymin-CB, zmin+CB], [xmax+CB, ymin-CB, zmin+CB], [xmax+CB, ymax+CB, zmin+CB], [xmin-CB, ymax+CB, zmin+CB],
                    
                    [xmin+CB - e.border_width, ymin+CB - e.border_width, zmin+CB], [xmax-CB + e.border_width, ymin+CB - e.border_width, zmin+CB], 
                    [xmax-CB + e.border_width, ymax-CB + e.border_width, zmin+CB], [xmin+CB - e.border_width, ymax-CB + e.border_width, zmin+CB],
                    [xmin - e.border_width, ymin - e.border_width, zmin], [xmax + e.border_width, ymin - e.border_width, zmin], 
                    [xmax + e.border_width, ymax + e.border_width, zmin], [xmin - e.border_width, ymax + e.border_width, zmin],

                    [xmin - e.border_width, ymin - e.border_width, zmin - e.bg_depth], [xmax + e.border_width, ymin - e.border_width, zmin - e.bg_depth], 
                    [xmax + e.border_width, ymax + e.border_width, zmin - e.bg_depth], [xmin - e.border_width, ymax + e.border_width, zmin - e.bg_depth],

                    [xmin, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
                ]);
                this.createTextBGGeometry_addFaces(border_g, 4, 6, false);
            }
            if(e.bg_type === "c") {
                let vertexlist = [];
                let xsize = (xmax-xmin)*.707;
                let ysize = (ymax-ymin)*.707;
                let displacex = xmax - (xmax-xmin)/2;
                let displacey = ymax - (ymax-ymin)/2;
                let num_points = 32;

                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin - e.bg_depth]);
                }
                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin]);
                }

                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*(xsize+CB)+displacex, Math.sin(angle)*(ysize+CB)+displacey, zmin+CB]);
                }
                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*(xsize+e.border_width-CB)+displacex, Math.sin(angle)*(ysize+e.border_width-CB)+displacey, zmin+CB]);
                }

                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*(xsize+e.border_width)+displacex, Math.sin(angle)*(ysize+e.border_width)+displacey, zmin]);
                }
                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*(xsize+e.border_width)+displacex, Math.sin(angle)*(ysize+e.border_width)+displacey, zmin - e.bg_depth]);
                }
                for(let x = 0; x < num_points; x++) {
                    let angle = x/num_points*2*Math.PI;
                    vertexlist.push([Math.cos(angle)*xsize+displacex, Math.sin(angle)*ysize+displacey, zmin - e.bg_depth]);
                }
                this.addListVertex(border_g.vertices, vertexlist);              
                this.createTextBGGeometry_addFaces(border_g, num_points, 6, false);
            }
            if(e.bg_type === "h") {
                let diffx = xmax-xmin;
                let diffy = ymax-ymin;
                let xmed = xmin + (xmax-xmin)/2;
                let ymed = ymin + (ymax-ymin)/2;
                let wx = e.border_width * diffx/diffy;
                let wy = e.border_width;
                this.addListVertex(border_g.vertices, [
                    [xmed-diffx, ymed, zmin - e.bg_depth], [xmed, ymed-diffy, zmin - e.bg_depth], [xmed+diffx, ymed, zmin - e.bg_depth], [xmed, ymed+diffy, zmin - e.bg_depth],
                    [xmed-diffx, ymed, zmin], [xmed, ymed-diffy, zmin], [xmed+diffx, ymed, zmin], [xmed, ymed+diffy, zmin],
                    [xmed-diffx-CB, ymed, zmin+CB], [xmed, ymed-diffy-CB, zmin+CB], [xmed+diffx+CB, ymed, zmin+CB], [xmed, ymed+diffy+CB, zmin+CB],
                    
                    [xmed-diffx+CB-wx, ymed, zmin+CB], [xmed, ymed-diffy+CB-wy, zmin+CB], [xmed+diffx-CB+wx, ymed, zmin+CB], [xmed, ymed+diffy-CB+wy, zmin+CB],
                    [xmed-diffx-wx, ymed, zmin], [xmed, ymed-diffy-wy, zmin], [xmed+diffx+wx, ymed, zmin], [xmed, ymed+diffy+wy, zmin],
                    [xmed-diffx-wx, ymed, zmin-e.bg_depth], [xmed, ymed-diffy-wy, zmin-e.bg_depth], [xmed+diffx+wx, ymed, zmin-e.bg_depth], [xmed, ymed+diffy+wy, zmin-e.bg_depth],
                    [xmed-diffx, ymed, zmin - e.bg_depth], [xmed, ymed-diffy, zmin - e.bg_depth], [xmed+diffx, ymed, zmin - e.bg_depth], [xmed, ymed+diffy, zmin - e.bg_depth],
                ]);
                this.createTextBGGeometry_addFaces(border_g, 4, 6, false);
            }
            if(e.bg_type === "p") {
                let diffy = ymax-ymin;
                this.addListVertex(border_g.vertices, [
                    [xmin-diffy, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax+diffy, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
                    [xmin-diffy, ymin, zmin], [xmax, ymin, zmin], [xmax+diffy, ymax, zmin], [xmin, ymax, zmin],

                    [xmin-diffy-CB*3, ymin-CB, zmin+CB], [xmax+CB, ymin-CB, zmin+CB], [xmax+diffy+CB*3, ymax+CB, zmin+CB], [xmin-CB, ymax+CB, zmin+CB],
                    
                    [xmin-diffy - (e.border_width-CB)*3, ymin + CB - e.border_width, zmin+CB], [xmax - CB + e.border_width, ymin + CB - e.border_width, zmin+CB], 
                    [xmax+diffy + (e.border_width-CB)*3, ymax - CB + e.border_width, zmin+CB], [xmin + CB - e.border_width, ymax - CB + e.border_width, zmin+CB],

                    [xmin-diffy - e.border_width*3, ymin - e.border_width, zmin], [xmax + e.border_width, ymin - e.border_width, zmin], 
                    [xmax+diffy + e.border_width*3, ymax + e.border_width, zmin], [xmin - e.border_width, ymax + e.border_width, zmin],

                    [xmin-diffy - e.border_width*3, ymin - e.border_width, zmin - e.bg_depth], [xmax + e.border_width, ymin - e.border_width, zmin - e.bg_depth], 
                    [xmax+diffy + e.border_width*3, ymax + e.border_width, zmin - e.bg_depth], [xmin - e.border_width, ymax + e.border_width, zmin - e.bg_depth],

                    [xmin-diffy, ymin, zmin - e.bg_depth], [xmax, ymin, zmin - e.bg_depth], [xmax+diffy, ymax, zmin - e.bg_depth], [xmin, ymax, zmin - e.bg_depth],
                ]);
                this.createTextBGGeometry_addFaces(border_g, 4, 6, false);
            }
        }

        return [bg_g, border_g, bounding_g];
    }

    addText(id, sceneid, e, alignToGrid) {
        let base = this.findMesh("base", e.base, this.scene[sceneid]);

        let group = new THREE.Group();
        let g = this.createTextGeometry(e.text, e.height, e.text_align, e.rotation_x);
        let bg_g, border_g, bounding_g;
        [bg_g, border_g, bounding_g] = this.createTextBGGeometry(g, e);

        let material = new THREE.MeshPhongMaterial({color: e.color, side: THREE.DoubleSide});
        let bg_material = new THREE.MeshPhongMaterial({color: (e.bg_color !== undefined) ? e.bg_color : 0xffffff});
        let border_material = new THREE.MeshPhongMaterial({color: (e.border_color !== undefined) ? e.border_color : 0x000000});
        let bounding_material = new THREE.MeshBasicMaterial({color: 0x0, visible: false});
        let textMesh = new THREE.Mesh(g, material);
        let bgMesh = new THREE.Mesh(bg_g, bg_material);
        let borderMesh = new THREE.Mesh(border_g, border_material);
        let boundingMesh = new THREE.Mesh(bounding_g, bounding_material);

        textMesh.userData.id = id;
        textMesh.userData.type = "text";
        textMesh.userData.subtype = "text";
        textMesh.userData.e = e;
        bgMesh.userData.id = id;
        bgMesh.userData.type = "text";
        bgMesh.userData.subtype = "bg";
        bgMesh.userData.e = e;
        borderMesh.userData.id = id;
        borderMesh.userData.type = "text";
        borderMesh.userData.subtype = "border";
        borderMesh.userData.e = e;
        boundingMesh.userData.id = id;
        boundingMesh.userData.type = "text";
        boundingMesh.userData.subtype = "bounding";
        boundingMesh.userData.e = e;
        group.userData.id = id;
        group.userData.type = "text";
        group.userData.e = e;

        base.add(group);
        group.add(textMesh);
        group.add(bgMesh);
        group.add(borderMesh);
        group.add(boundingMesh);

        this.moveMesh(sceneid, "text", id, e.px, e.py + base.userData.e.sy, e.pz, null, alignToGrid);
        group.rotation.order = "YXZ";
        group.rotation.x = e.rx;
        group.rotation.y = e.ry;

        textMesh.castShadow = true;
        this.requestDraw();

        return group;
    }

    updateSymbolColor(type, id, sceneid) {
        let meshgroup = this.findMesh(type, id, this.scene[sceneid]);
        let m = this.findMeshesOfGroup(meshgroup);
            
        m[0].material.uniforms.mycolor.value.r = (meshgroup.userData.e.color >> 16) / 256;
        m[0].material.uniforms.mycolor.value.g = ((meshgroup.userData.e.color >> 8) & 0xFF) / 256;
        m[0].material.uniforms.mycolor.value.b = (meshgroup.userData.e.color & 0xFF) / 256;
        
        if(meshgroup.userData.e.type === "F") {
            m[1].material.uniforms.mycolor.value.r = (meshgroup.userData.e.cd.flagcolor >> 16) / 256;
            m[1].material.uniforms.mycolor.value.g = ((meshgroup.userData.e.cd.flagcolor >> 8) & 0xFF) / 256;
            m[1].material.uniforms.mycolor.value.b = (meshgroup.userData.e.cd.flagcolor & 0xFF) / 256;
        }
        else if(meshgroup.userData.e.type === "A") {
            m[1].material.uniforms.mycolor.value.r = (meshgroup.userData.e.cd.head_color >> 16) / 256;
            m[1].material.uniforms.mycolor.value.g = ((meshgroup.userData.e.cd.head_color >> 8) & 0xFF) / 256;
            m[1].material.uniforms.mycolor.value.b = (meshgroup.userData.e.cd.head_color & 0xFF) / 256;
            m[2].material.uniforms.mycolor.value.r = (meshgroup.userData.e.cd.head_color >> 16) / 256;
            m[2].material.uniforms.mycolor.value.g = ((meshgroup.userData.e.cd.head_color >> 8) & 0xFF) / 256;
            m[2].material.uniforms.mycolor.value.b = (meshgroup.userData.e.cd.head_color & 0xFF) / 256;
        }

        this.requestDraw();
    }

    updateSymbolGeometryArrow_Shaft(g, e) {
        g.vertices = [];
        g.faces = [];
        g.faceVertexUvs[0] = [];

        let height_min = 0;
        let height_max = e.sy;
        if(e.cd.head_type !== "n") {
            height_max = height_max - height_max * e.cd.head_sy_per/100;
        }
        if(e.cd.tail_type !== "n") {
            height_min = e.sy * e.cd.tail_sy_per/100;
        }
        let sx_2 = e.sx/2;
        let sz_2 = e.sz/2;
        let r = sx_2/5;
        if(sz_2 < sx_2)
            r = sz_2/5;

        let vertices = [];
        let faces = [];
        let fvuv = [];
        let flat = false;

        let num_spaces = e.cd.shaft_dots*2-1;
        let len_space = (height_max-height_min)/num_spaces;

        if(e.cd.shaft_type === "s") {
            for(let dot_index = 0; dot_index < e.cd.shaft_dots; dot_index++) {
                let dot_y_min = height_min + dot_index*2*len_space;
                let dot_y_max = dot_y_min + len_space;
                vertices = [
                    [-sx_2, dot_y_min, sz_2], [sx_2, dot_y_min, sz_2], [sx_2+r, dot_y_min, sz_2-r], [sx_2+r, dot_y_min, -sz_2+r], [sx_2, dot_y_min, -sz_2], [-sx_2, dot_y_min, -sz_2], [-sx_2-r, dot_y_min, -sz_2+r], [-sx_2-r, dot_y_min, +sz_2-r],
                    [-sx_2, dot_y_max, sz_2], [sx_2, dot_y_max, sz_2], [sx_2+r, dot_y_max, sz_2-r], [sx_2+r, dot_y_max, -sz_2+r], [sx_2, dot_y_max, -sz_2], [-sx_2, dot_y_max, -sz_2], [-sx_2-r, dot_y_max, -sz_2+r], [-sx_2-r, dot_y_max, +sz_2-r],
                ];
                flat = true;
                let u = 0;

                let base_face = dot_index * 16;
                for(let x = 0; x < 8; x++) {
                    faces.push([base_face+x, base_face+ (x+1)%8, base_face + 8 + ((x+1)%8)]);
                    faces.push([base_face + x, base_face + 8 + ((x+1)%8), base_face + 8 + x]);
                    let type = x%4;
                    let delta = r;
                    if(type == 0)
                        delta = e.sx;
                    else if(type == 2)
                        delta = e.sz;
                    fvuv.push([[u, 0], [u+delta, 0], [u+delta, len_space]]);
                    fvuv.push([[u, 0], [u+delta, len_space], [u, len_space]]);
                    u += delta;
                }
                // Add top and bottom faces
                for(let x = 1; x < 7; x++) {
                    faces.push([base_face + 0, base_face + x+1, base_face + x]);
                    fvuv.push([[vertices[0][0], vertices[0][2]], [vertices[x+1][0], vertices[x+1][2]], [vertices[x][0], vertices[x][2]]])
                    faces.push([base_face + 8, base_face + 8+x, base_face + 8+x+1]);
                    fvuv.push([[vertices[0][0], vertices[0][2]], [vertices[x][0], vertices[x][2]], [vertices[x+1][0], vertices[x+1][2]]])
                }

                this.addListVertex(g.vertices, vertices);
                this.addListFaces(g.faces, g.faceVertexUvs[0], faces, fvuv);
            }
        }
        else if(e.cd.shaft_type === "r") {
            for(let dot_index = 0; dot_index < e.cd.shaft_dots; dot_index++) {
                vertices = [];
                faces = [];
                fvuv = [];
                let dot_y_min = height_min + dot_index*2*len_space;
                let dot_y_max = dot_y_min + len_space;
                let num_points = 24;
                for(let y = 0; y < 2; y++) {
                    for(let x = 0; x < num_points+1; x++) {
                        let angle = x/num_points * 2 * Math.PI;
                        vertices.push([sx_2 * Math.cos(angle), dot_y_min, sz_2 * Math.sin(angle)]);
                        vertices.push([sx_2 * Math.cos(angle), dot_y_max, sz_2 * Math.sin(angle)]);
                    }
                }
                let base_face = dot_index * (num_points+1) * 2 * 2;
                // Side faces
                for(let x = 0; x < num_points; x++) {
                    faces.push([base_face + x*2, base_face + x * 2 + 1, base_face + (x+1) * 2 + 1]);
                    fvuv.push([[x*sx_2, dot_y_min], [x*sx_2, dot_y_max], [(x+1) * sx_2, dot_y_max]]);
                    faces.push([base_face + x*2, base_face + (x+1) * 2 + 1, base_face + (x+1) * 2]);
                    fvuv.push([[x*sx_2, dot_y_min], [(x+1) * sx_2, dot_y_max], [(x+1) * sx_2, dot_y_min]]);
                }
                // Front and back faces
                for(let x = 1; x < num_points-1; x++) {
                    faces.push([base_face + (num_points+1)*2, base_face + (num_points+1)*2 + x*2, base_face + (num_points+1)*2 + x*2 + 2]);
                    fvuv.push([[vertices[(num_points+1)*2][0], vertices[(num_points+1)*2][2]], [vertices[(num_points+1)*2 + x*2][0], vertices[(num_points+1)*2 + x*2][2]], [vertices[(num_points+1)*2 + x*2 + 2][0], vertices[(num_points+1)*2 + x*2 + 2][2]]])
                    faces.push([base_face + (num_points+1)*2+1, base_face + (num_points+1)*2 + x*2 + 3, base_face + (num_points+1)*2 + x*2 + 1]);
                    fvuv.push([[vertices[(num_points+1)*2][0], vertices[(num_points+1)*2][2]], [vertices[(num_points+1)*2 + x*2 + 2][0], vertices[(num_points+1)*2 + x*2 + 2][2]], [vertices[(num_points+1)*2 + x*2][0], vertices[(num_points+1)*2 + x*2][2]]])
                }

                this.addListVertex(g.vertices, vertices);
                this.addListFaces(g.faces, g.faceVertexUvs[0], faces, fvuv);
            }
        }

        this.setGeometryUpdated([g], flat);
    }

    updateSymbolGeometryArrow_Head(g, e, istail) {
        g.vertices = [];
        g.faces = [];
        g.faceVertexUvs[0] = [];
        let sx_per = e.cd.head_sx_per;
        let sy_per = e.cd.head_sy_per;
        let sz_per = e.cd.head_sz_per;

        if(istail) {
            sx_per = e.cd.tail_sx_per;
            sy_per = e.cd.tail_sy_per;
            sz_per = e.cd.tail_sz_per;
        }

        let sx_2 = e.sx/2 * sx_per/100;
        let sx = e.sx;
        let sz_2 = e.sz/2 * sz_per/100;
        let py_1 = e.sy - e.sy * sy_per/100;
        let py_2 = e.sy;
        let r = e.sx/10;
        let type = e.cd.head_type;
        if(e.sz < e.sx)
            r = e.sz/10;
        let r_x = r;

        if(istail) {
            py_2 = 0;
            py_1 = e.sy * sy_per/100;
            type = e.cd.tail_type;
            sz_2 = -sz_2;
            r = -r;
        }

        let vertices = [];
        let faces = [];
        let fvuv = [];
        let flat = true;

        if(type == "f") {
            vertices = [
                [0, py_2, -sz_2], [-sx_2, py_1, -sz_2], [sx_2, py_1, -sz_2],
                [0, py_2+r, -sz_2+r], [-sx_2-r*(sx_2/(py_2-py_1))*2, py_1-r, -sz_2+r], [sx_2+r*(sx_2/(py_2-py_1))*2, py_1-r, -sz_2+r],
                [0, py_2+r,  sz_2-r], [-sx_2-r*(sx_2/(py_2-py_1))*2, py_1-r,  sz_2-r], [sx_2+r*(sx_2/(py_2-py_1))*2, py_1-r,  sz_2-r],
                [0, py_2, sz_2], [-sx_2, py_1, sz_2], [sx_2, py_1, sz_2],
            ]
            faces = [
                [0,2,1], [9,10,11],
                [0,1,4], [0,4,3], [1,2,5], [1,5,4], [2,0,3], [2,3,5],
                [3,4,7], [3,7,6], [4,5,8], [4,8,7], [5,3,6], [5,6,8],
                [6,7,10], [6,10,9], [7,8,11], [7,11,10], [8,6,9], [8,9,11],
            ];
            fvuv = [
                [[vertices[0][0],vertices[0][1]], [vertices[2][0],vertices[2][1]], [vertices[1][0],vertices[1][1]]],
                [[vertices[9][0],vertices[9][1]], [vertices[10][0],vertices[10][1]], [vertices[11][0],vertices[11][1]]],
            ];
            let len_side = Math.sqrt(sx_2*sx_2 + (py_2=py_1) * (py_2=py_1))
            for(let y = 0; y < 3; y++) {
                for(let z = 0; z < 3; z++) {
                    let x = 2+y*6+z*2;
                    let height = r*1.7;
                    let len = len_side/2;
                    if(y == 1)
                        height = sx_2*2;
                    if(z == 1)
                        len = sx_2*2;
                    fvuv.push([[0,0], [len, 0], [len, height]]);
                    x++;
                    fvuv.push([[0,0], [len, height], [0, height]]);
                }
            }
        }
        else if((type === "v") || (type === "i")) {
            if(istail) {
                sx_2 = -sx_2;
                sx = -sx;
            }
            let delta_y = sx_2;
            
            if(istail && (type === "i")) {
                sx_2 = -sx_2;
                sx = -sx;
                delta_y = -delta_y;
                sz_2 = -sz_2;
                r = -r;
                py_1 = 0;
                py_2 = e.sy * sy_per/100;               
            }
            else if(!istail && (type === "i")) {
                sx_2 = -sx_2;
                sx = -sx;
                delta_y = -delta_y;
                sz_2 = -sz_2;
                r = -r;
                py_2 = e.sy - e.sy * sy_per/100;
                py_1 = e.sy;
            }

            vertices = [
                [sx/2, py_2, sz_2], [sx_2, py_2-delta_y, sz_2], [sx_2, py_1-delta_y, sz_2], [sx/2, py_1, sz_2], 
                [-sx/2, py_1, sz_2], [-sx_2, py_1-delta_y, sz_2], [-sx_2, py_2-delta_y, sz_2], [-sx/2, py_2, sz_2],

                [sx/2+r*.5, py_2+r*.5, sz_2-r], [sx_2+r, py_2-delta_y, sz_2-r], [sx_2+r, py_1-delta_y-r*3, sz_2-r], [sx/2-r*.7, py_1-r*.7, sz_2-r], 
                [-sx/2+r*.7, py_1-r*.7, sz_2-r], [-sx_2-r, py_1-delta_y-r*3, sz_2-r], [-sx_2-r, py_2-delta_y, sz_2-r], [-sx/2-r*.5, py_2+r*.5, sz_2-r],

                [sx/2+r*.5, py_2+r*.5, -sz_2+r], [sx_2+r, py_2-delta_y, -sz_2+r], [sx_2+r, py_1-delta_y-r*3, -sz_2+r], [sx/2-r*.7, py_1-r*.7, -sz_2+r], 
                [-sx/2+r*.7, py_1-r*.7, -sz_2+r], [-sx_2-r, py_1-delta_y-r*3, -sz_2+r], [-sx_2-r, py_2-delta_y, -sz_2+r], [-sx/2-r*.5, py_2+r*.5, -sz_2+r],

                [sx/2, py_2, -sz_2], [sx_2, py_2-delta_y, -sz_2], [sx_2, py_1-delta_y, -sz_2], [sx/2, py_1, -sz_2],
                [-sx/2, py_1, -sz_2], [-sx_2, py_1-delta_y, -sz_2], [-sx_2, py_2-delta_y, -sz_2], [-sx/2, py_2, -sz_2],
            ];
            faces = [
                [0,2,1], [0,3,2], [0,4,3], [0,7,4], [4,6,5], [4,7,6],
                [0+24,1+24,2+24], [0+24,2+24,3+24], [0+24,3+24,4+24], [0+24,4+24,7+24], [4+24,5+24,6+24], [4+24,6+24,7+24]
            ];
            for(let y = 0; y < 3; y++) {
                for(let x = 0; x <8; x++) {
                    faces.push([y*8+x, y * 8 + (x+1)%8, (y+1)*8 + (x+1)%8]);
                    faces.push([y*8+x, (y+1)*8 + (x+1)%8, (y+1)*8 + x]);
                }
            }

            for(let x = 0; x < faces.length; x++) {
                if(x < 12)
                    fvuv.push([[vertices[faces[x][0]][0],vertices[faces[x][0]][1]], [vertices[faces[x][1]][0],vertices[faces[x][1]][1]], [vertices[faces[x][2]][0],vertices[faces[x][2]][1]]]);
                else if( (((x-12)%16) == 2) || (((x-12)%16) == 3) || (((x-12)%16) == 10) || (((x-12)%16) == 11))
                    fvuv.push([[vertices[faces[x][0]][1],vertices[faces[x][0]][2]], [vertices[faces[x][1]][1],vertices[faces[x][1]][2]], [vertices[faces[x][2]][1],vertices[faces[x][2]][2]]]);
                else
                    fvuv.push([[vertices[faces[x][0]][0],vertices[faces[x][0]][2]], [vertices[faces[x][1]][0],vertices[faces[x][1]][2]], [vertices[faces[x][2]][0],vertices[faces[x][2]][2]]]);
            }
            if((istail && (type == "v")) || (!istail && (type === "i"))){
                for(let x = 0; x < faces.length; x++) {
                    let temp = faces[x][1];
                    faces[x][1] = faces[x][2];
                    faces[x][2] = temp;
                    temp = fvuv[x][1];
                    fvuv[x][1] = fvuv[x][2];
                    fvuv[x][2] = temp;
                }
            }
        }
        else if(type == "p") {
            vertices = [
                [0, py_2, 0], [-sx_2, py_1, -sz_2], [sx_2, py_1, -sz_2], [sx_2, py_1, sz_2], [-sx_2, py_1, sz_2],
            ];
            faces = [[0,2,1], [0,3,2], [0,4,3], [0,1,4], [1,2,3], [1,3,4]];
            for(let x = 0; x < faces.length; x++) {
                if((x > 2) || (x === 1))
                    fvuv.push([[vertices[faces[x][0]][0],vertices[faces[x][0]][2]], [vertices[faces[x][1]][0],vertices[faces[x][1]][2]], [vertices[faces[x][2]][0],vertices[faces[x][2]][2]]]);
                else
                    fvuv.push([[vertices[faces[x][0]][0],vertices[faces[x][0]][1]], [vertices[faces[x][1]][0],vertices[faces[x][1]][1]], [vertices[faces[x][2]][0],vertices[faces[x][2]][1]]]);
            }
        }
        else if(type == "r") {
            for(let x = 0; x < 17; x++) {
                let angle = x/16*Math.PI;
                vertices.push([sx_2*Math.cos(angle), py_1 + (py_2-py_1)*Math.sin(angle), -sz_2]);
                if((x == 0) || (x == 16)) {
                    vertices.push([(sx_2+r_x)*Math.cos(angle), py_1 + (py_2-py_1+r)*Math.sin(angle)-r, -sz_2+r]);
                    vertices.push([(sx_2+r_x)*Math.cos(angle), py_1 + (py_2-py_1+r)*Math.sin(angle)-r, sz_2-r]);
                }
                else {
                    vertices.push([(sx_2+r_x)*Math.cos(angle), py_1 + (py_2-py_1+r)*Math.sin(angle), -sz_2+r]);
                    vertices.push([(sx_2+r_x)*Math.cos(angle), py_1 + (py_2-py_1+r)*Math.sin(angle), sz_2-r]);
                }
                vertices.push([sx_2*Math.cos(angle), py_1 + (py_2-py_1)*Math.sin(angle), sz_2]);
            }
            for(let x = 1; x < 16; x++) {
                faces.push([0, x*4+4, x*4]);
                faces.push([3, x*4+3, x*4+7]);
                fvuv.push([[vertices[0][0],vertices[0][1]], [vertices[x*4+4][0],vertices[x*4+4][1]], [vertices[x*4][0],vertices[x*4][1]]]);
                fvuv.push([[vertices[3][0],vertices[3][1]], [vertices[x*4+3][0],vertices[x*4+3][1]], [vertices[x*4+7][0],vertices[x*4+7][1]]]);
            }
            let tl = sx_2*2*Math.PI/16;
            for(let y = 0; y < 3; y++) {
                for(let x = 0; x < 16; x++) {
                    faces.push([x*4+y, x*4 + y + 4, x*4 + y + 5]);
                    faces.push([x*4+y, x*4 + y + 5, x*4 + y + 1]);
                    let depth = r*1.7;
                    if(y == 1)
                        depth = sz_2*2;
                    fvuv.push([[x*tl,0], [(x+1)*tl,0], [(x+1)*tl,depth]]);
                    fvuv.push([[x*tl,0], [(x+1)*tl,depth], [x*tl,depth]]);
                }
            }
            faces.push([0,1,65]); faces.push([0,65,64]);
            faces.push([1,2,66]); faces.push([1,66,65]);
            faces.push([2,3,67]); faces.push([2,67,66]);
            fvuv.push([[0,0], [0,r*1.7], [sx_2*2,r*1.7]]);
            fvuv.push([[0,0], [sx_2*2,r*1.7], [sx_2*2,0]]);
            fvuv.push([[0,0], [0,sz_2*2], [sx_2*2,sz_2*2]]);
            fvuv.push([[0,0], [sx_2*2,sz_2*2], [sx_2*2,0]]);
            fvuv.push([[0,0], [0,r*1.7], [sx_2*2,r*1.7]]);
            fvuv.push([[0,0], [sx_2*2,r*1.7], [sx_2*2,0]]);
            //flat = false;
        }
        else if(type == "s") {
            vertices = [
                [-sx_2, py_1, -sz_2], [sx_2, py_1, -sz_2], [sx_2, py_2, -sz_2], [-sx_2, py_2, -sz_2],
                [-sx_2-r_x, py_1-r, -sz_2+r], [sx_2+r_x, py_1-r, -sz_2+r], [sx_2+r_x, py_2+r, -sz_2+r], [-sx_2-r_x, py_2+r, -sz_2+r],
                [-sx_2-r_x, py_1-r, sz_2-r], [sx_2+r_x, py_1-r, sz_2-r], [sx_2+r_x, py_2+r, sz_2-r], [-sx_2-r_x, py_2+r, sz_2-r],
                [-sx_2, py_1, sz_2], [sx_2, py_1, sz_2], [sx_2, py_2, sz_2], [-sx_2, py_2, sz_2],
            ];
            faces = [[0,2,1], [0,3,2], [12,13,14], [12,14,15]];
            fvuv.push([[vertices[0][0],vertices[0][1]], [vertices[2][0],vertices[2][1]], [vertices[1][0],vertices[1][1]]]);
            fvuv.push([[vertices[0][0],vertices[0][1]], [vertices[3][0],vertices[3][1]], [vertices[2][0],vertices[2][1]]]);
            fvuv.push([[vertices[12][0],vertices[12][1]], [vertices[13][0],vertices[13][1]], [vertices[14][0],vertices[14][1]]]);
            fvuv.push([[vertices[12][0],vertices[12][1]], [vertices[14][0],vertices[14][1]], [vertices[15][0],vertices[15][1]]]);
            for(let y = 0; y < 3; y++) {
                for(let x = 0; x < 4; x++) {
                    faces.push([y*4+x, y*4+(x+1)%4, (y+1)*4+(x+1)%4]);
                    faces.push([y*4+x, (y+1)*4+(x+1)%4, (y+1)*4+x]);
                    let depth = r*1.7;
                    if(y == 1)
                        depth = sz_2*2;
                    if(x%2 === 0) {
                        fvuv.push([[0,0], [sx_2*2,0], [sx_2*2,depth]]);
                        fvuv.push([[0,0], [sx_2*2,depth], [0,depth]]);
                    }
                    else {
                        fvuv.push([[0,0], [(py_2-py_1),0], [(py_2-py_1),depth]]);
                        fvuv.push([[0,0], [(py_2-py_1),depth], [0,depth]]);
                    }
                }
            }
        }

        this.addListVertex(g.vertices, vertices);
        this.addListFaces(g.faces, g.faceVertexUvs[0], faces, fvuv);
        this.setGeometryUpdated([g], flat);
    }

    updateSymbolGeometryArrow(meshgroup) {
        let mesh_shaft = null;
        let mesh_head = null;
        let mesh_tail = null;
        meshgroup.children.forEach((element) => { 
            if(element.userData.submesh == 1)
                mesh_shaft = element;
            if(element.userData.submesh == 2)
                mesh_head = element;
            if(element.userData.submesh == 3)
                mesh_tail = element;
        });
        
        this.updateSymbolGeometryArrow_Shaft(mesh_shaft.geometry, meshgroup.userData.e);
        this.updateSymbolGeometryArrow_Head(mesh_head.geometry, meshgroup.userData.e, false);
        this.updateSymbolGeometryArrow_Head(mesh_tail.geometry, meshgroup.userData.e, true);
    }

    updateSymbolGeometry(meshgroup) {
        if(meshgroup.userData.e.type == "A")
            this.updateSymbolGeometryArrow(meshgroup);
        else
            this.updateStandardGeometry(meshgroup, "SYMBOL");

        return;
    }

    getSymbolTextureByType(type, index) {
        if(type in GEOMETRY.SYMBOL)
            return GEOMETRY.SYMBOL[type].subshapes[index].texture;
        else
            return GEOMETRY.SYMBOL["UNKNOWN"].subshapes[index].texture;
    }

    addSymbol(id, sceneid, e, alignToGrid) {
        let symbol_template = this.getDeviceTemplate("SYMBOL", e.type);
        let submesh_id = [];
        for(let x = 0; x < symbol_template.subshapes.length; x++)  {
            submesh_id.push(x+1);
        }
        let groupdata = {
            view: sceneid,
            type: "symbol",
            id: id,
            e: e,
            base: e.base,
            num_submesh: symbol_template.subshapes.length,
            texture: [
                staticurl + "/static/textures/basic.png", 
                staticurl + "/static/textures/basic.png",
                staticurl + "/static/textures/basic.png",
                ],
            submesh_id: submesh_id,
            color: [e.color, 0x0, 0x0],
        }
        if(e.type === "A") { // Arrows have 3 geometries
            groupdata.num_submesh = 3;
            groupdata.submesh_id = [1,2,3];
        }
        let group = this.createMeshGroup(groupdata);

        this.updateSymbolGeometry(group);
        this.updateSymbolColor("symbol", id, sceneid);

        return id;
    }

    updateL2SegmentGeometry(meshgroup) {
        let m = this.findMeshesOfGroup(meshgroup);
        let g = m[0].geometry;

        g.vertices = [];
        g.faces = [];
        g.faceVertexUvs[0] = [];

        let vertices = [];
        let faces = [];
        let fvuvs = [];
        let n_points = 16;
        let x_spacing = [[0,.6], [-.54,.65], [-.55,.7], [-.54,.9], [-.5,1], [.5,1], [.54,.9], [.55,.7], [.54,.65], [0,.6]];

        for(let x = 0; x < n_points+1; x++) {
            for(let y = 0; y < x_spacing.length; y++) {
                vertices.push([
                    x_spacing[y][0] * meshgroup.userData.e.sx,
                    (.5 + .5 * x_spacing[y][1] * Math.sin(2*x*Math.PI/n_points)) * meshgroup.userData.e.sy,
                    (.5 * x_spacing[y][1] * Math.cos(2*x*Math.PI/n_points)) * meshgroup.userData.e.sz
                ]);
            }
        }
        for(let x = 0; x < n_points; x++) {
            for(let y = 0; y < (x_spacing.length-1); y++) {
                faces.push([x*x_spacing.length+y, x*x_spacing.length+y+1, (x+1)*x_spacing.length + y+1]);
                faces.push([x*x_spacing.length+y, (x+1)*x_spacing.length+y+1, (x+1)*x_spacing.length + y]);
                fvuvs.push([[x_spacing[y][0]*meshgroup.userData.e.sx, 2*Math.PI*x/n_points], [x_spacing[y+1][0]*meshgroup.userData.e.sx, 2*Math.PI*x/n_points], [x_spacing[y+1][0]*meshgroup.userData.e.sx,2*Math.PI*(x+1)/n_points]]);
                fvuvs.push([[x_spacing[y][0]*meshgroup.userData.e.sx, 2*Math.PI*x/n_points], [x_spacing[y+1][0]*meshgroup.userData.e.sx, 2*Math.PI*(x+1)/n_points], [x_spacing[y][0]*meshgroup.userData.e.sx, 2*Math.PI*(x+1)/n_points]]);
            }
        }

        this.addListVertex(g.vertices, vertices);
        this.addListFaces(g.faces, g.faceVertexUvs[0], faces, fvuvs);

        g.verticesNeedUpdate = true;
        g.elementsNeedUpdate = true;
        g.uvsNeedUpdate = true;

        g.computeBoundingBox();
        g.computeBoundingSphere();
        g.computeVertexNormals();
        //g.computeFlatVertexNormals();

        this.requestDraw();
    }

    updateL2SegmentColor(id) {
        let meshgroup = this.findMesh("l2segment", id, this.scene["L3"]);
        let m = this.findMeshesOfGroup(meshgroup);

        let color = meshgroup.userData.e.color1;

        m[0].material.uniforms.mycolor.value.r = (color >> 16) / 256;
        m[0].material.uniforms.mycolor.value.g = ((color >> 8) & 0xFF) / 256;
        m[0].material.uniforms.mycolor.value.b = (color & 0xFF) / 256;

        this.requestDraw();
    }

    addL2Segment(id, e, alignToGrid) {
        let group = this.createMeshGroup({
            view: "L3",
            type: "l2segment", 
            id: id,
            e: e,
            base: e.base,
            num_submesh: 1, 
            texture: [staticurl + "/static/textures/basic.png"], 
            submesh_id: [1],
            color: [e.color1],
            alignToGrid: alignToGrid,
        });

        this.updateL2SegmentGeometry(group);
        this.addDeviceName(group, .2);

        return group;
    }

    getSidesOfBGPPeering(bgp_peering) {
        let e = bgp_peering.userData.e;
        let src_element = this.getMesh("L3", "vrf", e.l3_reference.src_vrf_id);
        let dst_element = this.getMesh("L3", "vrf", e.l3_reference.dst_vrf_id);

        return [src_element, dst_element];
    }

    updateBGPArrowColor(meshgroup) {
        let color = meshgroup.userData.e.color;
        let m = this.findMeshesOfGroup(meshgroup);

        m[0].material.uniforms.mycolor.value.r = (color >> 16) / 256;
        m[0].material.uniforms.mycolor.value.g = ((color >> 8) & 0xFF) / 256;
        m[0].material.uniforms.mycolor.value.b = (color & 0xFF) / 256;

        this.requestDraw();
    }

    updateBGPArrowGeometry(meshgroup) {
        let m = this.findMeshesOfGroup(meshgroup);
        let g = m[0].geometry;

        g.vertices = [];
        g.faces = [];
        g.faceVertexUvs[0] = [];

        let vertices = [];
        let faces = [];
        let fvuvs = [];

        // Find coordinates of source and destination vrfs
        let src_element = null, dst_element = null;
        let x1, y1, z1, x2, y2, z2;
        [src_element, dst_element] = this.getSidesOfBGPPeering(meshgroup);

        src_element.getWorldPosition(this.tempVector);
        x1 = this.tempVector.x;
        y1 = this.tempVector.y + src_element.userData.e.sy*.7;
        z1 = this.tempVector.z;

        dst_element.getWorldPosition(this.tempVector);
        x2 = this.tempVector.x;
        y2 = this.tempVector.y + dst_element.userData.e.sy*.7;
        z2 = this.tempVector.z;

        this.tempVector.set(x2-x1, y2-y1, z2-z1).normalize();
        x1 = x1+this.tempVector.x*.5;
        y1 = y1+this.tempVector.y*.5;
        z1 = z1+this.tempVector.z*.5;
        x2 = x2-this.tempVector.x*.5;
        y2 = y2-this.tempVector.y*.5;
        z2 = z2-this.tempVector.z*.5;
        let dir_x = (x2-x1), dir_y = (y2-y1), dir_z = (z2-z1);
        for(let i = 0; i < 17; i++) {
            let fraction = i/16;
            let x = dir_x * fraction;
            let z = dir_z * fraction;
            let y = dir_y * fraction - (i-8)*(i-8)/128 * meshgroup.userData.e.curve_y + .5 * meshgroup.userData.e.curve_y;
            x -= this.tempVector.z * ((i-8)*(i-8)/128 * meshgroup.userData.e.curve_x - .5 * meshgroup.userData.e.curve_x);
            z += this.tempVector.x * ((i-8)*(i-8)/128 * meshgroup.userData.e.curve_x - .5 * meshgroup.userData.e.curve_x);

            if((i == 0) || (i == 16)) {
                vertices.push([x, y-.05, z]);
                vertices.push([x, y-.05, z]);
                vertices.push([x, y-.05, z]);
                vertices.push([x, y-.05, z]);
            }
            else {
                if(i == 1) {
                    vertices.push([x - this.tempVector.z*.2, y, z + this.tempVector.x*.2]);
                    vertices.push([x + this.tempVector.z*.2, y, z - this.tempVector.x*.2]);
                    vertices.push([x + this.tempVector.z*.2, y-.1, z - this.tempVector.x*.2]);
                    vertices.push([x - this.tempVector.z*.2, y-.1, z + this.tempVector.x*.2]);
                }
                vertices.push([x - this.tempVector.z*.08, y, z + this.tempVector.x*.08]);
                vertices.push([x + this.tempVector.z*.08, y, z - this.tempVector.x*.08]);
                vertices.push([x + this.tempVector.z*.08, y-.1, z - this.tempVector.x*.08]);
                vertices.push([x - this.tempVector.z*.08, y-.1, z + this.tempVector.x*.08]);
                if(i == 15) {
                    vertices.push([x - this.tempVector.z*.2, y, z + this.tempVector.x*.2]);
                    vertices.push([x + this.tempVector.z*.2, y, z - this.tempVector.x*.2]);
                    vertices.push([x + this.tempVector.z*.2, y-.1, z - this.tempVector.x*.2]);
                    vertices.push([x - this.tempVector.z*.2, y-.1, z + this.tempVector.x*.2]);
                }
            }
        }
        for(let i = 0; i < 18; i++) {
            for(let j = 0; j < 4; j++) {
                faces.push([i*4 + j, (i+1)*4 + j, (i+1)*4 + ((j+1)%4)]);
                faces.push([i*4 + j, (i+1)*4 + ((j+1)%4), i*4 + ((j+1)%4)]);
                fvuvs.push([[0,0], [0,0], [0,0]]); fvuvs.push([[0,0], [0,0], [0,0]]);
            }
        }
        this.addListVertex(g.vertices, vertices);
        this.addListFaces(g.faces, g.faceVertexUvs[0], faces, fvuvs);

        this.moveMesh("L3", "bgp_peering", meshgroup.userData.id, x1, y1, z1);

        g.verticesNeedUpdate = true;
        g.elementsNeedUpdate = true;
        g.uvsNeedUpdate = true;

        g.computeBoundingBox();
        g.computeBoundingSphere();
        g.computeVertexNormals();
        //g.computeFlatVertexNormals();

        this.requestDraw();
    }

    addBGPArrow(id, e) {
        let meshgroup = this.createMeshGroup({
            view: "L3",
            type: "bgp_peering", 
            id: id,
            e: e,
            base: null,
            num_submesh: 1, 
            texture: [staticurl + "/static/textures/basic.png"], 
            submesh_id: [1],
            color: [e.color],
            alignToGrid: false,
        });
        this.updateBGPArrowGeometry(meshgroup);
        return meshgroup;
    }
}
