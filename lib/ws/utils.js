const { Logger } = require('../utils/logger');
const wsLogger = new Logger({ prefix: 'WebSocket' });

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
function exportDiagram(sessionid, uuid, etmaps, callback) {
    usermgt.isUserAllowed(sessionid, uuid, (error, user_result) => {
        if(error) {
            callback(error);
        }
        else {
            if(!(uuid in etmaps)) {
                // Diagram not in memory, load from storage
                ETMap.loadDiagram(null, config.diagrams.path, uuid, (err, diagram_data) => {
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
                    diagram: etmaps[uuid].diagram,
                });
            }
        }
    });
}

module.exports = {
    exportDiagram,
};