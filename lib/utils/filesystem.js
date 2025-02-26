const fs = require('fs');

function testDirectories(config) {
    checkDiagramsAccess(config);
    createTexturesDirectory(config);
    checkUserAccess(config);
    checkShapesAccess(config);
    checkSendmailAccess(config);
}

function checkDiagramsAccess(config) {
    try {
        fs.accessSync(config.diagrams.path, fs.constants.R_OK | fs.constants.W_OK);
    } catch(e) {
        throw("I don't have RW access to diagrams directory " + config.diagrams.path);
    }
}

function createTexturesDirectory(config) {
    const texturePath = `${config.diagrams.path}/textures`;
    if(!fs.existsSync(texturePath)) {
        fs.mkdirSync(texturePath);
    }
}

function checkUserAccess(config) {
    try {
        fs.accessSync(config.users.path, fs.constants.R_OK | fs.constants.W_OK);
    } catch(e) {
        throw("I don't have RW access to users directory " + config.users.path);
    }
}

function checkShapesAccess(config) {
    try {
        fs.accessSync(config.diagrams.shapes, fs.constants.R_OK | fs.constants.W_OK);
    } catch(e) {
        throw("I don't have RW access to shapes directory " + config.diagrams.shapes);
    }
}

function checkSendmailAccess(config) {
    try {
        fs.accessSync(config.sendmail.queue, fs.constants.R_OK | fs.constants.W_OK);
    } catch(e) {
        throw("I don't have RW access to sendmail queue directory " + config.sendmail.queue);
    }
}

module.exports = {
    testDirectories
};