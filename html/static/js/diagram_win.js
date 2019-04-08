WIN_data = {
	l: [],
	zindex: 100,
	auto_inc: 1,
	mousedescription: null,
	constants: {
		transceiver_options: [
			["Undefined", ""],
			["10GBASE-SR", "10GBASE-SR"],
			["10GBASE-T", "10GBASE-T"],
			["1000BASE-T", "1000BASE-T"],
			["1000BASE-SX", "1000BASE-SX"],
			["1000BASE-LX", "1000BASE-LX"],
			["10BASE-T", "10BASE-T"],
			["100BASE-T", "100BASE-T"],
		],
		iffunctionchoices: [
			["Not Defined", "radio_if_notdef.png", "none"],
			["Access/Trunk", "radio_if_l2.png", "switching"],
			["Layer 3", "radio_if_l3.png", "routing"],
		],
	}
}

function WIN_initialize() {
	Input_registerclass("win_h", null, null, WIN_mm);
	Input_registerclass("color_grab", null, null, WIN_Color_mm);
	Input_registerclass("slider_grab", null, null, WIN_Slider_mm);
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
	let px = parseInt(dom_element.style.left);
	px += diffx;
	if(px < 0) px = 0;
	if(px > 127) px = 127;
	dom_element.style.left = "" + px + "px";
	let cr = parseInt(DOM.findChildrenWithClass(dom_element.parentNode, "color_r")[0].style.left)*2;
	let cg = parseInt(DOM.findChildrenWithClass(dom_element.parentNode, "color_g")[0].style.left)*2;
	let cb = parseInt(DOM.findChildrenWithClass(dom_element.parentNode, "color_b")[0].style.left)*2;
	
	let value = (cr << 16) | (cg << 8) | cb;
	let HTMLcolor = value.toString(16);
	HTMLcolor = "#000000".substring(0,7 - HTMLcolor.length) + HTMLcolor;

	DOM.findChildrenWithClass(dom_element.parentNode, "colorbox")[0].style.backgroundColor = HTMLcolor;
	DOM.findChildrenWithClass(dom_element.parentNode, "color_value")[0].value = value;
}

function WIN_Slider_mm(x, y, diffx, diffy, dom_element) {
	let low = parseFloat(dom_element.getAttribute("data-low"));
	let high = parseFloat(dom_element.getAttribute("data-high"));
	let step = parseFloat(dom_element.getAttribute("data-step"));
	let width = parseInt(dom_element.getAttribute("data-width"));

	let bar = DOM.findChildrenWithClass(dom_element.parentNode, "slider_bar")[0];
	let i = DOM.findChildrenWithClass(dom_element.parentNode, "slider_value")[0];
	let bar_rect = bar.getBoundingClientRect();

	let pos = x - bar_rect.left;
	if(pos < 0)
		pos = 0;
	if(pos > width)
		pos = width;
	let numpoints = ((high-low))/step;
	let widthpoints = width/numpoints;
	let value = low + Math.round(pos/widthpoints) * step;

	dom_element.style.left = "" + (value-low)/(high-low)*width + "px";
	
	i.value = value;
}

function WIN_create(id, title, width, height) {
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
		id: id
	}

	WIN_data.l.push(windata);

	// Overide keypress to prevent change action when editing properties
	w.addEventListener("keypress", (event) => {
		if ((event.target instanceof HTMLInputElement) && (event.target.type === "text"))
			event.stopPropagation();
	});

	return windata;
}

function WIN_addSection(win, px, py) {
	let d = DOM.cdiv(win);
	DOM.setElementPos(d, px, py);

	return d;
}

function WIN_addLabel(win, px, py, label) {
	let l = DOM.cdiv(win, null, "win_label", label);
	DOM.setElementPos(l, px, py);

	return l;
}

function WIN_addTextInput(win, lpx, lpy, px, py, label, value) {
	WIN_addLabel(win, lpx, lpy, label)

	let i = DOM.ci_text(win);
	DOM.setElementPos(i, px, py);
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
	
	let rbar = DOM.cdiv(container, null, "color_bar");
	DOM.setElementPos(rbar, 2, 15);
	rbar.style.backgroundColor = "#FF8888";
	let rgrab = DOM.cdiv(container, null, "color_grab color_r");
	DOM.setElementPos(rgrab, r*.5, 13);

	let gbar = DOM.cdiv(container, null, "color_bar");
	DOM.setElementPos(gbar, 2, 35);
	gbar.style.backgroundColor = "#88FF88";
	let ggrab = DOM.cdiv(container, null, "color_grab color_g");
	DOM.setElementPos(ggrab, g*.5, 33);
	
	let bbar = DOM.cdiv(container, null, "color_bar");
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

function WIN_addImgSelection(win, px, py, label, value, options) {
	let o = []
	for(let x = 0; x < options.length; x++) {
		o.push([options[x],options[x]])
	}

	WIN_addLabel(win, px, py, label)

	let i = DOM.cselect(win, null, null, o);
	DOM.setElementPos(i, px + 2, py + 15);
	i.value = value;

	let img = DOM.cimg(win, staticurl + "/static/textures/" + i.value + ".png", null, "win_imgselect");
	DOM.setElementPos(img, px + 140, py+5);
	
	i.addEventListener("change", () => {
		img.src = staticurl + "/static/textures/" + i.value + ".png";
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
				inp.addEventListener("mouseover", (ev) => {
					WIN_addMouseDescription(ev.pageX, ev.pageY-40, fields[listfields[y]].description);
				});
				inp.addEventListener("mouseout", (ev) => {
					WIN_removeMouseDescription();
				});
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
		current_x += fields[key].width + 10;
	}

	WIN_dictListDraw(container, changelength_callback);

	return value_element;
}

function WIN_addButton(win, px, py, label, callback) {
	let b = DOM.cbutton(win, null, "win_button", label, null, callback);
	DOM.setElementPos(b, px, py);

	return b;
}

function WIN_addSelect(win, px, py, label, options, value) {
	WIN_addLabel(win, px, py, label)

	let i = DOM.cselect(win, null, null, options);
	DOM.setElementPos(i, px, py+16);
	i.value = value;

	return i;
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

		img.addEventListener("mouseover", (ev) => {
			WIN_addMouseDescription(ev.pageX-10, ev.pageY-30, choices[x][0]);
		});
		img.addEventListener("mouseout", (ev) => {
			WIN_removeMouseDescription();
		});
		if(choices[x][2] === value) {
			img.className = "win_imgradio_selected";
		}
	}

	return value_element;
}

function WIN_showGlobalSettingsWindow(gs, callbacks) {
	let winid = "global_settings_window";

	let wdata = WIN_create(winid, "Global Settings", 260, 65);
	if(!wdata)
		return;
	let w = wdata.w;

	// Checkbox to show hide name of devices
	wdata.d.show_device_name = WIN_addCheckBoxInput(w, 40, 30, 20, 30, "Show Device Names", gs.show_device_name);
	wdata.d.show_device_name.addEventListener("change", () => {callbacks.show_device_name(wdata.d.show_device_name)} );
}

function WIN_showBaseElementWindow(view, type, id, e, callback) {
	let winid = view + "_" + type + "_" + id;
	
	let wdata = WIN_create(winid, e.name, 460, 300);
	if(!wdata)
		return;
	let w = wdata.w;

	// Name
	wdata.d.name = WIN_addTextInput(w, 20, 20, 20, 35, "Name", e.name);

	// Level (sy)
	wdata.d.sy = WIN_addSlider(w, 250, 20, 100, "Level", e.sy, .5, 5, .5);

	// Color1
	wdata.d.color1 = WIN_addColorInput(w, 20, 70, "Color Floor", e.color1);

	// Color2
	wdata.d.color2 = WIN_addColorInput(w, 250, 70, "Color Border", e.color2);

	// Texture option
	wdata.d.t1name = WIN_addImgSelection(w, 20, 160, "Floor Texture", e.t1name, ['b1_t1', 'b1_t2', 'b1_t3']);
	wdata.d.t2name = WIN_addImgSelection(w, 20, 195, "Border Texture", e.t2name, ['b2_t1', 'b2_t2']);

	// Floor Texture size
	wdata.d.tsx_i = WIN_addSlider(w, 250, 160, 100, "Texture U", 1/e.tsx, .25, 10, .25);
	wdata.d.tsy_i = WIN_addSlider(w, 250, 195, 100, "Texture V", 1/e.tsy, .25, 10, .25);

	// Button to apply
	wdata.d.apply = WIN_addButton(w, 190, 270, "Apply", () => {
		callback(wdata);
	});
}

function WIN_showL2DeviceWindow(view, type, id, e, callback, check_ifnaming) {
	let winid = view + "_" + type + "_" + id;
	
	let wdata = WIN_create(winid, e.name, 440, 340);
	if(!wdata)
		return;
	let w = wdata.w;

	// Name
	wdata.d.name = WIN_addTextInput(w, 200, 20, 155, 35, "Name", e.name);

	// Color
	wdata.d.color1 = WIN_addColorInput(w, 20, 70, "Color 1", e.color1);	
	wdata.d.color2 = WIN_addColorInput(w, 230, 70, "Color 2", e.color2);	

	// List of interface naming
	wdata.d.ifnaming = WIN_addStringList(w, 20, 150, "Interface Naming", e.ifnaming, "Lo0",
		"Sample: Ethernet{1-32}/{1-4} will generate Ethernet1/1 to Ethernet 32/4", check_ifnaming);

	// Button to apply
	wdata.d.apply = WIN_addButton(w, 190, 310, "Apply", () => {
		callback(wdata);
	});	
}

function WIN_showL2DeviceConfigWindow(view, type, id, e, callback) {
	let winid = view + "_" + type + "_" + id + "_config";
	
	let wdata = WIN_create(winid, e.name, 660, 430);
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
		list_svis.push({tag: svi_tag, name: e.svis[svi_tag].name, ipv4: e.svis[svi_tag].ipv4[0], ipv6: e.svis[svi_tag].ipv6[0]})
	}

	let list_los = [];
	for(let lo_id in e.los) {
		list_los.push({id: lo_id, name: e.los[lo_id].name, ipv4: e.los[lo_id].ipv4[0], ipv6: e.los[lo_id].ipv6[0]})
	}

	wdata.d.vlans = WIN_addDictList(w, 20, 20, 300, 120, "VLAN List", list_vlans, {
		"tag": { name: "Vlan Tag", width: 60 },
		"name": { name: "Vlan Name", width: 120 }
	});

	wdata.d.vrfs = WIN_addDictList(w, 340, 20, 300, 120, "VRF List", list_vrfs, {
		"rd":   { name: "RD", width: 60 },
		"name": { name: "VRF Name", width: 120 },
	});

	wdata.d.svis = WIN_addDictList(w, 20, 150, 540, 120, "SVI List", list_svis, {
		"tag":   { name: "Vlan Tag", width: 60 },
		"name": { name: "If Name", width: 120 },
		"ipv4": { name: "IPv4", width: 120 },
		"ipv6": { name: "IPv6", width: 120 },
	});

	wdata.d.los = WIN_addDictList(w, 20, 280, 540, 120, "Loopback List", list_los, {
		"id":   { name: "Lo ID", width: 60 },
		"name": { name: "If Name", width: 120 },
		"ipv4": { name: "IPv4", width: 120 },
		"ipv6": { name: "IPv6", width: 120 },
	});

	// Button to apply
	wdata.d.apply = WIN_addButton(w, 280, 410, "Apply", () => {
		callback(wdata);
	});	
}

function WIN_showL2LinkWindow(view, type, id, e, callback) {
	let winid = view + "_" + type + "_" + id;
	
	let wdata = WIN_create(winid, e.name, 440, 200);
	if(!wdata)
		return;
	let w = wdata.w;

	// Type
	let options = [
		["Line", "0"], 
		["Square", "1"]
	];
	wdata.d.type = WIN_addSelect(w, 20, 20, "Link Type", options, e.type);

	// Order
	options = [["XY", "XY"], ["XZ", "XZ"], ["YX", "YX"], ["YZ", "YZ"], ["ZX", "ZX"], ["ZY", "ZY"]];
	wdata.d.order = WIN_addSelect(w, 20, 60, "Square Order", options, e.order);

	// Color
	wdata.d.color = WIN_addColorInput(w, 230, 20, "Color", e.linedata.color);

	// Weight
	wdata.d.weight = WIN_addSlider(w, 20, 100, 100, "Width", e.linedata.weight, .025, .2, .0125);

	// Height
	wdata.d.height = WIN_addSlider(w, 20, 130, 100, "Height", e.linedata.height, 0, .5, .05);

	// Button to apply
	wdata.d.apply = WIN_addButton(w, 190, 170, "Apply", () => {
		callback(wdata);
	});	
}

function WIN_showL2LinkConfigWindow_lag(wdata) {
	if(JSON.parse(wdata.d.ifbindings.value).length > 1)
		wdata.d.lag_section.style.display = "block";
	else
		wdata.d.lag_section.style.display = "none";
}

function WIN_showL2LinkConfigWindow(id, e, dev1, dev2, resolve_ifnaming, callback, callback_dev) {
	// First a bit of cleanup (if data of interfaces of a link is not defined)
	if(e.phy === undefined) {
		e.phy = {
					"ifbindings": [
					],
					"lag_name": ["Po0", "Po0"],
					"lacp": true,
					"transceiver": "",			
		}
	}

	for(let x = 0; x < e.devs.length; x++)
		if(e.devs[x].data === undefined)
			e.devs[x].data = {
				function: "none",
				function_data: {}				
			}

	// Create the window
	let winid = "L2_link_" + id + "_config";
	let dev1name = (dev1.name == "" ? "unnamed" : dev1.name);
	let dev2name = (dev2.name == "" ? "unnamed" : dev2.name);
	let wdata = WIN_create(winid, "Link between '" + dev1name + "' and '" + dev2name + "'.", 360, 310);
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
	() => {WIN_showL2LinkConfigWindow_lag(wdata)});

	wdata.d.lag_section = WIN_addSection(w, 10, 160);
	wdata.d.lag_name1 = WIN_addTextInput(wdata.d.lag_section, 60, 0, 40, 15, "Dev1 LAG Name", e.phy.lag_name[0]);
	wdata.d.lag_name2 = WIN_addTextInput(wdata.d.lag_section, 200, 0, 180, 15, "Dev2 LAG Name", e.phy.lag_name[1]);
	wdata.d.lacp = WIN_addSelect(wdata.d.lag_section, 140, 40, "LACP", [["Yes", "yes"], ["No", "no"]], (e.phy.lacp ? "yes" : "no"));

	WIN_showL2LinkConfigWindow_lag(wdata);

	wdata.d.dev1 = WIN_addButton(w, 20, 250, "Edit " + dev1name, (ev) => {
		callback_dev(0);
		ev.stopPropagation();
	});		
	wdata.d.dev2 = WIN_addButton(w, -20, 250, "Edit " + dev2name, (ev) => {
		callback_dev(1);
		ev.stopPropagation();
	});		

	wdata.d.apply = WIN_addButton(w, 160, 280, "Apply", () => {
		callback(wdata);
	});		
}

function WIN_showL2LinkConfigDeviceWindow_drawfunction(wdata, e, dev_index, dev) {
	DOM.removeChilds(wdata.d.section);

	if(wdata.d.function.value == "routing") {
		let vrf_options = [];
		for(let rd in dev.vrfs) {
			vrf_options.push([dev.vrfs[rd].name, rd])
		}

		let values = [];
		for(let x = 0; x < e.devs[dev_index].data.function_data.subinterfaces; x++) {
			let subif = e.devs[dev_index].data.function_data.subinterfaces[x];
			values.push({
				vlan_tag: subif.vlan_tag,
				ipv4: (len(subif.ipv4) > 0 ? subif.ipv4[0] : ""),
				ipv6: (len(subif.ipv6) > 0 ? subif.ipv6[0] : ""),
				vrf: subif.vrf,
			})
		}
		wdata.d.subinterfaces = WIN_addDictList(wdata.d.section, 0, 0, 580, 90, "Sub-Interfaces", values, {
			vlan_tag: {name: "VTag", width: 35, "description": "Vlan Tag for this subinterface. -1 if no tag."},
			ipv4: {name: "IPv4", width: 110},
			ipv6: {name: "IPv6", width: 255},
			vrf: {name: "VRF", width: 70, options: vrf_options}
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
					tagged: ( e.devs[dev_index].data.function_data.native_vlan == e.devs[dev_index].data.function_data.vlans[x] ? "yes" : "no"),
				})
			}
		}

		wdata.d.vlans = WIN_addDictList(wdata.d.section, 150, 0, 260, 90, "Vlan Members", [], {
			vlan_id: {name: "Vlan", width: 80, options: vlan_options},
			tagged: {name: "Tagged", width: 80, options: [["No", "no"], ["Yes", "yes"]]},
		})
	}
}

function WIN_showL2LinkConfigDeviceWindow(dev_index, link_id, e, dev, callback) {
	// First a bit of cleanup (if data is not defined)
	if(e.devs[dev_index].data.function_data === undefined) {
		e.devs[dev_index].data.function_data = {};
		e.devs[dev_index].data.function = "none";
	}

	// Create the window
	let winid = "L2_link_" + link_id + "_dev_" + dev_index + "_config";
	let devname = (dev.name == "" ? "unnamed" : dev.name);
	let wdata = WIN_create(winid, "Dev " + devname + " interface config.", 600, 230);
	if(!wdata)
		return;

	let w = wdata.w;

	wdata.d.function = WIN_addRadioImgInput(w, 240, 20, "Interface Type", WIN_data.constants.iffunctionchoices, e.devs[dev_index].data.function, () => {
		WIN_showL2LinkConfigDeviceWindow_drawfunction(wdata, e, dev_index, dev);
	});

	wdata.d.section = WIN_addSection(w, 10, 90);

	WIN_showL2LinkConfigDeviceWindow_drawfunction(wdata, e, dev_index, dev);

	// Button to apply
	wdata.d.apply = WIN_addButton(w, 270, 200, "Apply", () => {
		callback(wdata);
	});	
}

function WIN_showL2TextWindow(view, type, id, e, callback) {
	let winid = view + "_" + type + "_" + id;
	
	let wdata = WIN_create(winid, "Text " + id, 440, 200);
	if(!wdata)
		return;
	let w = wdata.w;

	// Text
	wdata.d.text = WIN_addTextInput(w, 200, 20, 155, 35, "Text", e.text);

	// Color
	wdata.d.color = WIN_addColorInput(w, 230, 70, "Color", e.color);

	// py
	wdata.d.py = WIN_addSlider(w, 20, 70, 100, "Height", e.py, 0, 5, .25);

	// Height
	wdata.d.height = WIN_addSlider(w, 20, 100, 100, "Size", e.height, .1, 2, .1);

	// Button to apply
	wdata.d.apply = WIN_addButton(w, 190, 170, "Apply", () => {
		callback(wdata);
	});	
}

function WIN_showL2SymbolFlagWindow(view, type, id, e, callback) {
	let winid = view + "_" + type + "_" + id;
	
	let wdata = WIN_create(winid, "Symbol " + id, 440, 140);
	if(!wdata)
		return;
	let w = wdata.w;

	// Color
	wdata.d.color = WIN_addColorInput(w, 20, 20, "Color Post", e.color);
	wdata.d.flagcolor = WIN_addColorInput(w, 230, 20, "Color Flag", e.cd.flagcolor);

	// Button to apply
	wdata.d.apply = WIN_addButton(w, 190, 110, "Apply", () => {
		callback(wdata);
	});	
}







