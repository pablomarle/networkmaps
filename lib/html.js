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

function initialize(config) {
    if(config.google_analytics_tag)
        set_google_analytics(config.google_analytics_tag);
    set_use_ssl(config.use_ssl);

    if(config.server.hostname) {
        server = http_proto + config.server.hostname + ":" + config.server.port;
        ws_server = ws_proto + config.server.hostname + ":" + config.server.port;
    }
    else {}
    if(!config.staticserver.hostname)
        static_server = server;
    else
        static_server = http_proto + config.staticserver.hostname + ":" + config.staticserver.port;
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

function html_addcss(server, port, cssfile) {
    return '<link rel="stylesheet" href="' + static_server + '/static/css/' + cssfile + '">'
}

function html_addjavascript(server, port, jsfile) {
    return '<script src="' + static_server + '/static/js/' + jsfile + '"></script>';
}

function html_addjavascriptconfig(wsserver, wsport, staticserver, staticport, diagram_uuid) {
    let string = '<script type="text/javascript">';
    
    string += 'let wsconfig="' + ws_server + '/";';
    string += 'let staticurl="' + static_server + '";';

    if(diagram_uuid) {
        string += 'let diagram_uuid="' + diagram_uuid + '";'
    }
    string += '</script>';

    return string;
}

function html_index(config) { 
    return  PAGE_HEAD + google_analytics +
            '<link href="' + http_proto + 'fonts.googleapis.com/css?family=Kalam:400,700" rel="stylesheet">' +
            html_addcss(config.staticserver.hostname, config.staticserver.port, "index.css") + 
            html_addjavascriptconfig(config.server.hostname, config.server.port, config.staticserver.hostname, config.staticserver.port) + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "DOM.js") + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "three.min.js") + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "index.js") + 
            PAGE_BODY +
            PAGE_END;
}

function html_not_found(config) {
    return  PAGE_HEAD + google_analytics +
            PAGE_BODY_NO_MAIN +
            "Not found" +
            PAGE_END;
}

function html_user_validated(config) { 
    return  PAGE_HEAD + google_analytics +
            '<link href="' + http_proto + 'fonts.googleapis.com/css?family=Kalam:400,700" rel="stylesheet">' +
            html_addcss(config.staticserver.hostname, config.staticserver.port, "index.css") + 
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

function html_password_reset(config) { 
    return  PAGE_HEAD + google_analytics +
            '<link href="' + http_proto + 'fonts.googleapis.com/css?family=Kalam:400,700" rel="stylesheet">' +
            html_addcss(config.staticserver.hostname, config.staticserver.port, "index.css") + 
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

function html_diagram(config, uuid) {
    return  PAGE_HEAD + google_analytics +
            html_addcss(config.staticserver.hostname, config.staticserver.port, "diagram.css") + 
            html_addcss(config.staticserver.hostname, config.staticserver.port, "diagram_win.css") + 
            html_addjavascriptconfig(config.server.hostname, config.server.port, config.staticserver.hostname, config.staticserver.port, uuid) + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "DOM.js") + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "three.min.js") + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "geometries.js") + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "diagram_menu.js") + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "diagram_wgl.js") + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "diagram_wgl_font.js") + 
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "diagram_ws.js") +
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "diagram_in.js") +
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "diagram_win.js") +
            html_addjavascript(config.staticserver.hostname, config.staticserver.port, "diagram.js") + 
            PAGE_BODY +
            PAGE_END;
}

module.exports = {
    "index": html_index,
    "not_found": html_not_found,
    "user_validated": html_user_validated,
    "password_reset": html_password_reset,
    "diagram": html_diagram,
    "get_http_proto": get_http_proto,
    "initialize": initialize,
}
