let usertextures_data = {
    dom: {}
};

async function upload_texture(img_input) {
    let formData = new FormData();
    formData.append("img", img_input);
    try {
        let r = await fetch('/upload/texture', {method: "POST", body: formData});
        let body = await r.text();
        if(r.status !== 200)
            DOM.showError("Error", "Error uploading file (" + r.status + "): " + body);
        else {
            DOM.removeChilds(usertextures_data.dom.texture, true);
            load_textures();
        }
    }
    catch (e) {
        DOM.showError("Error", "Failed to upload file: " + e);
    }
}

function request_add_texture() {
    DOM.removeChilds(usertextures_data.dom.texture, true);

    usertextures_data.dom.upload_show_img = DOM.cdiv(usertextures_data.dom.texture);

    let img_input = DOM.ci_f(usertextures_data.dom.texture);
    img_input.accept="image/x-png,image/gif,image/jpeg";
    img_input.addEventListener("change", () => {
        let file = img_input.files[0];
        DOM.removeChilds(usertextures_data.dom.upload_show_img, true);
        let img = DOM.c(usertextures_data.dom.upload_show_img, "img");
        img.style.width = "60vmin";
        img.style.height = "60vmin";
        img.file = file;

        const reader = new FileReader();
        reader.addEventListener("load", (e) => {
            img.src = e.target.result;
        });
        reader.readAsDataURL(file);        
    });
    DOM.cbutton(usertextures_data.dom.texture, null, "button_mini", "Upload", null, () => {
        if(img_input.files.length !== 1)
            DOM.showError("Error", "No file selected.");
        else
            upload_texture(img_input.files[0]);
    })
}

async function delete_texture(texture_id) {
    let r = await fetch('/usertextures/delete', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: texture_id,
        }),
    });

    if(r.status !== 200) {
        DOM.showError("Error", "Error on delete texture (" + r.status + ").");
        return;
    }

    let body = await r.json();

    if(body.error) {
        DOM.showError("Error", "Error on delete texture: " + body.error);
        return;
    }

    DOM.showError("Success", "Texture deleted.");

    load_textures();
}

async function rename_texture(texture_id, new_name) {
    let r = await fetch('/usertextures/rename', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: texture_id,
            name: new_name,
        }),
    });

    if(r.status !== 200) {
        DOM.showError("Error", "Error renaming texture (" + r.status + ").");
        return;
    }

    let body = await r.json();

    if(body.error) {
        DOM.showError("Error", "Error renaming texture: " + body.error);
        return;
    }

    DOM.showError("Success", "Texture renamed.");

    load_textures();
}

function show_texture() {
    let texture_id = this.getAttribute("data-textureid");
    DOM.removeChilds(usertextures_data.dom.texture, true);

    DOM.cimg(usertextures_data.dom.texture, "/usertexture/" + texture_id + ".png", null, "usertexture_img");
    
    let div_name = DOM.cdiv(usertextures_data.dom.texture);
    usertextures_data.dom.usertexture_name = DOM.ci_text(div_name, null, "texture_name_input", usertextures_data.user_textures[texture_id].name);
    usertextures_data.dom.usertexture_name.value = usertextures_data.user_textures[texture_id].name;

    DOM.cbutton(div_name, null, "button", "Rename", null, () => {
        rename_texture(texture_id, usertextures_data.dom.usertexture_name.value);
    })

    DOM.cbutton(usertextures_data.dom.texture, null, "button", "Delete", null, () => {
        if(confirm("Are you sure?")) {
            delete_texture(texture_id);
            DOM.removeChilds(usertextures_data.dom.texture, true);
        }
    })
}

async function load_textures() {
    let r = await fetch("/usertextures/list", {cache: "no-store"});

    if(r.status !== 200) {
        DOM.showError("Error", "Error loading texture list (" + r.status + ").");
        return;
    }

    let body = await r.json();

    if(body.error) {
        DOM.showError("Error", "Error loading texture list: " + body.error);
        return;
    }

    usertextures_data.user_textures = body;

    DOM.removeChilds(usertextures_data.dom.list_shapes, true);

    for(let texture_id in body) {
        let texture = DOM.cdiv(usertextures_data.dom.list_shapes, null, "usertexture", body[texture_id].name);
        texture.setAttribute("data-textureid", texture_id);
        texture.addEventListener("click", show_texture);
    }
}

function screen_init() {
    let body = document.body;
    let ge, div;

    let grid = DOM.cg(document.body, "grid", "full_screen", ["250px", "1fr"], ["45px", "1fr"]);

    // Header
    usertextures_data.dom.header = DOM.cge(grid, "header", null, 1, 3, 1, 2);
    usertextures_data.dom.home = DOM.cimg(usertextures_data.dom.header, staticurl + "/static/img/home_b.png", null, "button button-menu", null, () => {
        window.location.href = "/";
    });

    // Texture list
    ge = DOM.cge(grid, null, "navigation", 1, 2, 2, 3);
    div = DOM.cdiv(ge, null, "navigation_title");
    DOM.cdiv(div, null, "navigation_title_text", "Textures");
    DOM.cbutton(div, null, "button_mini", "Add", null, request_add_texture);
    usertextures_data.dom.list_shapes = DOM.cdiv(ge, "list_textures");

    // Texture drawing area
    usertextures_data.dom.texture = DOM.cge(grid, null, "texture_cell", 2, 3, 2, 3);
}

function init() {
    screen_init();
    load_textures();    
}

function main() {
    init();
}