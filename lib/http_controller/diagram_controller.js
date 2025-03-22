/**
 * Diagram Controller
 * 
 * Handles all diagram-related functionality including:
 * - Displaying diagrams for editing
 * - Exporting diagrams
 * - Diagram sharing and permissions
 */

const context = require('../context');
const { Logger } = require('../utils/logger');
const utilsExportDiagram = require('../utils/export_diagram');
const diagramLogger = new Logger({ prefix: 'DiagramController' });

/**
 * Display diagram editor interface for a specific diagram
 * 
 * @param {Object} callData - Object containing request details
 * @param {string} callData.method - HTTP method
 * @param {string} callData.url - Request URL
 * @param {Object} callData.session - User session object
 * @param {string} callData.content_type - Content-Type header
 * @param {string} callData.body - Request body
 * @param {Function} callData.sendresponse - Function to send HTTP response
 */
function showDiagram(callData) {
    const { url, session, sendresponse } = callData;
    
    // Extract diagram UUID from URL
    let surl = url.split("/");
    if (surl.length != 3) {
        sendresponse(404, "text/html", context.html.notFound(), session.sessionid);
        return;
    }
    
    let diagram_uuid = surl[2].split("?")[0];
    
    sendresponse(200, "text/html", context.html.diagram(diagram_uuid), session.sessionid);
}

/**
 * Export a diagram to JSON or other formats
 * 
 * @param {Object} callData - Object containing request details
 */
function exportDiagram(callData) {
    const { url, session, sendresponse } = callData;
    
    // Extract diagram UUID from URL
    let surl = url.split("/");
    if (surl.length != 3) {
        sendresponse(404, "application/json", JSON.stringify({error: "Not found"}), session.sessionid);
        return;
    }
    
    // User authentication check
    if (!session.data.user) {
        diagramLogger.info(`Unauthenticated export attempt for diagram ${surl[2]}`);
        sendresponse(403, "application/json", JSON.stringify({error: "Authentication required"}), session.sessionid);
        return;
    }
    
    // Export the diagram using WebSocket service
    utilsExportDiagram(session.sessionid, surl[2], (error, result) => {
        if (error) {
            diagramLogger.error(`Error exporting diagram ${surl[2]}: ${error}`);
            sendresponse(403, "application/json", JSON.stringify({error}), session.sessionid);
            return;
        }
        
        sendresponse(200, "application/json", JSON.stringify(result));
    });
}

module.exports = {
    showDiagram,
    exportDiagram,
  };