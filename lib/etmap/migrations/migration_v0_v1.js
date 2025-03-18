const V0_V1_ELEMENT_TYPE = {
    "_BC": "1_0",
    "_BC2": "1_1",
    "_BY": "1_2",
    "_BY2": "1_3",
    "_BS": "1_4",
    "_BO": "1_5",
    "_BP": "1_6",

    "R": "2_0",
    "S": "2_1",
    "ML": "2_2",
    "LB": "2_3",
    "_NC": "2_4",
    "_NA": "2_5",
    "_NM": "2_6",
    "_NT": "2_7",
    "_NW": "2_8",
    "_NW2": "2_9",
    "_NME": "2_10",
    "_NMP": "2_11",
    "_NVX": "2_12",
    "_NVS": "2_13",
    "_NVR": "2_14",
    "_NVP": "2_15",
    "_NVG": "2_16",

    "_CU": "3_0",
    "_CD": "3_1",
    "_CL": "3_2",
    "_CT": "3_3",
    "_CP": "3_4",
    "_CP2": "3_5",
    "_CPT": "3_6",
    "_CBH": "3_7",
    "_CBO": "3_8",
    "_CBQ": "3_9",
    "_CTC": "3_10",
    "_COM": "3_11",
    "_COW": "3_12",
    "_COL": "3_13",

    "SR": "4_0",
    "ST": "4_1",
    "_SDB": "4_2",
    "_SW": "4_3",
    "_SM": "4_4",
    "_SD": "4_5",
    "_SL": "4_6",
    "_SC": "4_7",
    "_SA": "4_8",
    "_SR": "4_9",
    "_SMM": "4_10",
    "_SVG": "4_11",
    "_SVH": "4_12",
    "_SN": "4_13",
    "_SOW": "4_14",
    "_SOL": "4_15",
    "_SOM": "4_16",

    "F": "5_0",
    "_XF": "5_1",
    "_XP": "5_2",
    "_XI": "5_3",
    "_XS": "5_4",
    "_XC": "5_5",
    "_XT": "5_6",
    "_XTP": "5_7",
    "_XB": "5_8",
    "_XV": "5_9",
    "_XAV": "5_10",
    "_XAS": "5_11",
    "_XWF": "5_12",
    "_XPL": "5_13",
    "_XL": "5_14",
    "_XH": "5_15",
};


/**
 * Function to migrate a diagram from version 0 to version 1
 * @param {Object} diagram - The diagram object to update
 * @returns {boolean} True if the diagram was updated, False if migration was not needed
*/
function migration_v0_v1(diagram) {
    if("version" in diagram && diagram.version !== 0) {
        return false;
    }
    diagram.version = 1;
    diagram.type = "network";
    if(!("settings" in diagram)) diagram.settings = {};
    if(!("id_gen" in diagram.settings)) diagram.settings.id_gen = 1000;
    if(!("bg_color" in diagram.settings)) diagram.settings.bg_color = 0xf0f0f0;
    if(!("shapes" in diagram.settings)) diagram.settings.shapes = ["1", "2", "3", "4", "5"];

    // Convert v0 device types to v1
    for(let id in diagram.L2.device) {
        if(diagram.L2.device[id].type in V0_V1_ELEMENT_TYPE)
            diagram.L2.device[id].type = V0_V1_ELEMENT_TYPE[diagram.L2.device[id].type];
    }

    // Check and add the different elements that compose a L3 diagram
    if(!("base" in diagram.L3)) diagram.L3.base = {};
    if(!("l2segment" in diagram.L3)) diagram.L3.l2segment = {};
    if(!("l2link" in diagram.L3)) diagram.L3.l2link = {};
    if(!("vrf" in diagram.L3)) diagram.L3.vrf = {};
    if(!("interface" in diagram.L3)) diagram.L3.interface = {};
    if(!("svi_interface" in diagram.L3)) diagram.L3.svi_interface = {};
    if(!("p2p_interface" in diagram.L3)) diagram.L3.p2p_interface = {};
    if(!("bgp_peering" in diagram.L3)) diagram.L3.bgp_peering = {};
    if(!("symbol" in diagram.L3)) diagram.L3.symbol = {};
    if(!("text" in diagram.L3)) diagram.L3.text = {};

    // Add a base on L3 diagrams if this doesn't exist
    if(Object.keys(diagram.L3.base).length === 0)
        diagram.L3.base[0] = {
            type: "F",
            name: "Floor",
            px: 0, py: 0, pz: 0, 
            rx: 0, ry: 0, rz: 0,
            sx: 20, sy: .5, sz: 20,
            color1: 0xffffff,
            color2: 0xffbbaa,
            t1name: "b1_t1",
            t2name: "b2_t1",
            tsx: 1,
            tsy: 1,
            data: [],
        }

    // Convert v0 vrf types to v1
    for(let id in diagram.L3.vrf) {
        if(diagram.L3.vrf[id].type in V0_V1_ELEMENT_TYPE)
            diagram.L3.vrf[id].type = V0_V1_ELEMENT_TYPE[diagram.L3.vrf[id].type];

    }
    return true;
}

module.exports = migration_v0_v1;