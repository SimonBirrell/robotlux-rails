var LuxUiToProtocol = (function() {
    "use strict";
    
    var module = {};
    var serverComm;
    var serverGraph = {};
    var uiGraphAdd = null, 
        uiGraphDel = null, 
        uiGraphUpd = null,  
        uiGraphClear = null;

    // Add new nodes to server graph
    var mergeServerGraph = function(newGraph) {
      for (var key in newGraph) {
        if (newGraph.hasOwnProperty(key)) {
          serverGraph[key] = newGraph[key];
        }
      }
    }   
    
    // Update nodes on server graph that already exist. Ignore the rest.
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

    module.interpretMessage = function(message) {
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
        if (mtype==='rosInstanceGraph') {
            //console.log("============= rosInstanceGraph ============");
            serverGraph = mbody.graph;
            rosInstanceId = mbody.rosInstance;
            uiGraphClear();
            uiGraphAdd(module.mbodyToUiGraph(serverGraph), rosInstanceId);
        } else if (mtype==='rosInstanceGraphAdd') {
            //console.log("============= rosInstanceGraphAdd ============");
            //console.log(mbody);
            var update = mbody.graph;
            mergeServerGraph(update);
            uiGraphAdd(module.mbodyToUiGraph(update), rosInstanceId);
        } else if (mtype==='rosInstanceGraphUpd') {
            //console.log("============= rosInstanceGraphUpd ============");
            var update = mbody.graph;
            var nodesToUpdate = updateServerGraph(update);
            uiGraphUpd(module.mbodyToUiGraph(nodesToUpdate));
        } else if (mtype==='rosInstanceGraphDel') {
            //console.log("============= rosInstanceGraphDel ============");
            var listNodesToDelete = mbody.graph;
            //console.log(listNodesToDelete);
            var graphSegmentToDelete = deleteFromServerGraph(listNodesToDelete);
            //console.log(graphSegmentToDelete);
            uiGraphDel(graphSegmentToDelete);
        }   
    } 

    module.printServerGraph = function() {
      console.log("...........serverGraph..........");
      for (var key in serverGraph) {
        if (serverGraph.hasOwnProperty(key)) {
          console.log(key + " : " + serverGraph[key]);
        }
      }
      console.log("................................");
    };

    module.getServerGraph = function() {
        return serverGraph;
    };

    module.setProtocol = function(communicationsProtocol) {
        serverComm = communicationsProtocol;      
    };
    
    module.open = function(uiGraphAddFn, uiGraphDelFn, uiGraphUpdFn, uiGraphClearFn) {
        uiGraphAdd = uiGraphAddFn;
        uiGraphDel = uiGraphDelFn;
        uiGraphUpd = uiGraphUpdFn;
        uiGraphClear = uiGraphClearFn;
        if (!serverComm) {
          throw "No communications protocol defined";
        } 
        serverComm.open(module.interpretMessage);
    }   
    
    module.close = function() {
        
    }

    var serverKeyToEmptyNode = function(serverKey) {
        return {'name': serverKey.substring(2).trim(), 'rtype': 'node', 'group': 1, 'width': 64, 'height': 64, 'x': 0, 'y': 0};
    }
    
    var serverKeyToEmptyTopic = function(serverKey) {
        return {'name': serverKey.substring(2), 'rtype': 'topic', 'group': 1, 'width': 64, 'height': 64, 'x': 0, 'y': 0}; 
    }

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

    var generateMachineTree = function(node) {

    }

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

    // Functions called from UI layer

    module.rosrun = function(hostname, packageName, runTarget) {
      var fullMachineId = hostnameToFullMachineId(hostname);
      //console.log("Calling rosrun with " + fullMachineId + " " + packageName + " " + runTarget);
      serverComm.sendMessage({mtype: 'rosrun', mbody: {rosmachine: fullMachineId, args: [packageName, runTarget]}});
    };

    module.roslaunch = function(hostname, packageName, runTarget) {
      var fullMachineId = hostnameToFullMachineId(hostname);
      //console.log("Calling roslaunch with " + fullMachineId + " " + packageName + " " + runTarget);
      serverComm.sendMessage({mtype: 'roslaunch', mbody: {rosmachine: fullMachineId, args: [packageName, runTarget]}});
    };

    module.kill = function(hostname, pid) {
      var fullMachineId = hostnameToFullMachineId(hostname);
      //console.log("Calling kill with " + fullMachineId + " " + pid);
      serverComm.sendMessage({mtype: 'kill', mbody: {rosmachine: fullMachineId, args: [pid]}});      
    }

    module.sendRosTopicMessage = function(rosInstanceId, rosTopic, rosMessage) {
      serverComm.sendMessage({mtype: 'message', 
                              mbody: {
                                rosInstance: rosInstanceId, 
                                topic: rosTopic, 
                                message: rosMessage
                              }
                            });      
    }

    function hostnameToFullMachineId(hostname) {
      return "org_id 0 ros_instance_base "+ hostname;
    }

    return module;
})();