/**
 * Function to migrate a diagram from version 2 to version 3
 * @param {Object} diagram - The diagram object to update
 * @returns {boolean} True if the diagram was updated, False if migration was not needed
*/
function migrate_v2_v3(diagram) {
    // From v2 to v3, we add a description field to links and devices and a name field to links.
    if(diagram.version !== 2) {
        return false;
    }

    diagram.version = 3;
    for(let element_id in diagram.L2.device) {
        diagram.L2.device[element_id].description = "";
    }
    let elements_to_add = {
        "L2": ["link"],
        "L3": ["svi_interface", "interface", "l2segment", "p2p_interface"]
    }
    for(let diagram_level in elements_to_add) {
        if(diagram_level in diagram) {
            for(let element_type of elements_to_add[diagram_level]) {
                for(let element_id in diagram[diagram_level][element_type]) {
                    diagram[diagram_level][element_type][element_id]["name"] = "";
                    diagram[diagram_level][element_type][element_id]["description"] = "";
                }
            }
        }
    }
    migrations.push({"from": 2, "to": 3})
}

module.exports = migrate_v2_v3;