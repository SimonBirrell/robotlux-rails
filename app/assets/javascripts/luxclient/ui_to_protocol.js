// This module liases between the UI module and the server communications module.
// It interprets and passes messages back and forth between these two layers
//

var LuxUiToProtocol = (function() {
    "use strict";
    
    var module = {};

    // The protocol communications object
    var serverComm;

    // A local copy of the graph on the server
    var serverGraph = {};

    // Save the API callbacks to the UI module.
    var uiGraphAdd = null, 
        uiGraphDel = null, 
        uiGraphUpd = null,  
        uiGraphClear = null;

    var connectionStatus = "disconnected";    

    var reconnectCountdown = 10000,
        reconnectStarted = false;

    var rosInstances = [];

    // Called from the main orchestration script to define which server protocol to use.
    //  communicationsProtocol - a protocol object that should be saved for later use
    //
    module.setProtocol = function(communicationsProtocol) {
        serverComm = communicationsProtocol;      
    };
    
    // Called by the UI layer to initiate contact with the server.
    // UI API callbacks are injected and saved.
    // The server protocol should have been set with setProtocol() prior to opening.
    //
    module.open = function(uiGraphAddFn, uiGraphDelFn, uiGraphUpdFn, uiGraphClearFn) {
        uiGraphAdd = uiGraphAddFn;
        uiGraphDel = uiGraphDelFn;
        uiGraphUpd = uiGraphUpdFn;
        uiGraphClear = uiGraphClearFn;
        reconnectStarted = false;
        if (!serverComm) {
          throw "No communications protocol defined";
        } 
        ConnectionPanel.connecting();
        serverComm.open(module.interpretMessage, module.connectionDropped, module.connectionEstablised);
    }   
    
    // Called by the UI layer to close contact with the server.
    //
    module.close = function() {
      // Doesn't do much right now    
    }    

    // Called by the protocol when a message arrives form the server that needs
    // interpreting.
    //  message - A string of a JSON-formatted message.
    //
    module.interpretMessage = function(message) {
        if (connectionStatus !== 'connected') {
          ConnectionPanel.connectionOk();
          connectionStatus = "connected";
        }      
        if (!uiGraphAdd || !uiGraphDel || !uiGraphUpd || !uiGraphClear) {
            throw("Message being interpreted before ui_to_protol.open() called.");
        }
        //console.log("message pre-parse:");
        //console.log(message);    
        message = JSON.parse(message);
        //console.log("message post-parse:");
        //console.log(message);    
        var mtype = message.mtype,
            mbody = message.mbody,
            rosInstanceId;
        //console.log("mbody:");
        //console.log(mbody);    
        if (mtype==='browserRefused') {
          alert(mbody.errorMessage);
        }
        else if (mtype==='rosInstanceGraph') {
            //console.log("============= rosInstanceGraph ============");
            serverGraph = mbody.graph;
            rosInstanceId = mbody.rosInstance;
            uiGraphClear();
            uiGraphAdd(module.mbodyToUiGraph(serverGraph), rosInstanceId);
        } else if (mtype==='rosInstanceGraphAdd') {
            //console.log("============= rosInstanceGraphAdd ============");
            //console.log(mbody);
            var update = mbody.graph;
            rosInstanceId = mbody.rosInstance;
            mergeServerGraph(update);
            uiGraphAdd(module.mbodyToUiGraph(update), rosInstanceId);
        } else if (mtype==='rosInstanceGraphUpd') {
            //console.log("============= rosInstanceGraphUpd ============");
            var update = mbody.graph;
            rosInstanceId = mbody.rosInstance;
            var nodesToUpdate = updateServerGraph(update);
            uiGraphUpd(module.mbodyToUiGraph(nodesToUpdate), rosInstanceId);
        } else if (mtype==='rosInstanceGraphDel') {
            rosInstanceId = mbody.rosInstance;
            console.log("============= rosInstanceGraphDel from " + rosInstanceId + " ============");
            var listNodesToDelete = mbody.graph;

            //console.log(listNodesToDelete);
            var graphSegmentToDelete = deleteFromServerGraph(listNodesToDelete);
            //console.log(graphSegmentToDelete);
            uiGraphDel(graphSegmentToDelete, rosInstanceId);
        } else if (mtype==='rosInstancesUpdate') {
            console.log("rosInstancesUpdate");
            console.log(mbody);
            rosInstanceUpdates(mbody);
        } else if (mtype==='unsubscribedRosInstance') {
            console.log("unsubscribedRosInstance");
            console.log(mbody);
            LuxUi.eraseRosInstance(mbody.rosInstance);
        }  
    } 

    module.connectionEstablised = function() {
      ConnectionPanel.connectionOk();
    };

    module.connectionDropped = function() {
      console.log("Connection dropped");
      reconnectCountdown = 5 + Math.floor(Math.random() * 3);
      ConnectionPanel.connectionLost(reconnectCountdown, tryToReconnect);
      setTimeout(updateReconnectCountdown, 1000);
    }

    function updateReconnectCountdown() {
      if (!reconnectStarted) {
        reconnectCountdown--;
        ConnectionPanel.connectionLostUpdateReconnectSeconds(reconnectCountdown);
        if (reconnectCountdown === 0) {
          console.log("Attempt reconnect");
          tryToReconnect();
        } else {
          setTimeout(updateReconnectCountdown, 1000);
        }
      }
    }

    function tryToReconnect() {
      reconnectStarted = true;
      console.log("Trying to reconnect...");
      ConnectionPanel.connecting();
      setTimeout(function() {
        console.log("")
        LuxUi.close();
        LuxUi.uiGraphUpdate();
        //LuxUi.open(LuxUiToProtocol);
      }, 100);
    }

    // ======== Functions called from UI layer =========================================

    // Send a command to the server to execute rosrun on the robot
    //  hostname - the machine to run the command on
    //  packageName - the package name
    //  runTarget- the actual run target
    // So this is equivalent to typing
    //  rosrun <packageName> <runTarget>
    // on the robot itself
    // TODO: Security! How do we stop someone saying "rosrun kill_humans" ?
    //
    module.rosrun = function(hostname, packageName, runTarget) {
      var fullMachineId = hostnameToFullMachineId(hostname);
      //console.log("Calling rosrun with " + fullMachineId + " " + packageName + " " + runTarget);
      serverComm.sendMessage({mtype: 'rosrun', mbody: {rosmachine: fullMachineId, args: [packageName, runTarget]}});
    };

    // Send a command to the server to execute roslaunch on the robot
    //  hostname - the machine to run the command on
    //  packageName - the package name
    //  runTarget- the actual run target
    //
    // So this is equivalent to typing
    //  roslaunch <packageName> <runTarget>
    // on the robot itself
    //
    module.roslaunch = function(hostname, packageName, runTarget) {
      var fullMachineId = hostnameToFullMachineId(hostname);
      serverComm.sendMessage({mtype: 'roslaunch', mbody: {rosmachine: fullMachineId, args: [packageName, runTarget]}});
    };

    // Perform a kill -9 <pid> on the specified host.
    //  hostname - the machine to run the command on
    //  pid - The PID of the process to kill
    //
    // TODO: Replace this rather insecure protocol with one where you kill a ROS node
    // by name
    //
    module.kill = function(hostname, pid) {
      var fullMachineId = hostnameToFullMachineId(hostname);
      //console.log("Calling kill with " + fullMachineId + " " + pid);
      serverComm.sendMessage({mtype: 'kill', mbody: {rosmachine: fullMachineId, args: [pid]}});      
    }

    // Send a ROS topic message that has been generated on the browser back to the robot.
    //  rosInstanceId - the ROS instance to send the message to
    //  rosTopic - the name of the ROS topic to publish to
    //  rosMessage - A JSON-formatted message
    //
    module.sendRosTopicMessage = function(rosInstanceId, rosTopic, rosMessage) {
      serverComm.sendMessage({mtype: 'message', 
                              mbody: {
                                rosInstance: rosInstanceId, 
                                topic: rosTopic, 
                                message: rosMessage
                              }
                            });      
    }

    // Convert a hostname to a full machine ID for specifying in a message
    // DEMO ONLY CODE
    // TODO: The browser should maintain a list of connected ROS instances
    function hostnameToFullMachineId(hostname) {
      return "org_id 0 ros_instance_base "+ hostname;
    }

    // ================ ROS Instances =============================================

    function rosInstanceUpdates(updates) {
      if (updates instanceof Array) {
        for (var i=0; i<updates.length; i++) {
          var update = updates[i];
          rosInstanceUpdate(update);
        }      
      } else {
        console.log("WARNING: Unexpected mbody for rosInstancesUpdate");
      }
    }


    function rosInstanceUpdate(update) {
      if ('add' in update) {
        console.log("Adding rosInstance: " + update.add.rosInstanceId);
        update.add.display = false;
        rosInstances.push(update.add);
      } else if ('del' in update) {
        console.log("Deleting rosInstance: " + update.del);
        var i = rosInstances.length;
        while (i--) {
          var rosInstance = rosInstances[i];
          if (rosInstance.rosInstanceId === update.del) {
            rosInstances.splice(i, 1);
            console.log("deleted");
          }
        }
      }
      RosInstancesPanel.updateInstances(rosInstances, displayRosInstance, hideRosInstance);
    }

    function displayRosInstance(rosInstance) {
      console.log("display ROS instance " + rosInstance.rosInstanceId);
      serverComm.sendMessage({mtype: 'subscribeRosInstance',
                          mbody: {rosInstance: rosInstance.rosInstanceId}});

    }

    function hideRosInstance(rosInstance) {
      console.log("hide ROS instance " + rosInstance.rosInstanceId);      
      serverComm.sendMessage({mtype: 'unsubscribeRosInstance',
                          mbody: {rosInstance: rosInstance.rosInstanceId}});
    }


    // ================ Server Graph ==============================================

    // Maintain a copy of the graph we receive from the server.
    // This should be structurally identical to the copy on the node.js server
    // In some ways this may be overkill as we also have uiFullGraph at the UI
    // layer.

    // Add new nodes to server graph
    //  newGraph -  The new mini-graph to merge into our copy of the server graph
    //              An array of [key, value] arrays, where key is a server key
    //              like "n /foo/bar" and the value is some hunk of JSON
    //
    var mergeServerGraph = function(newGraph) {
      for (var key in newGraph) {
        if (newGraph.hasOwnProperty(key)) {
          serverGraph[key] = newGraph[key];
        }
      }
    }   
    
    // Update nodes on server graph that already exist. Ignore the rest.
    //  newGraph -  The new mini-graph to merge into our copy of the server graph
    //              An array of [key, value] arrays, where key is a server key
    //              like "n /foo/bar" and the value is some hunk of JSON
    //
    var updateServerGraph = function(newGraph) {
      var nodesToUpdate = {}; 

      for (var i=0; i<newGraph.length; i++) {
        var key = newGraph[i][0],
            value = newGraph[i][1];

        if (key in serverGraph) {
          serverGraph[key] = value;
          nodesToUpdate[key] = value;
        }
      }

      return nodesToUpdate;
    };   
    
    // Delete a list of nodes from our copy of the server graph
    //  listNodesToDelete - an array of keys, each one of which represents a server node
    // These keys start with n, t, e (nodes, topics, edges) as per the protocol
    //
    // Returns an object that can be passed to the UI for pruning their copy of the
    // graph.
    //
    var deleteFromServerGraph = function(listNodesToDelete) {
      var nodeKeysToDelete = [],
          linkKeysToDelete = [];
      for (var i=0; i<listNodesToDelete.length; i++) {
        var key = listNodesToDelete[i];
        if (key in serverGraph) {
          delete serverGraph[key];
          if ((key.substring(0,1)==='n') || (key.substring(0,1)==='t')) {
            nodeKeysToDelete.push(key.substring(2));
          } else if (key.substring(0,1)==='e') {
            linkKeysToDelete.push(serverEdgeToUiLink(key));
          }
        }
      }
      return {nodes: nodeKeysToDelete, links: linkKeysToDelete};
    };


    // =============== Server format -> UI format conversion ==============================

    // Convert a server-formatted ROS edge to a UI-formatted link
    //  serverEdge -
    //  edgeData - 
    // Returns an object that can be passed to the UI layer
    //
    var serverEdgeToUiLink = function(serverEdge, edgeData) {
        edgeData = typeof edgeData !== 'undefined' ? edgeData : null;
        var edge= serverEdge.substring(1).replace('  ', ' .');
        var tokens = edge.split(/[ ]+/);
        if (tokens[0].substring(0,1)==='') {
            tokens[0]=tokens[1];
            tokens[2]=tokens[3];
            }
        if (tokens.length > 1) {
            var source = tokens[0], 
                target = tokens[2];
            var uiLink = {  'sourceName': source.replace('.',' '), 
                            'targetName': target.replace('.',' ')};
            if (edgeData) {
                uiLink['data'] = edgeData;
            }   
            return uiLink;
        }    
        return null;                 
    };

    // Convert a machine received from the server into a machine formatted for
    // use by the UI.
    //  machineKey - 
    //  machineGraph -
    //
    // Accessible from outside the module so we can test it.
    //
    module.serverMachineToUiMachine = function(machineKey, machineGraph) {

        var uiMachineGraph = {
                  'name': machineGraph.machine_details.human_name,
                  'node_type': machineGraph.machine_details.machine_type,
                  'hostname' : machineKey.substring(2),
                  'children': []
                };

        var packageTree = machineGraph.package_tree;
        if (packageTree) {
          for (var key in packageTree) {
            if (packageTree.hasOwnProperty(key)) {
              var packageGraph = {'name': key, 'node_type': 'package', 'children' : []};
              for (var i=0; i<packageTree[key].n.length; i++) {
                packageGraph.children.push({'name' : packageTree[key].n[i], 'node_type' : 'node', 'package': key});
              }
              for (var i=0; i<packageTree[key].l.length; i++) {
                packageGraph.children.push({'name' : packageTree[key].l[i], 'node_type' : 'launch', 'package': key});
              }
              for (var i=0; i<packageTree[key].s.length; i++) {
                packageGraph.children.push({'name' : packageTree[key].s[i], 'node_type' : 'script', 'package': key});
              }
              uiMachineGraph.children.push(packageGraph);
            }
          }
        }

        return uiMachineGraph;
    };

    // The graph for the addition / deletion / update is received in an "mbody" in the protocol
    // This function converts it into a UI-formatted graph
    //  graph - taken directly from the mbody
    // Returns a new object that can be passed to the UI layer
    //
    module.mbodyToUiGraph = function(graph) {
        var update = {nodes: [], links: [], groups: [], machines: []},
            groups = [],
            nodes = [],
            links = [],
            machines = [];
            
        // Do groups first
        
        // Do nodes first
        for (var key in graph) {
          if (graph.hasOwnProperty(key)) {
              if (key.substring(0,1)==='n') {
                  var node = serverKeyToEmptyNode(key);
                  node['data'] = graph[key];
                  nodes.push(node);
              } else if (key.substring(0,1)==='t') {
                  var topic = serverKeyToEmptyTopic(key);
                  topic['data'] = graph[key];
                  nodes.push(topic);
              }
          }
        }
        
        // Do links next
        for (var key in graph) {
          if (graph.hasOwnProperty(key)) {
              if (key.substring(0,1)==='e') {
                  links.push(serverEdgeToUiLink(key, graph[key]));       
              } 
          }
        }

        // Do machines last 
        for (var key in graph) {
          if (graph.hasOwnProperty(key)) {
              if (key.substring(0,1)==='m') {
                  var machineGraph = graph[key];
                  machines.push(this.serverMachineToUiMachine(key, graph[key]));       
              } 
          }          
        }
        
        // Now return the graph
        return {nodes: nodes, links: links, groups: groups, machines: machines};
    }

    // Convert a server key to an object that represents an empty ROS node
    // This can be passed to the UI layer.
    //  serverKey - "n /foo/bar", where n means node.
    //
    // NOTE: The n is actually redundant as we also use a leading space to differentiate
    // topics from nodes.
    //
    var serverKeyToEmptyNode = function(serverKey) {
        return {'name': serverKey.substring(2).trim(), 'rtype': 'node', 'group': 1, 'width': 64, 'height': 64, 'x': 0, 'y': 0};
    }
    
    // Convert a server key to an object that represents an empty ROS topic
    // This can be passed to the UI layer.
    //  serverKey - "n  /foo/bar", where n means node. Note the extra space for ROS topics.
    //
    // NOTE: The n is actually redundant as we also use a leading space to differentiate
    // topics from nodes.
    //
    var serverKeyToEmptyTopic = function(serverKey) {
        return {'name': serverKey.substring(2), 'rtype': 'topic', 'group': 1, 'width': 64, 'height': 64, 'x': 0, 'y': 0}; 
    }

    // ================ DEBUGGING FUNCTIONS =======================================

    // Print a copy of the serverGraph to the browser console.
    // Call from Chrome console with LuxUiToProtocol.printServerGraph();
    //
    module.printServerGraph = function() {
      console.log("...........serverGraph..........");
      for (var key in serverGraph) {
        if (serverGraph.hasOwnProperty(key)) {
          console.log(key + " : " + serverGraph[key]);
        }
      }
      console.log("................................");
    };

    // Used by Jasmine tests
    //
    module.getServerGraph = function() {
        return serverGraph;
    };


    return module;
})();