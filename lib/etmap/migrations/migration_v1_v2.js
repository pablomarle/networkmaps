/**
 * Function to migrate a diagram from version 1 to version 2
 * @param {Object} diagram - The diagram object to update
 * @returns {boolean} True if the diagram was updated, False if migration was not needed
*/
function migrate_v1_v2(diagram) {
    if(diagram.version !== 1) {
        return false;
    }

    diagram.version = 2;

    // Add URLs to all element types
    let elements_to_add = {
        "L2": ["link", "base", "device", "symbol", "text"],
        "L3": ["symbol", "svi_interface", "interface", "vrf", "l2segment", "base", "p2p_interface", "text"]
    }
    for(let diagram_level in elements_to_add) {
        for(let element_type of elements_to_add[diagram_level]) {
            for(let element_id in diagram[diagram_level][element_type]) {
                if(!("urls" in diagram[diagram_level][element_type][element_id])) {
                    diagram[diagram_level][element_type][element_id]["urls"] = {};
                }                    
            }
        }
    }

    return true;
}

module.exports = migrate_v1_v2;