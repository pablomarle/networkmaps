const fs = require('fs');

function load() {
    const data = fs.readFileSync('/etc/networkmaps/config.json');
    return JSON.parse(data);
}

module.exports = load();
