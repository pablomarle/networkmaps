const fs = require('fs').promises;
const nodemailer = require("nodemailer");

let transport;
let queue_dir, sent_dir;
let from;

function initialize(config) {
    queue_dir = config.queue;
    sent_dir = config.sent;
    from = config.from;

    transport = nodemailer.createTransport({
        host: config.server,
        port: config.port,
        secure: config.is_secured,
        tls: {rejectUnauthorized: config.verify_ssl_cert},
        auth: {
            user: config.user,
            pass: config.password
        }
    });
}

async function send_email(to, subject, text, html=null) {
    let message = {
        "from": from,
        "to": to,
        "subject": subject,
        "text": text
    }
    if(html != null)
        message.html = html;

    await transport.sendMail(message);
}

async function queue_email(to, subject, text, html=null) {
    let message = {
        "from": from,
        "to": to,
        "subject": subject,
        "text": text
    }
    if(html != null)
        message.html = html;
    
    let filename = queue_dir + "/" + to + Date.now();
    let json = JSON.stringify(message);

    await fs.writeFile(filename, json);
}

async function send_email_queue(filename) {
    let json = await fs.readFile(queue_dir + "/" + filename);

    let message = JSON.parse(json);

    await fs.rename(queue_dir + "/" + filename, sent_dir + "/" + filename);
    
    await transport.sendMail(message);
    console.log(`${(new Date()).toISOString()} : ${message.to} : ${message.subject}`);
}

async function empty_queue() {
    let filelist = await fs.readdir(queue_dir);
    
    for(let x = 0; x < filelist.length; x++) {
        try {
            await send_email_queue(filelist[x]);
        } catch (err) {
            console.log(err);
        }
    }
}

module.exports = {
    initialize: initialize,
    send_email: send_email,
    queue_email: queue_email,
    empty_queue: empty_queue
}
