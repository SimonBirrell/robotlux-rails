Robotlux
========
Rails Server and client-side JavaScript UI for Robot Lux.

The Rails Server will handle 
- part of authentication (probably) in collaboration with the node.js server
- user and organization account settings and preferences
- persistent storage for meta-information on ROS packages and messages

Right now it contains a fairly crappy temporary admin theme called Piluku with a lot of cruft. Beyond that, the Rails part currently does little.

LuxClient
---------

The client-side JavaScript app is called "luxclient" and lives in
/app/assets/javascripts/luxclient

The setup occurs in the script on
/app/views/home/index.html.erb

LuxClient uses the following frameworks:
- d3 for data visualization
- SVG for general rendering
- three.js for 3D graphics
- cola.js for the force-directed graph with constraints and grouping
- jQuery for this and that

The client-side app talks mainly to the node.js websockets server. In the future it will talk more to the Rails side.

Testing
-------

rake jasmine

then access the tests at

http://localhost:8888/


Credits
-------

Developed by Simon Birrell.

LuxManager API
--------------
The application now has a JSON API intended for the use of agents logging on and off. Itis located at

    /api/v1/

/api/v1/users/sign_in
This is called by the agent that wishes to log on, passing the following parameters:
email - The agent's "e-mail", of the form agent_name@org_name.orgs.robotlux.com
password - Agent's password, saved in config.txt
master_key - The ROS master URI transformed into a form that is the same for all participating agents.
network - The network Id
launch_command - The command used to launch the ROS instance. This may not be feasible.


TODO
----
An awful lot. The bulk of the app is here.

- Scaling to multiple node.js servers?
- Get focus working properly on nodes & topics
- Many Topics need to be rendered with specific viewers. For example:
-- Odometry viewer
-- Robot Joint State viewer (with hash topic system)
-- A tf viewer that renders the robot itself from URDF file
-- Specific topics for Erle Spider
-- Specific topics for Turtlebot
-- Specific topics for Baxter
-- Image topics
-- Streaming image topics
-- ...
- Node UI controls
-- Set and view rqt_reconfigure parameters
-- Set and view general ROS parameters
-- Pause and restart nodes
- Machine controls
-- View CPU and Memory
-- Reboot all nodes
- Implement bags
- Optimize performance.
- Improve robustness to server failure.
- Tests for UI layer. How?
- Replace crappy Piluku theme with decent HTML and working zIndex framework
- Generally tart-up / redesign the UI

License
-------

(c) 2015 Simon Birrell. All Rights Reserved.

