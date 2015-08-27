var LuxUi = (function() {
    	"use strict";
    
    	var module = {};

    	var QUIET_NAMES = ['/diag_agg', '/runtime_logger', '/pr2_dashboard', '/rviz', '/rosout', '/cpu_monitor', '/monitor', '/hd_monitor', '/rxloggerlevel', '/clock', '/rqt', '/statistics', '/luxagent','/rosout_agg'];
		var SHRINK_DURATION = 1000;  
		var KILL_DURATION = 1000;  
		var PILE_CONSOLIDATION_DURATION = 3000;
		var	NODE_LABEL_TOP = 20,
			NODE_LABEL_TEXT_HEIGHT = 16;


    	var uiGraph = {nodes: [], links: [], groups: [], machines: []},
    		uiFullGraph = uiGraph;
 
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

					uiFullGraph = emptyGraph();
					uiGraphUpdate();
					
					uiFullGraph = initialUiGraph();
					
					// Start interacting with the server
					protocolToUiLayer.open(uiGraphAdd, uiGraphDel, uiGraphUpd, uiGraphClear);

					// First update
					uiGraphUpdate();

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

					function deleteNode(nameNodeToDelete) {
						deleteNodeFromGraph(uiGraph, nameNodeToDelete);
					};

					function removeOrphanedTopics() {
						if (FilterOrphanedTopics) {
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
            							deleteNode(nodeName);
            						}
          						}
        					}
        				}	
					};

					function updateNodeOnUiGraph(uiFullGraphNode) {
						for (var i=0; i<uiGraph.nodes.length; i++) {
							if (uiGraph.nodes[i].rtype==='topic') {
								if (uiGraph.nodes[i].name === ' ' + uiFullGraphNode.name) {
									uiGraph.nodes[i].data = uiFullGraphNode.data;
									//uiGraph.nodes[i].viewer.currentView.constructor.update(uiGraph.nodes[i]);
									uiGraph.nodes[i].viewer.currentView.update(uiGraph.nodes[i]);
								}
							}
						}
					}

					function copyFromFullGraph() {
						uiGraph = emptyGraph();
						// Copy nodes
						for (var i=0; i<uiFullGraph.nodes.length; i++) {
							var original = uiFullGraph.nodes[i],
								savedNode = getSavedNode(original.name),
								size = (savedNode) ? savedNode.size : original.size,
								nodeFormat = (savedNode) ? savedNode.nodeFormat : original.nodeFormat,
								x = (savedNode) ? savedNode.x : original.x,
								y = (savedNode) ? savedNode.y : original.y,
								scaling = (savedNode) ? savedNode.scaling : original.scaling;

							uiGraph.nodes[i] = {
								name: original.name,
								rtype: original.rtype,
								size: size,
								data: original.data,
								viewer: original.viewer,
								nodeFormat: nodeFormat,
								width: original.width,
								height: original.height,
								group: original.group,
								x: x,
								y: y,
								px: x,
								py: y,
								scaling: scaling,
							};
							console.log(uiGraph.nodes[i].x + ", " + uiGraph.nodes[i].y);
						}
						// Copy links
						for (var i=0; i<uiFullGraph.links.length; i++) {
							//uiGraph.links[i] = uiFullGraph.links[i];
							var original = uiFullGraph.links[i];
							uiGraph.links[i] = {
								sourceName: original.sourceName,
								targetName: original.targetName
							};
						}
						// Copy groups
						for (var i=0; i<uiFullGraph.groups.length; i++) {
							uiGraph.groups[i] = {leaves: []};
							for (var l=0; l<uiFullGraph.groups[i].leaves.length; l++) {
								uiGraph.groups[i].leaves.push(uiFullGraph.groups[i].leaves[l]);
							}
						}
						// Copy machines
						for (var i=0; i<uiFullGraph.machines.length; i++) {
							uiGraph.machines[i] = uiFullGraph.machines[i];
						}
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
					
					////////////////////////////////////////////////////
					// Update function - called when graph is changed
					////////////////////////////////////////////////////	

					// dependencies: uiGraph, circleRadius, dragColaSetup
					
					function uiGraphUpdate() {

						console.log("uiGraphUpdate");

						// Nodes that are already on the graph shouldn't "jump" on an update
						saveCurrentNodePositions();

						// Filter out full graph
						copyFromFullGraph();

						// Connect any links on uiGraph
						connectLinks();

						// TODO Restore and remove from Protocol layer
						removeOrphanedTopics();
						hideQuietNodes();
						
						// Collapse nodes into piles where necessary
						collapsePiles();
						//connectLinks();

						// Set up groups
						createGroupsOnGraph(uiGraph);

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

					    // view switch icons - only visible on medium and large topics
					    switchIcons(node);

						updateNodes(node);

					    // Handle dying nodes
					    var dying = setUpDyingNodes(node);

					    // handle Kill Icons - only visible on large format ROS node
					    killIcons(node);
					    					
					    // Prototype topic display
					    TopicViewer.topicDisplay(node, uiGraph);

					    // Gracefully remove any exiting nodes
						var exitingNodes = setupExitingNodes(node);								
						
						// Start force layout
						forced = force.nodes(uiGraph.nodes)
						      .links(uiGraph.links)
							  .groups(uiGraph.groups)
						      .symmetricDiffLinkLengths(circleRadius * 2)
						      .start(10,15,20);	
						
						// Apply force to entering and updating elements
						// http://stackoverflow.com/questions/11368339/drawing-multiple-edges-between-two-nodes-with-d3
						force.on("tick", function() {
							graphTick(link, node, group);
						});	

						// Package tree added to menu
						MachineTreeMenu.updateMachineMenu(machineTreeMenu, uiGraph, DragDropManager, ProtocolToUiLayer);
					}
					module.uiGraphUpdate = uiGraphUpdate;

					function saveCurrentNodePositions() {
						console.log("saveCurrentNodePositions");
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
							};
							SavedNodes.push(savedNode);
							console.log(savedNode);
						}
					}

					function getSavedNode(nodeName) {
						for (var i=0; i< SavedNodes.length; i++) {
							if (SavedNodes[i].name === nodeName) {
								return SavedNodes[i];
							}
						}
						return null;
					}

					function graphTick(link, node, group) {
							link
							    .attr("d", function(d) {
							    	var dx = d.target.x - d.source.x,
        								dy = d.target.y - d.source.y,
        								dr = 300/1,
        								rotation = 0; //Math.atan2(dy, dx);  //linknum is defined above
    								return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " " + rotation + " 0,1 " + d.target.x + "," + d.target.y;
							    });

							node
								.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"})
								.attr("dummy", function(d) {
									// Get width from domElement where it has been
									// subject to a transition
									var widthOnDomElement = d3.select(this).attr("width") || 0;
									// Set size on data to allow bounding box to transition smoothly
									d.width = widthOnDomElement;
									d.height = widthOnDomElement;

									if (d.keepForceLayoutHeated) {
										setTimeout(function() {
											force.resume();
										},10);
									}

									//console.log(widthOnDomElement);
									// Dummy attribute
									return 0});

							group.attr("x", function (d) { return d.bounds.x; })
				                 .attr("y", function (d) { return d.bounds.y; })
				                 .attr("width", function (d) { return d.bounds.width(); })
				                 .attr("height", function (d) { return d.bounds.height(); });

				            TopicViewer.tick();
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
					        .on("dblclick", nextNodeSize );

/*
						nodeEnter.append("title")
						  .text(function(d) { return d.name; });

						nodeEnter.append("text")
						  .text(function(d) { return (d.rtype!=='dummy') ? topLabel(d.name) : ""; })
					    	.attr("alignment-baseline", "middle")
					   		.attr("text-anchor", "middle")
							.attr("class", function(d) {return "node-label label-top" })
					      	.attr("x", 0)
					      	.attr("font-size", function(d, i) {  return  "1em"; })
					      	.attr("text-anchor", function(d, i) { if (i>0) { return  "beginning"; } else { return "end" } });

						nodeEnter.append("text")
						  .text(function(d) { return (d.rtype!=='dummy') ? bottomLabel(d.name) : ""; })
							.attr("class", function(d) {return "node-label label-bottom" })
					      	.attr("x", 0)
					      	.attr("font-size", function(d, i) {  return  "1em"; })
					      	.attr("text-anchor", function(d, i) { if (i>0) { return  "beginning"; } else { return "end" } });
*/
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

					//////////////////////////////////////////////////////////////////
					// Node and Topic labels
					//////////////////////////////////////////////////////////////////

					// Add the labels under the node/topic plus any required handlers
					function appendNodeLabels(nodeEnter) {
						nodeEnter.selectAll('.nodetopic-label') 
						    .data(function(d) {
						    	var nameChunks = prepareLabels(d.name, d);
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
						uiGraphUpdate();
					}

					function unfold() {
						var levelToUnfold = this.pileLevel.substring(0, this.pileLevel.length-4);
						module.removePileUpLevel(levelToUnfold);
						uiGraphUpdate();
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


					function updateNodes(node) {
						// Update existing nodes with transitions
						node
					        .attr("class", function(d) {
					        	var nodeClass = "node";
					        	if (d.nodeFormat) {
					        		nodeClass = nodeClass + " node-format-" + d.nodeFormat;
					        	}
					        	return nodeClass;
					        });

						node
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

						node.selectAll("circle")
					   		.transition()
					   		.duration(SHRINK_DURATION)
					        .attr("r", function(d) {return nodeRadius(d);});

/*
					    node.selectAll(".label-top")
					    	.attr("alignment-baseline", "middle")
					   		.attr("text-anchor", "middle")
					   		.transition()
					   		.duration(SHRINK_DURATION)
					    	.attr("y", function(d) {return nodeRadius(d) + 20});

					    node.selectAll(".label-bottom")
					    	.attr("alignment-baseline", "middle")
					   		.attr("text-anchor", "middle")
					   		.transition()
					   		.duration(SHRINK_DURATION)
					    	.attr("y", function(d) {return nodeRadius(d) + 40});
*/

					    animateSwitchIcon(node, "switch-left-icon", -1);
					    animateSwitchIcon(node, "switch-right-icon", 1);

					    updateNodeLabels(node);
					}

					function setUpDyingNodes(node) {
					    // Handle dying nodes
					    var dying = node
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
					    			deleteLinksFromFullGraphConnectedTo(d.name);
									deleteNodeFromFullGraph(d.name);
									setTimeout(uiGraphUpdate, 100);
					    		})
								.remove();
						return dying;						
					}

					function setupExitingNodes(node) {
					    // Gracefully remove any exiting nodes
						var exitingNodes = node.exit();
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

					function switchIcons(selection) {
						switchIcon(selection, "switch-left-icon", -1, "\ue64a");
						switchIcon(selection, "switch-right-icon", +1, "\ue649");
					}

					function switchIcon(selection, klass, side, icon) {
					    var switchIcons = selection.selectAll("." + klass)
					    	.data(function(d) {
					    		return largeOrMediumTopicWithSeveralViews(d) ? [{hostname: d.data.hostname, size: d.size, width: d.width, viewer: d.viewer}] : []
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

					function largeOrMediumTopicWithSeveralViews(d) {
						return (((d.nodeFormat==='large')||(d.nodeFormat==='medium'))
								&&(d.rtype==='topic')
								&&(d.viewer.numberOfViews > 1)
								);
					}

					function animateSwitchIcon(node, klass, side) {
					    node.selectAll("." + klass)
					   		.transition()
					   		.duration(SHRINK_DURATION)
					   		.attr("opacity", 1.0)
					    	.attr("x", function(d) {return side * nodeRadius(d) - side * 20});						
					}

					function killIcons(selection) {
					    // handle Kill Icons - only visible on large format ROS node
					    var killIcons = selection.selectAll(".kill-icon")
					    	.data(function(d) {
					    		return ((d.nodeFormat==='large')&&(d.rtype==='node')&&(!d.shrinking)) ? [{hostname: d.data.hostname, pid: d.data.pid}] : []
					    	});
					    killIcons.enter()
					    	.append("text")
					    	.attr("class", "kill-icon")
					    	.attr("opacity", 0.0)
					    	.on("click", function(d) {
					    		ProtocolToUiLayer.kill(d.hostname, d.pid);
					    	})
					    	.transition()
					    	.duration(SHRINK_DURATION)
					    	.attr("opacity", 1.0)
					    	.attr("y", function(d) {return 4 * nodeRadius(d); });

					    killIcons.exit().remove();	
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

					function nextNodeSize(d, i) {
						console.log("*********** nextNodeSize ***********");
						console.log(uiGraph.nodes);
						console.log(d);
						//d = this.parentElement.__data__
						if (d.rtype==='dummy') {
							return;
						}
						d.size = d.size || 0;
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
						this.parentElement.__data__.size = d.size;
						this.parentElement.__data__.scaling = d.scaling;
						setNodeAttributes(d);
						d3.event.stopPropagation();
						console.log("*********** before update ***********");
						console.log(uiGraph.nodes);
						uiGraphUpdate();
						console.log("*********** after update ***********");
						console.log(uiGraph.nodes);
					}

					function setNodeAttributes(d) {
						var NODE_SIZE_TO_FORMAT = ['small', 'small', 'medium', 'medium', 'large', 'large'];
						d.nodeFormat = NODE_SIZE_TO_FORMAT[d.size]; 
						// TODO This is a test
						if (d.rtype==='topic') {
							if ((d.name.length % 2)===1) {
								d['message_type'] = 'tf2_msgs/TFMessage';
							} 
						}
					}

					function createGroupsOnGraph(graph) {
						// Add groups from hostname definitions in the nodes
						graph.groups = []
						for (var i=0; i<graph.nodes.length; i++) {
							var node = graph.nodes[i];
							if (('data' in node)&&('hostname' in node['data'])) {
								var hostname = node['data']['hostname'],
									targetGroup = -1;
								if ((node.rtype==='node')||(node.rtype==='pileOfNodes')) {
									for (var g=0; g<graph.groups.length; g++) {
										if ('hostname' in graph.groups[g]) {
											if (graph.groups[g]['hostname'] === hostname) {
												targetGroup = g;											
											}
										}
									}
									if (targetGroup>-1) {
										graph.groups[targetGroup]['leaves'].push(i);
									} else {
										graph.groups.push({leaves: [i], hostname: hostname, padding: circleRadius});
									}
								}	
							}	
						}	

						// Add groups that currently have no nodes
						for (var i=0; i<graph.machines.length; i++) {
							var machineHostname = graph.machines[i].hostname,
								found = false;
							for (var g=0; g<graph.groups.length; g++) {
								if (graph.groups[g].hostname === machineHostname) {
									found = true;
								}
							}
							if (!found) {
								// Add a dummy node
								graph.nodes.push(
									{	"name" : "/dummy" + g.toString(), 
										"rtype": "dummy", 
										"x": 0, 
										"y": 0, 
										"size": 0, 
										"width": 50, 
										"height": 50
									});
								graph.groups.push(
									{
										leaves: [graph.nodes.length -1], 
										hostname: machineHostname, 
										padding: circleRadius
									});
							}
						}					
					}

					function connectLinks() {
						// Add value to links
						var i = uiGraph.links.length;
						while (i--) {
							var sourceName = uiGraph.links[i]['sourceName'];
							var targetName = uiGraph.links[i]['targetName'];
							var source = findNode2(sourceName);
							var target = findNode2(targetName);
							if ((source != -1) && (target != -1)) {
								uiGraph.links[i]['source'] = source;
								uiGraph.links[i]['target'] = target;
								uiGraph.links[i]['value'] = 15;								
							} else {
								uiGraph.links.splice(i, 1);
							}
						}
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
					
					////////////////////////////////////////////////////
					// API for protocol to call
					////////////////////////////////////////////////////
					
					function uiGraphAdd(update) {

						// Add nodes first
						for (var i=0; i<update.nodes.length; i++) {
							var node = update.nodes[i];
							node['size'] = 0;
							setNodeAttributes(node);
							if (node.rtype==='topic') {
								node.viewer = new TopicViewer.TopicViewer(node);
							}

							uiFullGraph.nodes.push(node);
							addToNameSpaceTree(node);
						}

						// Add edges last
						for (var i=0; i<update.links.length; i++) {
							var link = update.links[i];
							link['source'] = findNodeInGraph(uiFullGraph, link['sourceName']);
							link['target'] = findNodeInGraph(uiFullGraph, link['targetName']);
							link['value'] = 15;
							
							if ((link['source']!=-1) && (link['target']!=-1)) {
								uiFullGraph.links.push(link);								
							}
						}

						// Add Machines
						for (var i=0; i<update.machines.length; i++) {
							uiFullGraph.machines.push(update.machines[i]);
						}
						
						uiGraphUpdate();
					}
					
					var deleteNodeFromFullGraph = function(nameNodeToDelete) {
						deleteNodeFromGraph(uiFullGraph, nameNodeToDelete);	
					};

					var deleteLinksFromFullGraphConnectedTo = function (nameNodeToDelete) {
						var j = uiFullGraph.links.length;
						while (j--) {
							if ((uiFullGraph.links[j].sourceName===nameNodeToDelete) ||
								(uiFullGraph.links[j].targetName===nameNodeToDelete)) {
								uiFullGraph.links.splice(j, 1);
							}
						}
					};

					function uiGraphDel(update) {
						for (var i=0; i<update.nodes.length; i++) {
							var nameNodeToDelete = update.nodes[i];
							startKillAnimation(nameNodeToDelete);
							removeFromNameSpaceTree(node);
						}
						uiGraphUpdate();
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
								if (uiFullGraph.nodes[j].name === node.name) {
									uiFullGraph.nodes[j] = node;
									updateNodeOnUiGraph(uiFullGraph.nodes[j]);
								}
							}
						}
					}
				
					function uiGraphClear() {
						console.log("Clearing uiGraph and uiFullGraph");
						uiGraph.groups = uiFullGraph.groups = [];
						uiGraph.links = uiFullGraph.links = [];
						uiGraph.nodes = uiFullGraph.nodes = [];
						uiGraph.machines = uiFullGraph.machines = [];
						uiGraphUpdate();
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
						console.log("");
						for (var i=0; i<graph.links.length; i++) {
							console.log(i + " " + graph.links[i].source + " " + graph.links[i].sourceName + " -> " + graph.links[i].target + " " + graph.links[i].targetName);
						}
						console.log(graph.groups);
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
						console.log("collapsePiles()");
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
							data: nodeToTransformIntoPile.data,
						};
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

					function removeFromNameSpaceTree(node) {
						var token, level,
							levels = listOfLevels(node.name);

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

    return module;
})();







		