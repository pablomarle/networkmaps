// Module to update L3 diagrams
class L3Processor {
    /**
     * Function to verify if bgp peers are properly linked to l3 elements. If not, proceed to delete them
     * and generate a list of actions to be done by clients to update their diagrams.
     */
    static update_bgp_peering(diagram) {
        let to_delete = [];
        let actions = [];

        for(let bgp_id in diagram.L3.bgp_peering) {
            let bgp = diagram.L3.bgp_peering[bgp_id];
            if(
                    (!(bgp.l3_reference.src_vrf_id in diagram.L3.vrf)) ||
                    (!(bgp.l3_reference.dst_vrf_id in diagram.L3.vrf))
                )
                to_delete.push(bgp_id);
        }

        to_delete.forEach((bgp_id) => {
            delete diagram.L3.bgp_peering[bgp_id];
            actions.push({m: "D", t: "bgp_peering", id: bgp_id})            
        });

        return actions;
    }

    static create_vrf(diagram, device_id, vrf_rd) {
        // Find the base for this vrf
        let base_id = "0";
        if(!(base_id in diagram.L3.base)) {
            let base_keys = Object.keys(diagram.L3.base);
            base_id = (base_keys.length > 0) ? base_keys[0] : "0";
        }

        // Get a new id
        let new_id = diagram.settings.id_gen++;
        new_id = String(new_id);
        let vrf_name = diagram.L2.device[device_id].name;
        if(diagram.L2.device[device_id].vrfs[vrf_rd].name !== "default")
            vrf_name = diagram.L2.device[device_id].vrfs[vrf_rd].name + "@" + diagram.L2.device[device_id].name;

        let new_vrf = {
            l2_reference: {
                device_id: device_id,
                vrf_id: vrf_rd,
            },
            base: base_id,
            type: diagram.L2.device[device_id].type,
            name: vrf_name,
            px: Math.random()*20-10, py: 0, pz: Math.random()*20-10,
            sx: 1, sy: 1, sz: 1,
            rx: 0, ry: 0, rz: 0,
            color1: diagram.L2.device[device_id].color1,
            color2: diagram.L2.device[device_id].color2,

            infobox_type: "l",
            data: [],
            urls: {},
        }
        diagram.L3.vrf[new_id] = new_vrf;

        return new_id;
    }

    static update_from_l2_vrf(diagram) {
        let actions = [];

        // Create struct to find new vrfs
        let new_vrfs = {};
        for(let device_id in diagram.L2.device) {
            new_vrfs[device_id] = {};
            for(let vrf_rd in diagram.L2.device[device_id].vrfs) {
                new_vrfs[device_id][vrf_rd] = true;
            }
        }

        // Go through each l3 vrf, update or remove it and mark it as existing on the new_vrfs struct
        for(let vrf_id in diagram.L3.vrf) {
            let vrf = diagram.L3.vrf[vrf_id];
            if( (vrf.l2_reference.device_id in diagram.L2.device) && 
                (vrf.l2_reference.vrf_id in diagram.L2.device[vrf.l2_reference.device_id].vrfs)) {
                // VRF exists in L2 and L3.
                new_vrfs[vrf.l2_reference.device_id][vrf.l2_reference.vrf_id] = false;
                // Check for name change
                let vrf_name = diagram.L2.device[vrf.l2_reference.device_id].name;
                if(diagram.L2.device[vrf.l2_reference.device_id].vrfs[vrf.l2_reference.vrf_id].name !== "default")
                    vrf_name = diagram.L2.device[vrf.l2_reference.device_id].vrfs[vrf.l2_reference.vrf_id].name + "@" + diagram.L2.device[vrf.l2_reference.device_id].name;

                if(vrf.name !== vrf_name) {
                    vrf.name = vrf_name;
                    actions.push({m: "CN", t: "vrf", id: vrf_id, data: {name: vrf_name}});
                }
            }
            else {
                // Vrf doesn't exist on L2. Delete the L3 element
                delete diagram.L3.vrf[vrf_id];
                actions.push({m: "D", t: "vrf", id: vrf_id})

                // Delete all interfaces associated with this vrf
                for(let if_id in diagram.L3.p2p_interface) {
                    let iface = diagram.L3.p2p_interface[if_id];
                    if((iface.l3_reference.src_vrf_id === vrf_id) || (iface.l3_reference.dst_vrf_id === vrf_id)) {
                        delete diagram.L3.p2p_interface[if_id];
                        actions.push({m: "D", t: "p2p_interface", id: if_id})
                    }
                }
                for(let if_id in diagram.L3.interface) {
                    let iface = diagram.L3.interface[if_id];
                    if(iface.l3_reference.src_vrf_id === vrf_id) {
                        delete diagram.L3.interface[if_id];
                        actions.push({m: "D", t: "interface", id: if_id})
                    }
                }
                for(let if_id in diagram.L3.svi_interface) {
                    let iface = diagram.L3.svi_interface[if_id];
                    if(iface.l3_reference.src_vrf_id === vrf_id) {
                        delete diagram.L3.svi_interface[if_id];
                        actions.push({m: "D", t: "svi_interface", id: if_id})
                    }
                }
            }
        }

        // Finally, add vrfs that exist on L2 but not on L3
        for(let device_id in new_vrfs) {
            for(let vrf_rd in new_vrfs[device_id])

                if(new_vrfs[device_id][vrf_rd]) {
                    let new_id = L3Processor.create_vrf(diagram, device_id, vrf_rd);
                    actions.push({m: "A", t: "vrf", id: new_id, data: diagram.L3.vrf[new_id]})
                }
        }

        return actions;
    }

    static create_l2segment(diagram, device_id, vlan_id) {
        // Find the base for this l2segment
        let base_id = "0";
        if(!(base_id in diagram.L3.base)) {
            let base_keys = Object.keys(diagram.L3.base);
            base_id = (base_keys.length > 0) ? base_keys[0] : "0";
        }

        // Get new id
        let new_id = diagram.settings.id_gen++;
        new_id = String(new_id);

        let new_l2segment = {
            l2_reference: {
                device_id: device_id,
                vlan_id: vlan_id
            },
            base: base_id,
            type: "VLAN",
            name: diagram.L2.device[device_id].vlans[vlan_id].name + " @ " + diagram.L2.device[device_id].name,
            px: Math.random()*20-10, py: 0, pz: Math.random()*20-10,
            sx: 2, sy: .4, sz: .4,
            rx: 0, ry: 0, rz: 0,
            color1: 0x66aaff,
            color2: 0x66aaff,

            infobox_type: "l",
            data: [],
            urls: {},
        }
        diagram.L3.l2segment[new_id] = new_l2segment;

        return new_id;
    }

    static update_from_l2_l2segment(diagram) {
        let actions = [];

        // Create struct to find new l2_segments
        let new_l2segments = {};
        for(let device_id in diagram.L2.device) {
            new_l2segments[device_id] = {};
            for(let vlan_id in diagram.L2.device[device_id].vlans) {
                new_l2segments[device_id][vlan_id] = true;
            }
        }

        // Go through each l2segment, update or remove it and mark it as existing on the new_l2segments struct
        for(let l2segment_id in diagram.L3.l2segment) {
            let l2segment = diagram.L3.l2segment[l2segment_id];
            if( (l2segment.l2_reference.device_id in diagram.L2.device) && 
                (l2segment.l2_reference.vlan_id in diagram.L2.device[l2segment.l2_reference.device_id].vlans)) {
                // l2segment exists in L2 (vlan) and L3.
                new_l2segments[l2segment.l2_reference.device_id][l2segment.l2_reference.vlan_id] = false;
                let segment_name = diagram.L2.device[l2segment.l2_reference.device_id].vlans[l2segment.l2_reference.vlan_id].name +
                        " @ " + diagram.L2.device[l2segment.l2_reference.device_id].name;
                if(segment_name !== l2segment.name) {
                    l2segment.name = segment_name;
                    actions.push({m: "CN", t: "l2segment", id: l2segment_id, data: {name: segment_name}});
                }

            }
            else {
                // l2segment doesn't exist on L2 (vlan). Delete the L3 element
                delete diagram.L3.l2segment[l2segment_id];
                actions.push({m: "D", t: "l2segment", id: l2segment_id})

                // Delete all l2links associated with this segment
                for(let l2link_id in diagram.L3.l2link) {
                    let l2link = diagram.L3.l2link[l2link_id];
                    if((l2link.l3_reference.src_l2segment_id === l2segment_id) || (l2link.l3_reference.dst_l2segment_id === l2segment_id)) {
                        delete diagram.L3.l2link[l2link_id];
                        actions.push({m: "D", t: "l2link", id: l2link_id})
                    }
                }
                // Delete interfaces and svi_interfaces
                for(let if_id in diagram.L3.interface) {
                    let iface = diagram.L3.interface[if_id];
                    if(iface.l3_reference.l2segment_id === l2segment_id) {
                        delete diagram.L3.interface[if_id];
                        actions.push({m: "D", t: "interface", id: if_id});
                    }
                }
                for(let if_id in diagram.L3.svi_interface) {
                    let iface = diagram.L3.svi_interface[if_id];
                    if(iface.l3_reference.l2segment_id === l2segment_id) {
                        delete diagram.L3.svi_interface[if_id];
                        actions.push({m: "D", t: "svi_interface", id: if_id});
                    }
                }
            }
        }

        // Finally, add vrfs that exist on L2 but not on L3
        for(let device_id in new_l2segments) {
            for(let vlan_id in new_l2segments[device_id])
                if(new_l2segments[device_id][vlan_id]) {
                    let new_id = L3Processor.create_l2segment(diagram, device_id, vlan_id);
                    actions.push({m: "A", t: "l2segment", id: new_id, data: diagram.L3.l2segment[new_id]})
                }
        }

        return actions;
    }

    static create_l2link(diagram, link_id, vlan_id) {
        // Find the ids of l2segments
        let link = diagram.L2.link[link_id];
        let vlan_id_0 = vlan_id;
        if(vlan_id_0 === "-1") {
            vlan_id_0 = link.devs[0].data.function_data.native_vlan;
        }
        let vlan_id_1 = vlan_id;
        if(vlan_id_1 === "-1") {
            vlan_id_1 = link.devs[1].data.function_data.native_vlan;
        }

        let src_l2segment_id = -1;
        let dst_l2segment_id = -1;
        for(let possible_l2segment_id in diagram.L3.l2segment) {
            let l2segment = diagram.L3.l2segment[possible_l2segment_id];
            if((l2segment.l2_reference.device_id === link.devs[0].id) && (l2segment.l2_reference.vlan_id === vlan_id_0))
                src_l2segment_id = possible_l2segment_id;
            if((l2segment.l2_reference.device_id === link.devs[1].id) && (l2segment.l2_reference.vlan_id === vlan_id_1))
                dst_l2segment_id = possible_l2segment_id;
            if((src_l2segment_id !== -1) && (dst_l2segment_id !== -1))
                break;
        }

        if((src_l2segment_id === -1) && (dst_l2segment_id === -1))
            return -1;

        // Get new id
        let new_id = diagram.settings.id_gen++;
        new_id = String(new_id);

        let new_l2link = {
            l2_reference: {
                link_id: link_id,
            },
            l3_reference: {
                src_l2segment_id: src_l2segment_id,
                dst_l2segment_id: dst_l2segment_id,
            },
            type: 0,
            order: "XY",
            linedata: {
                height: .25,
                weight: .05,
                color: 0x66aaff,
                points: [],
            },
            infobox_type: "l",
            data: [],
            urls: {},
        }
        diagram.L3.l2link[new_id] = new_l2link;
        return new_id;
    }

    static update_from_l2_l2link(diagram) { 
        let actions = [];

        // Create a struct to find new layer2 links
        let new_links = {}
        for(let link_id in diagram.L2.link) {
            let link = diagram.L2.link[link_id];
            if((link.devs[0].data.function == "switching") && (link.devs[1].data.function == "switching")) {
                new_links[link_id] = {};
                let compare_set = new Set(link.devs[0].data.function_data.vlans);
                if(link.devs[0].data.function_data.native_vlan !== "-1") {
                    compare_set.delete(link.devs[0].data.function_data.native_vlan);
                    compare_set.add(-1);
                }

                link.devs[1].data.function_data.vlans.forEach((dev1_vlan_id) => {
                    let real_dev1_vlan_id = dev1_vlan_id;
                    if(link.devs[1].data.function_data.native_vlan === dev1_vlan_id)
                        dev1_vlan_id = -1;
                    if(compare_set.has(dev1_vlan_id)) {
                        let real_dev0_vlan_id = dev1_vlan_id;
                        if(real_dev0_vlan_id === -1)
                            real_dev0_vlan_id = link.devs[0].data.function_data.native_vlan;
                        if((real_dev1_vlan_id in diagram.L2.device[link.devs[1].id].vlans) && (real_dev0_vlan_id in diagram.L2.device[link.devs[0].id].vlans)) {
                            new_links[link_id][dev1_vlan_id] = true;
                        }
                    }
                })
            }
        }

        // Go through each l2link and check if it should exist. If it should, mark it as existing. If not, delete it
        for(let l2link_id in diagram.L3.l2link) {
            // Check if the link associated exist and is configured as switching on both sides.
            let l2link = diagram.L3.l2link[l2link_id];
            if(!(l2link.l2_reference.link_id in diagram.L2.link)) {
                delete diagram.L3.l2link[l2link_id];
                actions.push({m: "D", t: "l2link", id: l2link_id});
                continue;
            }
            let link = diagram.L2.link[l2link.l2_reference.link_id];
            if((link.devs[0].data.function != "switching") || (link.devs[1].data.function != "switching")) {
                delete diagram.L3.l2link[l2link_id];
                actions.push({m: "D", t: "l2link", id: l2link_id});
                continue;
            }

            // Check if the vlan still exists on the device (if the l2segment exists, the vlan also).
            if(
                (!(l2link.l3_reference.src_l2segment_id in diagram.L3.l2segment)) ||
                (!(l2link.l3_reference.dst_l2segment_id in diagram.L3.l2segment))
                ) {
                delete diagram.L3.l2link[l2link_id];
                actions.push({m: "D", t: "l2link", id: l2link_id});
                continue;                
            }
            let l2segment_0 = diagram.L3.l2segment[l2link.l3_reference.src_l2segment_id];
            let l2segment_1 = diagram.L3.l2segment[l2link.l3_reference.dst_l2segment_id];
            let vlan_id_0 = l2segment_0.l2_reference.vlan_id;
            let vlan_id_1 = l2segment_1.l2_reference.vlan_id;

            let vlan_0_exists = false;
            for(let x = 0; x < link.devs[0].data.function_data.vlans.length; x++) {
                if(link.devs[0].data.function_data.vlans[x] === vlan_id_0) {
                    vlan_0_exists = true;
                    continue;
                }
            }
            let vlan_1_exists = false;
            for(let x = 0; x < link.devs[1].data.function_data.vlans.length; x++) {
                if(link.devs[1].data.function_data.vlans[x] === vlan_id_1) {
                    vlan_1_exists = true;
                    continue;
                }
            }
            if((!vlan_1_exists) || (!vlan_0_exists)) {
                delete diagram.L3.l2link[l2link_id];
                actions.push({m: "D", t: "l2link", id: l2link_id});
                continue;                
            }
            if(vlan_id_0 === link.devs[0].data.function_data.native_vlan)
                vlan_id_0 = -1;
            if(vlan_id_1 === link.devs[1].data.function_data.native_vlan)
                vlan_id_1 = -1;
            if(vlan_id_0 !== vlan_id_1) {
                delete diagram.L3.l2link[l2link_id];
                actions.push({m: "D", t: "l2link", id: l2link_id});
                continue;
            }

            new_links[l2link.l2_reference.link_id][vlan_id_0] = false;
        }

        // Add links that haven't been accounted for
        for(let link_id in new_links) {
            for(let vlan_id in new_links[link_id]) {
                if(new_links[link_id][vlan_id]) {
                    let new_id = L3Processor.create_l2link(diagram, link_id, vlan_id);
                    if(new_id !== -1)
                        actions.push({m: "A", t: "l2link", id: new_id, data: diagram.L3.l2link[new_id]})
                }
            }
        }
        return actions;
    }

    static create_interface(diagram, link_id, vlan_tag, vrf_id) {
        let link = diagram.L2.link[link_id];
        let routing_index = -1;
        let switching_index = -1;
        
        if((link.devs[0].data.function == "routing") && (link.devs[1].data.function == "switching")) {
            routing_index = 0; switching_index = 1;
        }
        else if((link.devs[1].data.function == "routing") && (link.devs[0].data.function == "switching")) {
            routing_index = 1; switching_index = 0;
        }
        if(routing_index === -1)
            return -1;

        // Find the id of l2segments
        let segment_id = -1;
        let vlan_id = vlan_tag;
        if(vlan_tag === "-1")
            vlan_id = link.devs[switching_index].data.function_data.native_vlan;
        for(let temp_segment_id in diagram.L3.l2segment) {
            if(
                    (diagram.L3.l2segment[temp_segment_id].l2_reference.device_id == link.devs[switching_index].id) && 
                    (diagram.L3.l2segment[temp_segment_id].l2_reference.vlan_id == vlan_id)) {
                segment_id = temp_segment_id;
                break;
            }
        }

        // Find the id of vrf
        let l3_vrf_id = -1;
        for(let temp_vrf_id in diagram.L3.vrf) {
            if(
                    (diagram.L3.vrf[temp_vrf_id].l2_reference.device_id == link.devs[routing_index].id) && 
                    (diagram.L3.vrf[temp_vrf_id].l2_reference.vrf_id == vrf_id)) {
                l3_vrf_id = temp_vrf_id;
                break;
            }
        }

        // Get new id
        let new_id = diagram.settings.id_gen++;
        new_id = String(new_id);

        let new_interface = {
                l2_reference: {
                    link_id: link_id,
                    vlan_tag: vlan_tag, 
                },
                l3_reference: {
                    vrf_id: l3_vrf_id,
                    l2segment_id: segment_id,
                },
                type: 0,
                order: "XY",
                linedata: {
                    height: .25,
                    weight: .025,
                    color: 0x888888,
                    points: [],
                },
                infobox_type: "l",
                data: [],
                urls: {},
        }
        diagram.L3.interface[new_id] = new_interface;
        return new_id;
    }

    static update_from_l2_interface(diagram) {
        let actions = [];

        // Create a struct to find new layer2 links
        let new_links = {}
        for(let link_id in diagram.L2.link) {
            let link = diagram.L2.link[link_id];
            let routing_index = -1;
            let switching_index = -1;
            if((link.devs[0].data.function == "routing") && (link.devs[1].data.function == "switching")) {
                routing_index = 0; switching_index = 1;
            }
            else if((link.devs[1].data.function == "routing") && (link.devs[0].data.function == "switching")) {
                routing_index = 1; switching_index = 0;
            }
            if(routing_index === -1)
                continue;

            new_links[link_id] = {};

            let routing_device = diagram.L2.device[link.devs[routing_index].id];
            let switching_device = diagram.L2.device[link.devs[switching_index].id];
            link.devs[routing_index].data.function_data.subinterfaces.forEach((subif) => {
                if(
                        (subif.vlan_tag === "-1") && 
                        (link.devs[switching_index].data.function_data.native_vlan !== "-1") && 
                        (subif.vrf in routing_device.vrfs) && 
                        (link.devs[switching_index].data.function_data.native_vlan in switching_device.vlans)
                        ) {
                    new_links[link_id]["-1"] = {"vrf": subif.vrf, is_new: true, true_vlan: link.devs[switching_index].data.function_data.native_vlan};
                }
                else if(
                        (subif.vlan_tag !== link.devs[switching_index].data.function_data.native_vlan) && 
                        (link.devs[switching_index].data.function_data.vlans.indexOf(subif.vlan_tag) !== -1) &&
                        (subif.vrf in routing_device.vrfs) && 
                        (subif.vlan_tag in switching_device.vlans)
                        ) {
                    new_links[link_id][subif.vlan_tag] = {vrf: subif.vrf, is_new: true, true_vlan: subif.vlan_tag};
                }
            })
        }

        // Find which interfaces are valid and remove the ones that are not
        for(let iface_id in diagram.L3.interface) {
            let iface = diagram.L3.interface[iface_id];

            // Check if the link exists
            if(!(iface.l2_reference.link_id in diagram.L2.link)) {
                delete diagram.L3.interface[iface_id];
                actions.push({m: "D", t: "interface", id: iface_id});
                continue;
            }

            // Check if the referenced vrf and l2segment exists
            if( (!(iface.l3_reference.vrf_id in diagram.L3.vrf)) || (!(iface.l3_reference.l2segment_id in diagram.L3.l2segment)) ) {
                delete diagram.L3.interface[iface_id];
                actions.push({m: "D", t: "interface", id: iface_id});
                continue;                
            }

            // Check if it exists on the struct created previously
            if(
                    (iface.l2_reference.link_id in new_links) && 
                    (iface.l2_reference.vlan_tag in new_links[iface.l2_reference.link_id]) &&
                    ( diagram.L3.vrf[iface.l3_reference.vrf_id].l2_reference.vrf_id == new_links[iface.l2_reference.link_id][iface.l2_reference.vlan_tag].vrf) &&
                    ( diagram.L3.l2segment[iface.l3_reference.l2segment_id].l2_reference.vlan_id == new_links[iface.l2_reference.link_id][iface.l2_reference.vlan_tag].true_vlan)
                    ) {
                new_links[iface.l2_reference.link_id][iface.l2_reference.vlan_tag].is_new = false;
            }
            else {
                delete diagram.L3.interface[iface_id];
                actions.push({m: "D", t: "interface", id: iface_id});
                continue;                
            }
        }

        // Create the interfaces
        for(let link_id in new_links) {
            for(let vlan_tag in new_links[link_id]) {
                if(new_links[link_id][vlan_tag].is_new) {
                    let new_id = L3Processor.create_interface(diagram, link_id, vlan_tag, new_links[link_id][vlan_tag].vrf);
                    if(new_id !== -1)
                        actions.push({m: "A", t: "interface", id: new_id, data: diagram.L3.interface[new_id]})
                }
            }
        }
        return actions;
    }

    static create_p2p_interface(diagram, link_id, vlan_tag, src_vrf, dst_vrf) {
        // Find the ids of vrfs
        let src_l3vrf_id = -1;
        let dst_l3vrf_id = -1;

        let link = diagram.L2.link[link_id];
        for(let l3_vrf_id in diagram.L3.vrf) {
            let vrf = diagram.L3.vrf[l3_vrf_id];
            if((vrf.l2_reference.device_id === link.devs[0].id) && (vrf.l2_reference.vrf_id === src_vrf))
                src_l3vrf_id = l3_vrf_id;
            else if((vrf.l2_reference.device_id === link.devs[1].id) && (vrf.l2_reference.vrf_id === dst_vrf))
                dst_l3vrf_id = l3_vrf_id;

            if((src_l3vrf_id !== -1) && (dst_l3vrf_id !== -1))
                break;
        }

        if((src_l3vrf_id === -1) || (dst_l3vrf_id === -1))
            return -1;

        // Get new id
        let new_id = diagram.settings.id_gen++;
        new_id = String(new_id);

        let new_p2p_interface = {
            l2_reference: {
                link_id: link_id,
                vlan_tag: vlan_tag,
            },
            l3_reference: {
                src_vrf_id: src_l3vrf_id,
                dst_vrf_id: dst_l3vrf_id,
            },
            type: 0,
            order: "XY",
            linedata: {
                height: .25,
                weight: .025,
                color: 0x888888,
                points: [],
            },
            infobox_type: "l",
            data: [],
            urls: {},
        }
        diagram.L3.p2p_interface[new_id] = new_p2p_interface;
        return new_id;
    }

    static update_from_l2_p2p_interface(diagram) {
        let actions = [];

        // Create a struct to find new layer2 links
        let new_links = {}

        for(let link_id in diagram.L2.link) {
            let link = diagram.L2.link[link_id];
            if((link.devs[0].data.function !== "routing") || (link.devs[1].data.function !== "routing")) {
                continue;
            }
            new_links[link_id] = {};
            let subif_0 = link.devs[0].data.function_data.subinterfaces;
            let subif_1 = link.devs[1].data.function_data.subinterfaces;

            // Find what vlan tags match. First build index on dev 1 and then find what elements of dev 0 are there
            let vlan_tags_1 = {};
            for(let x = 0; x < subif_1.length; x++)
                vlan_tags_1[subif_1[x].vlan_tag] = x;
            for(let x = 0; x <  subif_0.length; x++) {
                if(subif_0[x].vlan_tag in vlan_tags_1) {
                    new_links[link_id][subif_0[x].vlan_tag] = {is_new: true, src_vrf: subif_0[x].vrf, dst_vrf: subif_1[vlan_tags_1[subif_0[x].vlan_tag]].vrf};
                }
            }
        }

        for(let p2p_interface_id in diagram.L3.p2p_interface) {
            let p2p_interface = diagram.L3.p2p_interface[p2p_interface_id];

            if((!(p2p_interface.l2_reference.link_id in new_links)) || (!(p2p_interface.l2_reference.vlan_tag in new_links[p2p_interface.l2_reference.link_id]))) {
                delete diagram.L3.p2p_interface[p2p_interface_id];
                actions.push({m: "D", t: "p2p_interface", id: p2p_interface_id});
                continue;
            }

            // Check if referenced vrf exists
            if( (!(p2p_interface.l3_reference.src_vrf_id in diagram.L3.vrf)) || (!(p2p_interface.l3_reference.dst_vrf_id in diagram.L3.vrf)) ) {
                delete diagram.L3.p2p_interface[p2p_interface_id];
                actions.push({m: "D", t: "p2p_interface", id: p2p_interface_id});
                continue;
            }

            let vrf_0 = diagram.L3.vrf[p2p_interface.l3_reference.src_vrf_id];
            let vrf_1 = diagram.L3.vrf[p2p_interface.l3_reference.dst_vrf_id];

            if(
                (vrf_0.l2_reference.vrf_id != new_links[p2p_interface.l2_reference.link_id][p2p_interface.l2_reference.vlan_tag].src_vrf) ||
                (vrf_1.l2_reference.vrf_id != new_links[p2p_interface.l2_reference.link_id][p2p_interface.l2_reference.vlan_tag].dst_vrf)
                ) {
                delete diagram.L3.p2p_interface[p2p_interface_id];
                actions.push({m: "D", t: "p2p_interface", id: p2p_interface_id});
                continue;
            }

            // At this point, we have a match
            new_links[p2p_interface.l2_reference.link_id][p2p_interface.l2_reference.vlan_tag].is_new = false;
        }

        for(let link_id in new_links) {
            for(let vlan_tag in new_links[link_id]) {
                if(new_links[link_id][vlan_tag].is_new) {
                    let new_id = L3Processor.create_p2p_interface(diagram, link_id, vlan_tag, new_links[link_id][vlan_tag].src_vrf, new_links[link_id][vlan_tag].dst_vrf);
                    if(new_id !== -1)
                        actions.push({m: "A", t: "p2p_interface", id: new_id, data: diagram.L3.p2p_interface[new_id]})                    
                }
            }
        }
        return actions;
    }

    static create_svi_interface(diagram, device_id, svi_id, vrf_id) {
        let device = diagram.L2.device[device_id];
        let l3_vrf_id = -1;
        let l2segment_id = -1;
        // Find vrf
        for(let p_l3vrf_id in diagram.L3.vrf) {
            let vrf = diagram.L3.vrf[p_l3vrf_id];
            if((vrf.l2_reference.device_id === device_id) && (vrf.l2_reference.vrf_id === vrf_id)) {
                l3_vrf_id = p_l3vrf_id;
                break;
            }
        }

        // Find l2_segment
        for(let p_l2segment_id in diagram.L3.l2segment) {
            let l2segment = diagram.L3.l2segment[p_l2segment_id];
            if((l2segment.l2_reference.device_id === device_id) && (l2segment.l2_reference.vlan_id === svi_id)) {
                l2segment_id = p_l2segment_id;
                break;
            }
        }

        if ((l3_vrf_id === -1) || (l2segment_id == -1))
            return -1;

        // Get new id
        let new_id = diagram.settings.id_gen++;
        new_id = String(new_id);

        let new_svi_interface = {
            l2_reference: {
                device_id: device_id,
                svi_id: svi_id
            },
            l3_reference: {
                vrf_id: l3_vrf_id,
                l2segment_id: l2segment_id,
            },
            type: 0,
            order: "XY",
            linedata: {
                height: .25,
                weight: .025,
                color: 0x888888,
                points: [],
            },
            infobox_type: "l",
            data: [],
            urls: {},
        }
        diagram.L3.svi_interface[new_id] = new_svi_interface;
        return new_id;
    }

    static update_from_l2_svi_interface(diagram) {
        let actions = [];

        // Create a struct to find new layer2 links
        let new_svis = {}
        for(let dev_id in diagram.L2.device) {
            let link = diagram.L2.device[dev_id];

            new_svis[dev_id] = {};

            let dev = diagram.L2.device[dev_id];
            for(let svi_id in dev.svis) {
                let svi = dev.svis[svi_id];
                if(svi_id in dev.vlans) {
                    new_svis[dev_id][svi_id] = {vrf: svi.vrf, is_new: true};
                }
            }
        }

        // Find which svi_interfaces are valid and remove the ones that are not
        for(let iface_id in diagram.L3.svi_interface) {
            let iface = diagram.L3.svi_interface[iface_id];

            // Check if it is on the list of all svis that should exist
            if((!(iface.l2_reference.device_id in new_svis)) || (!(iface.l2_reference.svi_id in new_svis[iface.l2_reference.device_id]))) {
                delete diagram.L3.svi_interface[iface_id];
                actions.push({m: "D", t: "svi_interface", id: iface_id});
                continue;                
            }

            // Check if the vrf exists
            if(!(iface.l3_reference.vrf_id in diagram.L3.vrf)) {
                delete diagram.L3.svi_interface[iface_id];
                actions.push({m: "D", t: "svi_interface", id: iface_id});
                continue;                
            }

            // Check if the vrf matches
            if(diagram.L3.vrf[iface.l3_reference.vrf_id].l2_reference.vrf_id !== new_svis[iface.l2_reference.device_id][iface.l2_reference.svi_id].vrf) {
                delete diagram.L3.svi_interface[iface_id];
                actions.push({m: "D", t: "svi_interface", id: iface_id});
                continue;                
            }

            new_svis[iface.l2_reference.device_id][iface.l2_reference.svi_id].is_new = false;
        }

        // Create the interfaces
        for(let dev_id in new_svis) {
            for(let svi_id in new_svis[dev_id]) {
                if(new_svis[dev_id][svi_id].is_new) {
                    let new_id = L3Processor.create_svi_interface(diagram, dev_id, svi_id, new_svis[dev_id][svi_id].vrf);
                    if(new_id !== -1)
                        actions.push({m: "A", t: "svi_interface", id: new_id, data: diagram.L3.svi_interface[new_id]})
                }
            }
        }
        return actions;
    }


    static update_from_l2(diagram) {
        if(diagram.type !== "network")
            return [];
        
        let t = Date.now()
        let actions = [];
        /* *********************** */
        /* Process and update VRFs */
        /* *********************** */
        actions.push.apply(actions, L3Processor.update_from_l2_vrf(diagram));
        actions.push.apply(actions, L3Processor.update_from_l2_l2segment(diagram));
        actions.push.apply(actions, L3Processor.update_from_l2_l2link(diagram));
        actions.push.apply(actions, L3Processor.update_from_l2_interface(diagram));
        actions.push.apply(actions, L3Processor.update_from_l2_p2p_interface(diagram));
        actions.push.apply(actions, L3Processor.update_from_l2_svi_interface(diagram));

        // Verify and fix BGP peering. We do this here as it's more eficient to check afterwards 
        // than while things are added/removed as it is bgp peers the ones with the pointers to
        // the elements
        actions.push.apply(actions, L3Processor.update_bgp_peering(diagram));

        console.log("Update L3 diagram took: " + (Date.now()-t) + "ms");
        return actions;
    }
}

module.exports = L3Processor;