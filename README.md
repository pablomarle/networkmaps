# networkmaps

Online 3D network diagram editor. Edit together and share with others your network diagrams.

## What is Network Maps

Network maps pretends to be an online 3d network diagram editor. Via a browser, it allows you to create and edit network diagrams. This diagrams can be shared with other people and you can work together at the same time on them.
Network maps is composed of two parts:
    - A websockets server writen in javascript.
    - A server with static content (js client files, images, textures, css, ...).

## Current Status

Although the project can be run and it would allow for diagrams to be created, I wouldn't consider the first version is available. But if you are interested, feel free to try it.
It is currently running here:
[MaSSHandra.com](https://app.masshandra.com)

## Prerequisites

- MySQL database.
- Web server.

## Installation

Requires Node version 10 or higher.

Basic setup:
1. Create Users database using database_schema/users.sql
2. Create a config.json file on directory /etc/networkmaps. There is a sample file on "netmap/sample_config_serve_static.json
3. Create the directories referenced on the config file:
    a. db.diagrams.path: this is where diagrams will be stored
    b. sendmail.queue: emails that need to be sent will be stored here
    c. sendmail.sent: emails sent will be moved here
4. Run the websocket server on base directory: ./server.js
5. Run the mail server: node smtp_daemon.js

## Credits

We are using some 3rd party software:

    - three.js: we use this javascript library on the web client to render 2D and 3D models on web browser.:
      https://threejs.org/

    - node.js: javascript runtime used to run the server:
      https://nodejs.org/

