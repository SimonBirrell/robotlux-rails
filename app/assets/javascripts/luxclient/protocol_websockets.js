var LuxProtocolWebsockets = (function() {   
    "use strict";
     
    var module = {}; 
    var ws = false;
    
    module.open = function(interpretMessage) {
        if ("WebSocket" in window)  {
            // Remote server
            //ws = new WebSocket("ws://luxserver.herokuapp.com/");

            // Local server for testing
            //ws = new WebSocket("ws://localhost:8080/");

            ws = new WebSocket(LuxConfig.socketsServer);

            ws.onopen = function() {
                // Web Socket is connected, send data using send()
                console.log("Websocket connected to server...");
                module.sendMessage({mtype: 'browserConnect',
                                        mbody: {rosinstance: 'ros_instance_base', 
                                                org: 'org_id', 
                                                user: 'userName', 
                                                secret: 'secret'}});
                module.sendMessage({mtype: 'subscribeRosInstances'});
                module.sendMessage({mtype: 'subscribeRosInstance',
                                    mbody: {rosInstance: 'org_id 0 ros_instance_base'}});
                console.log("Message is sent...");
            }
            
            ws.onmessage = function (event) 
            { 
               //console.log("Message is received...");
               var receivedMessage = event.data;
               //console.log(receivedMessage);
               interpretMessage(receivedMessage);
            };

            ws.onclose = function()
            { 
               // websocket is closed.
               console.log("Connection is closed..."); 
            };

        } else {
            alert("WebSocket NOT supported by your Browser!");
        }        
    }
    
    module.sendMessage = function(message) {
        if (ws) {
            ws.send(JSON.stringify(message));
        } else {
            console.log("Tried LuxProtocolWebsocket.sendMessage() but websocket not connected yet.")
        }
    }
    
    module.close = function() {
        if (ws) {
            ws.close();
        } else {
            console.log("Tried LuxProtocolWebsocket.close() but websocket not connected yet.")
        }
    }
    
    return module;
    
})();

