WIN_data = {
	l: [],
	zindex: 100,
}

function WIN_initialize() {
	Input_registerclass("win_h", null, null, WIN_mm);
	Input_registerclass("color_grab", null, null, WIN_Color_mm);
	Input_registerclass("slider_grab", null, null, WIN_Slider_mm);
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

function WIN_addTextInput(win, lpx, lpy, px, py, label, value) {
	let l = DOM.cdiv(win, null, "win_label", label);
	DOM.setElementPos(l, lpx, lpy);

	let i = DOM.ci_text(win);
	DOM.setElementPos(i, px, py);
	i.value = value;

	return i;
}

function WIN_addCheckBoxInput(win, lpx, lpy, px, py, label, checked) {
	let l = DOM.cdiv(win, null, "win_label", label);
	DOM.setElementPos(l, lpx, lpy);

	let i = DOM.ci_checkbox(win);
	DOM.setElementPos(i, px, py);
	i.checked = checked;

	return i;
}

function WIN_addColorInput(win, px, py, label, value) {
	let r = value >> 16;
	let g = (value >> 8) & 0xFF;
	let b = value & 0xFF;

	let l = DOM.cdiv(win, null, "win_label", label);
	DOM.setElementPos(l, px, py);

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

	let l = DOM.cdiv(win, null, "win_label", label);
	DOM.setElementPos(l, px, py);

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
	let l = DOM.cdiv(win, null, "win_label", label);
	DOM.setElementPos(l, px, py);

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
			let index = parseInt(rem.getAttribute("data-index")) + 1;
			let newvalue = value_element.value.split(",");
			if (newvalue.length == 8)
				return
			newvalue.splice(index, 0, "Lo");
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

function WIN_addStringList(win, px, py, label, value, help, checkstring) {
	let i, l;
	
	let container = DOM.cdiv(win);
	DOM.setElementPos(container, px, py);

	let value_element = DOM.ci_text(container, null, "stringlist_value");
	DOM.setElementPos(value_element, 0, 0);
	value_element.value = value.join();
	value_element.style.display = "none";


	l = DOM.cdiv(win, null, "win_label", label);
	DOM.setElementPos(l, px, py);

	l = DOM.cdiv(win, null, "win_help", help)
	DOM.setElementPos(l, px+200, py+16);

	WIN_stringListDraw(container, checkstring);

	return value_element;
}

function WIN_addButton(win, px, py, label, callback) {
	let b = DOM.cbutton(win, null, "win_button", label, null, callback);
	DOM.setElementPos(b, px, py);

	return b;
}

function WIN_addSelect(win, px, py, label, options, value) {
	let l = DOM.cdiv(win, null, "win_label", label);
	DOM.setElementPos(l, px, py);

	let i = DOM.cselect(win, null, null, options);
	DOM.setElementPos(i, px, py+16);
	i.value = value;

	return i;
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
	wdata.d.ifnaming = WIN_addStringList(w, 20, 150, "Interface Naming", e.ifnaming, 
		"Sample: Ethernet{1-32}/{1-4} will generate Ethernet1/1 to Ethernet 32/4", check_ifnaming);

	// Button to apply
	wdata.d.apply = WIN_addButton(w, 190, 310, "Apply", () => {
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







