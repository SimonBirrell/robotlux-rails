var LuxUi = (function() {
    	"use strict";

    	var INCREMENTAL_SYSTEM = true;
    
    	var module = {};

    	var QUIET_NAMES = ['/diag_agg', '/runtime_logger', '/pr2_dashboard', '/rviz', '/rosout', '/cpu_monitor', '/monitor', '/hd_monitor', '/rxloggerlevel', '/clock', '/rqt', '/statistics', '/luxagent','/rosout_agg'];
		var SHRINK_DURATION = 1000;  
		var KILL_DURATION = 1000;  
		var PILE_CONSOLIDATION_DURATION = 3000;
		var	NODE_LABEL_TOP = 20,
			NODE_LABEL_TEXT_HEIGHT = 16;


    	var uiGraph = {nodes: [], links: [], groups: [], machines: []},
    		uiFullGraph = uiGraph,
    		uiGraphIncomplete;
 
    	var forced = null;	 

    	var NameSpaceTree = {};

    	var MachineMenusRendered = [],
    		SavedNodes = [];	

    	module.getUiGraph = function() {
    		return uiGraph;
    	};

    	module.getUiFullGraph = function() {
    		return uiFullGraph;
    	};

    	module.getUiIncompleteGraph = function() {
    		return uiGraphIncomplete;
    	};

    	module.close = function() {
			uiGraph = uiFullGraph = {nodes: [], links: [], groups: [], machines: []};
       	};

    	var FilterOrphanedTopics = false,
    		FilterDebugNodes = false;

    	var ProtocolToUiLayer = null;

    	var PilePoints = [];

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
	
    	module.open = function(protocolToUiLayer) {

    				ProtocolToUiLayer = protocolToUiLayer;

					// Basic parameters
					var width = 1500,
					    height = 1500,
					    fullWidth = width,
					    fullHeight = height,
						circleRadius = 32,
						groupPadding = (circleRadius / 2),
						colorText = "#042029",
						color = d3.scale.category20();
					

					// Set up user interaction
					
					var force = cola.d3adaptor()
					    .linkDistance(circleRadius * 5)
					    //.handleDisconnected(true)
   					    .handleDisconnected(false)
					    .avoidOverlaps(true)
   					    .size([width, height]);
    									
    				var dragColaSetup = force.drag()
    					.origin(function(d) { return d; })
    				    .on("dragstart", dragstarted)
					    .on("drag", draggedCola)
					    .on("dragend", dragended)
						;

					var margin = {top: 200, right: 20, bottom: 20, left: 300},
					    width = width - margin.right - margin.left,
					    height = height - margin.top - margin.bottom;

					var zoom = d3.behavior.zoom()
					    .on("zoom", zoomAndPan);
					
					// Set up main visualization area

					var canvas = d3.select("#robotlux").append("div")
						.attr("id", "canvas-layer");

					var svg = d3.select("#robotlux").append("svg")
					    .attr("width", width + margin.right + margin.left)
					    .attr("height", height + margin.top + margin.bottom)
						.attr("id","luxwindow-2d")
						.call(zoom)
						.append("g")
					    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
					;

					var rect = svg.append("rect")
					    .attr("width", width)
					    .attr("height", height)
					    .style("fill", "none")
					    .style("pointer-events", "all");

					var zoomed = function () {
					  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
					}
					
					// Set up topic viewer parameters
					TopicViewer.setup(d3, svg, margin, circleRadius, SHRINK_DURATION);

					//var machineTreeMenu = d3.select("#machine-tree-menu");
					var machineTreeMenu = d3.select("#mainMenu");

					// Drag HTML to SVG
					// http://bl.ocks.org/thudfactor/6611441
					var DragDropManager = {
						dragged: null,
						droppable: null,
						draggedMatchesTarget: function() {
							if (!this.droppable) return false;
								return true;
						}
					}

					uiGraphIncomplete = emptyGraph();
					uiFullGraph = emptyGraph();
					//uiGraphUpdate();
					
					uiFullGraph = initialUiGraph();
					
					// Start interacting with the server
					protocolToUiLayer.open(uiGraphAdd, uiGraphDel, uiGraphUpd, uiGraphClear);

					// First update
					uiGraphUpdate2();

					// Start animations & renderings
					animateAndRender();

					function animateAndRender() {
                    	//requestAnimationFrame(animateAndRender);
                    	for (var i=0; i<uiGraph.nodes.length; i++) {
                    		var node = uiGraph.nodes[i];
                    		if (node.viewer) {
                    			node.viewer.animateAndRender();
                    		}
                    	}
                    	// Call Keydrown.js which handles keyboard state
                    	kd.tick();
                    	// return true to cancel animation
                    	return false;
					}
					// This merges animateAndRender into the requestAnimationFrame() call.
					//
					d3.timer(animateAndRender);

					function deleteLeavesThatPointToNode(graph, indexNodeToDelete) {
						for (var g=0; g<graph.groups.length; g++) {	
							if (graph.groups[g].leaves) {
								var l = graph.groups[g].leaves.length;
								while (l--) {
									if (graph.groups[g].leaves[l]===indexNodeToDelete) {
										graph.groups[g].leaves.splice(l, 1);
									}
								}
							}	
						}
					};

					function deleteLink(graph, index) {
						graph.links.splice(index, 1);
					}

					function adjustLinks(graph, index) {
						var nameNodeToDelete = graph.nodes[index].name;
						var i = graph.links.length;
						while (i--) {
				 			var link = graph.links[i]; 
							if ((graph.links[i].sourceName === nameNodeToDelete) ||
								(graph.links[i].targetName === nameNodeToDelete)) {
								deleteLink(graph, i);
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

					function deleteNodeFromGraph(graph, nameNodeToDelete) {
						for (var j=0; j<graph.nodes.length; j++) {
							if (graph.nodes[j].name === nameNodeToDelete) {
								adjustLinks(graph, j);
								deleteLeavesThatPointToNode(graph, j);
								graph.nodes.splice(j, 1);
								break;
							}	
						}							
					}

					function deleteLinkFromGraph(targetLink, graph) {
						for (var i=0; i<graph.links.length; i++) {
							var link = graph.links[i];
							if (link === targetLink) {
								graph.links.splice(i, 1);
								return true;
							}
						}
						return false;
					}

					function deleteNode(nameNodeToDelete) {
						deleteNodeFromGraph(uiGraph, nameNodeToDelete);
					};

					function removeOrphanedTopics() {
						if (FilterOrphanedTopics) {
							//console.log("removeOrphanedTopics");
							//console.log(uiGraph.nodes.length);
							//console.log(uiGraph.links);
							var i = uiGraph.nodes.length;
        					while (i--) {
          						if (uiGraph.nodes[i]['rtype']==='topic') {
            						var e = uiGraph.links.length,
                					nodeName = uiGraph.nodes[i]['name'],
                					found = false;
            						while (e--) {
              							if ((uiGraph.links[e].sourceName === nodeName) || (uiGraph.links[e].targetName === nodeName)) {
                							found = true;
                							break;
              							}
            						}
            						if (!found) {
            							//console.log("DELETING " + nodeName);
            							//console.log("Links: ");
            							//console.log(uiGraph.links.length);
            							deleteNode(nodeName);
            						}
          						}
        					}
        				}	
					};

					module.findANode = function(name) {
						var found = false;
						for (var i=0; i<uiGraph.nodes.length; i++) {
							if (name === uiGraph.nodes[i].name) {
								console.log("FOUND! " + i);
								console.log(uiGraph.nodes[i]);
								found = true;
							}
						}
						if (!found) {
							console.log("not found");
						}
					}

					// TODO Clean up
					function updateNodeOnUiGraph(uiFullGraphNode) {
						for (var i=0; i<uiGraph.nodes.length; i++) {
							var node = uiGraph.nodes[i];
							if (node.rtype==='topic') {
								if (node.name === uiFullGraphNode.name) {
									node.data = uiFullGraphNode.data;
									if (HashTopicManager.isAHashableTopic(node)) {
										// The node in this case is the 'original' topic
										// which contains pointers to the subtopics
										//HashTopicManager.update(uiGraph, node, uiFullGraphNode.data);
										HashTopicManager.update(uiGraph, node, node.data);
									}
									if (node.viewer) {
										node.viewer.update(node);
									}
								}
							}
						}
					}

					function mergeFullNodeWithSaved(original, savedNode) {
						var size = (savedNode) ? savedNode.size : original.size,
						nodeFormat = (savedNode) ? savedNode.nodeFormat : original.nodeFormat,
						x = (savedNode) ? savedNode.x : original.x,
						y = (savedNode) ? savedNode.y : original.y,
						viewer = (savedNode) ? savedNode.viewer : original.viewer,
						data = (savedNode) ? savedNode.data : original.data,
						dying = (savedNode) ? savedNode.dying : original.dying,
						focus = (savedNode) ? savedNode.focus : false,
						scaling = (savedNode) ? savedNode.scaling : original.scaling,
						hashTopicOrigin = (savedNode) ? savedNode.hashTopicOrigin : original.hashTopicOrigin,
						hashSubTopics = (savedNode) ? savedNode.hashSubTopics : original.hashSubTopics,
						subTopicKey = (savedNode) ? savedNode.subTopicKey : original.subTopicKey,
						subTopicIndex = (savedNode) ? savedNode.subTopicIndex : original.subTopicIndex,
						newNode = {
							//name: (original.rtype==='topic') ? ' ' + original.name : original.name,
							name: original.name,
							rtype: original.rtype,
							size: size,
							nodeFormat: nodeFormat,
							viewer: viewer,
							x: x,
							y: y,
							px: x,
							py: y,
							scaling: scaling,
							dying: dying,
							data: data,
							focus: focus,
							hashTopicOrigin: hashTopicOrigin,
							hashSubTopics: hashSubTopics,
							subTopicKey: subTopicKey,
							subTopicIndex: subTopicIndex,

						};

						copyFieldIfPresent('width', original, newNode);
						copyFieldIfPresent('height', original, newNode);
						copyFieldIfPresent('group', original, newNode);

						return newNode;
					}

					function copyOfNode(original) {
						var savedNode = getSavedNode(original.name),
							newNode = mergeFullNodeWithSaved(original, savedNode);
						return newNode;						
					}

					function copyNodeFromFullGraph(original) {
						/*var savedNode = getSavedNode(original.name),
							newNode = mergeFullNodeWithSaved(original, savedNode);*/
						var newNode	= copyOfNode(original);

						uiGraph.nodes.push(newNode);
					}

/*
					function copyNodesFromFullGraph() {
						//var i = uiFullGraph.nodes.length;
						//while (i--) {
						for (var i=0; i<uiFullGraph.nodes.length; i++) {
							var original = uiFullGraph.nodes[i];
							copyNodeFromFullGraph(original);

							if (HashTopicManager.isAHashableTopic(newNode)) {
								console.log("Rescuing subtopics of " + newNode.name);
								for (var h=1; h<newNode.hashSubTopics.length; h++) {
									console.log("Rescued " + newNode.hashSubTopics[h].name);
									uiGraph.nodes.push(newNode.hashSubTopics[h]);
									console.log(uiGraph.nodes.length);
								}
								//HashTopicManager.setLinksOnSubTopics(uiGraph, newNode.hashSubTopics);
							}
							
						}

					}
					function copyLinksFromFullGraph() {
						for (var i=0; i<uiFullGraph.links.length; i++) {
							var original = uiFullGraph.links[i];
							//copyLinkFromFullGraph(original);
							uiGraph.links[i] = {
								sourceName: original.sourceName,
								targetName: original.targetName
							};
						}
					}
*/

					function copyLinkFromFullGraph(original) {
						console.log("copyLinkFromFullGraph " + original.sourceName + " > " + original.targetName);
						uiGraph.links.push({
								sourceName: original.sourceName,
								targetName: original.targetName
							});
					}

/*
					function copyGroupsFromFullGraph() {
						for (var i=0; i<uiFullGraph.groups.length; i++) {
							uiGraph.groups[i] = {leaves: []};
							for (var l=0; l<uiFullGraph.groups[i].leaves.length; l++) {
								uiGraph.groups[i].leaves.push(uiFullGraph.groups[i].leaves[l]);
							}
						}
					}
					function copyMachinesFromFullGraph() {
						for (var i=0; i<uiFullGraph.machines.length; i++) {
							uiGraph.machines[i] = uiFullGraph.machines[i];
						}						
					}

					function copyFromFullGraph() {
						//uiGraph = emptyGraph();
						copyNodesFromFullGraph();
						copyLinksFromFullGraph();
						copyGroupsFromFullGraph();
						copyMachinesFromFullGraph();
					}
*/

					function copyFieldIfPresent(fieldName, originalNode, newNode) {
						if (originalNode[fieldName]) {
							newNode = originalNode[fieldName];
						}
					}

					function shouldNodeBeDisplayed(node) {
						return shouldNodeWithNameBeDisplayed(node.name);
					}

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

					function hideQuietNodes() {
						// Following rqt_graph, always hide /rosout node
						deleteNode('/rosout');

						if (FilterDebugNodes) {
							// Filter out debug nodes
        					var i = uiGraph.nodes.length;
        					while (i--) {
        						var nodeName = uiGraph.nodes[i]['name'];
          						if ((QUIET_NAMES.indexOf(nodeName) > -1) ||
              						(QUIET_NAMES.indexOf(nodeName.substring(1)) > -1)){
          								deleteNode(nodeName);
            					}	
        					} 

        					// Filter out edges
        					var i = uiGraph.links.length;
        					while (i--) {
        						var nodeNameSource = uiGraph.links[i]['sourceName'],
        							nodeNameTarget = uiGraph.links[i]['targetName'];

          						if ((QUIET_NAMES.indexOf(nodeNameSource) > -1) || 
              						(QUIET_NAMES.indexOf(nodeNameSource.substring(1)) > -1) || 
              						(QUIET_NAMES.indexOf(nodeNameTarget) > -1) ||
              						(QUIET_NAMES.indexOf(nodeNameTarget.substring(1)) > -1)) {
            							uiGraph.links.splice(i, 1);
            					}
        					} 
						}
					}
	
	/*
					function saveCurrentNodePositions() {
						var node, savedNode;
						SavedNodes = [];
						for (var i=0; i<uiGraph.nodes.length; i++) {
							node = uiGraph.nodes[i];
							savedNode = {
								name: node.name,
								x: node.x,
								y: node.y,
								size: node.size,
								nodeFormat: node.nodeFormat,
								dying: node.dying,
								scaling: node.scaling,
								viewer: node.viewer,
								data: node.data,
								focus: node.focus,
								hashTopicOrigin: node.hashTopicOrigin,
								hashSubTopics: node.hashSubTopics,
								subTopicKey: node.subTopicKey,
								subTopicIndex: node.subTopicIndex,
							};
							SavedNodes.push(savedNode);
						}
					}
*/
					function getSavedNode(nodeName) {
						for (var i=0; i< SavedNodes.length; i++) {
							if (SavedNodes[i].name === nodeName) {
								return SavedNodes[i];
							}
						}
						return null;
					}

					////////////////////////////////////////////////////					
					//
					// Tick functions
					//
					////////////////////////////////////////////////////

					// One tick of the force layout simulation. This is generally
					// one animation frame, but doesn't have to be.
					//
					function graphTick(link, node, group) {
						defineLinkPath(link);
						copyWidthOnNodeFromTransition(node);
						positionGroup(group);
				        TopicViewer.tick();
					}

					function defineLinkPath(link) {
						link
						    .attr("d", function(d) {
						    	
						    	if ((typeof(d.target) === "undefined")||(typeof(d.source) === "undefined")) {
						    		console.log("Reconnecting...")
						    		connectLink(d);
						    	}
						    	if ((typeof(d.target) !== "undefined")&&(typeof(d.source) !== "undefined")) { 
							    	var dx = d.target.x - d.source.x,
        								dy = d.target.y - d.source.y,
        								dr = 300/1,
        								rotation = 0; //Math.atan2(dy, dx);  //linknum is defined above
    								return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " " + rotation + " 0,1 " + d.target.x + "," + d.target.y;
    							} else {
    								console.log(d);
    								throw "Link with no source or target";
    							}

    							return "";
						    });
					}

					function copyWidthOnNodeFromTransition(node) {
						node
							.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"})
							.attr("dummy", function(d) {
								// Get width from domElement where it has been
								// subject to a transition
								var widthOnDomElement = d3.select(this).attr("width") || 0;
								// Set size on data to allow bounding box to transition smoothly
								// d points to node on uiGraph
								d.width = widthOnDomElement;
								d.height = widthOnDomElement;
								// We can keep the force layout animation going
								// longer than usual by setting this flag.
								if (d.keepForceLayoutHeated) {
									setTimeout(function() {
										force.resume();
									},10);
								}

								// Dummy attribute
								return 0});
					}

					function setUpEnteringGroups(group) {
						var groupEnter = group
				          .enter();

				        var newGroups = groupEnter  
							.append("rect")
				            .attr("rx", 8).attr("ry", 8)
				            .attr("class", "group")
				            .attr("id", function(d) {return "machine_" + d.hostname;});

				        // When mouse is over a group, tell the DragDropManager that it's available
				        // as a drop target
				        newGroups.on('mouseover',function(d,i){
							DragDropManager.droppable = d; 
						});
						newGroups.on('mouseout',function(e){
							DragDropManager.droppable = null;
						});

						return groupEnter;
					}

					function positionGroup(group) {
							group.attr("x", function (d) { return d.bounds.x; })
				                 .attr("y", function (d) { return d.bounds.y; })
				                 .attr("width", function (d) { return d.bounds.width(); })
				                 .attr("height", function (d) { return d.bounds.height(); });

					}

					////////////////// End of tick functions ////////////////////////////////////

					function setUpEnteringLinks(link) {
						var linkEnter = link
					      .enter().append("svg:path")
					        .attr("class", "linkPath")
					        .attr("x1", function(d) { return d.source.x; })
					        .attr("y1", function(d) { return d.source.y; })
					        .attr("x2", function(d) { return d.target.x; })
					        .attr("y2", function(d) { return d.target.y; })
						    .attr("marker-end", function(d) { return "url(#" + "basic" + ")"; })
							.style("stroke-width", function(d) { return Math.sqrt(d.value); });

						return linkEnter;	
					}

					function setUpEnteringNodes(node) {
						// New nodes - add a group
						var nodeEnter = node
					      .enter().append("g")
							.attr("transform", function(d) {return "translate(" + d.x + "," + d.y + ")"})
					        .call(dragColaSetup);

					    // Add background circles for piles
					    drawBackgroundCicle(nodeEnter, 20);	
					    drawBackgroundCicle(nodeEnter, 10);	

						// New nodes - add contents of group
						nodeEnter.append("circle")
					        .attr("class", function(d) { return "node-" + d.rtype; })
					        .on("dblclick", nextNodeSize)
					        ;

					    appendNodeLabels(nodeEnter);

					    return nodeEnter;  	
					}

					function drawBackgroundCicle(selection, offset) {
					    selection.filter(function(d) {return ((d.rtype==='pileOfNodes') || (d.rtype==='pileOfTopics'))})
					    	.append("circle")
					        .attr("class", function(d) { return "node-" + d.rtype; })
					    	.attr("cx", offset)
					    	.attr("cy", -offset)
					    	;						
					}


					// NEW INCREMENTAL VERSION =============================================

					// uiGraph - where we store the D3 nodes that are actually being displayed
					// uiGraphIncomplete - where we store the nodes that will be displayed as soon as
					//						they are fully connected
					// uiFullGraph - the full set of ROS nodes/topics sent from the server
					//

					// Functions to manipulate NODES on the data graphs ====================
					//

					function insertNodeIntoGraph(node) {
						if (shouldNodeWithNameBeDisplayed(node.name)) {
							copyNodeFromFullGraph(node);
						}
					}

					function insertNodeIntoIncompleteGraph(node) {
						var newNode = copyOfNode(node);
						uiGraphIncomplete.nodes.push(newNode);
					}

					function moveNodeFromIncompleteToUiGraph(node) {
						uiGraph.nodes.push(node);
						addNodeToMatchingMachineGroups(node);
						//uiGraphUpdate2();
						deleteNodeFromGraph(uiGraphIncomplete, node.name);
					}

					function nodeIsReadyForDisplay(node) {
						return !isNodeAQuietNode(node);
					}

					function isNodeAQuietNode(node) {
						var nodeName = node.name;
						return ((QUIET_NAMES.indexOf(nodeName) > -1) ||
              					(QUIET_NAMES.indexOf(nodeName.substring(1)) > -1));
					}

					// Remove node and associated links from uiGraph
					//
					function removeNodeAndAssociatedLinksFromUiGraph(targetNode) {
						removeNodeFromAnyGroups(targetNode);
						deleteLinksFromGraphConnectedToNode(targetNode, uiGraph);
						removeNode(targetNode);	
					}

					// Remove node from uiGraph
					//	targetNode - reference to node object
					// Returns TRUE if found and deleted else FALSE
					//
					function removeNode(targetNode) {
						removeNodeFromGraph(targetNode, uiGraph);
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

					function findNodeOnGraph(node, graph) {
						for (var i=0; i<graph.nodes.length; i++) {
							if (name===graph.nodes[i]['name'])
								return i;
						}
						return -1;
					}	

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

					function nodeHasHostname(node, hostname) {
						return ((node.data) && (node.data.hostname) && (node.data.hostname === hostname));
					}

					function getHostnameOnNode(node) {
						if ((node.data) && (node.data.hostname)) {
							return node.data.hostname;
						}
						return "";
					}

					function getNodeIndex(node, graph) {
						for (var i=0; i<graph.nodes.length; i++) {
							if (node === graph.nodes[i]) {
								return i;
							}
						}
						return -1;
					}
			
					// Functions to manipulate LINKS on the data graphs ====================
					//

					function insertLinkIntoGraph(link) {
						var sourceName = link.sourceName,
							targetName = link.targetName;

						if (shouldNodeWithNameBeDisplayed(sourceName) &&
							shouldNodeWithNameBeDisplayed(sourceName)) {
							var newLink = createLink(link);
							uiGraph.links.push(newLink);	
							//uiGraphUpdate2();

							return true;						
						}
						return false;
					}

					function insertLinkIntoIncompleteGraph(link) {
						uiGraphIncomplete.links.push(link);
					}

					function moveAnyConnectedLinksFromIncompleteToMainGraph() {
						var link, i=uiGraphIncomplete.links.length;

						while (i--) {
							link = uiGraphIncomplete.links[i];
							if ((link.source>-1) && (link.target>-1)) {
								moveLinkFromIncompleteToUiGraph(link);
							}
						}						
					}					

					function moveLinkFromIncompleteToUiGraph(link) {
						if (insertLinkIntoGraph(link)) {
							deleteLinkFromGraph(link, uiGraphIncomplete);
						} else {
							console.log("Couldn't move link " + link.sourceName + " > " + link.targetName);
						}
					}

					function linkIsReadyForDisplay(link) {
						link['source'] = findNodeInGraph(uiGraph, link['sourceName']);
						link['target'] = findNodeInGraph(uiGraph, link['targetName']);

						return ((link['source']!=-1) && (link['target']!=-1));
					}

					function createLink(link) {
						var sourceName = link.sourceName,
							targetName = link.targetName, 
							source = findNode2(sourceName),
							target = findNode2(targetName);
						
						return {
							sourceName: sourceName,
							targetName: targetName,
							source: link.source,
							target: link.target,
							value: 15
						};						
					}

					function connectLinksOnGraph(graph) {
						var link;

						for (var i=0; i<graph.links.length; i++) {
							link = graph.links[i];
							connectLinkOnGraph(link, graph);
						}
					}

					function connectLinkOnGraph(link, graph) {
						var sourceName = link['sourceName'],
							targetName = link['targetName'],
							source = findNodeOnGraph(sourceName, graph),
							target = findNodeOnGraph(targetName, graph);
							if ((source != -1) && (target != -1)) {
								completeLink(link, source, target);
								return true;
							}
						return false;
					}

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
					//
					function deleteLinksFromGraphConnectedToNodeName(targetNode, graph) {
						var j = graph.links.length;
						while (j--) {
							if ((graph.links[j].sourceName===targetNode) ||
								(graph.links[j].targetName===targetNode)) {
								graph.links.splice(j, 1);
							}
						}
					}



					// Functions to manipulate GROUPS on the data graphs ===================
					//

					function createNewGroup(existingNodes, title, groupType) {
						var indexNodes = convertNodesToIndexes(existingNodes, uiGraph);

						var newGroup = {
										leaves: indexNodes, 
										title: title,
										gtype: groupType,
										padding: circleRadius
									   };
						if (groupType==="machine") {
							newGroup.hostname = title;
						}

						return newGroup;
					}

					function convertNodesToIndexes(nodes, graph) {
						var indexes = [];

						for (var i=0; i<nodes.length; i++) {
							var node = nodes[i];
							for (var j=0; j<graph.nodes.length; j++) {
								if (node === graph.nodes[j]) {
									indexes.push(j);
									break;
								}
							}
						}

						return indexes;
					}

					function connectGroupsOnGraph(graph) {
						var group;

						for (var i=0; i<graph.groups.length; i++) {
							group = graph.groups[i];
							connectGroupOnGraph(group, graph);
						}
					}

					function connectGroupOnGraph(group, graph) {

					}				

					function moveAnyConnectedGroupsFromIncompleteToMainGraph() {

					}

					function addNodeToGroup(node, group) {
						var indexes = convertNodesToIndexes([node], uiGraph);

						group.leaves.push(indexes[0]);
					}

					function removeDummyNodesFromGroup(group) {
						var i = group.leaves.length;
						while (i--) {
							var leaf = group.leaves[i];
							if (leaf.rtype === "dummy") {
								group.leaves.splice(i, 1);
							}
						}
					}

					// Workaround for a bug in WebCola
					// https://github.com/tgdwyer/WebCola/issues/140
					function resetLeavesOnAllGroups(graph) {
						for (var g=0; g<graph.groups.length; g++) {
							var group = graph.groups[g];
							resetLeavesOnGroup(group, graph);
						}
					}

					function resetLeavesOnGroup(group, graph) {
						var index;
						for (var l=0; l<group.leaves.length; l++) {
							var leaf = group.leaves[l];
							if (typeof leaf === "object") {
								index = getNodeIndex(leaf, graph);
								if (index<0) {
									console.log(group);
									throw "Node not found in resetLeavesOnGroup()";
								}	
								group.leaves[l] = index;	
							}
						}
					}

					// Functions to manipulate MACHINES on the data graphs ==================
					//

					function insertMachineIntoMainGraph(machine) {
						uiGraph.machines.push(machine);
						createGroupForMachine(machine);
					}

					function createGroupForMachine(machine) {
						var machineName = (machine.hostname || "unknown"),
							existingNodes = nodesWithHostnameOnGraph(machineName, uiGraph);

						// If there are no nodes in this group then make a dummy one
						if (existingNodes.length === 0)	{
							var dummyNode = createDummyNode("/dummy" + machineName);
							uiGraph.nodes.push(dummyNode);
							existingNodes.push(dummyNode);
						}

						var group = createNewGroup(existingNodes, machineName, "machine");
						uiGraph.groups.push(group);
					}

					function testDummyNode(name) {
						var dummyNode = createDummyNode("/dummy" + name);
						uiGraph.nodes.push(dummyNode);
					}

					function addNodeToMatchingMachineGroups(node) {
						var hostname = getHostnameOnNode(node);
						if (!hostname) {
							return;
						}

						console.log("Node " + node.name + " has hostname " + hostname);
						for (var i=0; i<uiGraph.groups.length; i++) {
							var group = uiGraph.groups[i];
							console.log("Group has hostname " + group.hostname);
							if (hostname === group.hostname) {
								console.log("match");
								addNodeToGroup(node, group);
								removeDummyNodesFromGroup(group);
							}
						}
					}

					// New slimmer update routine. This is called when nodes, links or groups are
					// added or deleted from uiGraph.
					// 
					// TODO: force.start() definitely needs calling on each graph change. Should 
					// check how much of the below D3 code actually needs calling.
					//

					function uiGraphUpdate2() {

						console.log("uiGraphUpdate2 ---------------------------------");
						
						// Collapse nodes into piles where necessary
						// TODO Make viewers regenerate on expand
						collapsePiles();

						// Set up groups
						//createGroupsOnGraph(uiGraph);


						// Hash-style topics and groups
						//createHashTopics();
						//HashTopicManager.addStrutsToHashTopics(uiGraph);


						// Data joins			
						var group = svg.selectAll(".group")
				          .data(uiGraph.groups);
					    var link = svg.selectAll(".linkPath")
					      .data(uiGraph.links, function(d) {return d.sourceName + "*" + d.targetName});
						var node = svg.selectAll(".node")
						  .data(uiGraph.nodes, function(d) {return d.name;});

						// Groups
						var groupEnter = setUpEnteringGroups(group);
						group.exit().remove();
					
						// Links
						var linkEnter = setUpEnteringLinks(link);
						link.exit().remove();	

						// Nodes
						var nodeEnter = setUpEnteringNodes(node);
						updateNodes(node);

					    // Topic displays
					    TopicViewer.topicDisplay(node, uiGraph);

					    // Gracefully remove any exiting nodes
						var exitingNodes = setupExitingNodes(node);								

						// Start force layout
						console.log("forced in update2");
						resetLeavesOnAllGroups(uiGraph);
						forced = force
							  .nodes(uiGraph.nodes)
						      .links(uiGraph.links)
							  .groups(uiGraph.groups)
						      .symmetricDiffLinkLengths(circleRadius * 2)
						      .start();
						console.log(uiGraph);
						console.log("finished forced in update2");

						// Apply force to entering and updating elements
						// http://stackoverflow.com/questions/11368339/drawing-multiple-edges-between-two-nodes-with-d3
						
						force.on("tick", function() {
							graphTick(link, node, group);
						});	

						// Package tree added to menu
						MachineTreeMenu.updateMachineMenu(machineTreeMenu, uiGraph, DragDropManager, ProtocolToUiLayer);
						console.log("Finished update2 --------------------------");
					}
					module.uiGraphUpdate2 = uiGraphUpdate2;


					//////////////////////////////////////////////////////////////////
					// Node and Topic labels
					//////////////////////////////////////////////////////////////////

					// Add the labels under the node/topic plus any required handlers
					function appendNodeLabels(nodeEnter) {
						nodeEnter.selectAll('.nodetopic-label') 
						    .data(function(d) {
						    	var nameChunks = (d.rtype === "dummy") ? "" : prepareLabels(d.name, d);
						    	return nameChunks;
						    })
						    .enter()
							    .append('text')
							    .classed('nodetopic-label', true)
							    .classed('nodetopic-label-active', function(d) {return (d.clickHandler !== null)})
							    .text(function(d) {
							    	return d.chunkName;
							    })
					    		.style("cursor", function(d) {
					    			return d.clickHandler ? "pointer" : "default";
					    		})
						    	.on("click", function(d) {
						    		if (d.clickHandler) {
						    			d.clickHandler();
						    		}
					    		})
		                    	.attr("x", 0)
                    			;
					}

					function prepareLabels(fullName, d) {
						var prefix = '';

						if (fullName.charAt(0)===' ') {
							prefix = ' ';
							fullName = fullName.substring(1);
						}
						if (fullName.charAt(0)==='/') {
							prefix = prefix + '/';
							fullName = fullName.substring(1);
						}

						var tokens = fullName.split("/"),
							numberTokens = tokens.length,
							nameChunks = [],
							nameChunk = null,
							clickHandler = null,
							pileLevel = prefix;

						for (var i=0; i<numberTokens; i++) {
							pileLevel = pileLevel + ((i>0) ? '/' : '') + tokens[i];
							nameChunk = {	
											chunkName: tokens[i], 
											pileLevel: pileLevel, 
											clickHandler: null,
											yIndex: i,
											node: d
										};
							nameChunks.push(nameChunk);
						}

						if (numberTokens>1) {
							// Intermediate name chunks will fold up the namespace when clicked
							for (var i=0; i<(numberTokens-1); i++) {
								nameChunks[i].clickHandler = foldup;
							}	
							// If the last chunk is '...' then this unfolds the namespace
							if (tokens[numberTokens-1] === '...') {
								nameChunks[numberTokens-1].clickHandler = unfold;
							}
						}
						return nameChunks;
					}

					function foldup() {
						module.addPileUpLevel(this.pileLevel + '/');
						uiGraphUpdate2();
					}

					function unfold() {
						var levelToUnfold = this.pileLevel.substring(0, this.pileLevel.length-4);
						module.removePileUpLevel(levelToUnfold);
						uiGraphUpdate2();
					}

					function updateNodeLabels(node) {
					    node.selectAll(".nodetopic-label")
					   		.transition()
					   		.duration(SHRINK_DURATION)
					    	.attr("y", function(d) {
        		            	var y = nodeRadius(d.node) + 
        		            			NODE_LABEL_TOP + 
        		            			d.yIndex * NODE_LABEL_TEXT_HEIGHT;
                		    	return y;
					    	});

					}

					//////////////////////////////////////////////////////////////////
					// End of Node and Topic labels
					//////////////////////////////////////////////////////////////////

					/////////////////// Basic D3 Node setup ////////////////////////////////////

					// This is called on every update to the graph
					//	nodeSelection - the D3 selection of nodes, already joined.
					//

					function updateNodes(nodeSelection) {
					    // view switch icons - only visible on medium and large topics
					    switchIcons(nodeSelection);

						// Update existing nodes with transitions
						setNodeClass(nodeSelection);

					    // Set up scaling of nodes for when user double-clicks
					    scaleNodes(nodeSelection);

					    // Animate switch icons when scaling topic
					    animateSwitchIcon(nodeSelection, "switch-left-icon", -1);
					    animateSwitchIcon(nodeSelection, "switch-right-icon", 1);

					    // Set up and animate node labels
					    updateNodeLabels(nodeSelection);		

					    // Handle dying nodes
					    setUpDyingNodes(nodeSelection);

					    // handle Kill Icons - only visible on large format ROS node
					    killIcons(nodeSelection);
					}

					// Set the CSS class on a D3 node
					//
					function setNodeClass(nodeSelection) {
						nodeSelection
					        .attr("class", function(d) {
					        	var nodeClass = "node";
					        	if (d.nodeFormat) {
					        		nodeClass = nodeClass + " node-format-" + d.nodeFormat;
					        	}
					        	return nodeClass;
					        });						
					}

					// Set up scaling of nodes for when user double-clicks
					//
					function scaleNodes(nodeSelection) {
						nodeSelection
							.transition()
							.duration(SHRINK_DURATION)
					        .attr("width", function(d) {return nodeRadius(d) * 2;})
					        .attr("height", function(d) {return nodeRadius(d) * 2;})
					        .each("start", function(d) {
					        	d.keepForceLayoutHeated = true;
					        	force.resume();
					        })
					        .each("end", function(d) {
						        d.keepForceLayoutHeated = false;
					        });

						nodeSelection.selectAll("circle")
							.classed("focus", function(d) {
								//console.log("Checking focus on " +d.name);
								//console.log(d.focus);
								return (this.parentElement.__data__.focus === true);

								//return (d.focus===true);
							})
					   		.transition()
					   		.duration(SHRINK_DURATION)
					        .attr("r", function(d) {return nodeRadius(d);});

					}

					// These are ROS nodes that have been brutally murdered by the user by clicking
					// on the kill icon.
					// They die slowly, then remove themselves from uiGraph
					//
					function setUpDyingNodes(nodeSelection) {
					    // Handle dying nodes
					    var dying = nodeSelection
					    	.filter(function(d) {return (d.dying===true);});
						dying.selectAll("circle")
							.transition()
							.duration(KILL_DURATION)
							.attr("r", 0);								
					    dying	
					    		.classed("dying", false)	
					    		.attr("opacity", 1.0)
								.transition()
								.duration(KILL_DURATION)
								.attr("width", 0)
								.attr("height", 0)
								.attr("opacity", 0.0)
								.each("start", function(d) {
									d.keepForceLayoutHeated = true;
								})
					    		.each("end", function(d) {
					    			removeNodeAndAssociatedLinksFromUiGraph(d);
					    			// TODO - are these two lines still necessary?
					    			deleteLinksFromFullGraphConnectedTo(d.name);
									deleteNodeFromFullGraph(d.name);
									// Trigger a graph update 
									setTimeout(uiGraphUpdate2, 100);
					    		})
								.remove();
						return dying;						
					}

					function setupExitingNodes(nodeSelection) {
					    // Gracefully remove any exiting nodes
						var exitingNodes = nodeSelection.exit();
						exitingNodes
							.attr("opacity", 1.0)
							.transition()
							.duration(KILL_DURATION)
							.attr("width", 0)
							.attr("height", 0)
							.attr("opacity", 0.0)
							.remove();
						exitingNodes.selectAll("circle")
							.transition()
							.duration(KILL_DURATION)
							.attr("r", 0);		

						return exitingNodes;						
					}

					/////////////////// End of Basic D3 Node setup ////////////////////////////////
					
					///////////////////// Switch Icons ////////////////////////////////////////////

					// Add in switchIcons to all topics
					// These are the < and > that swap between topic views
					//	selection - the 'node' D3 selection
					//
					function switchIcons(selection) {
						console.log("Setting up switchIcons ********************");
						switchIcon(selection, "switch-left-icon", -1, "\ue64a");
						switchIcon(selection, "switch-right-icon", +1, "\ue649");
					}

					// Add switch icons to a D3 selection of topics
					//	selection - the 'node' D3 selection
					// 	klass - the CSS class of the type of switch icon to add
					//	side - which side the icon is on. -1 on the left hand side, +1 on the right hand side
					//  icon - Font Awesome icon code
					//
					function switchIcon(selection, klass, side, icon) {
					    var switchIcons = selection.selectAll("." + klass)
					    	.data(function(d) {
					    		return topicNeedsSwitchIcons(d) ? [{hostname: d.data.hostname, size: d.size, width: d.width, viewer: d.viewer}] : []
					    	});

					    switchIcons.enter()
					    	.append("text")
					    		.attr("class", klass)
					    		.attr("opacity", 0.0)
					    		.on("click", function(d) {
					    			if (side===-1) {
						    			d.viewer.rotateViewLeft();
					    			} else {
						    			d.viewer.rotateViewRight();
					    			}
					    		})
					    		.text(icon)
					    		.style("font-family", "themify")
					    		.style("cursor", "pointer")
					   			.attr("text-anchor", "middle")
					    		.attr("alignment-baseline", "middle")
					    		.attr("stroke", "white")					    		
					    		.transition()
					    		.duration(SHRINK_DURATION)
					    		.attr("opacity", 1.0)
					    		;

					    switchIcons.exit().remove();	
					}

					// Return TRUE if this D3 node needs a switch icon added.
					// This is TRUE for topics that are "large" size
					//
					function topicNeedsSwitchIcons(d) {
						return (((d.nodeFormat==='large')||(d.nodeFormat==='medium'))
								&&(d.rtype==='topic')
								&&(d.viewer.numberOfViews > 1)
								);
					}

					// Set up scaling animation on switch icons for when the topic is
					// double-clicked
					//	node - the D3 node selection
					//	klass - the CSS class of these switch icons
					//	side - which side the icon is on. -1 on the left hand side, +1 on the right hand side
					//
					function animateSwitchIcon(node, klass, side) {
					    node.selectAll("." + klass)
					   		.transition()
					   		.duration(SHRINK_DURATION)
					   		.attr("opacity", 1.0)
					    	.attr("x", function(d) {return side * nodeRadius(d) - side * 20});						
					}

					///////////////////// End of Switch Icons /////////////////////////////////////


					// Set up Kill Icons - only visible as an "X" on large format ROS nodes
					//	nodeSelection - d3 selection of nodes
					//
					//	When the user clicks the kill icon, the UI-to-protocol layer is told
					//	to send a kill message back to the server
					//
					function killIcons(nodeSelection) {

						// Display on d3 nodes that are ROS nodes, large size
					    var killIcons = nodeSelection.selectAll(".kill-icon")
					    	.data(function(d) {
					    		return ((d.nodeFormat==='large')&&(d.rtype==='node')&&(!d.shrinking)) ? [{hostname: d.data.hostname, pid: d.data.pid}] : []
					    	});

					    // Set up kill icons to be clickable and to make them scale when the node scales
					    killIcons.enter()
					    	.append("text")
					    	.attr("class", "kill-icon")
					    	.attr("opacity", 0.0)
					    	.on("click", function(d) {
					    		console.log("Sending kill message to UI layer with hostname " + d.hostname + " PID " + d.pid);
					    		ProtocolToUiLayer.kill(d.hostname, d.pid);
					    	})
					    	.transition()
					    	.duration(SHRINK_DURATION)
					    	.attr("opacity", 1.0)
					    	.attr("y", function(d) {return 4 * nodeRadius(d); });

					    // Remove exitting kill icons (when node is removed)
					    killIcons.exit().remove();	

					    // Actual click icon is a boring "X"
					    killIcons
					    	.text("\ue646")
					    	.style("font-family", "themify")
					   		.attr("text-anchor", "middle")
					    	.attr("alignment-baseline", "middle")
					    	.attr("stroke", "white");
					}

					function nodeRadius(d) {
						var size = d.size || 0;

						return (size + 1) * circleRadius;
					}

					// Called by D3 when a user double-clicks on a node to expand it.
					//	d - the node being clicked
					//	i - node index (not currently used)
					//
					function nextNodeSize(d, i) {
						// Don't expand dummies
						if (d.rtype==='dummy') {
							return;
						}
						// The first click will expand a node
						d.size = d.size || 0;
						// Save the previous size
						d.psize = d.size;
						// Decide whether we're getting bigger or smaller
						d.scaling = d.scaling || "expanding";
						if (d.scaling==="expanding") {
							d.size += 2;
							if (d.size>4) {
								d.size = 2;
								d.scaling = "shrinking";
							}
						} else {
							d.size -= 2;
							if (d.size < 0) {
								d.size = 2;
								d.scaling = "expanding";
							}
						}
						// User has clicked on circle but uiGraph is bound to parent 
						// group, so copy the data.
						var parentDatum = this.parentElement.__data__;
						parentDatum.size = d.size;
						parentDatum.scaling = d.scaling;
						captureFocus(parentDatum);
						setNodeAttributes(d);
						setNodeAttributes(parentDatum);
						// This is stop the double-click triggering a zoom
						d3.event.stopPropagation();
						// Now update what needs updating on the layout
						var node = svg.selectAll(".node")
						  .data(uiGraph.nodes, function(d) {return d.name;});
						updateNodes(node);
					    TopicViewer.topicDisplay(node, uiGraph);
					}



					function setNodeAttributes(d) {
						var NODE_SIZE_TO_FORMAT = ['small', 'small', 'medium', 'medium', 'large', 'large'];
						d.nodeFormat = NODE_SIZE_TO_FORMAT[d.size]; 
						// TODO This is a test
						if (d.rtype==='topic') {
							if ((d.name.length % 2)===1) {
								//d['message_type'] = 'tf2_msgs/TFMessage';
							} 
						}
					}
 
 					// A dummy node is placed inside an empty "machine" group and removed
 					// once any real node is added. Groups can't contain zero leaves and still
 					// show up on the screen.
 					//
					function createDummyNode(name) {
						return {	"name" : name, 
										"rtype": "dummy", 
										"x": 0, 
										"y": 0, 
										"size": 0, 
										"width": 50, 
										"height": 50
								};
					}

					function connectLinks() {
						// Add value to links
						var i = uiGraph.links.length;
						while (i--) {
							if (!connectLink(uiGraph.links[i])) {
								uiGraph.links.splice(i, 1);
							}
						}
					}									

					function connectLink(link) {
						var sourceName = link['sourceName'],
							targetName = link['targetName'],
							source = findNode2(sourceName),
							target = findNode2(targetName);
						if ((source != -1) && (target != -1)) {
							link['source'] = source;
							link['target'] = target;
							link['value'] = 15;	
							return true;							
						} 				
						return false;		
					}


					////////////////////////////////////////////////////
					// User interaction functions
					////////////////////////////////////////////////////
					
					// Dependencies: margin, force
					
					function zoomAndPan() {
					  svg.attr("transform", "translate(" + (d3.event.translate[0] + margin.left) + "," + (d3.event.translate[1] + margin.top) + ")");
					  TopicViewer.zoomAndPan();
					}	
					
					function dragstarted(d) {
						d3.event.sourceEvent.stopPropagation();
						d.fixed |= 2; // set bit 2
			            d.px = d.x, d.py = d.y; // set velocity to zero			            
					}

					function draggedCola(d) {
				      d.px = d3.event.x, d.py = d3.event.y;               
					  d3.select(this).attr("transform", function(d) { return "translate(" + d3.event.x + "," + d3.event.y + ")"});

					  force.resume();
					}

					function dragended(d) {
					  d3.select(this).classed("dragging", false);
					}

					var setUpNewNode = function(node, rosInstanceId) {
						node.size = node.psize = 0;
						node.width = node.height = circleRadius;
						setNodeAttributes(node);
						if (node.rtype==='topic') {
							node.viewer = new TopicViewer.TopicViewer(node);
							if (rosInstanceId) {
								node.rosInstanceId = rosInstanceId;
							}
						}
					}
					module.setUpNewNode = setUpNewNode;
					
					////////////////////////////////////////////////////
					// API for protocol to call
					////////////////////////////////////////////////////
					
					function uiGraphAdd(update, rosInstanceId) {

						force.stop();
						// Add nodes first
						for (var i=0; i<update.nodes.length; i++) {
							var node = update.nodes[i];
							console.log("ADDING NODE " + node.name);
							addNodeToAllGraphs(node, rosInstanceId);
						}

						// Add links next
						for (var i=0; i<update.links.length; i++) {
							var link = update.links[i];
							console.log("ADDING LINK " + link.sourceName + " > " + link.targetName);
							addLinkToAllGraphs(link);
						}

						// Add Machines
						for (var i=0; i<update.machines.length; i++) {
							var machine = update.machines[i];
							console.log("ADDING MACHINE " + machine.name);
							addMachineToAllGraphs(machine);
						}
						
						if (INCREMENTAL_SYSTEM) {
							connectLinksOnGraph(uiGraphIncomplete);
							moveAnyConnectedLinksFromIncompleteToMainGraph();
							connectGroupsOnGraph(uiGraphIncomplete);
							moveAnyConnectedGroupsFromIncompleteToMainGraph();
							console.log("========= uiGraphAdd =========");
							//uiGraphPrint();
							uiGraphUpdate2();
						} else {
							uiGraphUpdate();
						}
						console.log(uiGraph.groups[0].leaves)
						console.log("Finished uiGraphAdd()");
					}
					
					function addNodeToAllGraphs(node, rosInstanceId) {
						setUpNewNode(node, rosInstanceId);
						uiFullGraph.nodes.push(node);
						addToNameSpaceTree(node);

						// EXPERIMENTAL
						if (INCREMENTAL_SYSTEM) {
							insertNodeIntoIncompleteGraph(node);
							if (nodeIsReadyForDisplay(node)) {
								moveNodeFromIncompleteToUiGraph(node);
							}
						}
					}

					function addLinkToAllGraphs(link) {
						link['value'] = 15;
						
						insertLinkIntoIncompleteGraph(link);
						if (linkIsReadyForDisplay(link)) {
							uiFullGraph.links.push(link);	
							moveLinkFromIncompleteToUiGraph(link);
						}
					}

					function addMachineToAllGraphs(machine) {
						uiFullGraph.machines.push(machine);
						insertMachineIntoMainGraph(machine);
					}

					var deleteNodeFromFullGraph = function(nameNodeToDelete) {
						deleteNodeFromGraph(uiFullGraph, nameNodeToDelete);	
					};

					var deleteLinksFromFullGraphConnectedTo = function (nameNodeToDelete) {
						deleteLinksFromGraphConnectedToNodeName(nameNodeToDelete, uiFullGraph);
						/*
						var j = uiFullGraph.links.length;
						while (j--) {
							if ((uiFullGraph.links[j].sourceName===nameNodeToDelete) ||
								(uiFullGraph.links[j].targetName===nameNodeToDelete)) {
								uiFullGraph.links.splice(j, 1);
							}
						}
						*/
					};

					function uiGraphDel(update) {
						for (var i=0; i<update.nodes.length; i++) {
							var nameNodeToDelete = update.nodes[i];
							startKillAnimation(nameNodeToDelete);
							removeFromNameSpaceTree(nameNodeToDelete);
						}
						uiGraphUpdate2();
					}

					function startKillAnimation(nameNodeToKill) {
						for (var j=0; j<uiGraph.nodes.length; j++) {
							if (uiGraph.nodes[j].name === nameNodeToKill) {
								uiGraph.nodes[j].dying = true;
								console.log("set dying on " + nameNodeToKill);
							}	
						}							
					}
					
					function uiGraphUpd(update) {
						console.log(".");
						for (var i=0; i<update.nodes.length; i++) {
							var node = update.nodes[i];
							setNodeAttributes(node);
							for (var j=0; j<uiFullGraph.nodes.length; j++) {
								var uiFullGraphNode = uiFullGraph.nodes[j];
								if (uiFullGraph.nodes[j].name === node.name) {
									uiFullGraph.nodes[j] = node;
									updateNodeOnUiGraph(uiFullGraph.nodes[j]);
								}
							}
						}
					}
				
					function uiGraphClear() {
						console.log("Clearing uiGraph and uiFullGraph");
						if (INCREMENTAL_SYSTEM) {
							uiFullGraph.groups = [];
							uiFullGraph.links = [];
							uiFullGraph.nodes = [];
							uiFullGraph.machines = [];
							if (!uiGraph.groups) {
								uiGraph.groups = [];
							} else {
								emptyArray(uiGraph.groups);
							}
							if (!uiGraph.links) {
								uiGraph.links = [];
							} else {
								emptyArray(uiGraph.links);
							}
							if (!uiGraph.nodes) {
								uiGraph.nodes = [];
							} else {
								emptyArray(uiGraph.nodes);
							}
							if (!uiGraph.machines) {
								uiGraph.machines = [];
							} else {
								emptyArray(uiGraph.machines);
							}
						} else {
							uiGraph.groups = uiFullGraph.groups = [];
							uiGraph.links = uiFullGraph.links = [];
							uiGraph.nodes = uiFullGraph.nodes = [];
							uiGraph.machines = uiFullGraph.machines = [];
						}
						//uiGraphUpdate();
					}

					function emptyArray(array) {
						//console.log("Emptying array of length " + array.length.toString());
						array.splice(0, array.length);
					}
					
					function uiGraphPrint() {
						LuxUiToProtocol.printServerGraph();
						printGraph(uiFullGraph, "uiFullGraph");
						printGraph(uiGraph, "uiGraph");
					}

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

					////////////////////////////////////////////////////
					
					// Dependencies: uiGraph

					function findNode(name) {
						var obj = uiGraph.nodes.filter(function ( node ) {
						    return node.name === name;
						})[0];

						return obj;
					}
					
					function findNode2(name) {
						for (var i=0; i<uiFullGraph.nodes.length; i++) {
							if (name===uiFullGraph.nodes[i]['name'])
								return i;
						}
						return -1;
					}
					
					function findNode3(name) {
						for (var i=0; i<uiGraph.nodes.length; i++) {
							if (name===uiGraph.nodes[i]['name'])
								return i;
						}
						return -1;
					}
					
					function findNodeInGraph(graph, name) {
						for (var i=0; i<graph.nodes.length; i++) {
							if (name===graph.nodes[i]['name'])
								return i;
						}
						return -1;
					}
					


					function colourNode(node) {
						var colorKeys = ['unknown', 'node', 'topic'];
						var colorValues = [1, 2, 3];
						
						var color = colorKeys.indexOf(node.rtype) || 0;
						
						return colorValues[color];
					}
				
					function topLabel(name) {
						var tokens = name.split("/");
						return tokens[1];
					}
				
					function bottomLabel(name) {
						var tokens = name.split("/");
						if (tokens.length > 1)
							return tokens[2];
						return "";	
					}
					
					function initialUiGraph() {
						var demoUiGraph = {
								"nodes":[
								],
								"links":[
								],
								"groups":[
								],
								"machines":[
								]
							};
							
						var emptyUiGraph = {
							"nodes" : [],
							"links" : [],
							"groups" : [],
							"machines" : []
						};	
						
						// Start with demo graph
						var graph = demoUiGraph;
						
						// Set up nodes
						for (var i=0; i<graph.nodes.length; i++) {
							graph.nodes[i]['group'] = 1;
							graph.nodes[i]['width'] = circleRadius*2;
							graph.nodes[i]['height'] = circleRadius*2;
						}
												
						return demoUiGraph;
					}
					
					function emptyGraph() {
						return {
							"nodes" : [],
							"links" : [],
							"groups" : [],
							"machines" : []
						};
					}

					///////////////////////////////////////////////////////////////////////////////
					// Piles
					///////////////////////////////////////////////////////////////////////////////

					module.uncollapseAllPiles = function() {
						PilePoints = [];
					};

					module.addPileUpLevel = function(level, targetNodeName) {
						PilePoints.push([level, targetNodeName]);
					};
 
					module.removePileUpLevel = function(level) {
						var i = PilePoints.length;
						while (i--) {
							if (PilePoints[i][0] === level) {
								PilePoints.splice(i, 1);
							}
						}
					};
 
					function collapsePiles() {
						for (var p=0; p<PilePoints.length; p++) {
							var pileLevel = PilePoints[p][0],
								targetNodeName = PilePoints[p][1],
								pilePointsFound = 0,
								nodeToTransformIntoPile = null,
								consolidatedNodeName = pileLevel + '/...';
							// Check there's more than one node in this level
							for (var i=0; i<uiGraph.nodes.length; i++) {
								if (matchesLevel(uiGraph.nodes[i]['name'], pileLevel)) {
									pilePointsFound++;
								}
							}
							// Only consolidate if there's more than one
							if (pilePointsFound>1) {
								modifyAndConsolidateLinksToPointToSummaryNode2(pileLevel);
								nodeToTransformIntoPile = removeMatchingNodesAndGetSummaryNode2(pileLevel, targetNodeName);
								if (nodeToTransformIntoPile) {
									transformNodeIntoPile(nodeToTransformIntoPile, consolidatedNodeName);
									connectNewLinksToPile(nodeToTransformIntoPile, consolidatedNodeName);
								}	
							}
						}
					}

					function connectNewLinksToPile(nodeToTransformIntoPile, consolidatedNodeName) {
						var link;
						for (var j=0; j<uiGraph.links.length; j++) {
							link = uiGraph.links[j];
							if (uiGraph.links[j].sourceName === consolidatedNodeName) {
								uiGraph.links[j].source = nodeToTransformIntoPile;
							}
							if (uiGraph.links[j].targetName === consolidatedNodeName) {
								uiGraph.links[j].target = nodeToTransformIntoPile;
							}
						}

					}

					function modifyAndConsolidateLinksToPointToSummaryNode2(pileLevel, nodeToTransformIntoPile) {
						// Modify and consolidate any links to point to summary node
						var index = uiGraph.links.length,
							consolidatedNodeName = pileLevel + '/...',
							link = null,
							j = 0,
							newLink = null,
							linkCursor = null,
							itsADuplicate = false,
							matchesLevelSource, matchesLevelTarget;
						while (index--) {
							// Alter targets to consolidated node
							link = uiGraph.links[index];
							matchesLevelSource = matchesLevel(link.sourceName, pileLevel);
							matchesLevelTarget = matchesLevel(link.targetName, pileLevel);
							if (matchesLevelSource || matchesLevelTarget) {
								newLink = {
									sourceName: matchesLevelSource ? consolidatedNodeName : link.sourceName,
									targetName: matchesLevelTarget ? consolidatedNodeName : link.targetName,
									source: matchesLevelSource ? null : link.source,
									target: matchesLevelTarget ? null : link.target,
									value: 15
								};
								uiGraph.links.splice(index, 1);

								// Detect if link is duplicate
								itsADuplicate = false;
								j = uiGraph.links.length;
								while (j--) {
									linkCursor = uiGraph.links[j];
									if ((j !== index) &&
										(linkCursor.sourceName === newLink.sourceName) &&
										(linkCursor.targetName === newLink.targetName)) {
										itsADuplicate = true;
										break;
									}
								}
								if (!itsADuplicate) {
									console.log("modifyAndConsolidateLinksToPointToSummaryNode2 " + newLink.sourceName + " > "+ newLink.targetName);
									uiGraph.links.push(newLink);
								}
							}
						}	
					}

					function removeMatchingNodesAndGetSummaryNode2(pileLevel, targetNodeName) {
						// Remove any matching nodes except the first	
						var pilePointsFound = 0,
							index = uiGraph.nodes.length,
							nodeName = null,
							thisIsTheNodeToPreserve = null,
							nodeToTransformIntoPile = null;
						for (var i=0; i<uiGraph.nodes.length; i++) {
							nodeName = uiGraph.nodes[i]['name'];
							if (matchesLevel(nodeName, pileLevel)&&(nodeName.substring(-3)!=='...')) {
								pilePointsFound++;
								thisIsTheNodeToPreserve = targetNodeName ? (nodeName === targetNodeName) : (pilePointsFound === 1);
								if (thisIsTheNodeToPreserve) {
									nodeToTransformIntoPile = uiGraph.nodes[i];
								}
							}
						}	
						var summaryNode = {
							name: 'summary',
							rtype: nodeToTransformIntoPile.rtype,
							x: nodeToTransformIntoPile.x,
							y: nodeToTransformIntoPile.y,
							focus: nodeToTransformIntoPile.focus,
						};
						if (nodeToTransformIntoPile.data) {
							summaryNode.data = nodeToTransformIntoPile.data;
						}
						while (index--) {
							nodeName = uiGraph.nodes[index]['name'];
							if (matchesLevel(nodeName, pileLevel)) {
								deleteNode(nodeName);
							}
						}
						uiGraph.nodes.push(summaryNode);
						return summaryNode;
					}

					function transformNodeIntoPile(nodeToTransformIntoPile, consolidatedNodeName) {
						var rtype = nodeToTransformIntoPile['rtype'];
						nodeToTransformIntoPile['rtype'] = 'pileOf' + rtype.charAt(0).toUpperCase() + rtype.slice(1) + 's';
						nodeToTransformIntoPile['name'] = consolidatedNodeName;
					}

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
							levels = listOfLevels(node.name);

						for (var i=0; i<levels.length; i++) {
							level = levels[i];
							if (level in NameSpaceTree) {
								NameSpaceTree[level].count ++; 
								if (NameSpaceTree[level].count >= AUTO_FOLDUP_NUMBER) {
									module.addPileUpLevel(level + '/');
								}
							} else {
								NameSpaceTree[level] = {count: 1, unfolded: false};
							}
						}		
					}

					function removeFromNameSpaceTree(nodeName) {
						var token, level,
							levels = listOfLevels(nodeName);

						for (var i=0; i<levels.length; i++) {
							level = levels[i];
							if (level in NameSpaceTree) {
								NameSpaceTree[level].count --; 
								if (NameSpaceTree[level].count < AUTO_FOLDUP_NUMBER) {
									module.removePileUpLevel(level + '/');
								}
							} else {
								throw "Node level '" + level + "' missing from NameSpaceTree";
							}
						}		
					}

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
		}

		// Handle focus on Nodes and Topics
		// Double click on a node/topic captures focus
		// TODO: Single click should capture focus too
		//
		function captureFocus(node) {
			clearFocusOnAllNodes()
			node.focus = true;
		}

		// Unfocus all nodes
		//
		function clearFocusOnAllNodes() {
			for (var i=0; i<uiGraph.nodes.length; i++) {
				uiGraph.nodes[i].focus = false;
			}
		}


		// Hash Topics
		function createHashTopics() {
			var node, additionalNodes, hashTopicGroup;
			
			for (var i=0; i<uiGraph.nodes.length; i++) {
				node = uiGraph.nodes[i];
				if (HashTopicManager.isAHashableTopic(node)) {
					
					for (var s=0; s<node.hashSubTopics.length; s++) {
						var name = node.hashSubTopics[s].name;
						//console.log("Searching for subtopic " + s.toString() + " " + name);
						for (var t=0; t<uiGraph.nodes.length; t++) {
							var targetNode = uiGraph.nodes[t];
							//console.log(">> " + targetNode.name);
							if ((targetNode.name) && (targetNode.name === name)) {
								//console.log("LINKED " + s.toString() + " " + name);
								node.hashSubTopics[s] = targetNode;
								break;
							}
						}
					}
					
					hashTopicGroup = HashTopicManager.createGroup(node, additionalNodes, uiGraph);
					uiGraph.groups.push(hashTopicGroup);
				}
			}
			//HashTopicManager.addStrutsToHashTopics(uiGraph);
		}
		



    return module;
})();







		