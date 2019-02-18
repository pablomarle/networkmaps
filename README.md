# networkmaps

Online 3D network diagram editor. Edit together and share with others your network diagrams.

## What is Network Maps

Network maps pretends to be an online 3d network diagram editor. Via a browser, it should allow sharing and editing network diagrams with other people.
Network maps is composed of two parts:
    - A websockets server writen in javascript.
    - A server with static content (js client files, images, textures, css, ...).

## Current Status

Although the project can be run and it would allow for diagrams to be created, I wouldn't consider the first version is available. But if you are interested, feel free to try it.

## Prerequisites

MySQL database.[br]
Web server.

## Installation

For now, only instructions for testing:
1. Create Users database using database_schema/users.sql
2. Configure your web server to publish the html directory on https
3. Configure the netmap/config.json file:
    a. The hostname of the web server
    b. The port to listen to
    c. As everything runs on https, the certificate
    d. Database details
    e. url of the static content
    f. The path where the diagram files will be stored
4. Run the websocket server on netmap directory: node main.js

## Credits

We are using some 3rd party software:
    - three.js: we use this javascript library on the web client to render 2D and 3D models on web browser.:
      https://threejs.org/

    - node.js: javascript runtime used to run the server:
      https://threejs.org/

