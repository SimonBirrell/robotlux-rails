// The interface with the websockets communication with the server.
// This could potentially be swapped out for some other type of protocol.
//

var LuxProtocolWebsockets = (function() {   
    "use strict";
     
    var module = {}; 
    var ws = false; 
    var connectionDroppedCallback = null;
    var statusConnection = null;
    
    // Open a websocket to the node.js server
    //
    //  TODO: Proper authentication system
    //  TODO: Maintain a list of connected ROS instances for user selection
    //  TODO: Make the browser attempt reconnects if connection drops
    //
    module.open = function(interpretMessage, connectionDropped, connectionEstablised) {
        connectionDroppedCallback = connectionDropped;

        if ("WebSocket" in window)  {
            // Get the actual websocket URL from the config
            ws = new WebSocket(LuxConfig.socketsServer);

            // Callback when socket connects
            ws.onopen = function() {
                // Web Socket is connected, send data using send()
                console.log("Websocket connected to server...");
                statusConnection = 'connected';

                connectionEstablised();

                // This is the first message we send to kick things off
                module.sendMessage({mtype: 'browserConnect',
                                        mbody: {rosinstance: 'ros_instance_base', 
                                                org: 'robotlux_org', 
                                                user: 'userName', 
                                                secret: 'secret'}});
                // Ask the server to give us a list of ROS instances that we have access
                // to.
                module.sendMessage({mtype: 'subscribeRosInstances'});

                // Choose a ROS instance.
                // HARDWIRED DEMO CODE
                /*
                module.sendMessage({mtype: 'subscribeRosInstance',
                                    mbody: {rosInstance: 'org_id 0 ros_instance_base'}});
                */
                console.log("Message is sent...");
            }
            
            // Receive a message from the server
            ws.onmessage = function (event) 
            { 
                if (statusConnection !== 'connected') {
                    statusConnection = 'connected';
                    connectionEstablised();
                }
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
                statusConnection = 'disconnected';

                if (connectionDroppedCallback) {
                    connectionDroppedCallback();
                }
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
            ws.send(JSON.stringify(message), function ack(error) {
                // if error is not defined, the send has been completed,
                // otherwise the error object will indicate what failed.
                if (error) {
                    console.log("*****WEBSOCKET ERROR*****");
                }
            }); 
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

