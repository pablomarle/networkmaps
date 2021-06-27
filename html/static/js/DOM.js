
DOM = {	
	donate : (parent) => {
		let form = document.createElement("form");
		form.action = "https://www.paypal.com/cgi-bin/webscr";
		form.method = 'post';
		form.target = '_top';
		form.innerHTML = '<input type="hidden" name="cmd" value="_s-xclick">' +
                    	 '<input type="hidden" name="hosted_button_id" value="G4WCUPHDE2HZN">' +
                    	 '<input type="submit" class="button" value="Donate">'

        parent.appendChild(form);
	},

	esc : (c) => {
		if(typeof c === "number")
			c = "" + c;
		return c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;");
	},
	
	c : (parent, etype, eid=null, eclass=null, etext=null) => {
		let element = document.createElement(etype);
		if (etext != null) element.innerHTML = DOM.esc(etext);
		if(eid) element.id = eid;
		if(eclass) element.className = eclass;
		if(parent)
			parent.appendChild(element);

		return element;
	},

	cdiv_fade : (parent, eid=null, eclass=null, etext=null) => {
		let div = DOM.c(parent, "div", eid, eclass, etext);
		DOM.fadeInElement(div);
		
		return div;
	},

	cdiv : (parent, eid=null, eclass=null, etext=null) => {
		return DOM.c(parent, "div", eid, eclass, etext);
	},

	cform : (parent, eid=null, eclass=null, etext=null) => {
		return DOM.c(parent, "form", eid, eclass, etext);
	},

	ctable : (parent, eid=null, eclass=null, etext=null) => {
		return DOM.c(parent, "table", eid, eclass, etext);
	},

	ctr : (parent, eid=null, eclass=null, etext=null) => {
		return DOM.c(parent, "tr", eid, eclass, etext);
	},

	ctd : (parent, eid=null, eclass=null, etext=null) => {
		return DOM.c(parent, "td", eid, eclass, etext);
	},

	cth : (parent, eid=null, eclass=null, etext=null) => {
		return DOM.c(parent, "th", eid, eclass, etext);
	},

	ci_text : (parent, eid=null, eclass=null, etext=null) => {
		return DOM.c(parent, "input", eid, eclass, etext);
	},

	ci_ta : (parent, eid=null, eclass=null, etext=null) => {
		return DOM.c(parent, "textarea", eid, eclass, etext);
	},

	ci_f : (parent, eid=null, eclass=null, etext=null) => {
		let input = DOM.c(parent, "input", eid, eclass, etext);
		input.type = "file";
		return input;
	},

	ci_pwd : (parent, eid=null, eclass=null, etext=null) => {
		let input = DOM.c(parent, "input", eid, eclass, etext);
		input.type = "password";
		return input;
	},

	ci_checkbox : (parent, eid=null, eclass=null, etext=null) => {
		let input = DOM.c(parent, "input", eid, eclass, etext);
		input.type = "checkbox";
		return input;
	},

	clabel : (parent, eid=null, eclass=null, etext=null, isfor=null) => {
		let label = DOM.c(parent, "label", eid, eclass, etext);
		if(isfor)
			label.htmlFor = isfor;
		return label;
	},

	cbutton : (parent, eid=null, eclass=null, etext=null, data=null, clickaction = null) => {
		let button = DOM.c(parent, "button", eid, eclass, etext);
		let attributes = [];
		if(data) 
			for (attr in data) {
				button.setAttribute("data-" + attr, data[attr]);
				attributes.push(attr);
			}

		if(clickaction)
			button.addEventListener("click", (ev) => {
				let result_data = {};
				for(let x = 0; x < attributes.length; x++) {
					result_data[attributes[x]] = ev.target.getAttribute("data-" + attributes[x]);
				}
				clickaction(ev, result_data);
			});
		
		return button;
	},

	cimg : (parent, src, eid=null, eclass=null, data=null, clickaction = null) => {
		let img = DOM.c(parent, "img", eid, eclass);

		img.src = src;
		
		if(data) 
			for (attr in data) {
				img.setAttribute("data-" + attr, data["attr"]);
			}

		if(clickaction)
			img.addEventListener("click", clickaction);
		
		return img;
	},

	cselect : (parent, eid=null, eclass=null, optionlist=null) => {
		let select = DOM.c(parent, "select", eid, eclass);
		if(optionlist) {
			for(let x = 0; x < optionlist.length; x++) {
				let o = DOM.c(select, "option", null, null, optionlist[x][0]);
				o.value = optionlist[x][1];
			}
		}

		return select;
	},

	cselect_options : (select, optionlist) => {
		DOM.removeChilds(select);
		for(let x = 0; x < optionlist.length; x++) {
			let o = DOM.c(select, "option", null, null, optionlist[x][0]);
			o.value = optionlist[x][1];
		}
	},

	cradio : (parent, eid=null, eclass=null, ename=null, checked=false) => {
		let radio = DOM.c(parent, "input", eid, eclass);
		radio.setAttribute('type', 'radio');
		radio.setAttribute('name', ename);
		if(checked)
			radio.setAttribute('checked', 'checked');
		return radio;
	},

	removeElement: (node) => {
		node.parentNode.removeChild(node);
	},

	removeChilds: (node, now=false) => {
		if(now) {
		    while (node.firstChild) {
		        node.removeChild(node.firstChild);
		    }
		}
		else {
		    for(let x = 0; x < node.childNodes.length; x++) {
		    	DOM.fadeOutElement(node.childNodes[x]);
		    }
		}
	},

	fadeOutElement: (node) => {
		let currentlevel = 1.0;
		let timer = setInterval(() => {
			currentlevel -= .1;
			node.style.opacity = currentlevel;
			if(currentlevel < 0) {
				clearInterval(timer);
				if(node.parentNode)
					node.parentNode.removeChild(node);
			}
		}, 50);
	},

	fadeInElement: (node) => {
		let currentlevel = 0;
		node.style.opacity = 0;
		let timer = setInterval(() => {
			node.style.opacity = currentlevel;
			currentlevel += .1;
			if(currentlevel > 1) {
				clearInterval(timer);
			}
		}, 50);
	},

	hide: (node) => {
		node.style.display = "none";
	},

	show: (node, display_mode) => {
		node.style.display = (display_mode) ? display_mode : "block";
	},

	showError: (errortitle, errortext, is_critical) => {
		let body = document. getElementsByTagName("body")[0];
		let div= DOM.cdiv(body, null, "error");
		div.style.zIndex = "10000";
			DOM.cdiv(div, null, "errortitle", errortitle);
			DOM.cdiv(div, null, "errortext", errortext);
		let x = 0;
		let interval = setInterval(() => {
			x++;
			div.style.transform = "translate(-50%, " + (-100+x*10) + "%)";
			if(x > 11)
				clearInterval(interval);
		}, 20);
		if(!is_critical)
			setTimeout(() => { DOM.fadeOutElement(div) }, 3000);
	},

	setElementPos: (node, px, py)  => {
		node.style.position = "absolute";
		if(px >= 0)
			node.style.left = "" + px + "px";
		else
			node.style.right = "" + -px + "px";
		if(py >= 0)
			node.style.top = "" + py + "px";
		else
			node.style.bottom = "" + -py + "px";
	},

	setElementSize: (node, width, height) => {
		if(width)
			node.style.width = "" + width + "px";
		if(height)
			node.style.height = "" + height + "px";
	},

	findChildrenWithClass: (node, classname) => {
		let childlist = [];
		for(let x = 0; x < node.children.length; x++) {
			let c = node.children[x];
			let classset = c.className.split(" ");
			for(let y = 0; y < classset.length; y++) {
				if (classset[y] == classname) {
					childlist.push(c);
					break;
				}
			}
		}

		return childlist;
	},

	cg: (parent, eid, eclass, list_columns, list_rows) => {
		let element = DOM.c(parent, "div", eid, eclass);
		element.style.display = "grid";
		element.style.gridTemplateColumns = list_columns.join(" ");
		element.style.gridTemplateRows = list_rows.join(" ");
		return element;
	},

	cge: (parent, eid, eclass, startx, endx, starty, endy) => {
		let element = DOM.c(parent, "div", eid, eclass);
		element.style.gridColumnStart = startx;
		element.style.gridColumnEnd = endx;
		element.style.gridRowStart = starty;
		element.style.gridRowEnd = endy;
		return element;
	},
}
