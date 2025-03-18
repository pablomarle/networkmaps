const migration_v0_v1 = require("./migration_v0_v1");
const migration_v1_v2 = require("./migration_v1_v2");
const migration_v2_v3 = require("./migration_v2_v3");
/**
 * Function to fix the version of a diagram by applying necessary migrations.
 * When source code is updated with new features, this function updates the diagram structure accordingly.
 * 
 * @param {Object} diagram - The diagram object to update
 * @returns {Array<Object>} An array of migration objects, each containing:
 *   - {number} from - The original version before migration
 *   - {number} to - The new version after migration
 * 
 * @example
 * // Returns [{"from": 0, "to": 1}, {"from": 1, "to": 2}] if diagram migrated from version 0 to 2
 * const migrations = fix_diagram_version(myDiagram);
 */
function fix_diagram_version(diagram) {
    let migrations = [];
    // Function to do adjustments on diagrams. This is needed as in some situations, when the source code
    // is updated, we add more functions and the diagram structure needs to be updated

    // Migration from v0 to v1
    if(migration_v0_v1(diagram)) {
        migrations.push({"from": 0, "to": 1})
    }

    // From v1 to v2, the only change is adding urls to objects. After v2, we support more than network diagrams.
    if(migration_v1_v2(diagram)) {
        migrations.push({"from": 1, "to": 2})
    }

    // From v2 to v3, we add a description field to links and devices and a name field to links.
    if(migration_v2_v3(diagram)) {
        migrations.push({"from": 2, "to": 3})
    }
    return migrations;
}

module.exports = {
    fix_diagram_version: fix_diagram_version,
};