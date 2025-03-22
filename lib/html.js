const context = require('./context');
const PAGE_HEAD = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Network Maps</title><meta name="viewport" content="width=device-width, initial-scale=1.0">';
const PAGE_BODY = '</head><body onload="main()">';
const PAGE_BODY_NO_MAIN = '</head><body>';
const PAGE_END = '</body></html>';

let http_proto = null;
let ws_proto = null;
let google_analytics = '';

let static_server = '';
let server = '';
let ws_server = '';
let use_client_server = false;
let use_client_static_server = false;

function initialize() {
    if(context.config.google_analytics_tag)
        set_google_analytics(context.config.google_analytics_tag);
    set_use_ssl(context.config.use_ssl);

    if(context.config.server.hostname) {
        server = http_proto + context.config.server.hostname + ":" + context.config.server.port;
        ws_server = ws_proto + context.config.server.hostname + ":" + context.config.server.port;
    }
    else {}
    if(!context.config.staticserver.hostname)
        static_server = server;
    else
        static_server = http_proto + context.config.staticserver.hostname + ":" + context.config.staticserver.port;

    if(context.config.server.use_client)
        use_client_server = true;

    if(context.config.staticserver.use_client)
        use_client_static_server = true;
}

function set_google_analytics(tag) {
    if(tag !== '')
        google_analytics = `<script async src="https://www.googletagmanager.com/gtag/js?id=` + tag + `"></script>
                        <script>window.dataLayer = window.dataLayer || [];
                            function gtag(){
                                dataLayer.push(arguments);
                            }
                            gtag('js', new Date());
                            gtag('config', '` + tag + `');
                        </script>`
}

function set_use_ssl(use_ssl) {
    if(use_ssl) {
        http_proto = "https://"
        ws_proto = "wss://"
    }
    else {
        http_proto = "http://"
        ws_proto = "ws://"
    }
}

function get_http_proto() {
    return http_proto;
}

function get_server() {
    return server;
}

function html_addcss(cssfile) {
    return '<link rel="stylesheet" href="' + static_server + '/static/css/' + cssfile + '">'
}

function html_addjavascript(jsfile) {
    return '<script src="' + static_server + '/static/js/' + jsfile + '"></script>';
}

function html_addjavascriptconfig(diagram_uuid, shapegroup_key) {
    let string = '<script type="text/javascript">';
    
    if(use_client_server) {
        string += 'let wsconfig="' + ws_proto + '" + location.host + "/";';
        string += 'let appserver="' + http_proto + '" + location.host;';
    }
    else {
        string += 'let wsconfig="' + ws_server + '/";';
        string += 'let appserver="' + server + '";';
    }

    if(use_client_static_server)
        string += 'let staticurl="' + http_proto + '" + location.host;';
    else
        string += 'let staticurl="' + static_server + '";';
    
    if(diagram_uuid) {
        string += 'let diagram_uuid="' + diagram_uuid + '";'
    }
    if(shapegroup_key) {
        string += 'let shapegroup_key="' + shapegroup_key + '";'
    }
    string += '</script>';

    return string;
}

function html_addlistconstant(name, l) {
    let string = '<script type="text/javascript">';
    string += 'let ' + name +  '=[';

    for(let x = 0; x < l.length; x++) {
        string += '"' + l[x] + '",';
    }
    string += ']</script>';

    return string;
}

function htmlIndex() { 
    return  PAGE_HEAD + google_analytics +
            html_addcss("index.css") + 
            html_addjavascriptconfig() + 
            html_addjavascript("DOM.js") + 
            html_addjavascript("index.js") + 
            PAGE_BODY +
            PAGE_END;
}

function htmlNotFound() {
    return  PAGE_HEAD + google_analytics +
            PAGE_BODY_NO_MAIN +
            "Not found" +
            PAGE_END;
}

function htmlNotAuthorized(message) {
    return  PAGE_HEAD + google_analytics +
            PAGE_BODY_NO_MAIN +
            message +
            PAGE_END;
}

function htmlUserValidated() { 
    return  PAGE_HEAD + google_analytics +
            html_addcss("index.css") + 
            PAGE_BODY_NO_MAIN +
            `<div class="box" id="present">
                <div class="boxtitle">Your user has been activated</div>
                <div class="paragraph">In the following minutes you will receive an email with your username and password.</div>
                <div class="t_center">
                    <button class="button" onclick="window.location.href = '` + server + `';">Return to Index</button>
                </div>
            </div>` +
            PAGE_END;
}

function htmlPasswordReset() { 
    return  PAGE_HEAD + google_analytics +
            html_addcss("index.css") + 
            PAGE_BODY_NO_MAIN +
            `<div class="box" id="present">
                <div class="boxtitle">Your password has been reset.</div>
                <div class="paragraph">In the following minutes you will receive an email with your new password.</div>
                <div class="t_center">
                    <button class="button" onclick="window.location.href = '` + server + `';">Return to Index</button>
                </div>
            </div>` +
            PAGE_END;
}

function htmlDiagram(uuid) {
    return  PAGE_HEAD + google_analytics +
            html_addcss("diagram.css") + 
            html_addcss("diagram_win.css") + 
            html_addjavascriptconfig(uuid ? uuid : "notdefined") + 
            html_addjavascript("DOM.js") + 
            html_addjavascript("three.min.js") + 
            html_addjavascript("geometries.js") + 
            html_addjavascript("shapetools.js") + 
            html_addjavascript("diagram_menu.js") + 
            html_addjavascript("diagram_wgl.js") + 
            html_addjavascript("diagram_wgl_font.js") + 
            html_addjavascript("diagram_ws.js") +
            html_addjavascript("diagram_in.js") +
            html_addjavascript("diagram_win.js") +
            html_addjavascript("diagram.js") + 
            PAGE_BODY +
            PAGE_END;
}

function htmlShapegroups() {
    const shapegroup_categories = context.usermgt.data.shape_group_data.categories
    return  PAGE_HEAD + google_analytics +
            html_addcss("index.css") + 
            html_addjavascriptconfig() + 
            html_addlistconstant("SHAPEGROUP_CATEGORIES", shapegroup_categories) +
            html_addjavascript("DOM.js") + 
            html_addjavascript("shapegroups.js") + 
            PAGE_BODY +
            PAGE_END;
}

function htmlShapegroupEditor(shapegroup_key) {
    return  PAGE_HEAD + google_analytics +
            html_addcss("index.css") + 
            html_addcss("shapegroup_editor.css") + 
            html_addjavascriptconfig(null, shapegroup_key) + 
            html_addjavascript("DOM.js") + 
            html_addjavascript("three.min.js") + 
            html_addjavascript("diagram_in.js") + 
            html_addjavascript("shapetools.js") + 
            html_addjavascript("shapegroup_editor.js") + 
            PAGE_BODY +
            PAGE_END;
}

function htmlUsertextures() {
    return  PAGE_HEAD + google_analytics +
            html_addcss("index.css") + 
            html_addcss("usertextures.css") + 
            html_addjavascriptconfig() + 
            html_addjavascript("DOM.js") + 
            html_addjavascript("usertextures.js") +
            PAGE_BODY +
            PAGE_END;
}

module.exports = {
    "index": htmlIndex,
    "notFound": htmlNotFound,
    "notAuthorized": htmlNotAuthorized,
    "userValidated": htmlUserValidated,
    "passwordReset": htmlPasswordReset,
    "diagram": htmlDiagram,
    "get_http_proto": get_http_proto,
    "get_server": get_server,
    "initialize": initialize,
    "shapegroups": htmlShapegroups,
    "shapegroup_editor": htmlShapegroupEditor,
    "usertextures": htmlUsertextures,
}
