let INPUT = {}

function Input_initialize(domelement, md_callback, mu_callback, mm_callback, mo_callback, mw_callback) {
    INPUT.dom = domelement;
    INPUT.px = 0;
    INPUT.py = 0;
    INPUT.diffx = 0;
    INPUT.diffy = 0;
    INPUT.click_dom = null;
    INPUT.md_callback = md_callback;
    INPUT.mu_callback = mu_callback;
    INPUT.mm_callback = mm_callback;
    INPUT.mo_callback = mo_callback;
    INPUT.mw_callback = mw_callback;

    INPUT.actionrunning = "";
    INPUT.domclass = {};
    INPUT.domid = {};
    INPUT.contextmenuid = {};

    domelement.addEventListener("mousedown", Input_mousedown);
    domelement.addEventListener("mouseup", Input_mouseup);
    domelement.addEventListener("mouseout", Input_mouseout);
    domelement.addEventListener("mousemove", Input_mousemove);
    domelement.addEventListener("wheel", Input_mousewheel, {passive: false});

    domelement.addEventListener("touchstart", Input_touchstart, {passive: false});
    domelement.addEventListener("touchend", Input_touchend, {passive: false});
    domelement.addEventListener("touchmove", Input_touchmove, {passive: false});
    domelement.addEventListener("touchenter", Input_touchenter, {passive: false});
    domelement.addEventListener("touchleave", Input_touchleave, {passive: false});
    domelement.addEventListener("touchcancel", Input_touchcancel, {passive: false});

    domelement.addEventListener("contextmenu", Input_contextmenu, {passive: false});
}

function Input_registerclass(classname, callback_md, callback_mu, callback_mm, callback_mo, callback_mw) {
    INPUT.domclass[classname] = {
        "md": callback_md,
        "mu": callback_mu,
        "mm": callback_mm,
        "mo": callback_mo,
        "mw": callback_mw,
    }
}

function Input_registerid(id, callback_md, callback_mu, callback_mm, callback_mo, callback_mw) {
    INPUT.domid[id] = {
        "md": callback_md,
        "mu": callback_mu,
        "mm": callback_mm,
        "mo": callback_mo,
        "mw": callback_mw,
    }
}

function Input_registercontextmenuid(id, callback) {
    INPUT.contextmenuid[id] = callback;
}

function Input_findtarget_contextmenu(path) {
    for(let x = 0; x < path.length; x++) {
        let domelement = path[x];
        let id = domelement.id;
        if(id in INPUT.contextmenuid) {
            return INPUT.contextmenuid[id];
        }
    }

    return null;
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
            INPUT.click_dom_mo = INPUT.domid[id]["mo"];
            INPUT.click_dom_mw = INPUT.domid[id]["mw"];
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
                INPUT.click_dom_mo = INPUT.domclass[cl]["mo"];
                INPUT.click_dom_mw = INPUT.domclass[cl]["mw"];
                return true;
            }
        }

        if(domelement == INPUT.dom) {
            INPUT.click_dom = domelement;
            INPUT.click_dom_md = INPUT.md_callback;
            INPUT.click_dom_mu = INPUT.mu_callback;
            INPUT.click_dom_mm = INPUT.mm_callback;
            INPUT.click_dom_mo = INPUT.mo_callback;
            INPUT.click_dom_mw = INPUT.mw_callback;
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
        INPUT.click_dom_md(INPUT.px, INPUT.py, INPUT.diffx, INPUT.diffy, INPUT.click_dom, INPUT.shift);
    else if ((event_type == "mu") && (INPUT.click_dom_mu != null))
        INPUT.click_dom_mu(INPUT.px, INPUT.py, INPUT.diffx, INPUT.diffy, INPUT.click_dom);
    else if ((event_type == "mm") && (INPUT.click_dom_mm != null))
        INPUT.click_dom_mm(INPUT.px, INPUT.py, INPUT.diffx, INPUT.diffy, INPUT.click_dom);
    else if ((event_type == "mo") && (INPUT.click_dom_mo != null))
        INPUT.click_dom_mo(INPUT.px, INPUT.py, INPUT.click_dom);
    else if ((event_type == "mw") && (INPUT.click_dom_mw != null))
        INPUT.click_dom_mw(INPUT.dx, INPUT.dy, INPUT.click_dom);
}

function Input_getComposedPath(ev) {
    if(ev.composedPath == 1)
        return ev.composedPath();
    else {
        let result = [];
        let current = ev.target;
        while(current) {
            result.push(current);
            current = current.parentNode;
        }
        return result;
    }
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
        INPUT.ctrl = ev.ctrlKey;
        INPUT.shift = ev.shiftKey;
        let composedPath = Input_getComposedPath(ev);

        if(Input_findtarget(composedPath))
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
    else {
        INPUT.diffx = 0;
        INPUT.diffy = 0;
        INPUT.px = ev.pageX;
        INPUT.py = ev.pageY;
        let composedPath = Input_getComposedPath(ev);

        if(Input_findtarget(composedPath))
            ev.preventDefault();

        Input_callback("mo");
    }

    return false
}

function Input_mouseout(ev) {
    if(ev.relatedTarget == document.body.parentNode)
        Input_mouseup(ev);
}

function Input_mousewheel(ev) {
    INPUT.dx = ev.deltaX;
    INPUT.dy = ev.deltaY;
    
    let composedPath = Input_getComposedPath(ev);
    
    ev.preventDefault();

    Input_callback("mw");
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

    if(Input_findtarget(Input_getComposedPath(ev)))
        ev.preventDefault();

    Input_callback("md");

    return false;
}

function Input_touchend(ev) {
    if(INPUT.actionrunning == "T") {
        //ev.preventDefault();
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
        //ev.preventDefault();
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

    let composedPath = Input_getComposedPath(ev);
    let callback = Input_findtarget_contextmenu(composedPath);
    if(callback) {
        callback(Math.floor(ev.pageX), Math.floor(ev.pageY));
    }

    return false;
}