WIN_data = {
    l: [],
    zindex: 100,
    auto_inc: 1,
    mousedescription: null,
    constants: {
        transceiver_options: [
            ["Undefined", ""],
            ["400GBASE-CR8", "400GBASE-CR8"],
            ["400GBASE-2FR4", "400GBASE-2FR4"],
            ["400GBASE-FR4", "400GBASE-FR4"],
            ["400GBASE-XDR4", "400GBASE-XDR4"],
            ["400GBASE-DR4", "400GBASE-DR4"],
            ["400GBASE-SR8", "400GBASE-SR8"],
            ["400GBASE-AOC", "400GBASE-AOC"],
            ["100GBASE-CR4", "100GBASE-CR4"],
            ["100GBASE-ERL4", "100GBASE-ERL4"],
            ["100GBASE-LRL4", "100GBASE-LRL4"],
            ["100GBASE-LR4", "100GBASE-LR4"],
            ["100GBASE-CWDM4", "100GBASE-CWDM4"],
            ["100GBASE-PSM4", "100GBASE-PSM4"],
            ["100GBASE-BIDI", "100GBASE-BIDI"],
            ["100GBASE-SWDM4", "100GBASE-SWDM4"],
            ["100GBASE-XSR4", "100GBASE-XSR4"],
            ["100GBASE-SR4", "100GBASE-SR4"],
            ["100GBASE-AOC", "100GBASE-AOC"],
            ["40GBASE-CR4", "40GBASE-CR4"],
            ["40GBASE-AOC", "40GBASE-AOC"],
            ["40GBASE-ER4", "40GBASE-ER4"],
            ["40GBASE-PLRL4", "40GBASE-PLRL4"],
            ["40GBASE-PLR4", "40GBASE-PLR4"],
            ["40GBASE-LRL4", "40GBASE-LRL4"],
            ["40GBASE-LR4", "40GBASE-LR4"],
            ["40GBASE-UNIV", "40GBASE-UNIV"],
            ["40GBASE-BIDI", "40GBASE-BIDI"],
            ["40GBASE-XSR4", "40GBASE-XSR4"],
            ["40GBASE-SR4", "40GBASE-SR4"],
            ["25GBASE-CR", "25GBASE-CR"],
            ["25GBASE-AOC", "25GBASE-AOC"],
            ["25GBASE-LR", "25GBASE-LR"],
            ["25GBASE-SR", "25GBASE-SR"],
            ["10GBASE-SR", "10GBASE-SR"],
            ["10GBASE-CR", "10GBASE-SR"],
            ["10GBASE-LR", "10GBASE-LR"],
            ["10GBASE-ER", "10GBASE-ER"],
            ["10GBASE-ZR", "10GBASE-ZR"],
            ["10GBASE-DWDM", "10GBASE-DWDM"],
            ["10GBASE-AOC", "10GBASE-AOC"],
            ["10GBASE-T", "10GBASE-T"],
            ["1000BASE-T", "1000BASE-T"],
            ["1000BASE-SX", "1000BASE-SX"],
            ["1000BASE-LX", "1000BASE-LX"],
            ["10BASE-T", "10BASE-T"],
            ["100BASE-T", "100BASE-T"],
        ],
        bgp_afisafi_choices: [
            ["ipv4/unicast", "ipv4/unicast"],
            ["ipv4/multicast", "ipv4/multicast"],
            ["ipv4/l3vpn", "ipv4/l3vpn"], 
            ["ipv4/l3vpn-multicast", "ipv4/l3vpn-multicast"],
            ["ipv4/labeled", "ipv4/labeled"],
            ["ipv6/unicast", "ipv6/unicast"],
            ["ipv6/multicast", "ipv6/multicast"],
            ["ipv6/l3vpn", "ipv6/l3vpn"],
            ["ipv6/l3vpn-multicast", "ipv6/l3vpn-multicast"],
            ["ipv6/labeled", "ipv6/labeled"],
            ["l2vpn/vpls", "l2vpn/vpls"],
            ["evpn", "evpn"],
        ],
        iffunctionchoices: [
            ["Not Defined", "radio_if_notdef.png", "none"],
            ["Access/Trunk", "radio_if_l2.png", "switching"],
            ["Layer 3", "radio_if_l3.png", "routing"],
        ],
        floor_subtype_choices: [
            ["No Border", "radio_base_st_n.png", "n"],
            ["Ground", "radio_base_st_g.png", "g"],
            ["Platform", "radio_base_st_p.png", "p"],
            ["Floating Platform", "radio_base_st_f.png", "f"],
        ],
        textalign_choices: [
            ["Left", "text_alignleft.png", "l"],
            ["Right", "text_alignright.png", "r"],
            ["Center", "text_aligncenter.png", "c"],
        ],
        textbackground_choices: [
            ["No Background", "text_bg_none.png", "n"],
            ["Rectangle", "text_bg_rect.png", "r"],
            ["Circle", "text_bg_circ.png", "c"],
            ["Rhombus", "text_bg_rho.png", "h"],
            ["Parallelogram", "text_bg_para.png", "p"],
        ],
        arrowheadtype_choices: [
            ["No Head", "radio_arrow_nohead.png", "n"],
            ["Flat", "radio_arrow_flat.png", "f"],
            ["V Shape", "radio_arrow_v.png", "v"],
            ["V Inv", "radio_arrow_i.png", "i"],
            ["Point", "radio_arrow_point.png", "p"],
            ["Round", "radio_arrow_round.png", "r"],
            ["Square", "radio_arrow_square.png", "s"],
        ],
        arrowshafttype_choices: [
            ["Round", "radio_shaft_round.png", "r"],
            ["Square", "radio_shaft_square.png", "s"],
        ],
        infobox_type_choices_network: [
            ["L2/L3 Info", "radio_infobox_l2l3.png", "l"],
            ["Data", "radio_infobox_data.png", "d"],
        ],
        infobox_type_choices: [
            ["Data", "radio_infobox_data.png", "d"],
        ],
    }
}

function WIN_initialize() {
    Input_registerclass("win_h", null, null, WIN_mm);
    Input_registerclass("color_grab", null, null, WIN_Color_mm);
    Input_registerclass("color_bar", null, null, WIN_Color_mm);
    Input_registerclass("slider_grab", null, null, WIN_Slider_mm);
    Input_registerclass("slider_bar", null, null, WIN_Slider_mm);
}

function WIN_get_next_autoinc() {
    let n = WIN_data.auto_inc;
    WIN_data.auto_inc++;

    return n;
}

function WIN_addMouseDescription(px, py, text) {
    if(WIN_data.mousedescription != null)
        DOM.removeElement(WIN_data.mousedescription);
    WIN_data.mousedescription = DOM.c(document.body, "div", null, "win_description", text);
    DOM.setElementPos(WIN_data.mousedescription, px, py);
    DOM.fadeInElement(WIN_data.mousedescription);
}

function WIN_removeMouseDescription() {
    if(WIN_data.mousedescription != null) {
        DOM.removeElement(WIN_data.mousedescription);
        WIN_data.mousedescription = null;
    }
}

function WIN_addBasicMouseDescriptionActions(element, text) {
    let num_lines = 1;
    for(let x = 0; x < text.length; x++)
        if(text[x] === "\n")
            num_lines++;

    element.addEventListener("mouseover", (ev) => {
        let ypos = ev.pageY-20*num_lines;
        let xpos = ev.pageX;
        if(xpos > (window.innerWidth-100))
            xpos = xpos-100;
        if(ypos < 50)
            ypos = ev.pageY+20
        WIN_addMouseDescription(xpos, ypos, text.replace(/\n/g, "<br>"));
    })
    element.addEventListener("mouseout", (ev) => {
        WIN_removeMouseDescription();
    })
}

function WIN_mm(x, y, diffx, diffy, dom_element) {
    let parent = dom_element.parentNode;
    let py = parseInt(parent.style.top);
    let px = parseInt(parent.style.left);
    px += diffx;
    py += diffy;
    parent.style.top = "" + py + "px";
    parent.style.left = "" + px + "px";
}

function WIN_Color_mm(x, y, diffx, diffy, dom_element) {
    if(dom_element.className.indexOf("color_bar_r") != -1) {
        dom_element = DOM.findChildrenWithClass(dom_element.parentNode, "color_r")[0];
    }
    if(dom_element.className.indexOf("color_bar_g") != -1) {
        dom_element = DOM.findChildrenWithClass(dom_element.parentNode, "color_g")[0];
    }
    if(dom_element.className.indexOf("color_bar_b") != -1) {
        dom_element = DOM.findChildrenWithClass(dom_element.parentNode, "color_b")[0];
    }
    let bar = null;
    if(dom_element.className.indexOf("color_r") != -1) {
        bar = DOM.findChildrenWithClass(dom_element.parentNode, "color_bar_r")[0];
    }
    if(dom_element.className.indexOf("color_g") != -1) {
        bar = DOM.findChildrenWithClass(dom_element.parentNode, "color_bar_g")[0];
    }
    if(dom_element.className.indexOf("color_b") != -1) {
        bar = DOM.findChildrenWithClass(dom_element.parentNode, "color_bar_b")[0];
    }
    let bar_rect = bar.getBoundingClientRect();
    let pos = x - bar_rect.left;
    if(pos < 0)
        pos = 0;
    if(pos > 127)
        pos = 127;
    dom_element.style.left = "" + pos + "px";

    let cr = parseInt(DOM.findChildrenWithClass(dom_element.parentNode, "color_r")[0].style.left)*2;
    let cg = parseInt(DOM.findChildrenWithClass(dom_element.parentNode, "color_g")[0].style.left)*2;
    let cb = parseInt(DOM.findChildrenWithClass(dom_element.parentNode, "color_b")[0].style.left)*2;
    
    let value = (cr << 16) | (cg << 8) | cb;
    let HTMLcolor = value.toString(16);
    HTMLcolor = "#000000".substring(0,7 - HTMLcolor.length) + HTMLcolor;

    DOM.findChildrenWithClass(dom_element.parentNode, "colorbox")[0].style.backgroundColor = HTMLcolor;
    DOM.findChildrenWithClass(dom_element.parentNode, "color_value")[0].value = value;

    if ("createEvent" in document) {
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("change", false, true);
        DOM.findChildrenWithClass(dom_element.parentNode, "color_value")[0].dispatchEvent(evt);
    }
    else
        DOM.findChildrenWithClass(dom_element.parentNode, "color_value")[0].fireEvent("onchange");
}

function WIN_Slider_mm(x, y, diffx, diffy, dom_element) {
    let bar = DOM.findChildrenWithClass(dom_element.parentNode, "slider_bar")[0];
    let grab = DOM.findChildrenWithClass(dom_element.parentNode, "slider_grab")[0];
    let i = DOM.findChildrenWithClass(dom_element.parentNode, "slider_value")[0];
    let bar_rect = bar.getBoundingClientRect();

    let low = parseFloat(grab.getAttribute("data-low"));
    let high = parseFloat(grab.getAttribute("data-high"));
    let step = parseFloat(grab.getAttribute("data-step"));
    let width = parseInt(grab.getAttribute("data-width"));

    let pos = x - bar_rect.left;
    if(pos < 0)
        pos = 0;
    if(pos > width)
        pos = width;
    let numpoints = ((high-low))/step;
    let widthpoints = width/numpoints;
    let value = low + Math.round(pos/widthpoints) * step;

    grab.style.left = "" + (value-low)/(high-low)*width + "px";
    
    i.value = value;
    if ("createEvent" in document) {
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("change", false, true);
        i.dispatchEvent(evt);
    }
    else
        i.fireEvent("onchange");
}

function WIN_input_nopropagate(event) {
    if (((event.target instanceof HTMLInputElement) && (event.target.type === "text")) || (event.target instanceof HTMLTextAreaElement))
        event.stopPropagation();
}

function WIN_destroy(view, type, obj_id) {
    let id = view + "_" + type + "_" + obj_id;

    for(let x = 0; x < WIN_data.l.length; x++) {
        if(WIN_data.l[x].id == id) {
            DOM.removeElement(WIN_data.l[x].w);
            WIN_data.l.splice(x,1);
            return true;
        }
    }

    return false;
}

function WIN_create(view, type, obj_id, title, width, height) {
    let id = view + "_" + type + "_" + obj_id;

    // Check if the id already exists
    for(let x = 0; x < WIN_data.l.length; x++) {
        if(WIN_data.l[x].id == id)
            return null;
    }

    let b = document.body;
    let w = DOM.cdiv(b, null, "win");

    w.style.zIndex = WIN_data.zindex++;
    w.style.top = "10px";
    w.style.left = "10px";
    w.style.width = "" + width + "px";
    w.style.height = "" + height + "px";
    w.setAttribute("data-id", id);

    DOM.cdiv(w, null, "win_h", title);

    let c = DOM.cdiv(w, null, "win_c", "X");
    c.style.position = "absolute";
    c.style.top = "0px";
    c.style.right = "0px";
    c.style.cursor = "pointer";
    
    // Close window
    c.addEventListener("click", () => {
        DOM.removeElement(w);
        for(let x = 0; x < WIN_data.l.length; x++) {
            if(WIN_data.l[x].id == id) {
                WIN_data.l.splice(x,1);
            }
        }
    })

    w.addEventListener("click", () => {
        if(w.style.zIndex != (WIN_data.zindex-1))
            w.style.zIndex = WIN_data.zindex++;
    })

    let windata = {
        w: w,
        d: {},
        id: id,
        obj: {
            view: view,
            type: type,
            id: obj_id,
        }
    }

    WIN_data.l.push(windata);

    // Overide keypress to prevent change action when editing properties
    w.addEventListener("keypress", WIN_input_nopropagate);
    w.addEventListener("mousedown", WIN_input_nopropagate);
    w.addEventListener("mouseup", WIN_input_nopropagate);
    w.addEventListener("mousemove", WIN_input_nopropagate);
    w.addEventListener("mouseout", WIN_input_nopropagate);
    w.addEventListener("wheel", (ev) => { event.stopPropagation(); });
    w.addEventListener("touchstart", WIN_input_nopropagate);
    w.addEventListener("touchend", WIN_input_nopropagate);
    w.addEventListener("touchmove", WIN_input_nopropagate);
    w.addEventListener("touchenter", WIN_input_nopropagate);
    w.addEventListener("touchleave", WIN_input_nopropagate);
    w.addEventListener("touchcancel", WIN_input_nopropagate);
    w.addEventListener("contextmenu", WIN_input_nopropagate);

    return windata;
}

function WIN_addSection(win, px, py) {
    let d = DOM.cdiv(win);
    DOM.setElementPos(d, px, py);

    return d;
}

function WIN_addLabel(win, px, py, label, width) {
    let l = DOM.cdiv(win, null, "win_label", label);
    DOM.setElementPos(l, px, py);
    if(width) {
        l.style.width = "" + width + "px";
        l.style.overflow = "hidden";
        l.style.height = "15px";
    }

    return l;
}

function WIN_addText(win, px, py, label, width) {
    let l = DOM.cdiv(win, null, null, label);
    DOM.setElementPos(l, px, py);
    if(width)
        l.style.width = "" + width + "px";

    return l;
}

function WIN_addTextInput(win, lpx, lpy, px, py, label, value, description) {
    WIN_addLabel(win, lpx, lpy, label)

    let i = DOM.ci_text(win);
    DOM.setElementPos(i, px, py);
    i.value = value;

    if(description) {
        WIN_addBasicMouseDescriptionActions(i, description);
    }

    return i;
}

function WIN_addTextArea(win, lpx, lpy, px, py, sx, sy, label, value) {
    WIN_addLabel(win, lpx, lpy, label)

    let i = DOM.ci_ta(win);
    DOM.setElementPos(i, px, py);
    DOM.setElementSize(i, sx, sy);
    i.value = value;

    return i;
}

function WIN_addCheckBoxInput(win, lpx, lpy, px, py, label, checked) {
    WIN_addLabel(win, lpx, lpy, label)

    let i = DOM.ci_checkbox(win);
    DOM.setElementPos(i, px, py);
    i.checked = checked;

    return i;
}

function WIN_addColorInput(win, px, py, label, value) {
    let r = value >> 16;
    let g = (value >> 8) & 0xFF;
    let b = value & 0xFF;

    WIN_addLabel(win, px, py, label)

    let container = DOM.cdiv(win);
    DOM.setElementPos(container, px, py);
    
    let rbar = DOM.cdiv(container, null, "color_bar color_bar_r");
    DOM.setElementPos(rbar, 2, 15);
    rbar.style.backgroundColor = "#FF8888";
    let rgrab = DOM.cdiv(container, null, "color_grab color_r");
    DOM.setElementPos(rgrab, r*.5, 13);

    let gbar = DOM.cdiv(container, null, "color_bar color_bar_g");
    DOM.setElementPos(gbar, 2, 35);
    gbar.style.backgroundColor = "#88FF88";
    let ggrab = DOM.cdiv(container, null, "color_grab color_g");
    DOM.setElementPos(ggrab, g*.5, 33);
    
    let bbar = DOM.cdiv(container, null, "color_bar color_bar_b");
    DOM.setElementPos(bbar, 2, 55);
    bbar.style.backgroundColor = "#8888FF";
    let bgrab = DOM.cdiv(container, null, "color_grab color_b");
    DOM.setElementPos(bgrab, b*.5, 53);

    let color = DOM.cdiv(container, null, "colorbox");
    DOM.setElementPos(color, 145, 15);
    let HTMLcolor = value.toString(16);
    HTMLcolor = "#000000".substring(0,7 - HTMLcolor.length) + HTMLcolor;
    color.style.backgroundColor = HTMLcolor;

    let i = DOM.ci_text(container, null, "color_value");
    DOM.setElementPos(i, 0, 0);
    i.value = value;
    i.style.display = "none";

    return i;
}

function WIN_addImgSelection_setImg(dom_element, img, options) {
    for(let i = 0; i < options.length; i++) {
        if(options[i][1] === dom_element.value) {
            if(options[i].length === 3)
                img.src = options[i][2]; // appserver + "/usertexture/" + dom_element.value + ".png";
            else
                img.src = staticurl + "/static/textures/" + dom_element.value + ".png";
            return;
        }
    }
}

function WIN_addImgSelection(win, px, py, label, value, options) {
    let o = []
    for(let x = 0; x < options.length; x++) {
        o.push([options[x],options[x]])
    }

    WIN_addLabel(win, px, py, label)

    let i = DOM.cselect(win, null, null, options);
    DOM.setElementPos(i, px + 2, py + 15);
    DOM.setElementSize(i, 130);
    i.value = value;

    let img = DOM.cimg(win, null, null, "win_imgselect");
    DOM.setElementPos(img, px + 140, py+5);
    WIN_addImgSelection_setImg(i, img, options);

    i.addEventListener("change", () => {
        WIN_addImgSelection_setImg(i, img, options);
        
    })
    return i;
}

function WIN_addSlider(win, px, py, width, label, value, low, high, step) {
    WIN_addLabel(win, px, py, label)

    let container = DOM.cdiv(win);
    DOM.setElementPos(container, px, py);

    let bar = DOM.cdiv(container, null, "slider_bar");
    bar.style.width = "" + width + "px";
    DOM.setElementPos(bar, 2, 17);

    let grab = DOM.cdiv(container, null, "slider_grab");
    DOM.setElementPos(grab, (value-low)/(high-low)*width, 13);
    grab.setAttribute("data-low", low);
    grab.setAttribute("data-high", high);
    grab.setAttribute("data-step", step);
    grab.setAttribute("data-width", width);

    let i = DOM.ci_text(container, null, "slider_value");
    DOM.setElementPos(i, width+10, 13);
    i.value = value;

    i.readOnly = true;

    return i;
}

function WIN_stringListRecalcValue(container) {
    let mclist = DOM.findChildrenWithClass(container, "stringlist_minic");
    let value_element = DOM.findChildrenWithClass(container, "stringlist_value")[0];

    let newvalue = []
    for(let x = 0; x < mclist.length; x++) {
        newvalue.push(DOM.findChildrenWithClass(mclist[x], "stringlist")[0].value);
    }

    value_element.value = newvalue.join(",");
}

function WIN_stringListDraw(container, checkstring) {
    let mclist = DOM.findChildrenWithClass(container, "stringlist_minic");
    for(let x = 0; x < mclist.length; x++) {
        DOM.removeElement(mclist[x]);
    }

    let value_element = DOM.findChildrenWithClass(container, "stringlist_value")[0];
    let value = value_element.value.split(",");
    let default_value = DOM.findChildrenWithClass(container, "stringlist_default")[0].value;

    for(let x = 0; x < value.length; x++) {
        let mc = DOM.cdiv(container, null, "stringlist_minic");
        DOM.setElementPos(mc, 4, 16 + x * 16);

        let inp = DOM.ci_text(mc, null, "stringlist");
        DOM.setElementPos(inp, 0, 0);
        inp.value = value[x];
        if(checkstring(inp.value))
            inp.style.backgroundColor = "#DDFFDD";
        else
            inp.style.backgroundColor = "#FFDDDD";

        inp.addEventListener("input", () => {
            if(checkstring(inp.value)) {
                inp.style.backgroundColor = "#DDFFDD";
                WIN_stringListRecalcValue(container);
            }
            else
                inp.style.backgroundColor = "#FFDDDD";

        })

        let add = DOM.cbutton(mc, null, "win_button stringlist_add_" + x, "+", null, () => {});
        DOM.setElementPos(add, 135, 0);
        add.setAttribute("data-index", x);
        add.addEventListener("click", () => {
            WIN_stringListRecalcValue(container);
            let index = parseInt(add.getAttribute("data-index")) + 1;
            let newvalue = value_element.value.split(",");
            if (newvalue.length == 8)
                return
            newvalue.splice(index, 0, default_value);
            value_element.value = newvalue.join(",");
            WIN_stringListDraw(container, checkstring);
        })
        let rem = DOM.cbutton(mc, null, "win_button stringlist_del_" + x, "-", null, () => {});
        DOM.setElementPos(rem, 160, 0);
        rem.setAttribute("data-index", x);
        rem.addEventListener("click", () => {
            DOM.removeElement(rem.parentNode, true);
            WIN_stringListRecalcValue(container);
            WIN_stringListDraw(container, checkstring);
        })
    }
}

function WIN_addStringList(win, px, py, label, value, default_value, help, checkstring) {
    let i, l;
    
    let container = DOM.cdiv(win);
    DOM.setElementPos(container, px, py);
    container.style.width = "200px";
    container.style.height = "80px";
    container.style.overflow = "auto";

    let value_element = DOM.ci_text(container, null, "stringlist_value");
    DOM.setElementPos(value_element, 0, 0);
    value_element.value = value.join();
    value_element.style.display = "none";

    let default_element = DOM.ci_text(container, null, "stringlist_default");
    DOM.setElementPos(default_element, 0, 0);
    default_element.value = default_value;
    default_element.style.display = "none";

    WIN_addLabel(win, px, py, label)

    l = DOM.cdiv(win, null, "win_help", help)
    DOM.setElementPos(l, px+200, py+16);

    WIN_stringListDraw(container, checkstring);

    return value_element;
}

function WIN_dictListRecalcValue(container) {
    let mclist = DOM.findChildrenWithClass(container, "dictlist_minic");
    let value_element = DOM.findChildrenWithClass(container, "dictlist_value")[0];

    let newvalue = []
    for(let x = 0; x < mclist.length; x++) {
        let new_entry = {}
        newvalue.push(new_entry);
        let dom_elements = DOM.findChildrenWithClass(mclist[x], "dictlist_value");
        for(let x = 0; x < dom_elements.length; x++) {
            let field = dom_elements[x].getAttribute("data-field");
            new_entry[field] = dom_elements[x].value;
        }
    }

    value_element.value = JSON.stringify(newvalue);
}

function WIN_dictListDraw(container, changelength_callback) {
    let mclist = DOM.findChildrenWithClass(container, "dictlist_minic");
    for(let x = 0; x < mclist.length; x++) {
        DOM.removeElement(mclist[x]);
    }

    let value_element = DOM.findChildrenWithClass(container, "dictlist_value")[0];
    let value = JSON.parse(value_element.value);
    let fields_element = DOM.findChildrenWithClass(container, "dictlist_fields")[0];
    let fields = JSON.parse(fields_element.value);
    let listfields = Object.keys(fields);

    if (value.length == 0) {
        let new_value = {};
        for(let field in fields)
            new_value[field] = "";
        value.push(new_value);
    }

    for(let x = 0; x < value.length; x++) {
        let mc = DOM.cdiv(container, null, "dictlist_minic");
        DOM.setElementPos(mc, 0, x * 20);

        let current_x = 0;
        
        for(let y = 0; y < listfields.length; y++) {
            let inp = null;
            if(fields[listfields[y]].options !== undefined)
                inp = DOM.cselect(mc, null, "dictlist_value", fields[listfields[y]].options)
            else
                inp = DOM.ci_text(mc, null, "dictlist_value");
            DOM.setElementPos(inp, current_x, 0);
            inp.value = value[x][listfields[y]];
            inp.setAttribute("data-field", listfields[y])
            inp.addEventListener("input", () => {
                WIN_dictListRecalcValue(container);
            })
            inp.style.width = "" + fields[listfields[y]].width + "px";

            if(fields[listfields[y]].description !== undefined) {
                WIN_addBasicMouseDescriptionActions(inp, fields[listfields[y]].description);
            }

            current_x += fields[listfields[y]].width + 10;
        }

        let add = DOM.cbutton(mc, null, "win_button dictlist_add_" + x, "+", null, () => {});
        DOM.setElementPos(add, current_x + 5, 0);
        add.setAttribute("data-index", x);
        add.addEventListener("click", () => {
            WIN_dictListRecalcValue(container);
            let index = parseInt(add.getAttribute("data-index")) + 1;
            let newvalue = JSON.parse(value_element.value);
            if (newvalue.length >= 256)
                return
            let newdata = {};
            for(let field in fields) newdata[field] = "";
            newvalue.splice(index, 0, newdata);
            value_element.value = JSON.stringify(newvalue);
            WIN_dictListDraw(container, changelength_callback);
            if(changelength_callback !== undefined)
                changelength_callback();

        })
        WIN_addBasicMouseDescriptionActions(add,"Add line below.");

        let rem = DOM.cbutton(mc, null, "win_button dictlist_del_" + x, "-", null, () => {});
        DOM.setElementPos(rem, current_x + 30, 0);
        rem.setAttribute("data-index", x);
        rem.addEventListener("click", () => {
            let index = parseInt(add.getAttribute("data-index"));
            let newvalue = JSON.parse(value_element.value);
            newvalue.splice(index, 1);
            value_element.value = JSON.stringify(newvalue);
            WIN_dictListDraw(container, changelength_callback);
            if(changelength_callback !== undefined)
                changelength_callback();
        })
        WIN_addBasicMouseDescriptionActions(rem, "Remove this line.");
    }
}

function WIN_addDictList(win, px, py, sx, sy, label, value, fields, changelength_callback) {
    let container = DOM.cdiv(win);
    DOM.setElementPos(container, px+10, py+32);
    container.style.width = "" + (sx-10) + "px";
    container.style.height = "" + (sy-32) + "px";
    container.style.overflow = "hidden auto";
    //container.style.border = "1px solid #aaa";

    let value_element = DOM.ci_text(container, null, "dictlist_value");
    DOM.setElementPos(value_element, 0, 0);
    value_element.value = JSON.stringify(value);
    value_element.style.display = "none";

    let fields_element = DOM.ci_text(container, null, "dictlist_fields");
    DOM.setElementPos(fields_element, 0, 0);
    fields_element.value = JSON.stringify(fields);
    fields_element.style.display = "none";

    // Add Labels
    WIN_addLabel(win, px, py, label)

    let current_x = 10;
    for(key in fields) {
        let l = DOM.cdiv(win, null, null, fields[key].name);
        DOM.setElementPos(l, px + current_x, py + 16);
        l.style.width = "" + fields[key].width + "px";
        l.style.height = "15px";
        l.style.overflow = "hidden";
        current_x += fields[key].width + 10;
    }

    WIN_dictListDraw(container, changelength_callback);

    return value_element;
}

function WIN_addSelectList(win, px, py, sx, sy, label, value, fields, description_field, select_callback) {
    let container = DOM.cdiv(win);
    DOM.setElementPos(container, px+10, py+16);
    container.style.width = "" + (sx-10) + "px";
    container.style.height = "" + (sy-16) + "px";
    container.style.overflow = "hidden auto";

    let value_element = DOM.ci_text(container, null, "dictlist_value");
    DOM.setElementPos(value_element, 0, 0);
    value_element.value = JSON.stringify(value);
    value_element.style.display = "none";

    let fields_element = DOM.ci_text(container, null, "dictlist_fields");
    DOM.setElementPos(fields_element, 0, 0);
    fields_element.value = JSON.stringify(fields);
    fields_element.style.display = "none";

    // Add Labels
    WIN_addLabel(win, px, py, label, sx)

    let listfields = Object.keys(fields);

    let mc = DOM.cdiv(container, null, "selectlist_headerc");
    DOM.setElementPos(mc, 0, 0);
    for(let key in fields) {
        let l = DOM.cdiv(mc, null, "selectlist_header", fields[key].name);
        l.style.width = "" + fields[key].width + "px";
    }

    let mc1 = DOM.cdiv(container, null, "selectlist_headerc");
    DOM.setElementPos(mc1, 0, 18);
    mc1.style.width = "" + (sx-14) + "px";
    mc1.style.height = "" + (sy-36) + "px";
    mc1.style.overflow = "hidden auto";
    mc1.style.border = "1px solid #888";

    let count = 0;
    for(let id in value) {
        mc = DOM.cdiv(mc1, null, "selectlist_minic");
        WIN_addBasicMouseDescriptionActions(mc, value[id][description_field]);
        mc.addEventListener("click", () => {
            select_callback(id);
        })
        DOM.setElementPos(mc, 0, count * 20);
        for(let y = 0; y < listfields.length; y++) {
            let d = DOM.cdiv(mc, null, "selectlist_value", value[id][listfields[y]]);
            d.style.width = "" + fields[listfields[y]].width + "px";
        }
        count++;
    }

    return value_element;
}

function WIN_addButton(win, px, py, label, callback, description) {
    let b = DOM.cbutton(win, null, "win_button", label, null, callback);
    DOM.setElementPos(b, px, py);

    if(description) {
        WIN_addBasicMouseDescriptionActions(b, description);
    }

    return b;
}

function WIN_addSelect(win, px, py, label, options, value, description) {
    WIN_addLabel(win, px, py, label)

    let i = DOM.cselect(win, null, null, options);
    DOM.setElementPos(i, px, py+16);
    i.value = value;

    if(description) {
        WIN_addBasicMouseDescriptionActions(i, description);
    }

    return i;
} 

function WIN_updateSelectOptions(select, options, value) {
    DOM.cselect_options(select, options);
    select.value = options[0][1];
    for(let x = 0; x < options.length; x++)
        if(value === options[x][1])
            select.value = options[x][1];
}

function WIN_addMultiSelect(win, px, py, sx, sy, label, options, value) {
    WIN_addLabel(win, px, py, label)

    let i = DOM.cselect(win, null, null, options);
    DOM.setElementPos(i, px, py+16);
    i.value = value;
    i.multiple = true;
    i.style.width = "" + sx + "px";
    i.style.height = "" + sy + "px";
    i.addEventListener("mouseover", (ev) => {
        if(WIN_data.mousedescription == null) {
            WIN_addMouseDescription(ev.pageX, ev.pageY-40, "Use CTRL to select multiple.");
            setTimeout(() => {WIN_removeMouseDescription()},
                2000);
        }
    });
    return i;
} 

function WIN_addRadioImgInput(win, px, py, label, choices, value, onchange_callback) {
    WIN_addLabel(win, px, py, label);

    let container = DOM.cdiv(win);
    DOM.setElementPos(container, px, py+16);

    let value_element = DOM.ci_text(win, null, "radio_value");
    DOM.setElementPos(value_element, px, py);
    value_element.value = value;
    value_element.style.display = "none";

    let autoinc = WIN_get_next_autoinc();

    for(let x = 0; x < choices.length; x++) {
        let img = DOM.cimg(container, staticurl + "/static/img/" + choices[x][1], null, "win_imgradio", null, (ev) => {
            value_element.value = choices[x][2];
            for(let z = 0; z < ev.target.parentNode.children.length; z++) {
                ev.target.parentNode.children[z].className = "win_imgradio";
            }
            ev.target.parentNode.children[x].className = "win_imgradio_selected";
            if(onchange_callback != null)
                onchange_callback(choices[x][2]);
        });
        DOM.setElementPos(img, 48*x, 0);

        WIN_addBasicMouseDescriptionActions(img, choices[x][0]);
        if(choices[x][2] === value) {
            img.className = "win_imgradio_selected";
        }
    }

    return value_element;
}

function WIN_showGlobalSettingsWindow(gs, callbacks) {
    let wdata = WIN_create("global", "settings", "0", "Global Settings", 360, 230);
    if(!wdata)
        return;
    let w = wdata.w;

    // Checkbox to show hide name of devices
    wdata.d.show_device_name = WIN_addCheckBoxInput(w, 40, 30, 20, 30, "Show Device Names", gs.show_device_name);
    wdata.d.show_device_name.addEventListener("change", () => {callbacks.show_device_name(wdata.d.show_device_name.checked)} );

    // Checkbox to cast shadows
    wdata.d.cast_shadow = WIN_addCheckBoxInput(w, 240, 30, 220, 30, "Cast Shadow", gs.cast_shadow);
    wdata.d.cast_shadow.addEventListener("change", () => {callbacks.cast_shadow(wdata.d.cast_shadow.checked)} );

    // Checkbox to activate grid
    wdata.d.grid_active = WIN_addCheckBoxInput(w, 40, 60, 20, 60, "Align to Grid", gs.grid.active);
    wdata.d.grid_x = WIN_addSlider(w, 20, 80, 100, "Grid Size X", gs.grid.x, .05, 1, .05);
    wdata.d.grid_y = WIN_addSlider(w, 20, 110, 100, "Grid Size Y", gs.grid.y, .05, 1, .05);
    wdata.d.grid_z = WIN_addSlider(w, 20, 140, 100, "Grid Size Z", gs.grid.z, .05, 1, .05);
    wdata.d.grid_angle = WIN_addSlider(w, 180, 80, 100, "Grid Angle", gs.grid.angle, 5, 45, 5);
    wdata.d.grid_resize = WIN_addSlider(w, 180, 110, 100, "Grid Resize", gs.grid.resize, .1, .25, .05);
    wdata.d.grid_active.addEventListener("change", () => {
        callbacks.grid_change(wdata.d.grid_active.checked, wdata.d.grid_x.value, wdata.d.grid_y.value, wdata.d.grid_z.value, wdata.d.grid_angle.value, wdata.d.grid_resize.value)
    });
    wdata.d.grid_x.addEventListener("change", () => {
        callbacks.grid_change(wdata.d.grid_active.checked, wdata.d.grid_x.value, wdata.d.grid_y.value, wdata.d.grid_z.value, wdata.d.grid_angle.value, wdata.d.grid_resize.value)
    });
    wdata.d.grid_z.addEventListener("change", () => {
        callbacks.grid_change(wdata.d.grid_active.checked, wdata.d.grid_x.value, wdata.d.grid_y.value, wdata.d.grid_z.value, wdata.d.grid_angle.value, wdata.d.grid_resize.value)
    });
    wdata.d.grid_y.addEventListener("change", () => {
        callbacks.grid_change(wdata.d.grid_active.checked, wdata.d.grid_x.value, wdata.d.grid_y.value, wdata.d.grid_z.value, wdata.d.grid_angle.value, wdata.d.grid_resize.value)
    });
    wdata.d.grid_angle.addEventListener("change", () => {
        callbacks.grid_change(wdata.d.grid_active.checked, wdata.d.grid_x.value, wdata.d.grid_y.value, wdata.d.grid_z.value, wdata.d.grid_angle.value, wdata.d.grid_resize.value)
    });
    wdata.d.grid_resize.addEventListener("change", () => {
        callbacks.grid_change(wdata.d.grid_active.checked, wdata.d.grid_x.value, wdata.d.grid_y.value, wdata.d.grid_z.value, wdata.d.grid_angle.value, wdata.d.grid_resize.value)
    });

    // On mouse over, highlight levels
    wdata.d.highlight_depth = WIN_addSlider(w, 20, 190, 100, "On MO, highlight depth", gs.highlight_depth, 1, 4, .5);    
    wdata.d.highlight_depth.addEventListener("change", () => {
        callbacks.highlight_depth(wdata.d.highlight_depth.value);
    });
}

function WIN_showBaseElementWindow(view, type, id, e, user_textures, callback) {
    let wdata = WIN_create(view, type, id, e.name, 460, 350);
    if(!wdata)
        return;
    let w = wdata.w;

    // Name
    wdata.d.name = WIN_addTextInput(w, 200, 20, 160, 35, "Name", e.name);

    // Type
    wdata.d.subtype = WIN_addRadioImgInput(w, 20, 60, "Floor Subtype", WIN_data.constants.floor_subtype_choices, (e.subtype !== undefined) ? e.subtype : "g", null);

    // Level (sy)
    wdata.d.sy = WIN_addSlider(w, 250, 70, 100, "Level", e.sy, .5, 20, .5);

    // Color1
    wdata.d.color1 = WIN_addColorInput(w, 20, 120, "Color Floor", e.color1);

    // Color2
    wdata.d.color2 = WIN_addColorInput(w, 250, 120, "Color Border", e.color2);

    // Opacity
    wdata.d.opacity = WIN_addSlider(w, 20, 200, 100, "Opacity", (e.opacity) ? e.opacity : 1, .1, 1, .05);

    // Texture option
    let texture_options = [
        ["Grid", "b1_t1"],
        ["Grid2", "b1_t1-inv"],
        ["Grid3", "b1_t1-trans"],
        ["Grid4", "b1_t1-trans2"],
        ["Plain", "b1_t2"],
        ["Hexagon", "b1_t3"],
        ["Pavement", "b1_t4"],
        ["Wood", "b1_t5"],
        ["Metal", "b1_t6"],
        ["Grass", "b1_t7"],
        ["Sand", "b1_t8"],
        ["Water", "b1_t9"],
        ["Bricks", "b2_t1"], 
        ["Stones", "b2_t2"],
        ];

    for(let texture_id in user_textures) {
        texture_options.push([user_textures[texture_id].name, texture_id, appserver + "/usertexture/" + texture_id + ".png"]);
    }

    wdata.d.t1name = WIN_addImgSelection(w, 20, 240, "Floor Texture", (e.t1user) ? e.t1user : e.t1name, texture_options);
    wdata.d.t2name = WIN_addImgSelection(w, 20, 275, "Border Texture", (e.t2user) ? e.t2user : e.t2name, texture_options);

    // Floor Texture size
    wdata.d.tsx_i = WIN_addSlider(w, 250, 240, 100, "Texture U", (e.tsx === null) ? 0 : 1/e.tsx, 0, 10, .25);
    wdata.d.tsy_i = WIN_addSlider(w, 250, 275, 100, "Texture V", (e.tsy === null) ? 0 : 1/e.tsy, 0, 10, .25);

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 325, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showDeviceWindow(diagram_type, view, type, id, e, callback, check_ifnaming) {
    let wdata = WIN_create(view, type, id, e.name, 440, 340);
    if(!wdata)
        return;
    let w = wdata.w;

    // Name & description
    wdata.d.name = WIN_addTextArea(w, 200, 20, 110, 35, 210, 30, "Name", e.name);
    wdata.d.description = WIN_addTextArea(w, 180, 75, 20, 90, 395, 45, "Description", e.description);
    // wdata.d.name = WIN_addTextInput(w, 200, 20, 155, 35, "Name", e.name);

    // Color
    wdata.d.color1 = WIN_addColorInput(w, 20, 145, "Color 1", e.color1); 
    wdata.d.color2 = WIN_addColorInput(w, 230, 145, "Color 2", e.color2);    

    // List of interface naming
    if(diagram_type === "network") {
        wdata.d.ifnaming = WIN_addStringList(w, 20, 220, "Interface Naming", e.ifnaming, "Lo0",
            "Sample: Ethernet{1-32}/{1-4} will generate Ethernet1/1 to Ethernet 32/4", check_ifnaming);
    }

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 310, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");   
}

function WIN_showDeviceConfigWindow(diagram_type, view, type, id, e, callback) {
    if(diagram_type !== "network") {
        DOM.showError("Not available", "Config only applies to network diagrams.", false)
        return;
    }

    let vrf_options = [];
    for(let rd in e.vrfs) {
        vrf_options.push([e.vrfs[rd].name, rd])

    }
    let default_vrf = (vrf_options.length > 0) ? vrf_options[0][1] : "";    

    let wdata = WIN_create(view, type + "-config", id, e.name, 660, 320);
    if(!wdata)
        return;
    let w = wdata.w;

    let list_vlans = [];
    for(let vlan_tag in e.vlans) {
        list_vlans.push({tag: vlan_tag, name: e.vlans[vlan_tag].name})
    }

    let list_vrfs = [];
    for(let vrf_rd in e.vrfs) {
        list_vrfs.push({rd: vrf_rd, name: e.vrfs[vrf_rd].name})
    }

    let list_svis = [];
    for(let svi_tag in e.svis) {
        list_svis.push({
            tag: svi_tag, 
            name: e.svis[svi_tag].name, 
            vrf: (e.svis[svi_tag].vrf === undefined) ? default_vrf : e.svis[svi_tag].vrf,
        })
    }

    wdata.d.vlans = WIN_addDictList(w, 20, 20, 300, 120, "VLAN List", list_vlans, {
        "tag": { name: "Vlan Tag", width: 60, "description": "Vlan Tag (0-4095)."},
        "name": { name: "Vlan Name", width: 120, "description": "Name of the VLAN."}
    });

    wdata.d.vrfs = WIN_addDictList(w, 340, 20, 300, 120, "VRF List", list_vrfs, {
        "rd":   { name: "RD", width: 60,  "description": "Route Distinguisher. An unique ID for the vrf (e: 0:0)." },
        "name": { name: "VRF Name", width: 120, "description": "Name of the VRF." },
    });

    wdata.d.svis = WIN_addDictList(w, 20, 150, 620, 120, "SVI List", list_svis, {
        "tag":   { name: "Vlan Tag", width: 60, "description": "Vlan Tag (0-4095)." },
        "name": { name: "If Name", width: 120, "description": "Name of the Interface (e. Vlan100)." },
        "vrf": { name: "VRF", width: 80, "descripion": "VRF this interface belongs to.", options: vrf_options },
    });

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 280, 290, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");   
}

function WIN_showLinkWindow(view, type, id, e, callback) {
    let wdata = WIN_create(view, type, id, "Link", 440, 330);
    if(!wdata)
        return;
    let w = wdata.w;

    // Name & description
    wdata.d.name = WIN_addTextArea(w, 200, 20, 110, 35, 210, 30, "Name", e.name);
    wdata.d.description = WIN_addTextArea(w, 180, 75, 20, 90, 395, 45, "Description", e.description);

    // Type
    let options = [
        ["Line", "0"], 
        ["Square", "1"]
    ];
    wdata.d.type = WIN_addSelect(w, 20, 150, "Link Type", options, e.type);

    // Order
    options = [["XY", "XY"], ["XZ", "XZ"], ["YX", "YX"], ["YZ", "YZ"], ["ZX", "ZX"], ["ZY", "ZY"]];
    wdata.d.order = WIN_addSelect(w, 20, 190, "Square Order", options, e.order);

    // Color
    wdata.d.color = WIN_addColorInput(w, 230, 150, "Color", e.linedata.color);

    // Weight
    wdata.d.weight = WIN_addSlider(w, 20, 230, 100, "Width", e.linedata.weight, .025, .2, .0125);

    // Height
    wdata.d.height = WIN_addSlider(w, 230, 230, 100, "Height", e.linedata.height, 0, .5, .05);

    // Show direction
    wdata.d.show_direction = WIN_addCheckBoxInput(w, 40, 272, 18, 270, "Show Direction", e.linedata.show_direction);

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 300, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");   
}

function WIN_showLinkConfigWindow_lag(wdata) {
    if(JSON.parse(wdata.d.ifbindings.value).length > 1)
        wdata.d.lag_section.style.display = "block";
    else
        wdata.d.lag_section.style.display = "none";
}

function WIN_showLinkConfigWindow(diagram_type, id, e, dev1, dev2, resolve_ifnaming, callback, callback_dev) {
    if(diagram_type !== "network") {
        DOM.showError("Not available", "Config only applies to network diagrams.", false)
        return;
    }

    // First a bit of cleanup (if data of interfaces of a link is not defined)
    if(e.phy === undefined) {
        e.phy = {
                    "ifbindings": [],
                    "lag_name": ["Po0", "Po0"],
                    "lacp": true,
                    "transceiver": "",          
        }
    }
    if(e.phy.lacp === undefined)
        e.phy.lacp = true;
    if(e.phy.lag_name === undefined)
        e.phy.lag_name = ["Po0", "Po0"];

    for(let x = 0; x < e.devs.length; x++)
        if(e.devs[x].data === undefined)
            e.devs[x].data = {
                function: "none",
                function_data: {}               
            }

    // Create the window
    let dev1name = (dev1.name == "" ? "unnamed" : dev1.name);
    let dev2name = (dev2.name == "" ? "unnamed" : dev2.name);
    let wdata = WIN_create("L2", "link-config", id, `Link between '${dev1name}' and '${dev2name}'.`.substring(0,48), 360, 310);
    if(!wdata)
        return;
    let w = wdata.w;

    // Create the select of interfaces
    let dev_ifnames = [[["Unselected", ""]], [["Unselected", ""]]];
    let devs = [dev1, dev2]
    for(let z = 0; z < 2; z++) {
        for(let x = 0; x < devs[z].ifnaming.length; x++) {
            let names = resolve_ifnaming(devs[z].ifnaming[x]);
            for(let y = 0; y < names.length; y++)
                dev_ifnames[z].push([names[y], names[y]]);
        }       
    }

    // Optics
    wdata.d.transceiver = WIN_addSelect(w, 120, 30, "Optics", WIN_data.constants.transceiver_options, e.phy.transceiver);

    // Physical Interface bindings
    let ifbindingsdict = [];
    for(let x = 0; x < e.phy.ifbindings.length; x++)
        ifbindingsdict.push({dev1: e.phy.ifbindings[x][0], dev2: e.phy.ifbindings[x][1]})

    wdata.d.ifbindings = WIN_addDictList(w, 10, 70, 340, 80, "Interfaces", ifbindingsdict, {
        dev1: {name: dev1name, width: 120, options: dev_ifnames[0]},
        dev2: {name: dev2name, width: 120, options: dev_ifnames[1]},
    },
    () => {WIN_showLinkConfigWindow_lag(wdata)});

    wdata.d.lag_section = WIN_addSection(w, 10, 160);
    wdata.d.lag_name1 = WIN_addTextInput(wdata.d.lag_section, 0, 0, 0, 15, dev1name + " LAG Name", e.phy.lag_name[0]);
    wdata.d.lag_name2 = WIN_addTextInput(wdata.d.lag_section, 0, 40, 0, 55, dev2name + " LAG Name", e.phy.lag_name[1]);
    wdata.d.lacp = WIN_addSelect(wdata.d.lag_section, 240, 40, "LACP", [["Yes", "yes"], ["No", "no"]], (e.phy.lacp ? "yes" : "no"));

    WIN_showLinkConfigWindow_lag(wdata);

    wdata.d.dev1 = WIN_addButton(w, 20, 250, "Edit " + dev1name.substring(0,16), (ev) => {
        callback_dev(0);
        ev.stopPropagation();
    });     
    wdata.d.dev2 = WIN_addButton(w, -20, 250, "Edit " + dev2name.substring(0,16), (ev) => {
        callback_dev(1);
        ev.stopPropagation();
    });     

    wdata.d.apply = WIN_addButton(w, 160, 280, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");       
}

function WIN_showLinkConfigDeviceWindow_drawfunction(wdata, e, dev_index, dev) {
    DOM.removeChilds(wdata.d.section, true);

    if(wdata.d.function.value == "routing") {
        let vrf_options = [];
        for(let rd in dev.vrfs) {
            vrf_options.push([dev.vrfs[rd].name, rd])
        }

        let values = [];
        if("subinterfaces" in e.devs[dev_index].data.function_data) for(let x = 0; x < e.devs[dev_index].data.function_data.subinterfaces.length; x++) {
            let subif = e.devs[dev_index].data.function_data.subinterfaces[x];
            values.push({
                vlan_tag: subif.vlan_tag,
                vrf: subif.vrf,
            })
        }
        wdata.d.subinterfaces = WIN_addDictList(wdata.d.section, 20, 0, 200, 90, "Sub-Interfaces", values, {
            vlan_tag: {name: "VTag", width: 35, "description": "Vlan Tag for this subinterface. -1 if no tag."},
            vrf: {name: "VRF", width: 70, options: vrf_options, "description": "VRF of this interface. VRFs are defined on Device Configs."}
        })
    }

    if(wdata.d.function.value == "switching") {
        let vlan_options = [];
        for(let vlan_id in dev.vlans) {
            vlan_options.push([dev.vlans[vlan_id].name, vlan_id]);
        }

        let values = [];

        if(e.devs[dev_index].data.function_data.vlans !== undefined) {
            for(let x = 0; x < e.devs[dev_index].data.function_data.vlans.length; x++) {
                values.push({
                    vlan_id: e.devs[dev_index].data.function_data.vlans[x],
                    tagged: ( e.devs[dev_index].data.function_data.native_vlan == e.devs[dev_index].data.function_data.vlans[x] ? "no" : "yes"),
                })
            }
        }

        wdata.d.vlans = WIN_addDictList(wdata.d.section, 20, 0, 280, 90, "Vlan Members", values, {
            vlan_id: {name: "Vlan", width: 80, options: vlan_options},
            tagged: {name: "Tagged", width: 80, options: [["No", "no"], ["Yes", "yes"]]},
        })
    }
}

function WIN_showLinkConfigDeviceWindow(dev_index, link_id, e, dev, callback) {
    // First a bit of cleanup (if data is not defined)
    if(e.devs[dev_index].data.function_data === undefined) {
        e.devs[dev_index].data.function_data = {};
        e.devs[dev_index].data.function = "none";
    }

    // Create the window
    let devname = (dev.name == "" ? "unnamed" : dev.name);
    let wdata = WIN_create("L2", "link-dev-"+ dev_index, link_id, "Dev " + devname + " interface config.", 300, 230);
    if(!wdata)
        return;

    let w = wdata.w;

    wdata.d.function = WIN_addRadioImgInput(w, 100, 20, "Interface Type", WIN_data.constants.iffunctionchoices, e.devs[dev_index].data.function, () => {
        WIN_showLinkConfigDeviceWindow_drawfunction(wdata, e, dev_index, dev);
    });

    wdata.d.section = WIN_addSection(w, 10, 90);

    WIN_showLinkConfigDeviceWindow_drawfunction(wdata, e, dev_index, dev);

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 120, 200, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showInterfaceConfigWindow(id, e, callback) {
    // First a bit of cleanup (if data is not defined)
    if(e.ip === undefined)
        e.ip = {address: {ipv4: [], ipv6: []}};

    // Create the window
    let wdata = WIN_create("L3", "interface-config", id, "Interface Config", 490, 180);
    if(!wdata)
        return;
    let w = wdata.w;

    let list_ipv4 = [];
    let list_ipv6 = [];
    e.ip.address.ipv4.forEach((ip) => { list_ipv4.push({ipv4: ip }) });
    e.ip.address.ipv6.forEach((ip) => { list_ipv6.push({ipv6: ip }) });

    wdata.d.ipv4_address = WIN_addDictList(w, 20, 20, 210, 120, "IPv4", list_ipv4, {
        "ipv4": { name: "", width: 120, "description": "IPv4 (e. 10.0.0.1/24). Empty if none." },
    });
    wdata.d.ipv6_address = WIN_addDictList(w, 240, 20, 250, 120, "IPv6", list_ipv6, {
        "ipv6": { name: "", width: 160, "description": "IPv6 (e. 2a01::1/64). Empty if none." },
    });

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 210, 140, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showSVIInterfaceConfigWindow(id, e, callback) {
    // First a bit of cleanup (if data is not defined)
    if(e.ip === undefined)
        e.ip = {address: {ipv4: [], ipv6: []}};

    // Create the window
    let wdata = WIN_create("L3", "svi_interface-config", id, "SVI Interface Config", 490, 180);
    if(!wdata)
        return;
    let w = wdata.w;

    let list_ipv4 = [];
    let list_ipv6 = [];
    e.ip.address.ipv4.forEach((ip) => { list_ipv4.push({ipv4: ip }) });
    e.ip.address.ipv6.forEach((ip) => { list_ipv6.push({ipv6: ip }) });

    wdata.d.ipv4_address = WIN_addDictList(w, 20, 20, 210, 120, "IPv4", list_ipv4, {
        "ipv4": { name: "", width: 120, "description": "IPv4 (e. 10.0.0.1/24). Empty if none." },
    });
    wdata.d.ipv6_address = WIN_addDictList(w, 240, 20, 250, 120, "IPv6", list_ipv6, {
        "ipv6": { name: "", width: 160, "description": "IPv6 (e. 2a01::1/64). Empty if none." },
    });

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 210, 140, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showP2PInterfaceConfigWindow(id, e, vrf1, vrf2, callback) {
    // First a bit of cleanup (if data is not defined)
    if(e.ip === undefined)
        e.ip = [{address: {ipv4: [], ipv6: []}}, {address: {ipv4: [], ipv6: []}}];

    let vrf_name = [(vrf1.name === "") ? "vrf_1" : vrf1.name, (vrf2.name === "") ? "vrf_2" : vrf2.name];

    // Create the window
    let wdata = WIN_create("L3", "p2p_interface-config", id, "P2P Interface Config", 490, 320);
    if(!wdata)
        return;
    let w = wdata.w;

    for(let x = 0; x < 2; x++) {
        let list_ipv4 = [];
        let list_ipv6 = [];
        e.ip[x].address.ipv4.forEach((ip) => { list_ipv4.push({ipv4: ip }) });
        e.ip[x].address.ipv6.forEach((ip) => { list_ipv6.push({ipv6: ip }) });

        wdata.d["ipv4_address_"+x] = WIN_addDictList(w, 20, 20+120*x, 210, 120, vrf_name[x] + " IPv4", list_ipv4, {
            "ipv4": { name: "", width: 120, "description": "IPv4 (e. 10.0.0.1/24). Empty if none." },
        });
        wdata.d["ipv6_address_"+x] = WIN_addDictList(w, 240, 20+120*x, 250, 120, vrf_name[x] + " IPv6", list_ipv6, {
            "ipv6": { name: "", width: 160, "description": "IPv6 (e. 2a01::1/64). Empty if none." },
        });
    }

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 210, 280, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showTextWindow(view, type, id, e, callback) {
    let wdata = WIN_create(view, type, id, "Text " + id, 640, 330);
    if(!wdata)
        return;
    let w = wdata.w;

    // Text
    wdata.d.text = WIN_addTextArea(w, 20, 20, 20, 35, 200, 120, "Text", e.text);

    // Color
    wdata.d.color = WIN_addColorInput(w, 230, 20, "Color", e.color);

    // py
    wdata.d.py = WIN_addSlider(w, 20, 220, 100, "Height", e.py, 0, 5, .25);

    // Height
    wdata.d.height = WIN_addSlider(w, 20, 250, 100, "Size", e.height, .1, 2, .1);

    // Text align
    wdata.d.text_align = WIN_addRadioImgInput(w, 20, 165, "Text Align", WIN_data.constants.textalign_choices, (e.text_align) ? e.text_align : "l");

    // Background type
    wdata.d.bg_type = WIN_addRadioImgInput(w, 230, 95, "Background Shape", WIN_data.constants.textbackground_choices, (e.bg_type) ? e.bg_type : "n");

    // Background Color and show
    wdata.d.bg_color = WIN_addColorInput(w, 230, 150, "BG Color", (e.bg_color !== undefined) ? e.bg_color : 0xffffff);
    wdata.d.bg_show = WIN_addCheckBoxInput(w, 460, 170, 440, 170, "Show Background", (e.bg_show) ? e.bg_show : false);

    // Border Color
    wdata.d.border_color = WIN_addColorInput(w, 230, 220, "Border Color", (e.border_color !== undefined) ? e.border_color : 0x000000);
    wdata.d.border_show = WIN_addCheckBoxInput(w, 460, 190, 440, 190, "Show Border", (e.border_show) ? e.border_show : false);
    wdata.d.border_width = WIN_addSlider(w, 440, 210, 100, "Border Size", (e.border_width) ? e.border_width : .1, .05, .5, .05);
    wdata.d.bg_depth = WIN_addSlider(w, 440, 245, 100, "Background Depth", (e.bg_depth) ? e.bg_depth : .1, .1, 1, .1);
    wdata.d.rotation_x = WIN_addSlider(w, 440, 280, 100, "Rotation X", (e.rotation_x) ? e.rotation_x : 0, 0, 90, 15);

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 290, 310, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");   
}

function WIN_showSymbolWindow(view, type, id, e, callback) {
    let wdata = WIN_create(view, type, id, "Symbol " + id, 440, 140);
    if(!wdata)
        return;
    let w = wdata.w;

    // Color
    wdata.d.color = WIN_addColorInput(w, 20, 20, "Color Post", e.color);

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 110, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showSymbolFlagWindow(view, type, id, e, callback) {
    let wdata = WIN_create(view, type, id, "Flag " + id, 440, 140);
    if(!wdata)
        return;
    let w = wdata.w;

    // Color
    wdata.d.color = WIN_addColorInput(w, 20, 20, "Color Post", e.color);
    wdata.d.flagcolor = WIN_addColorInput(w, 230, 20, "Color Flag", e.cd.flagcolor);

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 110, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showSymbolArrowWindow(view, type, id, e, callback) {
    let wdata = WIN_create(view, type, id, "Arrow " + id, 540, 370);
    if(!wdata)
        return;
    let w = wdata.w;

    // Color
    wdata.d.color = WIN_addColorInput(w, 20, 20, "Color Shaft", e.color);
    wdata.d.head_color = WIN_addColorInput(w, 230, 20, "Color Head", e.cd.head_color);

    wdata.d.head_type = WIN_addRadioImgInput(w, 20, 100, "Head Type", WIN_data.constants.arrowheadtype_choices, e.cd.head_type);
    wdata.d.tail_type = WIN_addRadioImgInput(w, 20, 160, "Tail Type", WIN_data.constants.arrowheadtype_choices, e.cd.tail_type);
    wdata.d.shaft_type = WIN_addRadioImgInput(w, 360, 100, "Shaft Type", WIN_data.constants.arrowshafttype_choices, e.cd.shaft_type);

    wdata.d.sx = WIN_addSlider(w, 20, 220, 100, "Width", e.sx, .02, 1, .02);
    wdata.d.sz = WIN_addSlider(w, 190, 220, 100, "Depth", e.sz, .02, 1, .02);

    wdata.d.shaft_dots = WIN_addSlider(w, 360, 220, 100, "Num dots", e.cd.shaft_dots, 1, 10, 1);

    wdata.d.head_sx_per = WIN_addSlider(w, 20, 260, 100, "Head Width Percentage", e.cd.head_sx_per, 100, 800, 10);
    wdata.d.head_sz_per = WIN_addSlider(w, 190, 260, 100, "Head Depth Percentage", e.cd.head_sz_per, 100, 800, 10);
    wdata.d.head_sy_per = WIN_addSlider(w, 360, 260, 100, "Head Length Percentage", e.cd.head_sy_per, 1, 50, 1);
    wdata.d.tail_sx_per = WIN_addSlider(w, 20, 300, 100, "Tail Width Percentage", e.cd.tail_sx_per, 100, 800, 10);
    wdata.d.tail_sz_per = WIN_addSlider(w, 190, 300, 100, "Tail Depth Percentage", e.cd.tail_sz_per, 100, 800, 10);
    wdata.d.tail_sy_per = WIN_addSlider(w, 360, 300, 100, "Tail Length Percentage", e.cd.tail_sy_per, 1, 50, 1);
    
    // Button to apply
    wdata.d.apply = WIN_addButton(w, 230, 340, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");   
}

function WIN_showVrfWindow(id, e, callback) {
    let wdata = WIN_create("L3", "vrf", id, e.name, 440, 140);
    if(!wdata)
        return;
    let w = wdata.w;

    // Color
    wdata.d.color1 = WIN_addColorInput(w, 20, 20, "Color 1", e.color1); 
    wdata.d.color2 = WIN_addColorInput(w, 230, 20, "Color 2", e.color2);    

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 110, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showVrfConfigWindow(id, e, callback) {
    let wdata = WIN_create("L3", "vrf-config", id, e.name, 490, 210);
    if(!wdata)
        return;
    let w = wdata.w;

    let router_id = "", asn="", los = [];
    if("routing" in e) {
        if("asn" in e.routing) asn = (e.routing.asn === null) ? "" : e.routing.asn;
        if("router_id" in e.routing) router_id = (e.routing.router_id === null) ? "" : e.routing.router_id;
    }
    if("los" in e) {
        for(let lo_name in e.los) {
            los.push({
                name: lo_name, 
                ipv4: (e.los[lo_name].ipv4.length > 0) ? e.los[lo_name].ipv4[0] : "",
                ipv6: (e.los[lo_name].ipv6.length > 0) ? e.los[lo_name].ipv6[0] : "",
            })
        }
    }
    wdata.d.router_id = WIN_addTextInput(w, 20, 20, 100, 20, "Router ID", router_id, "4 byte router ID used on different routing protocols. Ej. 10.0.0.1");
    wdata.d.asn = WIN_addTextInput(w, 20, 40, 100, 40, "ASN", asn, "Autonomous System Number used on BGP. Can use plain or AsDot notation. Ej. 65000");

    let list_loopbacks = [];
    wdata.d.los = WIN_addDictList(w, 20, 60, 460, 90, "Loopback List", los, {
        "name": { name: "Name", width: 60, "description": "Loopback interface name."},
        "ipv4": { name: "IPv4", width: 100, "description": "IPv4 Address. Empty if none."},
        "ipv6": { name: "IPv6", width: 200, "description": "IPv6 Address. Empty if none."},
    });

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 180, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showL2SegmentWindow(id, e, callback) {
    let wdata = WIN_create("L3", "l2segment", id, e.name, 440, 140);
    if(!wdata)
        return;
    let w = wdata.w;

    // Color
    wdata.d.color1 = WIN_addColorInput(w, 20, 20, "Color 1", e.color1); 

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 110, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");   
}

function WIN_showBGPPeerWindow(id, e, callback) {
    let wdata = WIN_create("L3", "bgp_peering", id, "BGP Peering Settings", 440, 140);
    if(!wdata)
        return;
    let w = wdata.w;

    // Color
    wdata.d.color = WIN_addColorInput(w, 20, 20, "Color 1", e.color);

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 110, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showBGPPeerConfigWindow_updateip(wdata, vrf1_addresses, vrf2_addresses, vrf1_ip, vrf2_ip) {
    let address_selection;

    let transport = wdata.d.transport.value;

    // Update src ip
    if(transport === "ipv4") {
        address_selection = [["0.0.0.0", "0.0.0.0"]];
    }
    else {
        address_selection = [["::", "::"]];
    }
    for(let x = 0; x < vrf1_addresses[transport].length; x++) {
        address_selection.push([vrf1_addresses[transport][x], vrf1_addresses[transport][x].split("/")[0]]);
    }
    WIN_updateSelectOptions(wdata.d.src_ip, address_selection, vrf1_ip);

    // Update dst ip
    if(transport === "ipv4") {
        address_selection = [["0.0.0.0", "0.0.0.0"]];
    }
    else {
        address_selection = [["::", "::"]];
    }
    for(let x = 0; x < vrf2_addresses[transport].length; x++) {
        address_selection.push([vrf2_addresses[transport][x], vrf2_addresses[transport][x].split("/")[0]]);
    }
    WIN_updateSelectOptions(wdata.d.dst_ip, address_selection, vrf2_ip);
}

function WIN_showBGPPeerConfigWindow(id, e, vrf1, vrf2, vrf1_addresses, vrf2_addresses, callback) {
    let address_selection;
    let wdata = WIN_create("L3", "bgp_peering", id, "BGP Peering Config", 440, 240);
    if(!wdata)
        return;
    let w = wdata.w;

    // Transport
    wdata.d.transport = WIN_addSelect(w, 160, 20, "Transport AF", [["IPv4", "ipv4"], ["IPv6", "ipv6"]], e.transport, "What address family is used to peer with the neighbor.");
    wdata.d.transport.addEventListener("change", () => {
        WIN_showBGPPeerConfigWindow_updateip(wdata, vrf1_addresses, vrf2_addresses, e.src_ip, e.dst_ip);
    })
    // Address selection
    address_selection = [["0.0.0.0", "0.0.0.0"]];

    wdata.d.src_ip = WIN_addSelect(w, 20, 60, vrf1.name + " IP", address_selection, e.src_ip, "IP address in '" + vrf1.name + "' used establish the bgp neighborship.");
    wdata.d.dst_ip = WIN_addSelect(w, 220, 60, vrf2.name + " IP", address_selection, e.dst_ip, "IP address in '" + vrf2.name + "' used establish the bgp neighborship.");
    WIN_showBGPPeerConfigWindow_updateip(wdata, vrf1_addresses, vrf2_addresses, e.src_ip, e.dst_ip);

    // AFI/SAFI selection
    let afisafi_data = [];
    e.afisafi.forEach((afisafi) => {
        afisafi_data.push({"afisafi": afisafi});
    });
    wdata.d.afisafi = WIN_addDictList(w, 20, 100, 220, 100, "AFI/SAFI", afisafi_data, {
        afisafi: {name: "AFI/SAFI", width: 120, options: WIN_data.constants.bgp_afisafi_choices},
    });

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 190, 210, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showBackgroundSettings(settings, callback) {
    let wdata = WIN_create("global", "background", "0", "Background", 240, 130);
    if(!wdata)
        return;
    let w = wdata.w;

    // Color1
    wdata.d.bg_color = WIN_addColorInput(w, 20, 20, "BG Color", settings.bg_color);

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 100, 100, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");   
}

function WIN_showFormatSettingsColor(settings, callback) {
    let wdata = WIN_create("global", "format", "color", "Format Color Settings", 450, 140);
    if(!wdata)
        return;
    let w = wdata.w;    

    // Colors
    wdata.d.color1 = WIN_addColorInput(w, 20, 60, "Color 1", settings.color1);
    wdata.d.color2 = WIN_addColorInput(w, 240, 60, "Color 2", settings.color2);
    wdata.d.use_standard_color = WIN_addCheckBoxInput(w, 40, 20, 20, 20, "Use these settings when creating devices", !settings.use_standard_color);

    for(attribute in wdata.d)
        wdata.d[attribute].addEventListener("change", () => { callback(wdata.d) });
}

function WIN_showFormatSettingsText(settings, callback) {
    let wdata = WIN_create("global", "format", "text", "Format Text Settings", 640, 330);
    if(!wdata)
        return;

    let w = wdata.w;

    wdata.d.use_standard_text = WIN_addCheckBoxInput(w, 40, 20, 20, 20, "Use these settings when creating text", !settings.use_standard_text);

    // Color
    wdata.d.color = WIN_addColorInput(w, 230, 20, "Color", settings.text_color);

    // Height
    wdata.d.height = WIN_addSlider(w, 20, 250, 100, "Size", settings.text_height, .1, 2, .1);

    // Text align
    wdata.d.text_align = WIN_addRadioImgInput(w, 20, 165, "Text Align", WIN_data.constants.textalign_choices, settings.text_align, () => {callback(wdata.d)});

    // Background type
    wdata.d.bg_type = WIN_addRadioImgInput(w, 230, 95, "Background Shape", WIN_data.constants.textbackground_choices, settings.text_bg_type, () => {callback(wdata.d)});

    // Background Color and show
    wdata.d.bg_color = WIN_addColorInput(w, 230, 150, "BG Color", settings.text_bg_color);
    wdata.d.bg_show = WIN_addCheckBoxInput(w, 460, 170, 440, 170, "Show Background", settings.text_bg_show);

    // Border Color
    wdata.d.border_color = WIN_addColorInput(w, 230, 220, "Border Color", settings.text_border_color);
    wdata.d.border_show = WIN_addCheckBoxInput(w, 460, 190, 440, 190, "Show Border", settings.text_border_show);
    wdata.d.border_width = WIN_addSlider(w, 440, 210, 100, "Border Size", settings.text_border_width, .05, .5, .05);
    wdata.d.bg_depth = WIN_addSlider(w, 440, 245, 100, "Background Depth", settings.text_bg_depth, .1, 1, .1);
    wdata.d.rotation_x = WIN_addSlider(w, 440, 280, 100, "Rotation X", settings.text_rotation_x, 0, 90, 15);

    for(attribute in wdata.d)
        wdata.d[attribute].addEventListener("change", () => { callback(wdata.d) }); 
}

function WIN_showFormatSettingsLink(settings, callback) {
    let wdata = WIN_create("global", "format", "link", "Format Link Settings", 440, 180);
    if(!wdata)
        return;
    let w = wdata.w;    

    wdata.d.use_standard_link = WIN_addCheckBoxInput(w, 40, 20, 20, 20, "Use these settings when creating links", !settings.use_standard_link);

    // Color
    wdata.d.color = WIN_addColorInput(w, 20, 60, "Color", settings.link_color);

    // Weight
    wdata.d.weight = WIN_addSlider(w, 240, 60, 100, "Width", settings.link_weight, .025, .2, .0125);

    // Height
    wdata.d.height = WIN_addSlider(w, 240, 100, 100, "Height", settings.link_height, 0, .5, .05);

    // Show direction
    wdata.d.show_direction = WIN_addCheckBoxInput(w, 40, 142, 18, 140, "Show Direction", settings.link_show_direction);

    for(attribute in wdata.d)
        wdata.d[attribute].addEventListener("change", () => { callback(wdata.d) });     
}

function WIN_showData(diagram_type, view, type, id, e, callback) {
    let wdata = WIN_create(view, type, id, "Data", 520, 280);
    if(!wdata)
        return;
    let w = wdata.w;

    // Infobox_type
    if(diagram_type === "network")
        wdata.d.infobox_type = WIN_addRadioImgInput(w, 220, 20, "Mouse Over:", WIN_data.constants.infobox_type_choices_network, (e.infobox_type) ? e.infobox_type : "l");
    else
        wdata.d.infobox_type = WIN_addRadioImgInput(w, 220, 20, "Mouse Over:", WIN_data.constants.infobox_type_choices, (e.infobox_type) ? e.infobox_type : "l");
    // Data. First convert element data to dictlist format, then add the window dictlist
    let data_dl = [];
    if(e.data) {
        e.data.forEach((entry) => {
            data_dl.push({title: entry.title, text: (entry.text.length > 0) ? entry.text[0] : ""});
            for(let x = 1; x < entry.text.length; x++)
                data_dl.push({title: "", text: entry.text[x]});
        })
    }
    wdata.d.data = WIN_addDictList(w, 20, 90, 480, 140, "Data", data_dl, {
        "title": { name: "Section Title", width: 100, "description": "Leave empty if data belongs to previous section.\nFirst entry must have title." },
        "text": { name: "Data", width: 280, "description": "Text or Data." },
    });

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 230, 250, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");   
}

function WIN_showEditURL(view, type, id, e, callback) {
    let winname = `Edit URLs of ${type}`;
    if(e.name)
        winname = `Edit URLs of ${type} ${e.name}`;

    let wdata = WIN_create(view, type, id, winname, 650, 220);
    if(!wdata)
        return;
    let w = wdata.w;

    let data_dl = [];
    for(let url_name in e.urls) {
        data_dl.push({name: url_name, url: e.urls[url_name]});
    }

    wdata.d.urls = WIN_addDictList(w, 20, 20, 600, 140, "URLs", data_dl, {
        "name": { name: "URL Label", width: 150, "description": "Label applied to the URL (what users will see)." },
        "url": { name: "URL", width: 350, "description": "URL including protocol. Example: https://www.networkmaps.org" },
    });

    // Button to apply
    wdata.d.apply = WIN_addButton(w, 300, 180, "Apply", () => {
        callback(wdata);
    }, "Apply changes.");
}

function WIN_showURL(view, type, id, name, url_struct) {
    let winname = `URLs of ${type}`;
    if(name)
        winname = `URLs of ${type} ${name}`;

    let num_urls = 0;
    let num_categories = 0;

    for(let url_category in url_struct) {
        if(Object.keys(url_struct[url_category]).length == 0 )
            continue;

        num_categories += 1;
        for(let url_label in url_struct[url_category]) {
            num_urls += 1;
        }
    }

    if(num_urls === 0)
        return;

    let wdata = WIN_create(view, `${type}_url`, id, winname, 300, 40 + 25 * (num_urls + num_categories));

    if(!wdata)
        return;

    let w = wdata.w;

    let y = 20;
    
    for(let url_category in url_struct) {
        if(Object.keys(url_struct[url_category]).length == 0 )
            continue;
        WIN_addLabel(w, 15, y, `URLs of ${url_category}`, 270);
        y += 25;

        for(let url_label in url_struct[url_category]) {
            let url = url_struct[url_category][url_label];
            WIN_addButton(w, 20, y, url_label, () => { window.open(url); });
            y += 25;
        }
    }
}

function WIN_closeShapeGroups() {
    return WIN_destroy("global", "shape", "list");
}

function WIN_showShapeGroups(diagram_shapegroups, networkmaps_shapegroups, callback_addshapegroup, callback_removeshapegroup) {
    let wdata = WIN_create("global", "shape", "list", "Edit Shapes available on this diagram", 560, 200);
    if(!wdata)
        return;
    let w = wdata.w;

    // Create the struct to show existing and available shape groups
    let existing = {}, available = {};
    for(let id in networkmaps_shapegroups) {
        if(diagram_shapegroups.indexOf(id) === -1)
            available[id] = networkmaps_shapegroups[id];
        else
            existing[id] = networkmaps_shapegroups[id];
    }

    wdata.d.callback_addshapegroup = callback_addshapegroup;
    wdata.d.callback_removeshapegroup = callback_removeshapegroup;

    wdata.d.existing = WIN_addSelectList(w, 10, 20, 240, 150, "Shape Groups on this diagram", existing, {
        "name": {name: "Shape Name", width: 100},
        //"description": {name: "Description", width: 400},
        "category": {name: "Category", width: 100},
    }, "description", callback_removeshapegroup);

    wdata.d.available = WIN_addSelectList(w, 300, 20, 240, 150, "Select Shape Groups to Add", available, {
        "name": {name: "Shape Name", width: 100},
        //"description": {name: "Description", width: 400},
        "category": {name: "Category", width: 100},
    }, "description", callback_addshapegroup);

    WIN_addText(w, 10, 180, "Click on a shape group to move it between boxes.", 520)
}