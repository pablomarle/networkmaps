# networkmaps

Online 3D network diagram editor. Edit together and share with others your network diagrams.
![Facebook DC Fabric](https://www.networkmaps.org/img/Facebook_DC_Fabric.png)

## What is Network Maps

Network maps pretends to be an online 3D network diagram editor. Via a browser, it allows you to create and edit network diagrams. These diagrams can be shared with other people and you can work together at the same time on them.
NetworkMaps also allows for network diagrams to be programatically created or updated using it's API and library, allowing users to easily create and maintain network diagrams up to date.  
All network diagrams include a L2 view (how the different elements of the network are physically connected) and L3 view (how are they connected logically, subinterfaces, vrfs, ...). L3 view is automatically created based on how the different L2 elements areconfigured.  

## Current Status

We have a live demo running the latest code here:
[NetworkMaps.org](https://app.networkmaps.org)

## Prerequisites

- Node version 10.15.1 or higher.

## Installation & Documentation.

All the documentation can be found here: [Networkmaps Documentation](https://www.networkmaps.org/documentation)

## Credits

We are using some 3rd party software:

    - three.js: we use this javascript library on the web client to render 2D and 3D models on web browser.:
      https://threejs.org/

    - node.js: javascript runtime used to run the server:
      https://nodejs.org/

