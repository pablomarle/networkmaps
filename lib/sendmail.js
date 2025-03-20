const context = require('./context');
const fs = require('fs').promises;
const nodemailer = require("nodemailer");

let transport;
let from;

function initialize() {
    from = context.config.sendmail.from;

    transport = nodemailer.createTransport({
        host: context.config.sendmail.server,
        port: context.config.sendmail.port,
        secure: context.config.sendmail.is_secured,
        tls: {rejectUnauthorized: context.config.sendmail.verify_ssl_cert},
        auth: {
            user: context.config.sendmail.user,
            pass: context.config.sendmail.password
        }
    });
}

async function send_email(to, subject, text, html=null) {
    let message = {
        "from": context.config.sendmail.from,
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
        "from": context.config.sendmail.from,
        "to": to,
        "subject": subject,
        "text": text
    }
    if(html != null)
        message.html = html;
    
    let filename = context.config.sendmail.queue + "/" + to + Date.now();
    let json = JSON.stringify(message);

    await fs.writeFile(filename, json);
}

async function send_email_queue(filename) {
    let json = await fs.readFile(context.config.sendmail.queue + "/" + filename);

    let message = JSON.parse(json);

    await fs.rename(context.config.sendmail.queue + "/" + filename, context.config.sendmail.sent + "/" + filename);
    
    await transport.sendMail(message);
    console.log(`${(new Date()).toISOString()} : ${message.to} : ${message.subject}`);
}

async function empty_queue() {
    let filelist = await fs.readdir(context.config.sendmail.queue);
    
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
