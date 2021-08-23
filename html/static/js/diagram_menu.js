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
                {n: "V.Move",   s: "EMV",   i: "move_v.png",    f: null, d: "Move diagram elements vertically."},
                {n: "Data",     s: "EDT",   i: "text.png",      f: null, d: "Element Data and Mouse Over Info."},
                {n: "URLs",     s: "EU",    i: "linksharing.png", f: null, d: "URLs of elements."},
                {n: "Shapes",   s: "ES",    i: "element_b.png",   f: null, d: "Add and remove groups of 3D shapes that are available on this diagram.\nA shape group is a collection of \"objects\" that can be added to the diagram with the \"New elements\" tool."},
            ]},
        format: {
            init_left: -142, left: -142, width: 128,
            name: "Format Elements",
            components: [
                {n: "Copy",     s: "FC",    i: "palette.png",   f: null, d: "Copy format from element.\nQuick access key: 'r", q: "KeyR"},
                {n: "Paste",    s: "FP",    i: "brush.png",     f: null, d: "Paste format to element\nQuick access key: 't'", q: "KeyT"},
                {n: "Color",  s: "FW",    i: "settings.png", f: null, d: "Open format color window"},
                {n: "Text",   s: "FT",    i: "text.png",     f: null, d: "Open format text window"},
                {n: "Link",   s: "FL",    i: "link.png",     f: null, d: "Open format link window"},
            ]},
        new: {
            init_left: -142, left: -142, width: 128,
            name: "Add",
            components: [
                {n: "Elements",   s: null,    i: "device_router.png", f: "new_device",    d: "Add new elements to the diagram." },
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
            name: "Add New Elements",
            components: []},
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
                {n: "B.Text",     s: "ATB",    i: "text.png",      f: null},
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
        frequent_L2: {
            init_left: -190, left: -142, width: 170,
            name: "Frequent Elements",
            components: []},
        frequent_L3: {
            init_left: -190, left: -142, width: 170,
            name: "Frequent Elements",
            components: []},
                    
        base_change: {
            init_left: -142, left: -142, width: 128,
            name: "Change Base",
            components: [
                {n: "B.Move",     s: "BM",    i: "move.png",      f: null, d: "Move floors/walls\nQuick access key: 'f'", q: "KeyF"},
                {n: "B.Rotate",   s: "BR",    i: "rotate.png",    f: null, d: "Rotate floors/walls\nQuick access key: 'g'", q: "KeyG"},
                {n: "B.Resize",   s: "BX",    i: "resize.png",    f: null, d: "Resize floors/walls\nQuick access key: 'h'", q: "KeyH"},
                {n: "B.Settings", s: "BC",    i: "settings.png",  f: null, d: "View the settings of floors/walls\nQuick access key: 'v'", q: "KeyV"},
                {n: "B.Delete",   s: "BD",    i: "delete.png",    f: null, d: "Delete floors/walls\nQuick access key: 'b'", q: "KeyB"},
            ]},
        new_routing: {
            init_left: -190, left: -190, width: 170,
            name: "Routing Protocols",
            components: [
                {n: "BGPPeer",    s: "ARB",    i: "bgp.png",   f: null, d: "Add BGP Peering\n Click on source VRF and drag to destination VRF."},
            ]},
    }
}
