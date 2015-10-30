// The interface with the websockets communication with the server.
// This could potentially be swapped out for some other type of protocol.
//

var LuxProtocolWebsockets = (function() {   
    "use strict";
     
    var module = {}; 
    var ws = false;
    
    // Open a websocket to the node.js server
    //
    //  TODO: Proper authentication system
    //  TODO: Maintain a list of connected ROS instances for user selection
    //  TODO: Make the browser attempt reconnects if connection drops
    //
    module.open = function(interpretMessage) {
        if ("WebSocket" in window)  {
            // Get the actual websocket URL from the config
            ws = new WebSocket(LuxConfig.socketsServer);

            // Callback when socket connects
            ws.onopen = function() {
                // Web Socket is connected, send data using send()
                console.log("Websocket connected to server...");

                // This is the first message we send to kick things off
                module.sendMessage({mtype: 'browserConnect',
                                        mbody: {rosinstance: 'ros_instance_base', 
                                                org: 'org_id', 
                                                user: 'userName', 
                                                secret: 'secret'}});
                // Ask the server to give us a list of ROS instances that we have access
                // to.
                module.sendMessage({mtype: 'subscribeRosInstances'});

                // Choose a ROS instance.
                // HARDWIRED DEMO CODE
                module.sendMessage({mtype: 'subscribeRosInstance',
                                    mbody: {rosInstance: 'org_id 0 ros_instance_base'}});

                console.log("Message is sent...");
            }
            
            // Receive a message from the server
            ws.onmessage = function (event) 
            { 
               //console.log("Message is received...");
               var receivedMessage = event.data;
               //console.log(receivedMessage);
               interpretMessage(receivedMessage);
            };

            // Close the websocket
            ws.onclose = function()
            { 
               // websocket is closed.
               console.log("Connection is closed..."); 
            };

        } else {
            alert("WebSocket NOT supported by your Browser!");
        }        
    }
    
    // Called from LuxUiToProtocol layer to send message to the server
    //  message - a JavaScript object to be JSONified.
    //
    module.sendMessage = function(message) {
        if (ws) {
            ws.send(JSON.stringify(message));
        } else {
            console.log("Tried LuxProtocolWebsocket.sendMessage() but websocket not connected yet.")
        }
    }
    
    // Close down this module. Useful for tests.
    //
    module.close = function() {
        if (ws) {
            ws.close();
        } else {
            console.log("Tried LuxProtocolWebsocket.close() but websocket not connected yet.")
        }
    }
    
    return module;
    
})();

