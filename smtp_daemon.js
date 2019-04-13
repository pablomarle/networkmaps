#!/usr/bin/node

const sendmail = require("./lib/sendmail");
const config = require('./lib/config');


function main() {
    sendmail.initialize(config.sendmail)
    
    setInterval(() => { sendmail.empty_queue() }, 30000);
}

main()
