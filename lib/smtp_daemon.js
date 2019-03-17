#!/usr/bin/node

const sendmail = require("./sendmail");
const config = require('./config');


function main() {
    sendmail.initialize(config.sendmail)
    
    setInterval(() => { sendmail.empty_queue() }, 30000);
}

main()
