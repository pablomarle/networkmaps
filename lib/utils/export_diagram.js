const context = require('../context');
const ETMap = require('../etmap/etmap');

/**
 * Export a diagram by its UUID
 * 
 * Retrieves a diagram either from active memory (if currently loaded)
 * or directly from storage. Includes access permission validation.
 * 
 * @param {string} sessionid - User's session identifier
 * @param {string} uuid - Unique identifier of the diagram to export
 * @param {Object} etmaps - ETMap object containing loaded diagrams
 * @param {function(Error, Object)} callback - Function to call with results
 * @param {Error} callback.error - Error object if operation failed, null otherwise
 * @param {Object} callback.result - Result object containing diagram data
 * @param {string} callback.result.name - Diagram name
 * @param {Object} callback.result.diagram - Complete diagram data structure
 * @returns {void}
 */
function exportDiagram(sessionid, uuid, callback) {
    context.usermgt.isUserAllowed(sessionid, uuid, (error, user_result) => {
        if(error) {
            callback(error);
        }
        else {
            if(!(uuid in context.etmaps)) {
                // Diagram not in memory, load from storage
                ETMap.loadDiagram(null, context.config.diagrams.path, uuid, (err, diagram_data) => {
                    if(err)
                        callback(err);
                    else
                        callback(null, {
                            name: user_result.ddata.name,
                            diagram: diagram_data,
                        });
                });
            }
            else {
                // Diagram already in memory
                callback(null, {
                    name: user_result.ddata.name,
                    diagram: context.etmaps[uuid].diagram,
                });
            }
        }
    });
}

module.exports = exportDiagram;
