const WebSocket = require('ws');

/**
 * Callback used when sending a request to the diagram endpoint. It will be called
 * when a reply for this request is received
 * @callback diagramRequestCallback
 * @param {string}      error   Error received or null if no error.
 * @param {Object}      data    Response data from the server if there was no error.
 */

/**
 * Class to programatically edit a specific network diagram on NetworkMaps.
 * Used by NetworkMapsLib to edit different diagrams
 */
class Diagram {
    constructor(websocket, ready_callback) {
        this.connected = true;
        this.ws = websocket;
        this.init = true;
        this.callbacks = {
            reload_data: (e, d) => {
                if(e)
                    ready_callback(e);
                else
                    ready_callback(null, this);
            },
        };
        this.msg_id = 1;

        this.ws.on("message", (data) => {
            let jdata = JSON.parse(data);
            // The I message is never a broadcast, and I use it to get the conn_id that will be used to
            // identify replies to my messages (as usually replies are broadcasted to all clients).
            if(jdata.m === "I") {
                this.data = jdata.d.d;
                this.conn_id = jdata.conn_id;
                if(this.callbacks.reload_data) {
                    this.callbacks.reload_data(null, this.data);
                    delete this.callbacks.reload_data;
                }
                return;
            }

            // If the message does not have my conn_id, it's not a reply from a message I sent. Ignore it.
            if(jdata.conn_id !== this.conn_id) {
                return;
            }
            
            if(jdata.m === "E") {
                if(this.callbacks[jdata.msg_id]) {
                    this.callbacks[jdata.msg_id](jdata.d.error);
                    delete this.callbacks[jdata.msg_id];
                }

                return;
            }
            else {
                if(this.callbacks[jdata.msg_id]) {
                    this.callbacks[jdata.msg_id](null, jdata.d);
                    delete this.callbacks[jdata.msg_id];
                }                
            }
        }); 
    }

    /**
     * This function will get the already loaded data of the diagram and send it to a callback function.
     * If this data is still not available (might happen if we just establish the connection), it will set up
     * a function to be called once this data is received
     */
    get_data(callback) {
        if(this.data)
            callback(null, this.data)
        else
            this.callbacks.reload_data = callback;
    }

    /**
     * This function will send a message to the diagram enpoint requesting the latest diagram data. once this data is received,
     * the callback function provided will be called
     * @param {Function}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    reload_data(callback) {
        if(!this.connected)
            callback("Not Connected.");
        this.callbacks.reload_data = callback;
        this.ws.send(JSON.stringify({
            m: "I",
            d: {},
            msg_id: -1,
        }));
    }

    /**
     * This function will send a provided message to the diagram endpoint and set up a callback for when the reply to this
     * message is received.
     * @param {Object}      message     Message to be sent to the server.
     * @param {Function}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    send_message(message, callback) {
        if(!this.connected) {
            callback("Not Connected.");
            return;
        }

        message.msg_id = this.msg_id++;

        this.callbacks[message.msg_id] = callback;
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Function to create a base on a diagram.
     * @param {string}      view        L2 or L3 depending on which view we want this base to belong
     * @param {number}      px          Coordinate x of the base
     * @param {number}      py          Coordinate y of the base. In general, this should be 0
     * @param {number}      pz          Coordinate z of the base.
     * @param {number}      sx          Size on the x axis of this base.
     * @param {number}      sy          Size on the y axis of this base. In general, this should be 1
     * @param {number}      sz          Size on the z axis of this base.
     * @param {number}      rx          Rotation on degrees of the base in the x axis. Should be 0.
     * @param {number}      ry          Rotation on degrees of the base in the y axis.
     * @param {number}      rz          Rotation on degrees of the base in the z axis. Should be 0.
     * @param {string}      st          Type of this base. Currently, only "F" is supported.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    add_base(view, px, py, pz, sx, sy, sz, rx, ry, rz, st, callback) {
        let message = {
            m: "A",
            d: {
                v: view,
                t: "base",
                px: px, py: py, pz: pz, sx: sx, sy: sy, sz: sz, rx: rx, ry: ry, rz: rz,
                st: st,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to create a device on a diagram.
     * @param {number}      px          Coordinate x of the device (in base coords).
     * @param {number}      py          Coordinate y of the device (in base coords). To have it on the floor, y must match the sy of the base
     * @param {number}      pz          Coordinate z of the device (in base coords).
     * @param {number}      sx          Size on the x axis of this device.
     * @param {number}      sy          Size on the y axis of this device.
     * @param {number}      sz          Size on the z axis of this device.
     * @param {number}      rx          Rotation on degrees of the device in the x axis. Should be 0.
     * @param {number}      ry          Rotation on degrees of the device in the y axis.
     * @param {number}      rz          Rotation on degrees of the device in the z axis. Should be 0.
     * @param {number}      color1      Integer representing the color1 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      color2      Integer representing the color2 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {string}      st          Subtype of this element (ej: "F", "R", "_COL", ...).
     * @param {string}      base        ID of the base where this device is located.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    add_device(st, px, py, pz, sx, sy, sz, rx, ry, rz, color1, color2, base, callback) {
        let message = {
            m: "A",
            d: {
                v: "L2",
                t: "device",
                px: px, py: py, pz: pz, sx: sx, sy: sy, sz: sz, rx: rx, ry: ry, rz: rz,
                color1: color1, color2: color2,
                base: base,
                st: st,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to create a link between devices on a diagram.
     * @param {string}      dev1_id     ID of the first device we want to link.
     * @param {string}      dev2_id     ID of the second device we want to link.
     * @param {number}      type        Integer representing the type of the link: 0: straight, 1: squared
     * @param {number}      color       Integer representing the color used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      weight      Integer representing the thickness of the link (0.001 - .5).
     * @param {number}      height      Height of the link relative to the y coord of the devices linked.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    add_link(dev1_id, dev2_id, type, color, weight, height, callback) {
        let message = {
            m: "A",
            d: {
                v: "L2",
                t: "link",
                dev1_id: dev1_id, dev2_id: dev2_id,
                type: type, weight: weight, height: height,
                color: color,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to create a joint in a link, l2segment, interface, svi_interface or p2p_interface.
     * @param {string}      view            L2 or L3 depending on which view the link/l2segment/... isg
     * @param {string}      element_type    link, l2segment, interface, svi_interface or p2p_interface.
     * @param {string}      id              Id of the element where the new joint will be added.
     * @param {string}      joint_index     Index of this joint on the list of joints. This is where the joint will be inserted.
     * @param {number}      px              Coordinate x of the joint (in world coords).
     * @param {number}      py              Coordinate y of the joint (in world coords).
     * @param {number}      pz              Coordinate z of the joint (in world coords).
     * @param {diagramRequestCallback}    callback        Function to be called when a response is received. Function will have two parameters: error and data received
     */
    add_joint(view, element_type, id, joint_index, px, py, pz, callback) {
        let message = {
            m: "A",
            d: {
                v: view,
                t: "joint",
                et: element_type,
                link_id: id, joint_index: joint_index,
                px: px, py: py, pz: pz,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to create a bgp peering between two vrfs
     * @param {string}      src_vrf_id      ID the first vrf that form this bgp peering
     * @param {string}      dst_vrf_id      ID the second vrf that form this bgp peering
     * @param {string}      transport       Whether bgp uses IPv4 or IPv6 as transport. Values can be either "ipv4" or "ipv6"
     * @param {string[]}    afisafi         List of address families exchanged on this peering: "ipv4/unicast", "ipv4/multicast", "ipv4/l3vpn", "ipv4/l3vpn-multicast", "ipv4/labeled", "ipv6/unicast", "ipv6/multicast", "ipv6/l3vpn", "ipv6/l3vpn-multicast", "ipv6/labeled", "l2vpn/vpls", "evpn"
     * @param {string}      src_ip          IP address used by the first vrf
     * @param {string}      dst_ip          IP address used by the second vrf
     * @param {diagramRequestCallback}    callback        Function to be called when a response is received. Function will have two parameters: error and data received
     */
    add_bgp_peering(src_vrf_id, dst_vrf_id, transport, afisafi, src_ip, dst_ip, callback) {
        let message = {
            m: "A",
            d: {
                v: "L3",
                t: "bgp_peering",
                src_vrf_id: src_vrf_id,
                dst_vrf_id: dst_vrf_id,
                transport: transport,
                afisafi: afisafi,
                src_ip: src_ip,
                dst_ip: dst_ip,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to create a text on a network diagram.
     * @param {string}      text            Text to be added.
     * @param {string}      view            L2 or L3 depending on which view the text is.
     * @param {number}      px              Coordinate x of the text (in base coords).
     * @param {number}      py              Coordinate y of the text (relative to the base sy).
     * @param {number}      pz              Coordinate z of the text (in base coords).
     * @param {number}      rx              Rotation on degrees of the text in the x axis.
     * @param {number}      ry              Rotation on degrees of the text in the y axis.
     * @param {string}      height          Height of the text.
     * @param {number}      color           Integer representing the color used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {string}      bg_type         Type of BG to be used: "n": no bg, "r": rectangle, "c": circle, "h", "p".
     * @param {string}      text_align      Text align: "l", "r" or "c"
     * @param {number}      bg_color        Integer representing the color used by the background. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      border_color    Integer representing the color used by the border. First byte R, Second G Third B: 0xRRGGBB.
     * @param {boolean}     bg_show         Boolean indicating if the background will be shown.
     * @param {boolean}     border_show     Boolean indicating if the border will be shown.
     * @param {number}      border_width    Width of the border (.01 - 1).
     * @param {number}      bg_depth        Depth of the background (.01 - 1).
     * @param {number}      rotation_x      Rotation of the text relative to the background.
     * @param {string}      base            ID of the base where this text is located.     
     * @param {diagramRequestCallback}    callback        Function to be called when a response is received. Function will have two parameters: error and data received
     */
    add_text(text, view, px, py, pz, rx, ry, height, color, bg_type, text_align, bg_color, border_color, bg_show, border_show, border_width, bg_depth, rotation_x, base, callback) {
        let message = {
            m: "A",
            d: {
                v: view,
                t: "text",
                base: base,
                px: px, py: py, pz: pz,
                rx: rx, ry: ry,
                text: text,
                height: height, color: color, text_align: text_align, rotation_x: rotation_x,
                bg_show: bg_show, bg_type: bg_type, bg_color: bg_color, bg_depth: bg_depth,
                border_show: border_show, border_color: border_color, border_width: border_width,

            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to create a symbol on a diagram.
     * @param {string}      st          Subtype of this element (ej: "X", "V", "A", "F").
     * @param {string}      view        L2 or L3 depending on which view the symbol is.
     * @param {number}      px          Coordinate x of the symbol (in base coords).
     * @param {number}      py          Coordinate y of the symbol (in base coords). To have it on the floor, y must match the sy of the base
     * @param {number}      pz          Coordinate z of the symbol (in base coords).
     * @param {number}      sx          Size on the x axis of this symbol.
     * @param {number}      sy          Size on the y axis of this symbol.
     * @param {number}      sz          Size on the z axis of this symbol.
     * @param {number}      rx          Rotation on degrees of the symbol in the x axis. Should be 0.
     * @param {number}      ry          Rotation on degrees of the symbol in the y axis.
     * @param {number}      rz          Rotation on degrees of the symbol in the z axis. Should be 0.
     * @param {number}      color       Integer representing the color1 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {Object}      cd          Object with the custom data of the symbol. The attributes to pass here are dependant on the subtype of this element:
     *                                          if st == "F" (flag), object should have:
     *                                              {number}    flagcolor: Integer representing the color used by the flag. First byte R, Second G Third B: 0xRRGGBB.
     *                                          if st == "A" (arrow), object shuld have:
     *                                              {number}    head_color:     Integer representing the color used by the head of the arrow. First byte R, Second G Third B: 0xRRGGBB.
     *                                              {string}    head_type:      Type of head: "n", "f", "v", "i", "p", "r" or "s"
     *                                              {string}    tail_type:      Type of tail: "n", "f", "v", "i", "p", "r" or "s"
     *                                              {string}    shaft_type:     Type of shaft: "s" or "r"
     *                                              {number}    head_sx_per:    Percentage of the shaft width used as head width.
     *                                              {number}    head_sy_per:    Percentage of the shaft length used as head length.
     *                                              {number}    head_sz_per:    Percentage of the shaft depth used as head depth.
     *                                              {number}    tail_sx_per:    Percentage of the shaft width used as head width.
     *                                              {number}    tail_sy_per:    Percentage of the shaft length used as head length.
     *                                              {number}    tail_sz_per:    Percentage of the shaft depth used as head depth.
     *                                              {number}    shaft_dots:     1 for solid line. Otherwise, number of dots of the line.
     * @param {string}      base        ID of the base where this symbol is located.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    add_symbol(st, view, px, py, pz, sx, sy, sz, rx, ry, rz, color, cd, base, callback) {
        let message = {
            m: "A",
            d: {
                v: view,
                t: "symbol",
                px: px, py: py, pz: pz, sx: sx, sy: sy, sz: sz, rx: rx, ry: ry, rz: rz,
                color: color,
                base: base,
                st: st,
                cd: cd,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to move a base on a diagram.
     * @param {string}      view        L2 or L3 depending on which view the base is.
     * @param {string}      id          ID of the element.
     * @param {number}      px          Coordinate x of the element (in world coords).
     * @param {number}      py          Coordinate y of the element (in world coords).
     * @param {number}      pz          Coordinate z of the element (in world coords).
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    move_base(view, id, px, py, pz, callback) {
        let message = {
            m: "M",
            d: {
                v: view,
                t: "base",
                i: id,
                x: px, y: py, z: pz,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to move an element on a diagram. Used to move devices, text, symbols, l2segments and vrfs.
     * @param {string}      view        L2 or L3 depending on which view the element is.
     * @param {string}      type        Type of the element: device, symbol, text, vrf, l2segment.
     * @param {string}      id          ID of the element.
     * @param {number}      px          Coordinate x of the element (in base coords).
     * @param {number}      py          Coordinate y of the element (in base coords). To have it on the floor, y must match the sy of the base
     * @param {number}      pz          Coordinate z of the element (in base coords).
     * @param {string}      base        ID of the base where this element is located.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    move_element(view, type, id, px, py, pz, base, callback) {
        let message = {
            m: "M",
            d: {
                v: view,
                t: type,
                i: id,
                x: px, y: py, z: pz,
                base: base,
            },
        }
        this.send_message(message, callback);
     }

    /**
     * Function to move a joint on a diagram.
     * @param {string}      view            L2 or L3 depending on which view the joint is.
     * @param {string}      element_type    link, l2segment, interface, svi_interface or p2p_interface.
     * @param {string}      id              Id of the element where the new joint will be added.
     * @param {number}      joint_index     Index of this joint on the list of joints. This is where the joint will be inserted.
     * @param {number}      px              Coordinate x of the joint (in world coords).
     * @param {number}      py              Coordinate y of the joint (in world coords). To have it on the floor, y must match the sy of the base
     * @param {number}      pz              Coordinate z of the joint (in world coords).
     * @param {diagramRequestCallback}    callback        Function to be called when a response is received. Function will have two parameters: error and data received
     */
    move_joint(view, element_type, id, joint_index, px, py, pz, callback) {
        let message = {
            m: "M",
            d: {
                v: view,
                t: "joint",
                et: element_type,
                i: id,
                x: px, y: py, z: pz,
                joint_index: joint_index,
            },
        }
        this.send_message(message, callback)
    }

    /**
     * Function to move a bgp peering
     * @param {string}      id          ID of the element.
     * @param {number}      curve_x     How much the curve goes in the x direction (to the sides).
     * @param {number}      curve_y     How high does the curve go.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    move_bgp_peering(id, curve_x, curve_y, callback) {
        let message = {
            m: "M",
            d: {
                v: "L3",
                t: "bgp_peering",
                i: id,
                curve_x: curve_x, curve_y: curve_y,
            },
        }
        this.send_message(message, callback);
     }

    /**
     * Function to rotate an element on a diagram. Used to rotate bases, devices, text, symbols, l2segments and vrfs.
     * @param {string}      view        L2 or L3 depending on which view the element is.
     * @param {string}      type        Type of the element: base, device, symbol, text, vrf, l2segment
     * @param {string}      id          ID of the element.
     * @param {number}      rx          Angle in degrees on the x axis.
     * @param {number}      ry          Angle in degrees on the y axis.
     * @param {number}      rz          Angle in degrees on the z axis.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    rotate_element(view, type, id, rx, ry, rz, callback) {
        let message = {
            m: "R",
            d: {
                v: view,
                t: type,
                i: id,
                x: rx, y: ry, z: rz,
            },
        }
        this.send_message(message, callback);
     }

    /**
     * Function to resize an element on a diagram. Used to resize bases, devices, symbols, l2segments and vrfs.
     * @param {string}      view        L2 or L3 depending on which view the element is.
     * @param {string}      type        Type of the element: base, device, symbol, vrf, l2segment
     * @param {string}      id          ID of the element.
     * @param {number}      sx          Scale x of the element (1 is standard size, 2 is double, ...)
     * @param {number}      sy          Scale y of the element (1 is standard size, 2 is double, ...)
     * @param {number}      sz          Scale z of the element (1 is standard size, 2 is double, ...)
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    resize_element(view, type, id, sx, sy, sz, callback) {
        let message = {
            m: "X",
            d: {
                v: view,
                t: type,
                i: id,
                x: sx, y: sy, z: sz,
            },
        }
        this.send_message(message, callback);
     }

    /**
     * Function to change the settings of a base element (floor).
     * @param {string}      view        L2 or L3 depending on which view the element is.
     * @param {string}      id          ID of the element.
     * @param {string}      name        Name of the element.
     * @param {string}      subtype     Defines how the base element looks: options: "g", "f", "p", "n"
     * @param {number}      color1      Integer representing the color1 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      color2      Integer representing the color2 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      opacity     Defines how transparent the element is where 0 is fully transparent and 1 is fully opaque.
     * @param {string}      t1name      Name of the texture used on the floor. ("b1_t1", b1_t1-inv, b1_t1-trans, b1_t1-trans2, b1_t2, b1_t3, b1_t4, b1_t5, b1_t6, b1_t7, b1_t8, b1_t9, b2_t1, b2_t2)
     * @param {string}      t2name      Name of the texture used on the borders. ("b1_t1", b1_t1-inv, b1_t1-trans, b1_t1-trans2, b1_t2, b1_t3, b1_t4, b1_t5, b1_t6, b1_t7, b1_t8, b1_t9, b2_t1, b2_t2)
     * @param {number}      sy          How elevated is the base.
     * @param {number}      tsx         Defines how the texture is applied on the element (scale x of the texture).
     * @param {number}      tsy         Defines how the texture is applied on the element (scale y of the texture).
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    settings_base(view, id, name, subtype, color1, color2, opacity, t1name, t2name, sy, tsx, tsy, callback) {
        let message = {
            m: "P",
            d: {
                v: view,
                t: "base",
                i: id,
                name: name,
                subtype: subtype,
                color1: color1, color2: color2,
                opacity: opacity,
                t1name: t1name, t2name: t2name,
                sy: sy,
                tsx: tsx, tsy: tsy,
            }
        }
        this.send_message(message, callback);
     }

    /**
     * Function to change the settings of a device.
     * @param {string}      id          ID of the element.
     * @param {string}      name        Name of the element.
     * @param {number}      color1      Integer representing the color1 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      color2      Integer representing the color2 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {string[]}    ifnaming    List of patterns to generate interface names of devices
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    settings_device(id, name, color1, color2, ifnaming, callback) {
        let message = {
            m: "P",
            d: {
                v: "L2",
                t: "device",
                i: id,
                name: name,
                color1: color1, color2: color2,
                ifnaming: ifnaming,
            }
        };
        this.send_message(message, callback);
    }

    /**
     * Function to change the settings of a vrf.
     * @param {string}      id          ID of the element.
     * @param {number}      color1      Integer representing the color1 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      color2      Integer representing the color2 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    settings_vrf(id, color1, color2, callback) {
        let message = {
            m: "P",
            d: {
                v: "L3",
                t: "vrf",
                i: id,
                color1: color1, color2: color2,
            }
        }
        this.send_message(message, callback);
    }

    /**
     * Function to change the settings of a l2segment.
     * @param {string}      id          ID of the element.
     * @param {number}      color1      Integer representing the color1 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    settings_l2segment(id, color1, callback) {
        let message = {
            m: "P",
            d: {
                v: "L3",
                t: "vrf",
                i: id,
                color1: color1,
            }
        }
        this.send_message(message, callback);
    }

    /**
     * Function to change the settings of a link, l2link, interface, p2p_interface or svi_interface.
     * @param {string}      view        L2 or L3 depending on which view the element is.
     * @param {string}      type        Type of link to change: link, l2link, interface, p2p_interface or svi_interface.
     * @param {string}      id          ID of the element.
     * @param {number}      type        Integer representing the type of the link: 0: straight, 1: squared
     * @param {number}      color       Integer representing the color used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      weight      Integer representing the thickness of the link (0.001 - .5).
     * @param {number}      height      Height of the link relative to the y coord of the devices linked.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    settings_link(view, type, id, link_type, order, color, weight, height, callback) {
        let message = {
            m: "P",
            d: {
                v: view,
                t: type,
                i: id,
                type: link_type,
                order: order,
                color: color,
                weight: weight,
                height: height,
            }
        }
        this.send_message(message, callback);
    }

    /**
     * Function to change the settings of a bgp_peering.
     * @param {string}      id          ID of the element.
     * @param {number}      color       Integer representing the color used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    settings_bgp_peering(id, color, callback) {
        let message = {
            m: "P",
            d: {
                v: "L3",
                t: "bgp_peering",
                i: id,
                color: color,
            }
        }
        this.send_message(message, callback);
    }

    /**
     * Function to change the settings of a text on a network diagram.
     * @param {string}      view            L2 or L3 depending on which view the element is.
     * @param {string}      id              ID of the element.
     * @param {string}      text            Text to be added.
     * @param {string}      height          Height of the text.
     * @param {number}      color           Integer representing the color used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {string}      bg_type         Type of BG to be used: "n": no bg, "r": rectangle, "c": circle, "h", "p".
     * @param {string}      text_align      Text align: "l", "r" or "c"
     * @param {number}      bg_color        Integer representing the color used by the background. First byte R, Second G Third B: 0xRRGGBB.
     * @param {number}      border_color    Integer representing the color used by the border. First byte R, Second G Third B: 0xRRGGBB.
     * @param {boolean}     bg_show         Boolean indicating if the background will be shown.
     * @param {boolean}     border_show     Boolean indicating if the border will be shown.
     * @param {number}      border_width    Width of the border (.01 - 1).
     * @param {number}      bg_depth        Depth of the background (.01 - 1).
     * @param {number}      rotation_x      Rotation of the text relative to the background.
     * @param {diagramRequestCallback}    callback        Function to be called when a response is received. Function will have two parameters: error and data received
     */
    settings_text(view, id, text, height, color, bg_type, text_align, bg_color, border_color, bg_show, border_show, border_width, bg_depth, rotation_x, callback) {
        let message = {
            m: "A",
            d: {
                v: view,
                t: "text",
                i: id,
                text: text,
                height: height, color: color, text_align: text_align, rotation_x: rotation_x,
                bg_show: bg_show, bg_type: bg_type, bg_color: bg_color, bg_depth: bg_depth,
                border_show: border_show, border_color: border_color, border_width: border_width,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to create a symbol on a diagram.
     * @param {string}      view        L2 or L3 depending on which view the symbol is.
     * @param {string}      id          ID of the element.
     * @param {number}      color       Integer representing the color1 used by the shape. First byte R, Second G Third B: 0xRRGGBB.
     * @param {Object}      cd          Object with the custom data of the symbol. The attributes to pass here are dependant on the subtype of this element:
     *                                          if st == "F" (flag), object should have:
     *                                              {number}    flagcolor: Integer representing the color used by the flag. First byte R, Second G Third B: 0xRRGGBB.
     *                                          if st == "A" (arrow), object shuld have:
     *                                              {number}    head_color:     Integer representing the color used by the head of the arrow. First byte R, Second G Third B: 0xRRGGBB.
     *                                              {string}    head_type:      Type of head: "n", "f", "v", "i", "p", "r" or "s"
     *                                              {string}    tail_type:      Type of tail: "n", "f", "v", "i", "p", "r" or "s"
     *                                              {string}    shaft_type:     Type of shaft: "s" or "r"
     *                                              {number}    head_sx_per:    Percentage of the shaft width used as head width.
     *                                              {number}    head_sy_per:    Percentage of the shaft length used as head length.
     *                                              {number}    head_sz_per:    Percentage of the shaft depth used as head depth.
     *                                              {number}    tail_sx_per:    Percentage of the shaft width used as head width.
     *                                              {number}    tail_sy_per:    Percentage of the shaft length used as head length.
     *                                              {number}    tail_sz_per:    Percentage of the shaft depth used as head depth.
     *                                              {number}    shaft_dots:     1 for solid line. Otherwise, number of dots of the line.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    settings_symbol(view, id, color, cd, callback) {
        let message = {
            m: "A",
            d: {
                v: view,
                t: "symbol",
                i: id,
                color: color,
                cd: cd,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to delete an element. Works for base, device, symbol, text, link, bgp_peering
     * @param {string}      view        L2 or L3 depending on which view the element is.
     * @param {string}      type        Type of the element to delete: base, device, symbol, text, link
     * @param {string}      id          ID of the element.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    delete_element(view, type, id, callback) {
        let message = {
            m: "D",
            d: {
                v: view,
                t: type,
                i: id,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to delete an element. Works for base, device, symbol, text, link
     * @param {string}      view            L2 or L3 depending on which view the element is.
     * @param {string}      element_type    link, l2segment, interface, svi_interface or p2p_interface.
     * @param {string}      id              ID of the element.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    delete_joint(view, element_type, id, joint_index) {
        let message = {
            m: "D",
            d: {
                v: view,
                t: "joint",
                et: element_type,
                i: id,
                joint_index: joint_index,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure a device (what vlans does it have, vrfs, svis and loopback interfaces).
     * @param {string}      id              ID of the element.
     * @param {Object}      vlans           List of vlans of this device. object id should be the vlan tag. The object will have one only attribute: name.
     *                                          ej: {1: {name: "VLAN1"}, 100: {name: "CORP VLAN 100"}}
     * @param {Object}      vrfs            List of vrfs of this device. Route Distinguiser is the key of the vrf. The object will have one only attribute: name.
     *                                          ej: {"10:1": {name:"default"}, "20:1": {name: "VRF_CORP"}}
     * @param {Object}      svis            List of svis of this device. The key will be the vlan tag. Value should be an object containint:
     *                                          name: string with name of interface
     *                                          vrf: vrf this svi belongs to (route distinguiser).
     *                                          ej: {1: {name: "vlan100", vrf: "10:1"}}
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    config_device(id, vlans, vrfs, svis, los, callback) {
        let message = {
            m: "C",
            d: {
                v: "L2",
                t: "device",
                i: id,
                vlans: vlans, vrfs: vrfs, svis: svis,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure a link (interface names on both sides, lag names in case of more than one interface, is it running lacp and transceiver used).
     * @param {string}      id              ID of the element.
     * @param {Object[]}    ifbindings      List of list containing the interface name on each side of the cable).
     * @param {string[]}    lag_name        List with two strings referencing the name of the portchannel created on both sides of the cables
     * @param {boolean}     lacp            Is lacp enabled?
     * @param {string}      transceiver     Transceiver type used on these cables.
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    config_link(id, ifbindings, lag_name, lacp, transceiver, callback) {
        let message = {
            m: "C",
            d: {
                v: "L2",
                t: "link",
                i: id,
                ifbindings: ifbindings, lag_name: lag_name, lacp: lacp, transceiver: transceiver,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure a device link (interface names on both sides, lag names in case of more than one interface, is it running lacp and transceiver used).
     * @param {string}      id              ID of the link.
     * @param {number}      dev_index       Index of the device in the link (0 or 1 depending on how the link was created).
     * @param {string}      if_function     Function of this interface. Can be none (not configured), switching (layer 2 interface) or routing (layer 3 interface).
     * @param {string[]}    vlans           (function switching) List of vlans (vlan id) that exist on this interface. Each vlan must exist on the device.
     * @param {string}      native_vlan     (function switching) Vlan that is not tagged on this interface.
     * @param {Object[]}    subinterfaces   (function routing) List of l3 subinterfaces on this interface. Each member will have:
     *                                          vlan_tag: if not tagged: -1.
     *                                          vrf: vrf (identified by RD) this interface belongs to (vrf should exist on the device)
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    config_devicelink(id, dev_index, if_function, vlans, native_vlan, subinterfaces, callback) {
        let message = {
            m: "C",
            d: {
                v: "L2",
                t: "linkdev",
                i: id,
                function: if_function,
                vlans: vlans,
                native_vlan: native_vlan,
                subinterfaces: subinterfaces,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure a VRF
     * @param {string}      id              ID of the interface.
     * @param {string[]}    router_id       Router id: should be a 4 byte number following same notation as an ipv4 address. ej: 10.11.12.13
     * @param {string[]}    asn             Autonomous system number
     * @param {Object}      los             List of loopbacks of this vrf. The key will be the loopback name. Value should be an object containint:
     *                                          ipv4: list of strings containing ipv4 addresses assigned to this interface
     *                                          ipv6: list of strings containing ipv4 addresses assigned to this interface
     *                                          ej: {"lo0": {ipv4: ["1.1.1.1/32"], "ipv6": []}, ... }
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    config_vrf(id, router_id, asn, los, callback) {
        let message = {
            m: "C",
            d: {
                v: "L3",
                t: "vrf",
                i: id,
                router_id: router_id,
                asn: asn,
                los: los,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure a bgp_peering
     * @param {string}      id              ID of the interface.
     * @param {string}      transport       Whether bgp uses IPv4 or IPv6 as transport. Values can be either "ipv4" or "ipv6"
     * @param {string[]}    afisafi         List of address families exchanged on this peering: "ipv4/unicast", "ipv4/multicast", "ipv4/l3vpn", "ipv4/l3vpn-multicast", "ipv4/labeled", "ipv6/unicast", "ipv6/multicast", "ipv6/l3vpn", "ipv6/l3vpn-multicast", "ipv6/labeled", "l2vpn/vpls", "evpn"
     * @param {string}      src_ip          IP address used by the first vrf
     * @param {string}      dst_ip          IP address used by the second vrf
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    config_bgp_peering(id, transport, afisafi, src_ip, dst_ip, callback) {
        let message = {
            m: "C",
            d: {
                v: "L3",
                t: "bgp_peering",
                i: id,
                transport: transport,
                afisafi: afisafi,
                src_ip: src_ip,
                dst_ip: dst_ip,
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure a L3 interface.
     * @param {string}      id              ID of the interface.
     * @param {string[]}    ipv4_list       ipv4 address list of this interface
     * @param {string[]}    ipv6_list       ipv6 address list of this interface
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    config_interface(id, ipv4_list, ipv6_list, callback) {
        let message = {
            m: "C",
            d: {
                v: "L3",
                t: "interface",
                i: id,
                ip: {
                    address: {
                        ipv4: ipv4_list,
                        ipv6: ipv6_list,
                    }
                }
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure a L3 svi_interface.
     * @param {string}      id              ID of the interface.
     * @param {string[]}    ipv4_list       ipv4 address list of this interface
     * @param {string[]}    ipv6_list       ipv6 address list of this interface
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    config_sviinterface(id, ipv4_list, ipv6_list, callback) {
        let message = {
            m: "C",
            d: {
                v: "L3",
                t: "svi_interface",
                i: id,
                ip: {
                    address: {
                        ipv4: ipv4_list,
                        ipv6: ipv6_list,
                    }
                }
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure a L3 p2p_interface.
     * @param {string}      id              ID of the interface.
     * @param {string[]}    dev1_ipv4_list       ipv4 address list of dev1 in this interface
     * @param {string[]}    dev1_ipv6_list       ipv6 address list of dev1 in this interface
     * @param {string[]}    dev2_ipv4_list       ipv4 address list of dev2 in this interface
     * @param {string[]}    dev2_ipv6_list       ipv6 address list of dev2 in this interface
     * @param {diagramRequestCallback}    callback    Function to be called when a response is received. Function will have two parameters: error and data received
     */
    config_p2pinterface(id, dev1_ipv4_list, dev1_ipv6_list, dev2_ipv4_list, dev2_ipv6_list, callback) {
        let message = {
            m: "C",
            d: {
                v: "L3",
                t: "p2p_interface",
                i: id,
                ip: [
                    {
                        address: {
                            ipv4: dev1_ipv4_list,
                            ipv6: dev1_ipv6_list,
                        }
                    },
                    {
                        address: {
                            ipv4: dev2_ipv4_list,
                            ipv6: dev2_ipv6_list,
                        }
                    },
                ],
            },
        };
        this.send_message(message, callback);
    }

    /**
     * Function to configure data on any element.
     * @param {string}      view            L2 or L3 depending on which view the element is.
     * @param {string}      type            device, link, base, text, symbol, text, vrf, l2segment, l2_link, interface, svi_interface or p2p_interface.
     * @param {string}      id              ID of the element.
     * @param {string}      infobox_type    What information will be displayed on mouse over: 
     *                                          "l": l2/l3 info.
     *                                          "d": data.
     * @param {Object[]}      data          data to be stored. a list of objects that follow this format:
     *                                          {
     *                                              title: "this is the title",
     *                                              text: [
     *                                                  "text line 1",
     *                                                  "text line 2",
     *                                              ]
     *                                          }
     */
    data(view, type, id, infobox_type, data) {
        let message = {
            m: "DT",
            d: {
                v: view,
                t: type,
                i: id,
            },
        };
        this.send_message(message, callback);
    }
}

/**
 * Class to programatically create, edit and delete network diagrams on NetworkMaps
 */
class NetworkMapsLib {
    /**
     * Constructor of the class. It will do an initial connection to the server on the user endpoint
     * using the sessionid provided (if any) and check if this session is authenticated.
     * If no session is provided or the session provided is invalid, it will get the new
     * session provided by the server.
     * @param {boolean}     use_ssl         Identifies if the connection will be done using http or https
     * @param {string}      hostname        IP address or hostname of the server
     * @param {string}      port            Port number where the server is listening
     * @param {Object}      options         Dictionary containing optional parameters:
     *                                      session_id:  Session ID already created by the server 
     *                                                                      (to prevent having to authenticate).
     *                                      verify_cert: Define if in the connection we want to
     *                                                                      verify the server certificate (default true).
     * @param {Function}    ready_callback  Function to call once the user connection to the server has been established
     * @param {Function}    close_callback  Function to call if the socket is closed
     */
    constructor(use_ssl, hostname, port, options, ready_callback, close_callback) {
        this.conn = {};

        this.conn.hostname = hostname;
        this.conn.port = port;
        this.conn.use_ssl = use_ssl;
        this.conn.ready_callback = ready_callback;
        this.conn.close_callback = close_callback;
        this.callbacks = {};
        this.connected = false;
        this.authenticated = false;

        if(options) {
            this.conn.session_id = ("session_id" in options) ? options.session_id : "";
            this.conn.verify_cert = ("verify_cert" in options) ? options.verify_cert : true;
        }
        else {
            this.conn.session_id = "";
            this.conn.verify_cert = true;
        }

        this.conn.headers = {};
        this.conn.proto = "http";
        if(this.conn.use_ssl) {
            this.conn.proto = "https";
        }

        this.diagrams = {};

        this.updateSessionCookie();
        this.setup_user_ws();
    }

    updateSessionCookie() {
        if(this.conn.use_ssl) {
            if(this.conn.session_id)
                this.conn.headers.Cookie = 'NetSessionSec=' + this.conn.session_id;
        }
        else {
            if(this.conn.session_id)
                this.conn.headers.Cookie = 'NetSessionNoSec=' + this.conn.session_id;
        }        
    }

    /**
     * Function to create the initial connection to the server on the user endpoint and get the
     * session id (if not provided) that we will use to make changes on NetworkMaps.
     * This function will be called by the constructor.
     */
    setup_user_ws() {
        this.user_ws = new WebSocket(this.conn.proto + "://" + this.conn.hostname + ":" + this.conn.port + "/user", {
            "rejectUnauthorized": this.conn.verify_cert,
            "headers": this.conn.headers,
        });

        this.user_ws.on('open', () => {
            this.connected = true;
        })
        this.user_ws.on('close', () => {
            this.connected = false;
            if(this.conn.close_callback)
                this.conn.close_callback();
        });
        this.user_ws.on('message', (data) => {
            this.process_message(data)
        })
    }

    /**
     * Function to create a connection to a diagram.
     * @param {string}      uuid        UUID of the diagram.
     * @param {Function}    callback    Function to be called once the connection is established.
     *                                  This function will have two parameters:
     *                                      error: error if any
     *                                      diagram: diagram object we can use to make changed on the diagram.
     * @param {Function}    close_callback    Function to be called once the connection is closed.
     */
    setup_diagram_ws(uuid, callback, close_callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return;
        }
        if(!this.authenticated) {
            if(callback) callback("Not authenticated.");
            return;
        }
        if(uuid in this.diagrams) {
            if(callback) callback("Diagram already exists.");
            return;
        }

        let ws = new WebSocket(this.conn.proto + "://" + this.conn.hostname + ":" + this.conn.port + "/diagram/" + uuid, {
            "rejectUnauthorized": this.conn.verify_cert,
            "headers": this.conn.headers,
        });
        ws.on('open', () => {
            this.diagrams[uuid] = new Diagram(ws, callback);
        })
        ws.on('close', () => {
            if(uuid in this.diagrams) {
                this.diagrams[uuid].connected = false;
                delete this.diagrams[uuid];
                if(close_callback)
                    close_callback();
            }
        });
    }

    /**
     * Internal function used to process the messages received from the server on the user endpoint.
     * This function will make callbacks to functions provided by the user upon reception of expected
     * messages.
     * @param {Object}  data    Data received on the user websocket
     */
    process_message(data) {
        let jdata = JSON.parse(data);
        
        if(jdata.m === "I") {
            this.conn.session_id = jdata.session_id;
            this.updateSessionCookie();

            if("user" in jdata.d) {
                this.authenticated = true;
                this.conn.ready_callback();
            }
            else {
                this.conn.ready_callback();
                return;
            }
        }
        else if(jdata.m === "L") {
            if("error" in jdata.d) {
                if(this.callbacks.login) {
                    this.callbacks.login(jdata.d.error);
                    this.callbacks.login = null;
                }
            }
            else {
                this.authenticated = true;
                if(this.callbacks.login) {
                    this.callbacks.login(null, jdata.d.result);
                    this.callbacks.login = null;
                }   
            }
        }
        else if(jdata.m === "O") {
            this.authenticated = false;
            if(this.callbacks.logout) {
                this.callbacks.logout();
                this.callbacks.logout = null;
            }
        }
        else if(jdata.m === "DL") {
            if(this.callbacks.list_diagrams) {
                this.callbacks.list_diagrams(jdata.d.error, jdata.d.dl);
                this.callbacks.list_diagrams = null;
            }
        }
        else if(jdata.m === "DN") {
            if(this.callbacks.add_diagram) {
                this.callbacks.add_diagram(jdata.d.error, jdata.d.uuid);
                this.callbacks.add_diagram = null;
            }
        }
        else if(jdata.m === "DD") {
            if(this.callbacks.delete_diagram) {
                this.callbacks.delete_diagram(jdata.d.error);
                this.callbacks.delete_diagram = null;
            }
        }
    }

    /**
     * Function for authenticate the session created with NetworkMaps
     * @param {string}      username    Name of the user (email address).
     * @param {string}      password    Password of this user
     * @param {Function}    callback    Function to be called once a response is received from
     *                                  NetworkMaps. This function will have two parameters:
     *                                      error: String with error description if there was an error
     *                                      result: object containing user, name and last name of the user authenticated
     */
    login(username, password, callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return;
        }
        if(this.authenticated) {
            if(callback) callback("Already authenticated.");
            return;
        }

        this.callbacks.login = callback;
        this.user_ws.send(JSON.stringify({
            "m":"L",
            "d": {
                "username": username,
                "password": password
            }
        }));
    }

    /**
     * Function to logout the session.
     * @param {Function}    callback    Function to be called once a response is received from the server. This
     *                                  function will have one parameters: error in case there was an error on this call
     */
    logout(callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return;
        }
        if(!this.authenticated) {
            if(callback) callback("Not authenticated.");
            return;
        }
        this.callbacks.logout = callback;
        this.user_ws.send(JSON.stringify({"m":"O","d":{}}));
    }

    /**
     * Function to list the diagrams accessible by this user.
     * @param {Function}    callback    Function to call when server responds. This function will have two parameters:
     *                                      error: if an error is received
     *                                      diagram_list: list of diagrams. Each entry (diagram) on the list will have:
     *                                          uuid: id of the diagram (to uniquely identify this diagram on the system).
     *                                          name: name of the diagram
     *                                          permission: permissions we have on this diagram
     *                                          oe: username of the owner
     *                                          on: name of the owner
     *                                          ol: last name of the owner
     */
    list_diagrams(callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return;
        }
        if(!this.authenticated) {
            if(callback) callback("Not authenticated.");
            return;
        }
        this.callbacks.list_diagrams = callback;
        this.user_ws.send(JSON.stringify({"m":"DL","d":{}}));
    }

    /**
     * Function to add a new diagram.
     * @param {string}      name        Name of the diagram to be created
     * @param {Function}    callback    Function to be called when a response is received from the system. 
     *                                  This function has two parameters:
     *                                      error: if an error is received
     *                                      data: object containing the uuid of the newly created diagram.
     */
    add_diagram(name, callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return;
        }
        if(!this.authenticated) {
            if(callback) callback("Not authenticated.");
            return;
        }
        this.callbacks.add_diagram = callback;
        this.user_ws.send(JSON.stringify({"m":"DN","d":{
            n: name,
        }}));
    }

    /**
     * Function to delete a diagram.
     * @param {string}      uuid        UUID of the diagram to be deleted
     * @param {Function}    callback    Function to be called when a response is received from the system. 
     *                                  This function has one parameter:
     *                                      error: if an error is received
     */
    delete_diagram(uuid, callback) {
        if(!this.connected) {
            if(callback) callback("Not connected.");
            return;
        }
        if(!this.authenticated) {
            if(callback) callback("Not authenticated.");
            return;
        }
        this.callbacks.delete_diagram = callback;
        this.user_ws.send(JSON.stringify({"m":"DD","d":{
            uuid: uuid,
        }}));
    }
}

module.exports = NetworkMapsLib