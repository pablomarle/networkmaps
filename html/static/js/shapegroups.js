let shapegroups_data = {
    name: "NetworkMaps",    
};

function add_message_box(title) {
    let body = document. getElementsByTagName("body")[0];

    if(shapegroups_data.messagebox)
        delete_message_box();
    
    shapegroups_data.messagebox = DOM.cdiv_fade(body, null, "box");
        DOM.cdiv(shapegroups_data.messagebox, null, "boxtitle", title);

    return shapegroups_data.messagebox;
}

function delete_message_box() {
    if(shapegroups_data.messagebox) {
        DOM.fadeOutElement(shapegroups_data.messagebox);
    }

    shapegroups_data.messagebox = null;
}

function add_infobox(text, px, py) {
    let ib = document.getElementById("infobox");
    if(!ib) {
        let body = document. getElementsByTagName("body")[0];
        ib = DOM.cdiv(body, "infobox", "infobox", text);
        ib.style.position = "fixed";
        ib.style.top = py + "px";
        ib.style.left = px + "px";
    }
    else {
        DOM.removeChilds(ib, true);
        ib.innerHTML = text;
    }
}

function remove_infobox() {
    let ib = document.getElementById("infobox");
    if(ib)
        DOM.removeElement(ib);
}

function set_node_infobox(node, text) {
    node.addEventListener("mouseover", (ev) => {
        add_infobox(text, ev.pageX, ev.pageY+20)
    })
    node.addEventListener("mouseout", () => {
        remove_infobox();
    })
}

function screen_init() {
    let body, div, i;
    
    body = document.getElementsByTagName("body")[0];
    DOM.removeChilds(body);

    shapegroups_data.dom_head = DOM.cdiv_fade(body, null, "head");
        div = DOM.cdiv(shapegroups_data.dom_head, null, "headleft");
            DOM.cimg(div, staticurl + "/static/img/icon.png", null, "titleicon");
            DOM.cdiv(div, null, "headtext", shapegroups_data.name);
        
        div = DOM.cdiv(shapegroups_data.dom_head, null, "headright");
            i = DOM.cimg(div, staticurl + "/static/img/home_b.png", null, "button button-menu", null, () => {
                window.location.href = "/";
            });
            set_node_infobox(i, "Home");
    shapegroups_data.dom_content = DOM.cdiv_fade(body, null, "content");
        div = DOM.cdiv(shapegroups_data.dom_content, null, "newdiagram");
            i = DOM.cimg(div, staticurl + "/static/img/element_b.png", "newshapegroup", "iconbutton button", null, () => {
                screen_create_new();
            });
            set_node_infobox(i, "Create New Shape Group");
            DOM.cdiv(div, null, "iconbuttontext", "New Shape Group");

        shapegroups_data.dom_shapegroups = DOM.cdiv(shapegroups_data.dom_content, null, "diagramlist");
}

function screen_init_shapegroups() {
    DOM.removeChilds(shapegroups_data.dom_shapegroups, true);

    for(let key in shapegroups_data.shapegroups) if(shapegroups_data.shapegroups[key].am_i_owner) {
        let element = shapegroups_data.shapegroups[key];
        let div = DOM.cdiv(shapegroups_data.dom_shapegroups, null, "diagram");
        let i = DOM.cdiv(div, null, "diagram_name", element.name + " (" + DOM.esc(element.category) + ")");
        set_node_infobox(i, element.description + "<br>Owner: " + element.owner);
        i.setAttribute("data-key", key);
        i.addEventListener("click", (e) => {
            window.location.href = "/shapegroups/edit/" + e.currentTarget.getAttribute("data-key");
        })

        let dom_actions = DOM.cdiv(div, null, "diagram_actions");
            // Delete button
            let dom_delete = DOM.cdiv(dom_actions, null, "diagram_button");
            set_node_infobox(dom_delete, "Delete Shape Group");
                DOM.cimg(dom_delete, staticurl + "/static/img/delete.png", null, "diagram_button_img");
            dom_delete.setAttribute("data-key", key);
            dom_delete.addEventListener("click", screen_delete);

            // Settings button
            let dom_settings = DOM.cdiv(dom_actions, null, "diagram_button");
            set_node_infobox(dom_settings, "Settings Shape Group");
                DOM.cimg(dom_settings, staticurl + "/static/img/settings.png", null, "diagram_button_img");
            dom_settings.setAttribute("data-key", key);
            dom_settings.addEventListener("click", screen_settings);

    }
}

function screen_settings() {
    let div, body, t, tr, td;
    let key = this.getAttribute("data-key");
    let shapegroup = shapegroups_data.shapegroups[key];

    let category_options = [];
    for(let x = 0; x < SHAPEGROUP_CATEGORIES.length; x++)
        category_options.push([SHAPEGROUP_CATEGORIES[x], SHAPEGROUP_CATEGORIES[x]]);

    div = add_message_box("Settings Shape Group");
    t = DOM.ctable(div, null, "t_center");
        tr = DOM.ctr(t);
            td = DOM.ctd(tr, null, null, "Name");
            td = DOM.ctd(tr);
            shapegroups_data.dom_name = DOM.ci_text(td, null, "input");
            shapegroups_data.dom_name.style.width = "230px";
            shapegroups_data.dom_name.value = shapegroup.name;
        tr = DOM.ctr(t);
            td = DOM.ctd(tr, null, null, "Description");
            td = DOM.ctd(tr);
            shapegroups_data.dom_description = DOM.ci_text(td, null, "input");
            shapegroups_data.dom_description.style.width = "230px";
            shapegroups_data.dom_description.value = shapegroup.description;
        tr = DOM.ctr(t);
            td = DOM.ctd(tr, null, null, "Category");
            td = DOM.ctd(tr);
            shapegroups_data.dom_category = DOM.cselect(td, null, "input", category_options);
            shapegroups_data.dom_category.style.width = "230px";
            shapegroups_data.dom_category.value = shapegroup.category;
        tr = DOM.ctr(t);
            td = DOM.ctd(tr);
                DOM.cbutton(td, null, "button", "Update", {key: key}, update_shape_group);
                DOM.cbutton(td, null, "button", "Cancel", null, () => {
                    delete_message_box();
                });

            td.colSpan = "2";
}

function update_shape_group(ev, data) {
    let key = data.key;
    let name = shapegroups_data.dom_name.value;
    let description = shapegroups_data.dom_description.value;
    let category = shapegroups_data.dom_category.value;

    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/shapegroups/update", true);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.send(JSON.stringify({
        "id": key,
        "name": name,
        "description": description,
        "category": category,
    }));
    xmlhttp.onreadystatechange = () => {
        if(xmlhttp.readyState == 4) {
            if(xmlhttp.status == 200) {
                let data = JSON.parse(xmlhttp.responseText);
                if("error" in data) {
                    DOM.showError("Error", data.error);
                }
                else {
                    delete_message_box();
                    shapegroups_data.shapegroups[key].name = name;
                    shapegroups_data.shapegroups[key].description = description;
                    shapegroups_data.shapegroups[key].category = category;
                    screen_init_shapegroups();
                }
            }
            else {
                DOM.showError("Connection Error", "There was an error sending the request: " + xmlhttp.status);
            }
        }
    };
}

function screen_create_new() {
    let div, t, tr, td;

    let category_options = [];
    for(let x = 0; x < SHAPEGROUP_CATEGORIES.length; x++)
        category_options.push([SHAPEGROUP_CATEGORIES[x], SHAPEGROUP_CATEGORIES[x]]);

    div = add_message_box("New Shape Group");
    t = DOM.ctable(div, null, "t_center");
        tr = DOM.ctr(t);
            td = DOM.ctd(tr, null, null, "Name");
            td = DOM.ctd(tr);
            shapegroups_data.dom_name = DOM.ci_text(td, null, "input");
            shapegroups_data.dom_name.style.width = "230px";
        tr = DOM.ctr(t);
            td = DOM.ctd(tr, null, null, "Description");
            td = DOM.ctd(tr);
            shapegroups_data.dom_description = DOM.ci_text(td, null, "input");
            shapegroups_data.dom_description.style.width = "230px";
        tr = DOM.ctr(t);
            td = DOM.ctd(tr, null, null, "Category");
            td = DOM.ctd(tr);
            shapegroups_data.dom_category = DOM.cselect(td, null, "input", category_options);
            shapegroups_data.dom_category.style.width = "230px";

        tr = DOM.ctr(t);
            td = DOM.ctd(tr);
                DOM.cbutton(td, null, "button", "Create", null, create_shape_group);
                DOM.cbutton(td, null, "button", "Cancel", null, () => {
                    delete_message_box();
                });

            td.colSpan = "2";
}

function create_shape_group() {
    let name = shapegroups_data.dom_name.value;
    let description = shapegroups_data.dom_description.value;
    let category = shapegroups_data.dom_category.value;

    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/shapegroups/new", true);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.send(JSON.stringify({
        "name": name,
        "description": description,
        "category": category,
    }));
    xmlhttp.onreadystatechange = () => {
        if(xmlhttp.readyState == 4) {
            if(xmlhttp.status == 200) {
                let data = JSON.parse(xmlhttp.responseText);
                if("error" in data) {
                    DOM.showError("Error", data.error);
                }
                else {
                    delete_message_box();
                    shapegroups_data.shapegroups[data.key] = data.data;
                    shapegroups_data.shapegroups[data.key].am_i_owner = true;
                    screen_init_shapegroups();
                }
            }
            else {
                DOM.showError("Connection Error", "There was an error sending the request: " + xmlhttp.status);
            }
        }
    };
}

function screen_delete() {
    let div, body, t, tr, td, i, form;
    let key = this.getAttribute("data-key");
    
    div = add_message_box("Delete Shape Group")
        DOM.cdiv(div, null, "paragraph", "Are you sure you want to delete this shape group?")
        DOM.cdiv(div, null, "paragraph", "This action can't be undone")
        t = DOM.cdiv(div, null, "t_center");
            i = DOM.cbutton(t, null, "button", "Yes", null, () => {
                delete_shape_group(key);
            });
            i.setAttribute("data-key", key);
            DOM.cbutton(t, null, "button", "No", null, () => {
                delete_message_box();
            });
}

function delete_shape_group(key) {
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/shapegroups/delete", true);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.send(JSON.stringify({
        "id": key,
    }));
    xmlhttp.onreadystatechange = () => {
        if(xmlhttp.readyState == 4) {
            if(xmlhttp.status == 200) {
                let data = JSON.parse(xmlhttp.responseText);
                if("error" in data) {
                    DOM.showError("Error", data.error);
                }
                else {
                    delete_message_box();
                    delete shapegroups_data.shapegroups[key];
                    screen_init_shapegroups();
                }
            }
            else {
                DOM.showError("Connection Error", "There was an error sending the request: " + xmlhttp.status);
            }
        }
    };
}

function get_shapegroups() {
    let path = "/shapegroups/list";
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", path, true);
    xmlhttp.send();
    xmlhttp.onreadystatechange = () => {
        if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            let data = JSON.parse(xmlhttp.responseText);
            shapegroups_data.shapegroups = data;
            screen_init_shapegroups();
        }
    };  
}

function init() {
    screen_init();
    get_shapegroups();
}

function main() {
    init();
}