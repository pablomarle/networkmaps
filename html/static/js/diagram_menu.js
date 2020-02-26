MENU = {
    toolboxes: {
        camera: {
            init_left: -142, left: -142, width: 128,
            name: "Move Camera",
            components: [
                {n: "Move",     s: "CM",    i: "cam_move.png",      f: null, d: "Move the view\nQuick access key: 'q'", q: "KeyQ"},
                {n: "Rotate",   s: "CR",    i: "cam_rotate.png",    f: null, d: "Rotate the view\nQuick access key: 'w'", q: "KeyW"},
                {n: "Zoom",     s: "CZ",    i: "cam_zoom.png",      f: null, d: "Zoom in and out\nQuick access key: 'e'", q: "KeyE"},
            ]},
        element: {
            init_left: -142, left: -142, width: 128,
            name: "Change Elements",
            components: [
                {n: "Move",     s: "EM",    i: "move.png",      f: null, d: "Move diagram elements\nQuick access key: 'a'", q: "KeyA"},
                {n: "Rotate",   s: "ER",    i: "rotate.png",    f: null, d: "Rotate diagram elements\nQuick access key: 's'", q: "KeyS"},
                {n: "Resize",   s: "EX",    i: "resize.png",    f: null, d: "Resize diagram elements\nQuick access key: 'd'", q: "KeyD"},
                {n: "Settings", s: "EC",    i: "settings.png",  f: null, d: "View the settings of an element\nQuick access key: 'z'", q: "KeyZ"},
                {n: "Config",   s: "EI",    i: "edit.png",      f: null, d: "View config related to a diagram element\nQuick access key: 'x'", q: "KeyX"},
                {n: "Delete",   s: "ED",    i: "delete.png",    f: null, d: "Delete an element of the diagram\nQuick access key: 'c'", q: "KeyC"},
                {n: "Base",     s: null,    i: "base.png",      f: "base_change", d: "Modify Floors and walls."},
                {n: "Format",   s: null,    i: "brush.png",     f: "format", d: "Format Elements, links, text and symbols."},
                {n: "V.Move",   s: "EMV",   i: "move_v.png",    f: null, d: "Move diagram elements vertically.\nCurrently only available for Symbols."},
                {n: "Data",     s: "EDT",   i: "text.png",      f: null, d: "Element Data and Mouse Over Info."},
            ]},
        format: {
            init_left: -142, left: -142, width: 128,
            name: "Format Elements",
            components: [
                {n: "Copy",     s: "FC",    i: "palette.png",   f: null, d: "Copy format from element.\nQuick access key: 'r", q: "KeyR"},
                {n: "Paste",    s: "FP",    i: "brush.png",     f: null, d: "Paste format to element\nQuick access key: 't'", q: "KeyT"},
                {n: "WinColor",  s: "FW",    i: "settings.png", f: null, d: "Open format color window"},
                {n: "WinText",   s: "FT",    i: "text.png",     f: null, d: "Open format text window"},
                {n: "WinLink",   s: "FL",    i: "link.png",     f: null, d: "Open format link window"},
            ]},
        new: {
            init_left: -142, left: -142, width: 128,
            name: "Add New Elements",
            components: [
                {n: "Device",   s: null,    i: "device_router.png", f: "new_device",    d: "Add new devices to the diagram." },
                {n: "Link",     s: null,    i: "link.png",          f: "new_link",      d: "Add connections between devices." },
                {n: "Base",     s: null,    i: "base.png",          f: "new_base",      d: "Add new Floors or Walls."},
                {n: "Text",     s: null,    i: "text.png",          f: "new_text",      d: "Add text to the diagrams." },
                {n: "Symbol",   s: null,    i: "symbol.png",        f: "new_symbol",    d: "Add symbols to the diagrams." },
            ]},
        new_l3: {
            init_left: -142, left: -142, width: 128,
            name: "Add New Elements",
            components: [
                {n: "Base",     s: null,    i: "base.png",          f: "new_base",      d: "Add new Floors or Walls."},
                {n: "Routing",  s: null,    i: "routing.png",       f: "new_routing",   d: "Add new routing protocol information."},
                {n: "Text",     s: null,    i: "text.png",          f: "new_text",      d: "Add text to the diagrams." },
                {n: "Symbol",   s: null,    i: "symbol.png",        f: "new_symbol",    d: "Add symbols to the diagrams." },
                {n: "Link",     s: null,    i: "link.png",          f: "new_l3_link",   d: "Add connections between devices." },
            ]},
        new_device: {
            init_left: -142, left: -142, width: 128,
            name: "Add New Devices",
            components: [
/*                {n: "Shapes",   s: null,    i: "device_cube.png",       f: "new_device_shapes",     d: "Simple devices with geometrical shapes." },
                {n: "Network",  s: null,    i: "device_router.png", f: "new_device_network",    d: "Network devices like routers and switches."},
                {n: "Clients",  s: null,    i: "device_user.png",       f: "new_device_clients",    d: "Laptops, desktops, phones, ..." },
                {n: "Servers",  s: null,    i: "device_server.png",       f: "new_device_servers",    d: "Different kind of servers."},
                {n: "Security",  s: null,    i: "device_firewall.png",      f: "new_device_security",   d: "Security devices like firewalls, "}, */
            ]},
/*        new_device_shapes: {
            init_left: -190, left: -190, width: 170,
            name: "Add Basic Shapes",
            components: [
                {n: "Cube",     s: "AD_BC",    i: "device_cube.png",      f: null},
                {n: "Cube/2",     s: "AD_BC2",    i: "device_cube2.png",   f: null, d: "Half cube"},
                {n: "Cylinder", s: "AD_BY",    i: "device_cylinder.png",      f: null},
                {n: "Cylind/2", s: "AD_BY2",    i: "device_cylinder2.png",     f: null, d: "Half cylinder."},
                {n: "Sphere",   s: "AD_BS",    i: "device_sphere.png",      f: null},
                {n: "Cone",     s: "AD_BO",    i: "device_cone.png",      f: null},
                {n: "Piramid",    s: "AD_BP",    i: "device_pyramid.png",      f: null},
            ]},
        new_device_network: {
            init_left: -190, left: -190, width: 170,
            name: "Add Network Device",
            components: [
                {n: "Router",   s: "ADR",    i: "device_router.png",      f: null},
                {n: "Switch",   s: "ADS",    i: "device_switch.png",      f: null},
                {n: "ML Dev",   s: "ADML",   i: "device_ml.png",          f: null, d: "Multilayer Device."},
                {n: "Load B",   s: "ADLB",   i: "device_lb.png",          f: null, d: "Load Balancer."},
                {n: "Cloud",    s: "AD_NC",    i: "device_cloud.png",     f: null},
                {n: "ATM",      s: "AD_NA",    i: "device_atm.png",      f: null},
                {n: "ML Sw",    s: "AD_NM",    i: "device_mlswitch.png",      f: null, d: "Multilayer Switch."},
                {n: "T.Server", s: "AD_NT",    i: "device_ts.png",      f: null, d: "Terminal Server."},
                {n: "Wireless", s: "AD_NW",    i: "device_wireless.png",      f: null, d: "Wirless Router."},
                {n: "Wireless", s: "AD_NW2",    i: "device_wireless2.png",      f: null, d: "Wirless Router."},
                {n: "mpls pe",  s: "AD_NME",    i: "device_mpls_pe.png",      f: null, d: "MPLS Provider Edge."},
                {n: "mpls p",   s: "AD_NMP",    i: "device_mpls_p.png",      f: null, d: "MPLS P"},
                {n: "VxLan",    s: "AD_NVX",    i: "device_vxlan.png",      f: null, d: "VxLAN Router."},
                {n: "V.Switch", s: "AD_NVS",    i: "device_v_switch.png",      f: null, d: "Virtual Switch."},
                {n: "V.Router", s: "AD_NVR",    i: "device_v_router.png",      f: null, d: "Virtual Router."},
                {n: "IP PBX",     s: "AD_NVP",    i: "device_pbx.png",      f: null, d: "VoIP PBX"},
                {n: "VoIP G.",     s: "AD_NVG",    i: "device_voice_gateway.png",      f: null, d: "VoIP Gateway"},
            ]},
        new_device_clients: {
            init_left: -190, left: -190, width: 170,
            name: "Add Clients",
            components: [
                {n: "User",         s: "AD_CU",    i: "device_user.png",      f: null},
                {n: "Desktop",      s: "AD_CD",    i: "device_desktop.png",      f: null},
                {n: "Laptop",       s: "AD_CL",    i: "device_laptop.png",      f: null},
                {n: "Tablet",       s: "AD_CT",    i: "device_tablet.png",      f: null},
                {n: "Phone",        s: "AD_CP",    i: "device_phone.png",      f: null},
                {n: "Phone",        s: "AD_CP2",    i: "device_phone2.png",      f: null},
                {n: "Printer",      s: "AD_CPT",    i: "device_printer.png",      f: null},
                {n: "Home",         s: "AD_CBH",    i: "device_home.png",      f: null},
                {n: "Office",       s: "AD_CBO",    i: "device_office.png",      f: null},
                {n: "HQ",           s: "AD_CBQ",    i: "device_hq.png",      f: null},
                {n: "Car",          s: "AD_CTC",    i: "device_car.png",      f: null},
                {n: "Mac",          s: "AD_COM",    i: "device_mac.png",      f: null},
                {n: "Windows",      s: "AD_COW",    i: "device_windows.png",      f: null},
                {n: "Linux",        s: "AD_COL",    i: "device_linux.png",      f: null},
            ]},
        new_device_servers: {
            init_left: -190, left: -190, width: 170,
            name: "Add Servers",
            components: [
                {n: "Server",   s: "ADSR",   i: "device_server.png",      f: null},
                {n: "Storage",  s: "ADST",   i: "device_storage.png",     f: null},
                {n: "DB",       s:  "AD_SDB",    i: "device_db.png",      f: null},
                {n: "Web",      s:  "AD_SW",    i: "device_www.png",      f: null},
                {n: "Mail",     s:  "AD_SM",    i: "device_mail.png",      f: null},
                {n: "DNS",      s:  "AD_SD",    i: "device_dns.png",      f: null},
                {n: "Log",      s:  "AD_SL",    i: "device_log.png",      f: null},
                {n: "MemDB",    s:  "AD_SC",    i: "device_memdb.png",      f: null},
                {n: "LDAP",     s:  "AD_SA",    i: "device_ldap.png",      f: null},
                {n: "Robot",    s:  "AD_SR",    i: "device_robot.png",      f: null},
                {n: "Monitor",  s:  "AD_SMM",    i: "device_monitor.png",      f: null},
                {n: "V.Guest",  s:  "AD_SVG",    i: "device_vguest.png",      f: null},
                {n: "V.Host",   s:  "AD_SVH",    i: "device_vhost.png",      f: null},
                {n: "GPU",     s:  "AD_SN",    i: "device_gpu.png",      f: null},
                {n: "Windows",     s:  "AD_SOW",    i: "device_swindows.png",      f: null},
                {n: "Linux",     s:  "AD_SOL",    i: "device_slinux.png",      f: null},
                {n: "Mac",     s:  "AD_SOM",    i: "device_smac.png",      f: null},
            ]},
        new_device_security: {
            init_left: -190, left: -190, width: 170,
            name: "Add Security Devices",
            components: [
                {n: "Firewall",  s: "ADF",      i: "device_firewall.png",       f: null},
                {n: "Firewall",     s: "AD_XF",    i: "device_firewall2.png",   f: null},
                {n: "Proxy",     s: "AD_XP",    i: "device_proxy.png",          f: null},
                {n: "IPSec",     s: "AD_XI",    i: "device_ipsec.png",      f: null},
                {n: "ssl vpn",   s: "AD_XS",    i: "device_sslvpn.png",      f: null},
                {n: "Cert",      s: "AD_XC",    i: "device_cert.png",      f: null},
                {n: "Treat",     s: "AD_XT",    i: "device_threat.png",      f: null},
                {n: "TreatP",    s: "AD_XTP",    i: "device_av.png",      f: null, d: "Threat protection."},
                {n: "Bug",     s: "AD_XB",    i: "device_bug.png",      f: null},
                {n: "Virus",     s: "AD_XV",    i: "device_virus.png",      f: null},
                {n: "A.Virus",   s: "AD_XAV",    i: "device_av2.png",      f: null},
                {n: "A.Spam",    s: "AD_XAS",    i: "device_as.png",      f: null},
                {n: "Web F",       s: "AD_XWF",    i: "device_wf.png",      f: null, d: "Web Filtering"},
                {n: "Led",       s: "AD_XPL",    i: "device_led.png",      f: null},
                {n: "Lock",      s: "AD_XL",    i: "device_lock.png",      f: null},
                {n: "Hacker",    s: "AD_XH",    i: "device_hacker.png",      f: null},
            ]}, */
        new_link: {
            init_left: -190, left: -190, width: 170,
            name: "Add Link",
            components: [
                {n: "Line",     s: "ALL",    i: "link_line.png",      f: null, d: "Add straight link (cable) between devices."},
                {n: "Squared",  s: "ALS",    i: "link_squared.png",   f: null, d: "Add squared link (cable)between devices."},
                {n: "Joint",    s: "AJ",     i: "link_joint.png",     f: null, d: "Add Joint to an existing link.\nClick on the link to create the joint. After that, you can move the joint with the move tool."},
            ]},
        new_l3_link: {
            init_left: -190, left: -190, width: 170,
            name: "Add Link",
            components: [
                {n: "Joint",    s: "AJ",     i: "link_joint.png",     f: null, d: "Add Joint to an existing link.\nClick on the link to create the joint. After that, you can move the joint with the move tool."},
            ]},
        new_base: {
            init_left: -190, left: -190, width: 170,
            name: "Add Base",
            components: [
                {n: "Floor",    s: "ABF",    i: "base.png",      f: null},
            ]},
        new_text: {
            init_left: -190, left: -190, width: 170,
            name: "Add Text",
            components: [
                {n: "Base",     s: "ATB",    i: "text.png",      f: null},
            ]},
        new_symbol: {
            init_left: -190, left: -190, width: 170,
            name: "Add Symbol",
            components: [
                {n: "Flag",     s: "ASF",    i: "symbol_flag.png",      f: null},
                {n: "X",        s: "ASX",    i: "symbol_x.png",      f: null},
                {n: "V",        s: "ASV",    i: "symbol_v.png",      f: null},
                {n: "Arrow",    s: "ASA",    i: "symbol_a.png",      f: null},
            ]},
        base_change: {
            init_left: -142, left: -142, width: 128,
            name: "Change Base",
            components: [
                {n: "Move",     s: "BM",    i: "move.png",      f: null, d: "Move floors/walls\nQuick access key: 'f'", q: "KeyF"},
                {n: "Rotate",   s: "BR",    i: "rotate.png",    f: null, d: "Rotate floors/walls\nQuick access key: 'g'", q: "KeyG"},
                {n: "Resize",   s: "BX",    i: "resize.png",    f: null, d: "Resize floors/walls\nQuick access key: 'h'", q: "KeyH"},
                {n: "Settings", s: "BC",    i: "settings.png",  f: null, d: "View the settings of floors/walls\nQuick access key: 'v'", q: "KeyV"},
                {n: "Delete",   s: "BD",    i: "delete.png",    f: null, d: "Delete floors/walls\nQuick access key: 'b'", q: "KeyB"},
            ]},
        new_routing: {
            init_left: -190, left: -190, width: 170,
            name: "Routing Protocols",
            components: [
                {n: "BGPPeer",    s: "ARB",    i: "bgp.png",   f: null, d: "Add BGP Peering\n Click on source VRF and drag to destination VRF."},
            ]},
    }
}
