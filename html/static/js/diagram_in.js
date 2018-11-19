let INPUT = {}

function Input_initialize(domelement, md_callback, mu_callback, mm_callback) {
	INPUT.dom = domelement;
	INPUT.px = 0;
	INPUT.py = 0;
	INPUT.diffx = 0;
	INPUT.diffy = 0;
	INPUT.click_dom = null;
	INPUT.md_callback = md_callback;
	INPUT.mu_callback = mu_callback;
	INPUT.mm_callback = mm_callback;
	INPUT.actionrunning = "";
	INPUT.domclass = {};
	INPUT.domid = {};

	domelement.addEventListener("mousedown", Input_mousedown);
	domelement.addEventListener("mouseup", Input_mouseup);
	domelement.addEventListener("mouseout", Input_mouseout);
	domelement.addEventListener("mousemove", Input_mousemove);

	domelement.addEventListener("touchstart", Input_touchstart);
	domelement.addEventListener("touchend", Input_touchend);
	domelement.addEventListener("touchmove", Input_touchmove);
	domelement.addEventListener("touchenter", Input_touchenter);
	domelement.addEventListener("touchleave", Input_touchleave);
	domelement.addEventListener("touchcancel", Input_touchcancel);

	domelement.addEventListener("contextmenu", Input_contextmenu);
}

function Input_registerclass(classname, callback_md, callback_mu, callback_mm) {
	INPUT.domclass[classname] = {
		"md": callback_md,
		"mu": callback_mu,
		"mm": callback_mm,
	}
}

function Input_registerid(id, callback_md, callback_mu, callback_mm) {
	INPUT.domid[id] = {
		"md": callback_md,
		"mu": callback_mu,
		"mm": callback_mm,
	}
}

function Input_findtarget(path) {
	for(let x = 0; x < path.length; x++) {
		let domelement = path[x];
		let id = domelement.id;
		if(id in INPUT.domid) {
			INPUT.click_dom = domelement;
			INPUT.click_dom_md = INPUT.domid[id]["md"];
			INPUT.click_dom_mu = INPUT.domid[id]["mu"];
			INPUT.click_dom_mm = INPUT.domid[id]["mm"];
			return true;
		}

		let classlist = domelement.className.split(" ");
		for(let x = 0; x < classlist.length; x++) {
			let cl = classlist[x];
			if(cl in INPUT.domclass) {
				INPUT.click_dom = domelement;
				INPUT.click_dom_md = INPUT.domclass[cl]["md"];
				INPUT.click_dom_mu = INPUT.domclass[cl]["mu"];
				INPUT.click_dom_mm = INPUT.domclass[cl]["mm"];
				return true;
			}
		}

		if(domelement == INPUT.dom) {
			INPUT.click_dom = domelement;
			INPUT.click_dom_md = INPUT.md_callback;
			INPUT.click_dom_mu = INPUT.mu_callback;
			INPUT.click_dom_mm = INPUT.mm_callback;
			return false;			
		}
	}

	INPUT.click_dom = null;
	return false;
}

function Input_callback(event_type) {
	if (INPUT.click_dom == null)
		return;

	// Run the event
	if((event_type == "md") && (INPUT.click_dom_md != null))
		INPUT.click_dom_md(INPUT.px, INPUT.py, INPUT.diffx, INPUT.diffy, INPUT.click_dom);
	else if ((event_type == "mu") && (INPUT.click_dom_mu != null))
		INPUT.click_dom_mu(INPUT.px, INPUT.py, INPUT.diffx, INPUT.diffy, INPUT.click_dom);
	else if ((event_type == "mm") && (INPUT.click_dom_mm != null))
		INPUT.click_dom_mm(INPUT.px, INPUT.py, INPUT.diffx, INPUT.diffy, INPUT.click_dom);
}

function Input_mousedown(ev) {
	

	if(INPUT.actionrunning != "")
		return false;

	if(ev.button == 0) { // Left click
		INPUT.px = ev.pageX;
		INPUT.py = ev.pageY;
		INPUT.diffx = 0;
		INPUT.diffy = 0;
		INPUT.actionrunning = "ML";
		if(Input_findtarget(ev.composedPath()))
			ev.preventDefault();

		Input_callback("md");
	}	
	
	return false
}

function Input_mouseup(ev) {
	if((ev.button == 0) && (INPUT.actionrunning == "ML")) { // Left button
		ev.preventDefault();
		INPUT.actionrunning = "";
		INPUT.px = ev.pageX;
		INPUT.py = ev.pageY;
		INPUT.diffx = 0;
		INPUT.diffy = 0;

		Input_callback("mu");
	}
	
	return false
}

function Input_mousemove(ev) {
	if(INPUT.actionrunning == "ML") {
		ev.preventDefault();
		let diffx = ev.pageX - INPUT.px;
		let diffy = ev.pageY - INPUT.py;
		INPUT.diffx = diffx;
		INPUT.diffy = diffy;
		INPUT.px = ev.pageX;
		INPUT.py = ev.pageY;

		Input_callback("mm");
	}

	return false
}

function Input_mouseout(ev) {
	if(ev.relatedTarget == document.body.parentNode)
		Input_mouseup(ev);
	//if((ev.button == 0) && (INPUT.actionrunning == "ML")) {
	//	console.log("Mouse out");
	//}
}

function Input_touchstart(ev) {
	

	if(INPUT.actionrunning != "" || (ev.changedTouches < 1))
		return false;

	INPUT.actionrunning = "T";
	INPUT.touchid = ev.changedTouches[0].identifier;
	INPUT.px = ev.changedTouches[0].pageX;
	INPUT.py = ev.changedTouches[0].pageY;
	INPUT.diffx = 0;
	INPUT.diffy = 0;

	if(Input_findtarget(ev.changedTouches[0].composedPath()))
		ev.preventDefault();

	Input_callback("md");

	return false;
}

function Input_touchend(ev) {
	if(INPUT.actionrunning == "T") {
		ev.preventDefault();
		for(let x = 0; x < ev.changedTouches.length; x++) {
			let t = ev.changedTouches[x];
			if(t.identifier == INPUT.touchid) {
				INPUT.actionrunning = "";
				
				INPUT.px = t.pageX;
				INPUT.py = t.pageY;
				INPUT.diffx = 0;
				INPUT.diffy = 0;

				Input_callback("mu");
			}
		}
	}

	return false;
}

function Input_touchmove(ev) {
	if(INPUT.actionrunning == "T") {
		ev.preventDefault();
		for(let x = 0; x < ev.changedTouches.length; x++) {
			let t = ev.changedTouches[x];
			if(t.identifier == INPUT.touchid) {
				let diffx = t.pageX - INPUT.px;
				let diffy = t.pageY - INPUT.py;
				
				INPUT.px = t.pageX;
				INPUT.py = t.pageY;
				INPUT.diffx = diffx;
				INPUT.diffy = diffy;

				Input_callback("mm");
			}
		}
	}

	return false;
}

function Input_touchenter(ev) {
	ev.preventDefault();
}

function Input_touchleave(ev) {
	ev.preventDefault();
	return Input_touchend(ev);
}

function Input_touchcancel(ev) {
	ev.preventDefault();
	return Input_touchend(ev);
}

function Input_contextmenu(ev) {
	ev.preventDefault();
	return false;
}