// This module handles the graphs that store the various and nodes, links, groups
// and displays them on the page using d3 and webcola.
//
// (c) Simon Birrell 2015
//
var LuxUi = (function() {
    	"use strict";

    	var INCREMENTAL_SYSTEM = true;
    
    	var module = {};

    	var QUIET_NAMES = [ 
    						'/diag_agg', '/runtime_logger', '/pr2_dashboard', '/rviz', '/rosout', 
    						'/cpu_monitor', '/monitor', '/hd_monitor', '/rxloggerlevel', '/clock', 
    						'/rqt', '/statistics', '/luxagent','/rosout_agg','/zeroconf/zeroconf',
    						'/interactions', '/app_manager', '/bumper2pointcloud',
    						//' /tf', 
    						' /tf_static', '/robot_state_publisher',
    						'/capability_server','/diagnostic_aggregator', ' /diagnostics_agg', ' /diagnostics_toplevel_state',
    						' /zeroconf/new_connections', ' /zeroconf/lost_connections', '/capability_server_nodelet_manager',
    						' /gateway/gateway_info', ' /interactions/interactive_clients',
    						' /capability_server/bonds', ' /capability_server/events', ' /interactions/pairing',
    						' /turtlebot/status', ' /turtlebot/rapp_list', ' /turtlebot/incompatible_rapp_list',
    						' /gateway/force_update', ' /diagnostics',
    						' /cmd_vel_mux/parameter_descriptions', 
    						' /cmd_vel_mux/parameter_updates',
    						' /sound_play/feedback', ' /sound_play/status', ' /sound_play/goal', ' /sound_play/cancel', ' /sound_play/result',
    						' /depthimage_to_laserscan/parameter_updates', 
    						' /depthimage_to_laserscan/parameter_descriptions',
    						' /capability_server_events', '/master', ' /info' 
    						];
 
    	var uiFullGraph = RenderUi.uiGraph,
    		uiGraphIncomplete;

    	var forced = null;	 

    	var NameSpaceTree = {};

    	var MachineMenusRendered = [];	

    	// Access uiGraph outside this module
    	//
    	module.getUiGraph = function() {
    		return RenderUi.uiGraph;
    	};

    	// Access uiFullGraph outside this module
    	//
    	module.getUiFullGraph = function() {
    		return uiFullGraph;
    	};

    	// Access uiIncompleteGraph outside this module (for debugging)
    	//
    	module.getUiIncompleteGraph = function() {
    		return uiGraphIncomplete;
    	};

    	// Shut down the UI, e.g. at the end of a test
    	//
    	module.close = function() {
			RenderUi.uiGraph = uiFullGraph = {nodes: [], links: [], groups: [], machines: []};
       	};

    	var FilterOrphanedTopics = true,
    		FilterDebugNodes = true;

    	var ProtocolToUiLayer = null;

    	var PilePoints = [];

    	module.getPiles = function() {
    		console.log("NameSpaceTree");
    		console.log(NameSpaceTree);
    		console.log("PilePoints");
    		console.log(PilePoints);
    	}

    	// Get/Set whether to hide debug nodes and orphaned topics
    	//
        module.getFilterDebugNodes = function() {
     		return FilterDebugNodes;
    	};

    	module.setFilterDebugNodes = function(filterOn) {
      		FilterDebugNodes = filterOn;
    	};

    	module.getFilterOrphanedTopics = function() {
      		return FilterOrphanedTopics;
    	};

    	module.setFilterOrphanedTopics = function(filterOn) {
      		FilterOrphanedTopics = filterOn;
    	};
	
		// Start up the UI
		//	protocolToUiLayer - inject the module that translates between the protocol and the UI
		//
    	module.open = function(protocolToUiLayer) {

			ProtocolToUiLayer = protocolToUiLayer;

			RenderUi.open(unfoldPile, addPileUpLevel, collapsePiles, 
						  ProtocolToUiLayer.kill, removeNodeAndAssociatedLinksFromUiGraph,
						  removeNodeAndAssociatedLinksFromFullGraph);

			// These two graphs handle nodes before they are actually displayed
			//	uiFullGraph - This is a copy of all the nodes/topics/links on the server,
			//				  whether or not they are currently displayed
			//	uiGraphIncomplete - This graph holds nodes and links that are due to be 
			//						shown on the UI, but aren't ready yet. For example,
			//						a link may be stored here until the nodes at both ends
			//						are displayed.
			//
			uiGraphIncomplete = emptyGraph();
			uiFullGraph = emptyGraph();
			
			// Start interacting with the server
			// Send callbacks so that the protocolToUiLayer can notify us
			// when instructions arrive from the server.
			protocolToUiLayer.open(uiGraphAdd, uiGraphDel, uiGraphUpd, uiGraphClear);

			// First update
			uiGraphUpdate();

			RenderUi.setUpAnimation();

			function uiGraphUpdate() {
				collapsePiles();
				RenderUi.uiGraphUpdate();
				MachineTreeMenu.updateMachineMenu(RenderUi.machineTreeMenu, uiFullGraph, RenderUi.DragDropManager, ProtocolToUiLayer);
			}
			module.uiGraphUpdate = uiGraphUpdate;


			////////////////////////////////////////////////////
			// API for protocol layer to call
			////////////////////////////////////////////////////
			
			// This is called by the protocol layer whenever a new update
			// is received for the ROS computational graph. The update is incorporated
			// into the UI
			//	update - A "mini-graph" with node, link and machine arrays.
			//
			// nodes at this level are ROS nodes and topics rather than d3 elements.
			// Similarly, links are ROS edges from the computational graph and machines
			// are Linux hosts. This function will do all the work necessary to transform
			// these concepts into d3 nodes, links and groups.
			//
			function uiGraphAdd(update, rosInstanceId) {
				console.log("========= uiGraphAdd to " + rosInstanceId + " =========");

				// Stop force-constrained graph during update. May not be necessary.
				//force.stop();
				RenderUi.forceStop();

				console.log(update);

				// Add ROS nodes and topics first
				for (var i=0; i<update.nodes.length; i++) {
					var node = update.nodes[i];
					console.log("ADDING NODE " + node.name);
					addNodeToAllGraphs(node, rosInstanceId);
				}

				// Add ROS edges next
				for (var i=0; i<update.links.length; i++) {
					var link = update.links[i];
					console.log("ADDING LINK " + link.sourceName + " > " + link.targetName);
					addLinkToAllGraphs(link, rosInstanceId);
				}

				// Add Machines
				for (var i=0; i<update.machines.length; i++) {
					var machine = update.machines[i];
					console.log("ADDING MACHINE " + machine.name);
					console.log(machine);
					addMachineToAllGraphs(machine, rosInstanceId);
				}
				
				// See if any links can be moved directly to the UI
				connectLinksOnGraph(uiGraphIncomplete);
				moveAnyConnectedLinksFromIncompleteToMainGraph();
				moveAnyConnectedGroupsFromIncompleteToMainGraph();

				// d3/webcola makes us do a lot of work on each addition/deletion
				uiGraphUpdate();

				console.log("Finished uiGraphAdd()");
			}
			
			// This is called by the protocol layer whenever a ROS node, topic, edge or
			// machine gets deleted from the ROS computational graph.
			// The equivalent items are deleted from the various graphs and the 
			// display is updated.
			//
			function uiGraphDel(update, rosInstanceId) {
				for (var i=0; i<update.nodes.length; i++) {
					var nameNodeToDelete = update.nodes[i];
					RenderUi.triggerNodeDeath(nameNodeToDelete);
					removeFromNameSpaceTree(nameNodeToDelete);
				}
				uiGraphUpdate();
			}

			// This is called by the protocol layer whenever ROS entities are changed.
			// This is largely intended for receiving ROS message updates to topics.
			//
			function uiGraphUpd(update, rosInstanceId) {
				console.log(".");
				for (var i=0; i<update.nodes.length; i++) {
					var updateNode = update.nodes[i];
					updateNodeOnAllGraphs(updateNode);
				}
			}

			// Update a node on uiFullGraph and on uiGrpah
			//	updateNode - reference to node object on update
			//
			function updateNodeOnAllGraphs(updateNode) {
				for (var j=0; j<uiFullGraph.nodes.length; j++) {
					var uiFullGraphNode = uiFullGraph.nodes[j];
					if (uiFullGraphNode.name === updateNode.name) {
						copyUpdateDataToUiFullGraphNode(updateNode, uiFullGraphNode);
						updateNodeOnUiGraph(uiFullGraphNode);
					}
				}
			}

			// This is called by the protocol layer to completely clear the display
			// and our various internal graphs.
			//
			function uiGraphClear() {
				console.log("Clearing uiGraph and uiFullGraph");
				uiFullGraph.groups = [];
				uiFullGraph.links = [];
				uiFullGraph.nodes = [];
				uiFullGraph.machines = [];
				RenderUi.clearGraph();
			}

			// Copy data received in server update to the uiFullGraphNode
			//	updateNode - node from server update
			//	uiFullGraphNode - node stored in uiFullGraph
			//
			function copyUpdateDataToUiFullGraphNode(updateNode, uiFullGraphNode) {
				uiFullGraphNode.data.message = updateNode.data.message;
				uiFullGraphNode.data.type = updateNode.data.type;
			}
		
			// ======================= DEBUGGING FUNCTIONS ==============================

			// Useful for debugging. Send the various graphs we maintain to the browser console.
			//
			function uiGraphPrint() {
				LuxUiToProtocol.printServerGraph();
				printGraph(uiFullGraph, "uiFullGraph");
				printGraph(RenderUi.uiGraph, "uiGraph");
			}

			// print a graph to the console, giving it a title.
			//
			function printGraph(graph, name) {
				console.log("..........." + name + "..............");
				for (var i=0; i<graph.nodes.length; i++) {
					console.log(i + " " + graph.nodes[i].name);
				}
				console.log("Links");
				console.log(graph.links);
				for (var i=0; i<graph.links.length; i++) {
					console.log(i + " " + graph.links[i].source + " " + graph.links[i].sourceName + " -> " + graph.links[i].target + " " + graph.links[i].targetName);
				}
				console.log(graph.groups);
				console.log(graph.machines);
				console.log(".....................................");
			}

			// ======================= End of DEBUGGING FUNCTIONS =======================


			///////////////////////////////////////////////////////////////////////////////
			// Piles
			//
			// Piles (nice name) are a way of visualizing nodes/topics that are
			// closely related and don't need to be always seen as individuals.
			// They are displayed as "piles" of nodes or topics with some mechanism
			// for "unfolding" them into individuals and/or sub-piles
			//
			// For the moment, nodes are folded into piles based on namespace
			//
			///////////////////////////////////////////////////////////////////////////////

			module.uncollapseAllPiles = function() {
				PilePoints = [];
			};

			// Maintain a list of levels that are "folded up"
			// New nodes in this level should not be displayed as individuals
			//	level - " /foo/bar/baz"
			//	targetNodeName - unused? TODO
			// Note trailing / added to level
			//
			function addPileUpLevel(level, targetNodeName) {
				console.log("addPileUpLevel: " + level);
				console.log(targetNodeName);
				for (var i=0; i<PilePoints.length; i++) {
					var pilePoint = PilePoints[i];
					if (pilePoint[0] === level + "/") {
						console.log("Level already exists.");
						return;
					}
				}
				PilePoints.push([level, targetNodeName]);
			};
			module.addPileUpLevel = addPileUpLevel;

			// Call this when unfolding a name space and showing the individual nodes
			// again.
			//	level - " /foo/bar/" will unfold a pile that contains " /foo/bar/one" 
			// and " /foo/bar/two"
			module.removePileUpLevel = function(level) {
				var i = PilePoints.length;
				while (i--) {
					if (PilePoints[i][0] === level) {
						PilePoints.splice(i, 1);
					}
				}
			};


			// Consolidate nodes or topics based on namespace. Goes through uiGraph
			// and looks for nodes that pertain to levels in the "PilePoints" list of
			// folded levels.
			//
			function collapsePiles() {
				for (var p=0; p<PilePoints.length; p++) {
					var pilePoint = PilePoints[p];
					collapseNodesThatBelongToThisPilePoint(pilePoint);
				}
			}

			// A PilePoint contains a pileLevel, e.g. " /foo/bar/" and a targetNodeName
			// which is the original node that generated this pile.
			// TODO: Seems to be a mystery about whether or not we're using the latter
			//
			function collapseNodesThatBelongToThisPilePoint(pilePoint) {
				var pileLevel = pilePoint[0],
					pilePointsFound = 0;

				// Check how many visible nodes belong to this level
				// pileLevel = " /foo" will count " /foo", " /foo/bar" etc.
				RenderUi.iterateDownUiNodes(function(node, nodeName) {
					if (matchesLevel(nodeName, pileLevel)) {
						pilePointsFound++;
					}					
				});

				// Only consolidate if there's more than one
				if (pilePointsFound>1) {
					collapseNodesInPileLevel(pileLevel);
				}
			}

			// Consolidate all nodes on uiGraph that match a pilelevel
			//	pileLevel - " /foo/bar"
			//
			function collapseNodesInPileLevel(pileLevel) {
				var consolidatedNodeName = pileLevel + '/...',
					nodeToTransformIntoPile = null;

				modifyAndConsolidateLinksToPointToSummaryNode(pileLevel);
				var nodeToTransformIntoPile = removeMatchingNodesAndGetSummaryNode(pileLevel);
				if (nodeToTransformIntoPile) {
					transformNodeIntoPile(nodeToTransformIntoPile, consolidatedNodeName);
				} 
				connectNewLinksToPile(consolidatedNodeName);					
			}

			// For a given pileLevel, create links that will point to the summary node
			// and prune all the others.
			//
			function modifyAndConsolidateLinksToPointToSummaryNode(pileLevel) {
				RenderUi.iterateDownUiLinks(function(link, index) {
					// Alter targets to consolidated node
					modifyAndConsolidateLinkAtIndexToPointToSummaryNode(link, index, pileLevel);
				});
			}

			// Returns TRUE if nodeName is a pile 
			// Must finish in ... 
			//
			function nodeNameIsAPile(nodeName) {
				return (nodeName.substring(nodeName.length-3)==='...');
			}

			// For a given link (defined by index) and pileLevel, check if it links to
			// one of the nodes in the pile defined by pilelevel. If it does, then create
			// a new link that links to the pile. Then check if this is a duplicate, and if not,
			// add to the list of links.
			// TODO dodgy logic?
			//
			function modifyAndConsolidateLinkAtIndexToPointToSummaryNode(link, index, pileLevel) {

				var //link = RenderUi.uiGraph.links[index],
					consolidatedNodeName = pileLevel + '/...',
					matchesLevelSource = (matchesLevel(link.sourceName, pileLevel) && !nodeNameIsAPile(link.sourceName)),
					matchesLevelTarget = (matchesLevel(link.targetName, pileLevel) && !nodeNameIsAPile(link.targetName));

				if (matchesLevelSource || matchesLevelTarget) {
					// Create a new link to summary node
					var newLink = {
						sourceName: matchesLevelSource ? consolidatedNodeName : link.sourceName,
						targetName: matchesLevelTarget ? consolidatedNodeName : link.targetName,
						source: matchesLevelSource ? null : link.source,
						target: matchesLevelTarget ? null : link.target,
						value: 15
					};
					// Remove existing link
					RenderUi.uiGraph.links.splice(index, 1);

					// Detect if link is duplicate
					var itsADuplicate = false;

					// Now go through all other links and see if they duplicate this new link
					RenderUi.iterateDownUiLinks(function(linkCursor, j) {
						if ((j !== index) &&
							(linkCursor.sourceName === newLink.sourceName) &&
							(linkCursor.targetName === newLink.targetName)) {
							itsADuplicate = true;
							//break;
						}						
					});

					// If a similar link already exists, then don't need to add it
					if (!itsADuplicate) {
						RenderUi.uiGraph.links.push(newLink);
					}
				}
			}

			// Search for links to a node of name consolidatedNodeName and ensure
			// that the pointers to the node are correct.
			//
			function connectNewLinksToPile(consolidatedNodeName) {
				var link,
					nodeToTransformIntoPile=null;

				RenderUi.iterateDownUiNodes(function(node, nodeName, i) {
					if (nodeName === consolidatedNodeName) {
						nodeToTransformIntoPile = node;
					}					
				});

				if (nodeToTransformIntoPile) {

					RenderUi.iterateDownUiLinks(function(link, index) {
						if (link.sourceName === consolidatedNodeName) {
							link.source = nodeToTransformIntoPile;
						}
						if (link.targetName === consolidatedNodeName) {
							link.target = nodeToTransformIntoPile;
						}
					});

					/*
					for (var j=0; j<RenderUi.uiGraph.links.length; j++) {
						link = RenderUi.uiGraph.links[j];
						if (link.sourceName === consolidatedNodeName) {
							link.source = nodeToTransformIntoPile;
						}
						if (link.targetName === consolidatedNodeName) {
							link.target = nodeToTransformIntoPile;
						}
					}	
					*/				
				}


			}					

			// Eliminate the individual nodes in a pilelevel and replace them with a summary node
			// whose positioning data is taken from the node defined by targetNodeName
			//
			function removeMatchingNodesAndGetSummaryNode(pileLevel) {
				// Remove any matching nodes except the first	
				var pilePointsFound = 0,
					nodeName = null,
					thisIsTheNodeToPreserve = null,
					nodeToTransformIntoPile = null,
					summaryNode = null;

				// For any nodes that match the level (but are not the summary node)
				// figure out a node which can provide position data for the summary node
				// (The node that the user selects becomes the summary)	
				//

				
				RenderUi.iterateUpUiNodes(function(node, nodeName, i) {
					if (matchesLevel(nodeName, pileLevel)&&(nodeName!==pileLevel+'/...')) {
						pilePointsFound++;
						thisIsTheNodeToPreserve = (pilePointsFound === 1);
						if (thisIsTheNodeToPreserve) {
							nodeToTransformIntoPile = node;
						}
					}
				});
												
				// Only if we found a node to transform into a pile
				if (nodeToTransformIntoPile) {
					// Create a summary node
					summaryNode = {
						name: 'summary',
						rtype: nodeToTransformIntoPile.rtype,
						x: nodeToTransformIntoPile.x,
						y: nodeToTransformIntoPile.y,
						focus: nodeToTransformIntoPile.focus,
						parentNode: nodeToTransformIntoPile.parentNode
					};

					// Copy data from old node to the summary node
					if (nodeToTransformIntoPile.data) {
						summaryNode.data = nodeToTransformIntoPile.data;
					}
				}	

				// Delete any nodes in this pileLevel
				RenderUi.iterateDownUiNodes(function(node, nodeName, i) {
					if (matchesLevel(nodeName, pileLevel)&&(nodeName!==pileLevel+'/...')) {
						deleteNodeFromGraph(RenderUi.uiGraph, nodeName);
					}
				});

				if (nodeToTransformIntoPile) {
					// ... and add the single summary node in their place
					RenderUi.uiGraph.nodes.push(summaryNode);

					// Switch uiNode pointer on parent to summaryNode
					var parentNode = nodeToTransformIntoPile.parentNode;
					for (var i=0; i<parentNode.uiNodes.length; i++) {
						var uiNode = parentNode.uiNodes[i];
						if (uiNode === nodeToTransformIntoPile) {
							parentNode.uiNodes[i] = summaryNode;
							break;
						}
					}
				}


				return summaryNode;
			}

			// TODO: Kind of twisted. The source node is altered then the data copied to the new summary node
			// Would be better just to create all this stuff on the new node
			//
			function transformNodeIntoPile(nodeToTransformIntoPile, consolidatedNodeName) {
				var rtype = nodeToTransformIntoPile['rtype'];
				nodeToTransformIntoPile['rtype'] = 'pileOf' + rtype.charAt(0).toUpperCase() + rtype.slice(1) + 's';
				nodeToTransformIntoPile['name'] = consolidatedNodeName;
			}

			// Does a node with the given name belong to a pilelevel?
			//
			function matchesLevel(nodeName, pileLevel) {
				return (nodeName.substring(0, pileLevel.length) === pileLevel);
			}

			// NameSpaceTree
			// This keeps track of the number of children at each level of the 
			// namespace and whether or not they have been manually unfolded (TODO)
			// This is used when adding (or removing nodes) to automatically 'fold up'
			// multiple nodes/topics into piles when they are related

			var AUTO_FOLDUP_NUMBER = 3;

			function addToNameSpaceTree(node) {
				var token, level,
					// " /foo/bar/baz" becomes [" /foo", " /foo/bar", " /foo/bar/baz"]
					levels = listOfLevels(node.name);

				for (var i=0; i<levels.length; i++) {
					// " /foo"
					// " /foo/bar"
					// " /foo/bar/baz"
					level = levels[i];
					// NamesSpaceTree { " /foo/bar": {count: 0, unfolded: false}, ... }
					if (level in NameSpaceTree) {
						NameSpaceTree[level].count ++; 
						if (NameSpaceTree[level].count >= AUTO_FOLDUP_NUMBER) {
							module.addPileUpLevel(level);
						}
					} else {
						NameSpaceTree[level] = {count: 1, unfolded: false};
					}
				}		
			}

			// Whenever a node/topic is deleted, it's one less item to worry about in the
			// NameSpaceTree
			//
			function removeFromNameSpaceTree(nodeName) {
				var token, level,
					levels = listOfLevels(nodeName);

				console.log(NameSpaceTree);
				console.log(nodeName);
				console.log(levels);

				for (var i=0; i<levels.length; i++) {
					level = levels[i];
					if (level in NameSpaceTree) {
						NameSpaceTree[level].count --; 
						if (NameSpaceTree[level].count < AUTO_FOLDUP_NUMBER) {
							module.removePileUpLevel(level + '/');
						}
					} else {
						// TODO: Make compatible with hash topics
						console.log("WARNING: Node level '" + level + "' missing from NameSpaceTree");
						//throw "Node level '" + level + "' missing from NameSpaceTree";
					}
				}		
			}

			// Break a namespaced node name into an array of levels.
			//	fullName - node name
			//
			// e.g. "/foo/bar/baz" becomes ["/foo", "/foo/bar", "/foo/bar/baz"]
			// Leading space is preserved, so
			// " /foo/bar/baz" becomes [" /foo", " /foo/bar", " /foo/bar/baz"]
			//
			function listOfLevels(fullName) {
				var pileLevel = '',
					levelList = [];

				if (fullName.charAt(0)===' ') {
					pileLevel = ' ';
					fullName = fullName.substring(1);
				}
				if (fullName.charAt(0)==='/') {
					pileLevel = pileLevel + '/';
					fullName = fullName.substring(1);
				}

				var tokens = fullName.split("/"),
					numberTokens = tokens.length;

				for (var i=0; i<numberTokens; i++) {
					pileLevel = pileLevel + ((i>0) ? '/' : '') + tokens[i];
					levelList.push(pileLevel);
				}

				return levelList;
			}

			// Unfold a pile so that UI displayes the children
			// Generally called from the click handler on a "..." node label
			// 	levelToUnfold - " /foo/bar" will unfold summaryNode
			//	summaryNode - pointer to node " /foo/bar/..."
			//
			function unfoldPile(levelToUnfold, summaryNode) {
				var startX = summaryNode.x,
					startY = summaryNode.y;

				removeNodeAndAssociatedLinksFromUiGraph(summaryNode);
				removePileUpLevelAndAncestors(levelToUnfold);

				addNodesAndLinksToGraphFromLevel(levelToUnfold, startX, startY);
				removePileUpLevelAndAncestors(levelToUnfold);

				//connectGroupsOnGraph(uiGraphIncomplete);
				connectLinksOnGraph(uiGraphIncomplete);
				moveAnyConnectedLinksFromIncompleteToMainGraph();
			}

			// When we unfold a pilelevel such as " /foo/bar/baz",
			// we also don't want any folding to occur at " /foo" or " /foo/bar"
			// This function removes " /foo", " /foo/bar" and " /foo/bar/baz"
			// from the list of pileup levels.
			//	levelToUnfold - " /foo/bar/baz"
			//
			function removePileUpLevelAndAncestors(levelToUnfold) {
				var levels = listOfLevels(levelToUnfold);

				for (var i=0; i<levels.length; i++) {
					var level = levels[i];
					console.log("Removing pileup level " + level);
					module.removePileUpLevel(level);
				}
			}

			// Copy the hidden nodes in the pile from our master copy on uiFullGraph
			// Add their links back in too.
			// Give the nodes the same x,y coordinates as the soon-to-be-removed 
			// summary node so that the unfolded nodes "explode out" from where the user clicked
			//
			function addNodesAndLinksToGraphFromLevel(levelToUnfold, startX, startY) {
				for (var i=0; i<uiFullGraph.nodes.length; i++) {
					var node = uiFullGraph.nodes[i];
					if (matchesLevel(node.name, levelToUnfold)) {
						node.x = startX;
						node.y = startY;
						addNodeToUi(node);
						addNodeLinksToUI(node);
					}
				}
			} 

			// =============== GRAPH MANIPULATION FUNCTIONS =========================
			//
			// uiGraph - where we store the D3 nodes that are actually being displayed
			// uiGraphIncomplete - where we store the nodes that will be displayed as soon as
			//						they are fully connected
			// uiFullGraph - the full set of ROS nodes/topics sent from the server
			//

			// Create an empty graph object. Useful for initializing
			// uiGraph, uiFullGraph etc.
			//
			function emptyGraph() {
				return {
					"nodes" : [],
					"links" : [],
					"groups" : [],
					"machines" : []
				};
			}

			// Functions to do with RosInstances

			function eraseRosInstance(rosInstanceId) {
				console.log("Erasing " + rosInstanceId + " from UI.");

				// Remove nodes from uiFullGraph & uiGraph
				var i = uiFullGraph.nodes.length;
				while (i--) {
					var fullNode = uiFullGraph.nodes[i];
					if (fullNode.rosInstanceId === rosInstanceId) {
						removeNodeFromAllGraphs(fullNode);
					}
				}

				// Remove nodes from uiFullGraph & uiGraph
				var i = uiFullGraph.links.length;
				while (i--) {
					var fullLink = uiFullGraph.links[i];
					removeLinkFromAllGraphs(fullLink);
				}

				// Remove nodes from uiFullGraph & uiGraph
				var i = uiFullGraph.machines.length;
				while (i--) {
					var machine = uiFullGraph.machines[i];
					if (machine.rosInstanceId === rosInstanceId) {
						removeMachineFromAllGraphs(machine);
					}
				}

				// Remove nodes from uiGraphIncomplete
				var i = uiGraphIncomplete.nodes.length;
				while (i--) {
					var incompleteNode = uiGraphIncomplete.nodes[i];
					if (incompleteNode.rosInstanceId === rosInstanceId) {
						uiGraphIncomplete.nodes.splice(i, 1);
					}
				}

				// Remove links from uiGraphIncomplete
				var i = uiGraphIncomplete.links.length;
				while (i--) {
					var incompleteLink = uiGraphIncomplete.links[i];
					uiGraphIncomplete.links.splice(i, 1);
				}

				uiGraphUpdate();
			}
			module.eraseRosInstance = eraseRosInstance;

			// Functions to manipulate NODES on the data graphs ====================
			//

			// Add a node to the various graphs we maintain.
			// uiFullGraph actually points to the original node object that came in 
			// the update, augmented with some more attributes.
			// uiGraph and uiGraphIncomplete get a copy of the original node, so that 
			// we don't mess with the clone of the server graph that we maintain in 
			// uiFullGraph.
			//
			function addNodeToAllGraphs(node, rosInstanceId) {
				if (findNodeByNameOnGraph(node.name, uiFullGraph) === -1) {
					setUpNewNode(node, rosInstanceId);
					addRosInstanceIdToTopic(node, rosInstanceId);
					uiFullGraph.nodes.push(node);
					var uiNode = addNodeToUi(node);
					setUpNewRosTopic(uiNode, rosInstanceId);
				} else {
					console.log("NODE ALREADY EXISTS");
					console.log(getHostnameOnNode(node));
				}			
			}

			// Remove a node rom uiFullGraph and delete any uiNodes that correspond to it on
			// uiGraph.
			//	node - node on uiFullGraph
			//
			function removeNodeFromAllGraphs(node) {
				var i = uiFullGraph.nodes.length;
				while (i--) {
					var uiFullGraphNode = uiFullGraph.nodes[i];
					if (uiFullGraphNode === node) {
						removeUiNodesFromUiGraph(node.uiNodes);
						uiFullGraph.nodes.splice(i, 1);
					}
				}
			}

			// Copy a ROS node or topic to the UI. The nodes are first buffered in
			// uiGraphIncomplete waiting the decision on when to move them to uiGraph
			// and the display.
			//	node - reference to the original update node stored in uiFullGraph
			//  overwriteName - optional uiNode name to overwrite the one defined on node
			// 
			function addNodeToUi(node, overwriteName) {
				addToNameSpaceTree(node);

				var uiNode = copyNodeToIncompleteGraph(node);
				setUpNewRosTopic(uiNode);

				if (overwriteName) {
					uiNode.name = overwriteName;
				}

				if (nodeIsReadyForDisplay(uiNode)) {
					moveNodeFromIncompleteToUiGraph(uiNode);
				}
				node.uiNodes.push(uiNode);

				return uiNode;
			}
			module.addNodeToUi = addNodeToUi;

			// Remove an array of nodes from uiGraph.
			//	arrayNodes - an array of nodes on uiGraph
			//
			function removeUiNodesFromUiGraph(arrayNodes) {
				var i = arrayNodes.length;
				while (i--) {
					removeNodeAndAssociatedLinksFromUiGraph(arrayNodes[i]);
				}
			}

			// Make a copy of a node from uiFullGraph and place it in uiGraphIncomplete
			// ready for moving to uiGraph
			//	node - reference to node object
			//
			function copyNodeToIncompleteGraph(node) {
				var newNode = copyOfNode(node);
				uiGraphIncomplete.nodes.push(newNode);
				return newNode;
			}

			// Move a d3 node from uiGraphIncomplete to uiGraph and display it
			// Add it to any matching machine groups that are on the display
			// e.g. ROS nodes get put inside the yellow "machine" on the display.
			//	node - reference to node object
			//
			function moveNodeFromIncompleteToUiGraph(node) {
				RenderUi.uiGraph.nodes.push(node);
				addNodeToMatchingMachineGroups(node);
				deleteNodeFromGraph(uiGraphIncomplete, node.name);
			}

			// Are we ready to display a d3 node?
			//	"quiet" nodes (e.g. /rosout) are kept off the display
			//
			function nodeIsReadyForDisplay(node) {
				return !isNodeAQuietNode(node);
			}

			// Quiet nodes are standard, boring ROS nodes and topics that are always 
			// present and just clutter up the display.
			//
			function isNodeAQuietNode(node) {
				var nodeName = node.name;
				return ((QUIET_NAMES.indexOf(nodeName) > -1) ||
      					(QUIET_NAMES.indexOf(nodeName.substring(1)) > -1));
			}

			// Decide if a node should be displayed.
			// reasons why not:
			//  - the node is "quiet" and user doesn't want to see quiet nodes
			//	- rosout is never shown
			//
			function shouldNodeWithNameBeDisplayed(nodeName) {
				if (nodeName === '/rosout') {
					return false;
				}

				if (FilterDebugNodes) {
					if ((QUIET_NAMES.indexOf(nodeName) > -1) ||
      					(QUIET_NAMES.indexOf(nodeName.substring(1)) > -1)){
						return false;
					}

				}
				return true;
			}

			// Remove node and associated links from uiGraph
			//	targetNode - reference to node object
			//
			function removeNodeAndAssociatedLinksFromUiGraph(targetNode) {
				console.log("removeNodeAndAssociatedLinksFromUiGraph");
				console.log(targetNode);
				removeNodeFromAnyGroups(targetNode);
				deleteLinksFromGraphConnectedToNode(targetNode, RenderUi.uiGraph);
				removeGroupIfLastNodeOfGroup(targetNode);
				removeNode(targetNode);	
				removeNodeFromParent(targetNode);
			}

			function removeNodeAndAssociatedLinksFromFullGraph(name) {
	    		deleteLinksFromFullGraphConnectedTo(name);
				deleteNodeFromFullGraph(name);
			}

			// Remove node from uiGraph
			//	targetNode - reference to node object
			// Returns TRUE if found and deleted else FALSE
			//
			function removeNode(targetNode) {
				removeFromNameSpaceTree(targetNode.name);
				removeNodeFromGraph(targetNode, RenderUi.uiGraph);
			}

			// There's a reference to the uiNode on the parent node in uiFullGraph
			// This function removes that reference (when the uiNode is deleted)
			//	targetNode - reference to node on uiGraph	
			//
			function removeNodeFromParent(targetNode) {
				var arrayNodes = targetNode.parentNode.uiNodes;
				var i = arrayNodes.length;
				while (i--) {
					var node = arrayNodes[i];
					if (targetNode===node) {
						arrayNodes.splice(i, 1);
					}
				}
			}

			// Remove node from a graph.
			//	targetNode - reference to node object
			// Returns TRUE if found and deleted else FALSE
			//
			function removeNodeFromGraph(targetNode, graph) {
				var i = graph.nodes.length;
				while (i--) {
					var node = graph.nodes[i];
					if (node === targetNode) {
						graph.nodes.splice(i, 1);
						return true;
					} 
				}
				return false;
			}

			// Removes Hash Topic group if this is the last node of the group
			//	targetNode - reference to node on uiGraph
			//
			function removeGroupIfLastNodeOfGroup(targetNode) {
				var parent = targetNode.parentNode;
				if ((parent)&&(parent.hashTopicOrigin)&&(parent.uiNodes.length===1)) {
					var groupIndex = targetNode.group;
					RenderUi.removeGroupFromUi(RenderUi.uiGraph.groups[groupIndex]);
				}
			}

			// Remove node from graph and delete links and groups that point to it
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			//  nameNodeToDelete - name of node to remove
			//	TODO: Refactor with other versions
			//
			function deleteNodeFromGraph(graph, nameNodeToDelete) {
				//console.log("deleteNodeFromGraph: " + nameNodeToDelete);
				for (var j=0; j<graph.nodes.length; j++) {
					if (graph.nodes[j].name === nameNodeToDelete) {
						adjustLinks(graph, j);
						deleteLeavesThatPointToNode(graph, j);
						graph.nodes.splice(j, 1);
						break;
					}	
				}							
			}

			// graph.groups.leaves are indexes (sometimes) or pointers (other times)
			// to the nodes in graph.nodes that belong to a group. Right now, groups are used
			// to display the machine that contains ROS nodes.
			// This function prunes graph.groups.leaves of a given node. It assumes that
			// references are in place.
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			// 	indexNodeToDelete - The index of the node to remove on 'graph.nodes'
			//
			function deleteLeavesThatPointToNode(graph, indexNodeToDelete) {
				var nodeToDelete = (typeof indexNodeToDelete==='number') ? graph.nodes[indexNodeToDelete] : indexNodeToDelete;
				var index = (typeof indexNodeToDelete==='number') ? indexNodeToDelete : findNodeByNameOnGraph(indexNodeToDelete.name);

				for (var g=0; g<graph.groups.length; g++) {	
					if (graph.groups[g].leaves) {
						var l = graph.groups[g].leaves.length;
						while (l--) {
							if (graph.groups[g].leaves[l]===nodeToDelete) {
								graph.groups[g].leaves.splice(l, 1);
							}
						}
					}	
				}
			};

			// Given a node name, find its index on a graph (in graph.nodes)
			//	name - node name
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			// returns index or -1 if not found
			//
			function findNodeByNameOnGraph(name, graph) {
				for (var i=0; i<graph.nodes.length; i++) {
					var node = graph.nodes[i];
					if (name===node.name) {
						return i;
					}
				}
				return -1;
			}	

			// Return array of references to nodes on 'graph' that belong to 'hostname'
			//	hostname - the hostname of the machine
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			//
			function nodesWithHostnameOnGraph(hostname, graph) {
				var list = [];

				for (var i=0; i<graph.nodes.length; i++) {
					var node = graph.nodes[i];
					if (nodeHasHostname(node, hostname)) {
						list.push(node);
					}
				}
				return list;
			}

			// Each ROS node keeps a copy of which machine it is running on
			//	node - reference to node object
			//	hostname - string: name of machine
			//
			function nodeHasHostname(node, hostname) {
				return ((node.data) && (node.data.hostname) && (node.data.hostname === hostname));
			}

			// Return hostname stored no node or empty string if undefined
			//	node - reference to node object
			//
			function getHostnameOnNode(node) {
				if ((node.data) && (node.data.hostname)) {
					return node.data.hostname;
				}
				return "";
			}

			// Find the index of a named node
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			// 	name - name of the node
			//
			function findNodeInGraph(graph, name) {
				for (var i=0; i<graph.nodes.length; i++) {
					if (name===graph.nodes[i]['name'])
						return i;
				}
				return -1;
			}
		
			// Set up a new node to be displayed.
			//	- set various parameters such as size and rosInstanceId
			//	- Create a TopicViewer if it's a topic
			//
			var setUpNewNode = function(node, rosInstanceId) {
				// node.rosInstanceId = rosInstanceId;
				// node.size = node.psize = 0;
				// node.width = node.height = circleRadius;
				// node.uiNodes = [];
				RenderUi.setUpNewNode(node, rosInstanceId);
				RenderUi.setNodeFormatFromSize(node);
			}
			module.setUpNewNode = setUpNewNode;
			// Can be called from hashTopicManager (incomplete)

			function setUpNewRosTopic(node, rosInstanceId) {
				if (node.rtype==='topic') {
					node.viewer = new TopicViewer.TopicViewer(node);
					/*
					if (rosInstanceId) {
						node.rosInstanceId = rosInstanceId;
					}
					*/
				}		
				addRosInstanceIdToTopic(node, rosInstanceId);		
			}

			function addRosInstanceIdToTopic(node, rosInstanceId) {
				if ((node.rtype==='topic') && (rosInstanceId)) {
					node.rosInstanceId = rosInstanceId;
				}								
			}

			// Remove named node from uiFullGraph
			//	nameNodeToDelete - name of node to remove
			//
			var deleteNodeFromFullGraph = function(nameNodeToDelete) {
				deleteNodeFromGraph(uiFullGraph, nameNodeToDelete);	
			};

			// Functions to manipulate LINKS on the data graphs ====================
			//

			// Add a link from an update to the various graphs we maintain.
			//	link - reference to the original link object in update
			//
			function addLinkToAllGraphs(link, rosInstanceId) {
				if (findLinkOnUiFullGraphFromIndexes(link.source, link.target) === -1) {
					console.log("LINK IS NEW");
					link.rosInstanceId = rosInstanceId;
					link['value'] = 15;
					uiFullGraph.links.push(link);	
					
					insertLinkIntoIncompleteGraph(link);
					if (linkIsReadyForDisplay(link)) {
						moveLinkFromIncompleteToUiGraph(link);
					}
				} else {
					console.log("LINK ALREADY EXISTS");
				}
			}

			// Remove a link from FullGraph and from uiGraph
			//	link - reference to link on uiFullGraph
			//
			function removeLinkFromAllGraphs(link) {
				var name = link.name,
					rosInstanceId = link.rosInstanceId;
				for (var i=0; i<uiFullGraph.links.length; i++) {
					var fullLink = uiFullGraph.links[i];
					if ((fullLink.name === name) && (fullLink.rosInstanceId === rosInstanceId)) {
						// TODO delete UI links
						uiFullGraph.links.splice(i, 1);
						return;
					}
				}
			}


			function findLinkOnUiFullGraphFromIndexes(sourceIndex, targetIndex) {
				for (var l=0; l<uiFullGraph.links.length; l++) {
					var link = uiFullGraph.links[l];
					var source = link.source, 
						target = link.target;
					if (typeof source === "object") {
						source = findNodeInGraph(source, uiFullGraph);
					}	
					if (typeof target === "object") {
						target = findNodeInGraph(target, uiFullGraph);
					}	
					if ((source === sourceIndex) && (target === targetIndex)) {
						return l;
					}
				}
				return -1;
			}

			// Add a link to the UI.
			// Links are first buffered in the uiGraphIncomplete until we're sure
			// both nodes the link is connected to are in uiGraph and displayed.
			// At that point the link is moved from uiGraphIncomplete to uiGraph
			// TODO refactor with insertLinkIntoUi
			//
			function addLinkToUi(link) {
				insertLinkIntoIncompleteGraph(link);
				if (linkIsReadyForDisplay(link)) {
					moveLinkFromIncompleteToUiGraph(link);
				}
			}

			// Insert link into UI *if* both ends are also displayed.
			// 	link - reference to link object (probably in uiGraphIcomplete)
			// Returns TRUE if the link was added to uiGraph, FALSE otherwise
			//
			function insertLinkIntoUI(link) {
				var sourceName = link.sourceName,
					targetName = link.targetName;

				if (shouldNodeWithNameBeDisplayed(sourceName) &&
					shouldNodeWithNameBeDisplayed(targetName)) {
					var newLink = copyLink(link);
					console.log("insertLinkIntoUI: " + sourceName + " -> " + targetName);
					RenderUi.uiGraph.links.push(newLink);	

					return true;						
				}
				return false;
			}

			// Add link to the "waiting room" for passing to the UI
			// link - reference to link object
			//
			function insertLinkIntoIncompleteGraph(link) {
				uiGraphIncomplete.links.push(link);
			}

			// Go through list of links on uiGraphIncomplete and move any that are connected
			// at both ends to displayed nodes to the uiGraph itself.
			//
			function moveAnyConnectedLinksFromIncompleteToMainGraph() {
				var link, i=uiGraphIncomplete.links.length;

				while (i--) {
					link = uiGraphIncomplete.links[i];
					if ((link.source>-1) && (link.target>-1)) {
						moveLinkFromIncompleteToUiGraph(link);
					}
				}						
			}					

			// Move a single link from uiGraphIncomplete to uiGraph where it will be displayed
			// to the user.
			//
			function moveLinkFromIncompleteToUiGraph(link) {
				if (insertLinkIntoUI(link)) {
					deleteLinkFromGraph(link, uiGraphIncomplete);
				} else {
					console.log("Couldn't move link " + link.sourceName + " > " + link.targetName);
				}
			}

			// Links are ready for display if both ends are connected to d3 nodes
			// that are actually in uiGraph for display. This function actually attempts 
			// the linkage.
			//
			function linkIsReadyForDisplay(link) {
				link['source'] = findNodeInGraph(RenderUi.uiGraph, link['sourceName']);
				link['target'] = findNodeInGraph(RenderUi.uiGraph, link['targetName']);

				return ((link['source']!=-1) && (link['target']!=-1));
			}

			// Create a new link for uiGraph / uiGraphIncomplete based on an existing
			// one on uiFullGraph
			//
			function copyLink(link) {
				var sourceName = link.sourceName,
					targetName = link.targetName, 
					source = findNodeInGraph(uiFullGraph, sourceName),
					target = findNodeInGraph(uiFullGraph, targetName);
				
				return {
					sourceName: sourceName,
					targetName: targetName,
					source: link.source,
					target: link.target,
					value: 15
				};						
			}

			// Attempt to connect all the links on a graph to nodes on that same graph.
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			//
			function connectLinksOnGraph(graph) {
				var link;

				for (var i=0; i<graph.links.length; i++) {
					link = graph.links[i];
					connectLinkOnGraph(link, graph);
				}
			}

			// Attempt to connect a single link on a graph to nodes on that same graph.
			//	link - reference to a link object
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			//
			function connectLinkOnGraph(link, graph) {
				var sourceName = link['sourceName'],
					targetName = link['targetName'],
					source = findNodeByNameOnGraph(sourceName, graph),
					target = findNodeByNameOnGraph(targetName, graph);
					if ((source != -1) && (target != -1)) {
						completeLink(link, source, target);
						return true;
					}
				return false;
			}

			// Legacy version. TODO Refactor with above.
			//
			function connectLink(link) {
				var sourceName = link['sourceName'],
					targetName = link['targetName'],
					source = findNodeInGraph(uiFullGraph, sourceName),
					target = findNodeInGraph(uiFullGraph, targetName);
				if ((source != -1) && (target != -1)) {
					link['source'] = source;
					link['target'] = target;
					link['value'] = 15;	
					return true;							
				} 				
				return false;		
			}
	
			// Set link source and targets as *indexes* to nodes on the graph.
			// d3/cola seems to prefer indexes, which it then converts to pointers.
			//
			function completeLink(link, source, target) {
				link['source'] = source;
				link['target'] = target;
				link['value'] = 15;							
			}

			// Remove any links that are connected to targetNode on a given graph
			//
			function deleteLinksFromGraphConnectedToNode(targetNode, graph) {
				var nameNodeToDelete = targetNode.name;
				deleteLinksFromGraphConnectedToNodeName(nameNodeToDelete, graph);
			}

			// Remove any links that are connected to a node with given name on a given graph
			// 	targetNode - NAME of node to delete from graph
			//
			function deleteLinksFromGraphConnectedToNodeName(targetNode, graph) {
				var j = graph.links.length;
				while (j--) {
					if ((graph.links[j].sourceName===targetNode) ||
						(graph.links[j].targetName===targetNode)) {
						console.log("deleteLinksFromGraphConnectedToNodeName: " + graph.links[j].sourceName + " -> " + graph.links[j].targetName);
						graph.links.splice(j, 1);
					}
				}
			}

			// Delete link from a graph by reference
			//	targetLink - reference to link object
			//
			function deleteLinkFromGraph(targetLink, graph) {
				for (var i=0; i<graph.links.length; i++) {
					var link = graph.links[i];
					if (link === targetLink) {
						console.log("deleteLinkFromGraph: " + targetLink.sourceName + " -> " + targetLink.targetName);
						graph.links.splice(i, 1);
						return true;
					}
				}
				return false;
			}

			// Delete links from uiFullGraph that are connected to a node
			// Called when a node is permanently removed from the graph 
			// e.g. ROS node killed on server
			// 	nameNodeToDelete - name of the ROS node / topic to delete
			//
			var deleteLinksFromFullGraphConnectedTo = function (nameNodeToDelete) {
				deleteLinksFromGraphConnectedToNodeName(nameNodeToDelete, uiFullGraph);
			};

			// Delete links from a graph that are connected to a node
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			//	index - index of node that is being deleted on graph.nodes
			// TODO: Refactor with other versions
			//
			function adjustLinks(graph, index) {
				var nameNodeToDelete = graph.nodes[index].name;
				var i = graph.links.length;
				while (i--) {
		 			var link = graph.links[i]; 
					if ((graph.links[i].sourceName === nameNodeToDelete) ||
						(graph.links[i].targetName === nameNodeToDelete)) {
						//deleteLink(graph, i);
						console.log("adjustLinks: " + graph.links[i].sourceName + " -> " + graph.links[i].targetName);	
						console.log("nameNodeToDelete: " + nameNodeToDelete);
						console.trace();
						graph.links.splice(i, 1);

					} else {
						if (link.source > index) {
							link.source--;
						}
						if (link.target > index) {
							link.target--;
						}
					}	
				}
			}

			// Copy any links to 'node' that are in uiFullGraph to the UI for 
			// viewing.
			//	node - reference to the node on uiGraph
			//
			function addNodeLinksToUI(node) {
				var nodeName = node.name;
				for (var i=0; i<uiFullGraph.links.length; i++) {
					var link = uiFullGraph.links[i];
					if ((link.sourceName === nodeName) || (link.targetName === nodeName)) {
						console.log("Adding link to UI " + link.sourceName + " -> " + link.targetName);
						addLinkToUi(link);
					}
				}
			}

			// Functions to manipulate GROUPS on the data graphs ===================
			//

			// Set the group to be published to the display once all leaf nodes have also been published.
			//	group - group to be added to display
			//
			function addGroupToUi(group) {
				var uiGroup = copyGroupToIncompleteGraph(group);
				moveGroupIfReady(uiGroup);

				return uiGroup;
			}
			module.addGroupToUi = addGroupToUi;

			// Copy a group to the incomplete graph
			// Groups will sit here until all their leaves are displayable
			//	group - group to move
			//
			function copyGroupToIncompleteGraph(group) {
				var uiGroup = RenderUi.copyGroup(group);
				uiGraphIncomplete.groups.push(uiGroup);

				return uiGroup;
			}

			// function copyGroup(group) {
			// 	// Copy array
			// 	var leaves = [];
			// 	for (var i=0; i<group.leaves.length; i++) {
			// 		var leaf = group.leaves[i];
			// 		leaves.push(leaf);
			// 	}

			// 	// Copy group and add d3 specific padding
			// 	var uiGroup = {
			// 					leaves: leaves,
			// 					title: group.title,
			// 					gtype: group.gtype,
			// 					padding: circleRadius,
			// 					rosInstanceId: group.rosInstanceId
			// 				   };
			// 	if (group.hostname) {
			// 		uiGroup.hostname = group.hostname;
			// 	}			   

			// 	return uiGroup;				
			// }

			// For group to be ready to display, all leaves must be ready to display
			//	uiGroup - group that we want to display
			//
			function groupIsReadyForDisplay(uiGroup) {
				for (var i=0; i<uiGroup.leaves.length; i++) {
					var leaf = uiGroup.leaves[i];
					if (!leafIsReadyForDisplay(leaf)) {
						return false;
					}
				}
				return true;
			}

			// For a leaf to be ready to display, it must be pointing to a node on uiGraph
			// It can either be an index (because it has alrady been converted) or an object
			// reference.
			//	leaf - entry from group.leaves[]
			//
			function leafIsReadyForDisplay(leaf) {
				// See if leaf has already been converted to an index
				if (typeof leaf === "number") {
					return true;
				}

				// If it's an object reference, see if node is on uiGraph
				for (var i=0; i<RenderUi.uiGraph.nodes.length; i++) {
					var node = RenderUi.uiGraph.nodes[i];
					if (node === leaf) {
						return true;
					}
				}
				return false;
			}

			// Move a group from uiGraphIncomplete to uiGraph
			// Do this when group is definitely ready to display (all leaves have been displayed)
			//	uiGroup - group that we want to display
			//	
			function moveGroupFromIncompleteToUiGraph(uiGroup) {
				RenderUi.uiGraph.groups.push(uiGroup);

				var i = uiGraphIncomplete.groups.length;
				while (i--) {
					var group = uiGraphIncomplete.groups[i];
					if (uiGroup === group) {
						uiGraphIncomplete.groups.splice(i, 1);
					}
				}
			}

			// Move any groups to display graph if they are ready to display
			// (i.e. all leaves are already displayed)
			//
			function moveAnyConnectedGroupsFromIncompleteToMainGraph() {
				var i = uiGraphIncomplete.groups.length;
				while (i--) {
					var uiGroup = uiGraphIncomplete.groups[i];
					moveGroupIfReady(uiGroup);
				}
			}

			// Move a single group to display graph if it's ready to be diplayed.
			//	uiGroup - group that can potentially be moved
			//
			function moveGroupIfReady(uiGroup) {
				if (groupIsReadyForDisplay(uiGroup)) {
					moveGroupFromIncompleteToUiGraph(uiGroup);
				}
			}

			// Add a single node to an existing group on uiGraph
			//	node - reference to node object on uiGraph
			//	group - reference to group object on uiGraph
			// Note that webcola requires leaves to be indexes on each force.start()
			// (though it then changes them to node references)
			//
			function addNodeToGroupOnUiGraph(node, group) {
				group.leaves.push(node);
			}

			// Remove a node from a group. Assumes that the leaf on the group
			// has already been converted to a reference (an index won't work)
			// TODO: Check that this always being called after index has been converted to 
			//		 reference or make it work in both ways.
			// 
			function removeNodeFromGroup(node, group) {
				var leaves = group.leaves,
					l = leaves.length,
					found = false;

				while (l--) {
					var leaf = leaves[l];
					// If leaf could be an integer index or a node reference
					if (leaf === node) {
						leaves.splice(l, 1);
						found = true;
					} 
				}	
				return found;
			}

			// webcola groups must contain at least one leaf. So for groups like 
			// "machines" we want a way of displaying them even if they're empty of ROS
			// nodes. We do this by adding an invisible dummy node to the group.
			//	group - reference to group object
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			//
			function addDummyToGroupIfNecessary(group, graph) {
				if (group.leaves.length > 0) {
					return;
				}

				var dummyNode = createDummyNode("/dummy" + (group.title || "Unknown"));
				graph.nodes.push(dummyNode);
				group.leaves.push(dummyNode);
			}

			// Remove node from any groups on uiGraph and add a dummy node instead
			// if the group would otherwise be empty.
			//	node - reference to node object
			//
			function removeNodeFromAnyGroups(node) {

				var nodeIndex = findNodeByNameOnGraph(node.name, RenderUi.uiGraph);
				if (nodeIndex<0) {
					console.log("Can't remove non-existant node: " + node.name);
					return;
					//throw("Can't remove non-existant node: " + node.name);
				}

				// A node could theoretically be in multiple groups
				for (var g=0; g<RenderUi.uiGraph.groups.length; g++) {
					var group = RenderUi.uiGraph.groups[g];

					removeNodeFromGroup(node, group);
					addDummyToGroupIfNecessary(group, RenderUi.uiGraph);
				}
			}

			// Functions to manipulate MACHINES on the data graphs ==================
			//
			// Machines aren't a d3 concept, so you could argue they don't belong on
			// uiGraph, uiGraphIcomplete and uiFullGraph
			// That's where they are right now.
			// A machine is a Linux host running ROS that is part of a "ROS installation"
			// We render a d3 group to represent this machine and put all ROS nodes
			// running on that machine inside it.
			//

			// Add a machine to all the graphs we maintain.
			//	machine - reference to the original machine object in uiFullGraph
			//
			function addMachineToAllGraphs(machine, rosInstanceId) {
				machine.rosInstanceId = rosInstanceId;
				uiFullGraph.machines.push(machine);
				insertMachineIntoUI(machine);
			}

			// Delete a machine and remove any associated uiGraph groups
			//	targetMachine - reference to machine on uiFullGraph
			//
			function removeMachineFromAllGraphs(targetMachine) {
				RenderUi.removeGroupFromUi(targetMachine.group);
				for (var i=0; i<uiFullGraph.machines.length; i++) {
					var machine = uiFullGraph.machines[i];
					if (machine === targetMachine) {
						uiFullGraph.machines.splice(i, 1);
						return;
					}
				}
			}

			// Add a machine to uiGraph and display it.
			//	machine - reference to machine object
			//
			function insertMachineIntoUI(machine) {
				//uiGraph.machines.push(machine);
				createGroupForMachine(machine);
			}

			// Create a group for the ROS machine (a Linux host)
			// Look for any displayed ROS nodes that have the same hostname and pop them
			// into the group. If the group is empty, add a dummy.
			//	machine - reference to machine object on uiGraph
			//	
			function createGroupForMachine(machine) {
				var machineName = (machine.hostname || "unknown"),
					existingNodes = nodesWithHostnameOnGraph(machineName, RenderUi.uiGraph);

				// If there are no nodes in this group then make a dummy one
				if (existingNodes.length === 0)	{
					var dummyNode = createDummyNode("/dummy" + machineName);
					RenderUi.uiGraph.nodes.push(dummyNode);
					existingNodes.push(dummyNode);
				}

				// Create the group and add it to uiGraph
				var group = RenderUi.createNewGroup(existingNodes, machineName, "machine", machine.rosInstanceId);
				var uiGroup = addGroupToUi(group);
				uiGroup.rosInstanceId = machine.rosInstanceId;
				machine.group = uiGroup;
			}

			// In this case we add a ROS node to the graph and check if it matches any
			// existing machine-groups. If it does, we add it to the group.
			//
			function addNodeToMatchingMachineGroups(node) {
				var hostname = getHostnameOnNode(node);
				// If the d3 node has no hostname (e.g. it's a topic) then nothing further
				// to be done.
				if (!hostname) {
					console.log("No HOSTNAME on NODE " + node.name);
					return;
				}

				var found = false;

				// Look for matching nodes. Remove any dummy nodes if we add a real one
				for (var i=0; i<RenderUi.uiGraph.groups.length; i++) {
					var group = RenderUi.uiGraph.groups[i];
					if (hostname === group.hostname) {
						console.log("ADDING NODE " + node.name + " TO GROUP " + group.hostname);
						addNodeToGroupOnUiGraph(node, group);
						RenderUi.removeDummyNodesFromGroup(group);
						found = true;
					} 
				}

				if (!found) {
					console.log("NODE " + node.name + " WITH HOSTNAME " + hostname + " NOT FOUND IN ANY GROUPS");
				}
			}

			// =============== End of GRAPH MANIPULATION FUNCTIONS ======================

			// ======== Legacy code =====================================================
			//
			// TODO: Refactor this out and delete the crap.
			//

			// Make a copy of the node in uiFullGraph for storing in uiGraph and 
			// uiGraphIncomplete
			//
			// The nodes on uiFullGraph represent the ROS entities
			// The nodes on uiGraph represent the graphical elements
			// There is an N-N relationship between the two
			//
			// TODO Refactor and simplify. This is inherited from the previous implementation
			// Many of these attributes will be undefined on uiFullGraph
			//
			function copyOfNode(original) {
				// hashTopic related code. Incomplete.
				var hashTopicOrigin = original.hashTopicOrigin,
				hashSubTopics = original.hashSubTopics,
				subTopicKey = original.subTopicKey,
				subTopicIndex = original.subTopicIndex,

				newNode = {
					name: original.name,
					rtype: original.rtype,
					parentNode: original,
					size: original.size,
					psize: original.psize,
					nodeFormat: original.nodeFormat,
					x: original.x,
					y: original.y,
					px: original.x,
					py: original.y,
					scaling: original.scaling,
					dying: original.dying,
					data: original.data,
					focus: original.focus,
					hashTopicOrigin: hashTopicOrigin,
					hashSubTopics: hashSubTopics,
					subTopicKey: subTopicKey,
					subTopicIndex: subTopicIndex,
					width: original.width,
					height: original.height,
					group: original.group,
					rosInstanceId: original.rosInstanceId,
				};

				copyFieldIfPresent('width', original, newNode);
				copyFieldIfPresent('height', original, newNode);
				copyFieldIfPresent('group', original, newNode);

				return newNode;
			}
			module.copyOfNode = copyOfNode;

			// This is probably not necessary
			// TODO: Check and eliminate
			//
			function copyFieldIfPresent(fieldName, originalNode, newNode) {
				if (originalNode[fieldName]) {
					newNode = originalNode[fieldName];
				}
			}

/*
			// When you delete a ROS node on ROS, the associated topics seem to hang around
			// for a while. These are "orphaned topics" and we try not to show them.
			// TODO: There is an argument for filtering these on the ROS end of things, not the
			// client. 
			//
			function removeOrphanedTopics() {
				if (FilterOrphanedTopics) {

					var i = RenderUi.uiGraph.nodes.length;
					while (i--) {
  						if (RenderUi.uiGraph.nodes[i]['rtype']==='topic') {
    						var e = RenderUi.uiGraph.links.length,
        					nodeName = RenderUi.uiGraph.nodes[i]['name'],
        					found = false;
    						while (e--) {
      							if ((RenderUi.uiGraph.links[e].sourceName === nodeName) || (RenderUi.uiGraph.links[e].targetName === nodeName)) {
        							found = true;
        							break;
      							}
    						}
    						if (!found) {
    							deleteNodeFromGraph(RenderUi.uiGraph, nodeName);
    						}
  						}
					}

				}	
			};
*/

			// TODO Clean up. hashTopic code unfinished.
			function updateNodeOnUiGraph(uiFullGraphNode) {
				var updateRequired = false;
				
				updateRequired = HashTopicManager.seeIfUpdateRequiresNewUiNodes(uiFullGraphNode);
				
				// uiFullGraphNodes carry a list of pointers to uiNodes
				for (var i=0; i<uiFullGraphNode.uiNodes.length; i++) {
					var uiNode = uiFullGraphNode.uiNodes[i];
					uiNode.data = uiFullGraphNode.data;
					if (uiNode.viewer) {
						uiNode.viewer.update(uiNode);
					} else {
						console.log("Viewer not ready for " + uiNode.name);
					}
				}
				
				if (updateRequired) {
					uiGraphUpdate();
				}
			}

			// End of legacy code ====================================================								

		}
		
    return module;
})();







		