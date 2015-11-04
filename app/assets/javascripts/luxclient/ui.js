// This module handles the graphs that store the various and nodes, links, groups
// and displays them on the page using d3 and webcola.
//
// (c) Simon Birrell 2015
//
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

    	var MachineMenusRendered = [];	

    	// Access uiGraph outside this module
    	//
    	module.getUiGraph = function() {
    		return uiGraph;
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
			uiGraph = uiFullGraph = {nodes: [], links: [], groups: [], machines: []};
       	};

    	var FilterOrphanedTopics = false,
    		FilterDebugNodes = false;

    	var ProtocolToUiLayer = null;

    	var PilePoints = [];

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

			// Basic parameters
			var width = 1500,
			    height = 1500,
			    fullWidth = width,
			    fullHeight = height,
				circleRadius = 32,
				groupPadding = (circleRadius / 2),
				colorText = "#042029",
				color = d3.scale.category20();
			
			// The webcola adaptor replaces d3's built-in force constrained graph
			var force = cola.d3adaptor()
			    .linkDistance(circleRadius * 5)
				    .handleDisconnected(false)
			    .avoidOverlaps(true)
				    .size([width, height]);
								
			// Allow the user to drag the background with the mouse    									
			var dragColaSetup = force.drag()
				.origin(function(d) { return d; })
			    .on("dragstart", dragstarted)
			    .on("drag", draggedCola)
			    .on("dragend", dragended)
				;

			// The margin of the viewing area
			var margin = {top: 200, right: 20, bottom: 20, left: 300},
			    width = width - margin.right - margin.left,
			    height = height - margin.top - margin.bottom;

			// Allow the user to zoom and pan with the mouse
			var zoom = d3.behavior.zoom()
			    .on("zoom", zoomAndPan);
			
			// Set up main visualization area

			// Have a <div> to store the canvases used by WebGL
			// The ordering on the HTML (before the SVG) is important
			// for who handles the clicks
			var canvas = d3.select("#robotlux").append("div")
				.attr("id", "canvas-layer");

			// The SVG <div> is where all the vector graphics will be rendered
			// A group within it acts as a window on the complete graph 
			var svg = d3.select("#robotlux").append("svg")
			    .attr("width", width + margin.right + margin.left)
			    .attr("height", height + margin.top + margin.bottom)
				.attr("id","luxwindow-2d")
				.call(zoom)
				.append("g")
			    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
			;

			// This is a rectangle within the group under the SVG
			var rect = svg.append("rect")
			    .attr("width", width)
			    .attr("height", height)
			    .style("fill", "none")
			    .style("pointer-events", "all");

			// Callback function to handle zooming
			// TODO - not used?
			/*
			var zoomed = function () {
			  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
			}
			*/
			
			// Set up topic viewer module with some UI parameters
			TopicViewer.setup(d3, svg, margin, circleRadius, SHRINK_DURATION);

			// Set up the machine tree menu on the left hand side
			// This will be populated with the list of installed ROS packages
			// and run/launch targets
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

			// Start animations & renderings
			animateAndRender();

			// This function is called from d3 during a requestAnimationFrame call to the 
			// browser. It should be executed once per animation frame.
			//
			function animateAndRender() {
            	for (var i=0; i<uiGraph.nodes.length; i++) {
            		var node = uiGraph.nodes[i];
            		// Animate topic views
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

			// This is the end of the "open" code. Everything else is just function
			// definitions that use variables like svg, force, circleRadius etc.

			////////////////////////////////////////////////////					
			//
			// Tick functions
			//
			////////////////////////////////////////////////////

			// One tick of the force layout simulation. This is generally
			// one animation frame, but doesn't have to be.
			//	linkSelection - d3 selection of links
			//	nodeSelection - d3 selection of nodes
			//  groupSelection - d3 selection of groups
			//
			function graphTick(linkSelection, nodeSelection, groupSelection) {
				defineLinkPath(linkSelection);
				copyWidthOnNodeFromTransition(nodeSelection);
				positionGroup(groupSelection);
		        TopicViewer.tick();
			}

			// Links on the graph are represented by curved, dashed lines.
			// On each animation frame, set the "d" SVG attribute that defines look
			// for the link.
			//
			function defineLinkPath(linkSelection) {
				linkSelection
				    .attr("d", function(d) {
				    	// TODO this may not be necessary or desirable
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

			// While node is scaling (because of a user click), pass the width
			// from the DOM element (where the d3 transition has set it) back to the data
			// node. The keepForceLayoutHeated flag on the node allows us to prolong
			// the force constrained layout simulation for a little while longer.
			//
			function copyWidthOnNodeFromTransition(nodeSelection) {
				nodeSelection
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

			// Position d3 groups on screen 
			//
			function positionGroup(groupSelection) {
					groupSelection
						 .attr("x", function (d) { return d.bounds.x; })
		                 .attr("y", function (d) { return d.bounds.y; })
		                 .attr("width", function (d) { return d.bounds.width(); })
		                 .attr("height", function (d) { return d.bounds.height(); });
			}

			////////////////// End of tick functions ////////////////////////////////////

			///////////////// d3 functions called from uiGraphUpdate() //////////////////

			// This function sets up the d3 groups that will appear on screen
			//
			function setUpEnteringGroups(groupSelection) {
				var groupEnter = groupSelection
		          .enter();

		        // Groups that are just entering the UI.
		        // At the moment we only have on type of group, which represents a 
		        // machine.
		        var newGroups = groupEnter  
					.append("rect")
		            .attr("rx", 8).attr("ry", 8)
		            .attr("class", function(d) {
		            	if (d.gtype === "hashTopic") {
		            		return "group-hash-topic";
		            	}
		            	return "group";
		            })
		            .attr("id", function(d) {
		            	if (d.gtype === "hashTopic") {
		            		return "";
		            	}
		            	return "machine_" + d.hostname;
		            });

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

			// This function sets up d3 links that are just entering the UI.
			// At the moment, all links represent node-topic connections
			// This will change with hashTopic's "invisible struts"
			//
			function setUpEnteringLinks(linkSelection) {
				var linkEnter = linkSelection
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

			// This function sets up d3 nodes (which can represent ROS node and topics)
			// that are just enetering the UI.
			//
			function setUpEnteringNodes(nodeSelection) {
				// New nodes - add a group
				var nodeEnter = nodeSelection
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

			// Piles are currently represented as a pile of three circles.
			// This function draws just one of them.
			//
			function drawBackgroundCicle(selection, offset) {
			    selection.filter(function(d) {return ((d.rtype==='pileOfNodes') || (d.rtype==='pileOfTopics'))})
			    	.append("circle")
			        .attr("class", function(d) { return "node-" + d.rtype; })
			    	.attr("cx", offset)
			    	.attr("cy", -offset)
			    	;						
			}

			// Determine the color of the d3 node based on the node type
			//
			function colourNode(node) {
				var colorKeys = ['unknown', 'node', 'topic'];
				var colorValues = [1, 2, 3];
				
				var color = colorKeys.indexOf(node.rtype) || 0;
				
				return colorValues[color];
			}

			// New slimmer update routine. This is called when nodes, links or groups are
			// added or deleted from uiGraph. Force Constrained Graphs on d3 and webcola
			// require the force.start() to be called on each addition / deletion.
			// 
			// TODO: force.start() definitely needs calling on each graph change. Should 
			// check how much of the below D3 code actually needs calling.
			//

			function uiGraphUpdate() {

				console.log("uiGraphUpdate ---------------------------------");
				
				// Collapse nodes into piles where necessary
				// TODO Make viewers regenerate on expand
				collapsePiles();

				// Set up groups
				//createGroupsOnGraph(uiGraph);


				// Hash-style topics and groups
				// New feature - incomplete code!
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
				console.log("reset leaves");
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
			module.uiGraphUpdate = uiGraphUpdate;
			// This update routine can be called from outside the module


			//////////////////////////////////////////////////////////////////
			// Node and Topic labels
			// These are the named labels under each circle. They represent the
			// ROS namespace name of the node or topic. 
			// So /foo/bar/baz is shown as a vertical stack of three labels:
			// "foo", "bar" and "baz"
			//////////////////////////////////////////////////////////////////

			// Add the labels under the nodes/topics plus any required click handlers
			//	nodeEnter - the d3 selection for entering nodes
			//
			function appendNodeLabels(nodeEnter) {
				nodeEnter.selectAll('.nodetopic-label') 
				    .data(function(d) {
				    	// Make a join with an array of text labels
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

			// Prepare an array of text labels that represent the ROS namespace
			// So "/foo/bar/baz" becomes ["foo", "bar", "baz"]
			// Adds click handlers as necessary for folding and unfolding.
			// This array is used in the d3 join
			// 	fullName - the ROS namespaced name
			//	d - the d3 node. TODO Appears to be unused.
			//
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

			// Click handler for a node label that will "fold up" all child nodes
			//	this - d3 node that has been clicked
			//
			function foldup() {
				module.addPileUpLevel(this.pileLevel);
				uiGraphUpdate();
			}

			// Click handler for a node label that will "unfold" child nodes
			//	this - d3 node that has been clicked
			//
			function unfold() {
				var summaryNode = this.node;
				var levelToUnfold = this.pileLevel.substring(0, this.pileLevel.length-4);
				unfoldPile(levelToUnfold, summaryNode);
				uiGraphUpdate();
			}

			// Update the d3 selection of node labels in case they're on a node that's 
			// being scaled up or down.
			//
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

			// These are ROS nodes that have been brutally murdered by the user by clicking
			// on the kill icon.
			// They die slowly, then remove themselves from uiGraph and uiFullGraph.
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
			    			deleteLinksFromFullGraphConnectedTo(d.name);
							deleteNodeFromFullGraph(d.name);
							// Trigger a graph update 
							setTimeout(uiGraphUpdate, 100);
			    		})
						.remove();
				return dying;						
			}
 
			// These are d3 nodes that have been removed from the UI
			//
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

			// Called by d3 when a user double-clicks on a node to expand it.
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
				setNodeFormatFromSize(d);
				setNodeFormatFromSize(parentDatum);
				// This is stop the double-click triggering a zoom
				d3.event.stopPropagation();
				// Now update what needs updating on the layout
				var node = svg.selectAll(".node")
				  .data(uiGraph.nodes, function(d) {return d.name;});
				updateNodes(node);
			    TopicViewer.topicDisplay(node, uiGraph);
			}

			// d.size is an integer 0, 1, 2, 3 etc. that will by multiplied to define the
			// actual radius on screen
			// d.nodeFormat is a string "small", "medium", "large" that determines the levels
			// of functionality the node with have
			// this function doncvert d.size into d.nodeFormat
			//
			function setNodeFormatFromSize(d) {
				var NODE_SIZE_TO_FORMAT = ['small', 'small', 'medium', 'medium', 'large', 'large'];
				d.nodeFormat = NODE_SIZE_TO_FORMAT[d.size]; 
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


			////////////////////////////////////////////////////
			// User interaction callbacks
			////////////////////////////////////////////////////
			
			// Dependencies: margin, force
			
			// Called by d3 When a user zooms or pans
			// Change the window the user is observing onto the graph
			// Also tell the topic viewers as they may have to move their canvases
			//
			function zoomAndPan() {
			  svg.attr("transform", "translate(" + (d3.event.translate[0] + margin.left) + "," + (d3.event.translate[1] + margin.top) + ")");
			  TopicViewer.zoomAndPan();
			}	
			
			// Called by d3 when a user starts to drag a node
			// Stop event propagating through to the background (otherwise it will also do 
			// zoom or drag)
			// Stop the node drifting during the drag
			//	d - the node that's being dragged
			//
			function dragstarted(d) {
				d3.event.sourceEvent.stopPropagation();
				d.fixed |= 2; // set bit 2
	            d.px = d.x, d.py = d.y; // set velocity to zero			            
			}

			// Called by d3 during the drag
			// Set the node position from the user's cursor
			//	d - the node that's being dragged
			//
			function draggedCola(d) {
		      d.px = d3.event.x, d.py = d3.event.y;               
			  d3.select(this).attr("transform", function(d) { return "translate(" + d3.event.x + "," + d3.event.y + ")"});

			  force.resume();
			}

			// Called by d3 when the drag ends
			//	d - the node that's being dragged
			//
			function dragended(d) {
			  d3.select(this).classed("dragging", false);
			}

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
				console.log("========= uiGraphAdd =========");

				// Stop force-constrained graph during update. May not be necessary.
				force.stop();

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
					addLinkToAllGraphs(link);
				}

				// Add Machines
				for (var i=0; i<update.machines.length; i++) {
					var machine = update.machines[i];
					console.log("ADDING MACHINE " + machine.name);
					addMachineToAllGraphs(machine);
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
			function uiGraphDel(update) {
				for (var i=0; i<update.nodes.length; i++) {
					var nameNodeToDelete = update.nodes[i];
					triggerNodeDeath(nameNodeToDelete);
					removeFromNameSpaceTree(nameNodeToDelete);
				}
				uiGraphUpdate();
			}

			// This is called by the protocol layer whenever ROS entities are changed.
			// This is largely intended for receiving ROS message updates to topics.
			//
			function uiGraphUpd(update) {
				console.log(".");
				for (var i=0; i<update.nodes.length; i++) {
					var updateNode = update.nodes[i];
					for (var j=0; j<uiFullGraph.nodes.length; j++) {
						var uiFullGraphNode = uiFullGraph.nodes[j];
						if (uiFullGraphNode.name === updateNode.name) {
							copyUpdateDataToUiFullGraphNode(updateNode, uiFullGraphNode);
							updateNodeOnUiGraph(uiFullGraphNode);
						}
					}
				}
			}

			// This is called by the protocol layer to completely clear the display
			// and our various internal graphs.
			//
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
			}

			// Copy data received in server update to the uiFullGraphNode
			//	updateNode - node from server update
			//	uiFullGraphNode - node stored in uiFullGraph
			//
			function copyUpdateDataToUiFullGraphNode(updateNode, uiFullGraphNode) {
				uiFullGraphNode.data.message = updateNode.data.message;
				uiFullGraphNode.data.type = updateNode.data.type;
			}
		
			// Remove all items in the array
			// We don't want to overwrite the array with [] because d3 has a reference to
			// it.
			//
			function emptyArray(array) {
				array.splice(0, array.length);
			}
			
			// ======================= DEBUGGING FUNCTIONS ==============================

			// Useful for debugging. Send the various graphs we maintain to the browser console.
			//
			function uiGraphPrint() {
				LuxUiToProtocol.printServerGraph();
				printGraph(uiFullGraph, "uiFullGraph");
				printGraph(uiGraph, "uiGraph");
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

			// Find a named node in uiGraph. Useful to call from the browser console.
			//
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
			module.addPileUpLevel = function(level, targetNodeName) {
				for (var i=0; i<PilePoints.length; i++) {
					var pilePoint = PilePoints[i];
					if (pilePoint[0] === level + "/") {
						return;
					}
				}
				PilePoints.push([level, targetNodeName]);
			};

				// Call this when unfolding a name space and showing the individual nodes
				// again.
				//	level - " /foo/bar/" will unfold a pile that contains " /foo/bar/one" 
				// and " /foo/bar/two"
			module.removePileUpLevel = function(level) {
				console.log("Searching for level " + level);
				var i = PilePoints.length;
				while (i--) {
					if (PilePoints[i][0] === level) {
						console.log("Removing pile up level " + level);
						PilePoints.splice(i, 1);
					}
				}
			};


				// Consolidate nodes or topics based on namespace. Goes through uiGraph
				// and looks for nodes that pertain to levels in the "PilePoints" list of
				// folded levels.
				//
			function collapsePiles() {
				console.log("Nodes before collapsing piles " + uiGraph.nodes.length);
				for (var p=0; p<PilePoints.length; p++) {
					var pilePoint = PilePoints[p];
					console.log("Checking pilepoint " + pilePoint);
					collapseNodesThatBelongToThisPilePoint(pilePoint);
				}
				console.log("Nodes after collapsing piles " + uiGraph.nodes.length);
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
				for (var i=0; i<uiGraph.nodes.length; i++) {
					if (matchesLevel(uiGraph.nodes[i]['name'], pileLevel)) {
						pilePointsFound++;
					}
				}
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
				var nodeToTransformIntoPile = removeMatchingNodesAndGetSummaryNode2(pileLevel);
				if (nodeToTransformIntoPile) {
					transformNodeIntoPile(nodeToTransformIntoPile, consolidatedNodeName);
					connectNewLinksToPile(nodeToTransformIntoPile, consolidatedNodeName);
				}	
			}

			// For a given pileLevel, create links that will point to the summary node
			// and prune all the others.
			//
			function modifyAndConsolidateLinksToPointToSummaryNode(pileLevel) {
				// Modify and consolidate any links to point to summary node
				var index = uiGraph.links.length;
				while (index--) {
					// Alter targets to consolidated node
					modifyAndConsolidateLinkAtIndexToPointToSummaryNode(index, pileLevel);
				}	
			}

			// For a given link (defined by index) and pileLevel, 
			// TODO dodgy logic?
			function modifyAndConsolidateLinkAtIndexToPointToSummaryNode(index, pileLevel) {

				var link = uiGraph.links[index],
					consolidatedNodeName = pileLevel + '/...',
					matchesLevelSource = matchesLevel(link.sourceName, pileLevel),
					matchesLevelTarget = matchesLevel(link.targetName, pileLevel);
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
					uiGraph.links.splice(index, 1);

					// Detect if link is duplicate
					var itsADuplicate = false;

					// Now go through all other links and see if they duplicate this new link
					var j = uiGraph.links.length;
					while (j--) {
						var linkCursor = uiGraph.links[j];
						if ((j !== index) &&
							(linkCursor.sourceName === newLink.sourceName) &&
							(linkCursor.targetName === newLink.targetName)) {
							itsADuplicate = true;
							break;
						}
					}
					// If a similar link already exists, then don't need to add it
					if (!itsADuplicate) {
						console.log("modifyAndConsolidateLinksToPointToSummaryNode " + newLink.sourceName + " > "+ newLink.targetName);
						uiGraph.links.push(newLink);
					}
				}
			}

			function connectNewLinksToPile(nodeToTransformIntoPile, consolidatedNodeName) {
				var link;
				for (var j=0; j<uiGraph.links.length; j++) {
					link = uiGraph.links[j];
					if (link.sourceName === consolidatedNodeName) {
						link.source = nodeToTransformIntoPile;
					}
					if (link.targetName === consolidatedNodeName) {
						link.target = nodeToTransformIntoPile;
					}
				}
			}					

			// Eliminate the individual nodes in a pilelevel and replace them with a summary node
			// whose positioning data is taken from the node defined by targetNodeName
			//
			function removeMatchingNodesAndGetSummaryNode2(pileLevel, targetNodeName) {
				// Remove any matching nodes except the first	
				var pilePointsFound = 0,
					index = uiGraph.nodes.length,
					nodeName = null,
					thisIsTheNodeToPreserve = null,
					nodeToTransformIntoPile = null;

				// For any nodes that match the level (but are not the summary node)
				// figure out a node which can provide position data for the summary node
				// (The node that the user selects becomes the summary)	
				//
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

				// Create a summary node
				var summaryNode = {
					name: 'summary',
					rtype: nodeToTransformIntoPile.rtype,
					x: nodeToTransformIntoPile.x,
					y: nodeToTransformIntoPile.y,
					focus: nodeToTransformIntoPile.focus,
				};

				// Copy data from old node to the summary node
				if (nodeToTransformIntoPile.data) {
					summaryNode.data = nodeToTransformIntoPile.data;
				}

				// Delete any nodes in this pileLevel
				while (index--) {
					nodeName = uiGraph.nodes[index]['name'];
					if (matchesLevel(nodeName, pileLevel)) {
						deleteNodeFromGraph(uiGraph, nodeName);
					}
				}

				// ... and add the single summary node in their place
				uiGraph.nodes.push(summaryNode);
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
						console.log("Adding node to UI " + node.name);
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
				setUpNewNode(node, rosInstanceId);
				uiFullGraph.nodes.push(node);
				addNodeToUi(node);
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

			// Remove a node from uiGraph and the display.
			// 	nodeToDelete - reference to the node object on uiGraph
			// This does not delete the associated links.
			//
			function removeNodeFromUi(nodeToDelete) {
				//removeFromNameSpaceTree(node);
				var i = uiGraph.nodes.length;
				while (i--) {
					var node = uiGraph.nodes[i];
					if (node === nodeToDelete) {
						console.log("Removing node " + node.name + " from UI");
						uiGraph.nodes.splice(i, 1);
					}
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
				uiGraph.nodes.push(node);
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

			// Remove node from graph and delete links and groups that point to it
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			//  nameNodeToDelete - name of node to remove
			//	TODO: Refactor with other versions
			//
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

			// graph.groups.leaves are indexes (sometimes) or pointers (other times)
			// to the nodes in graph.nodes that belong to a group. Right now, groups are used
			// to display the machine that contains ROS nodes.
			// This function prunes graph.groups.leaves of a given node. It assumes that
			// references are in place.
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			// 	indexNodeToDelete - The index of the node to remove on 'graph.nodes'
			//
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

			// Given a node name, find its index on a graph (in graph.nodes)
			//	name - node name
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
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

			// Get the index of a node on a graph
			//	node - reference to node object
			//	graph - reference to uiGraph, uiFullGraph or uiGraphIncomplete
			//
			function getNodeIndex(node, graph) {
				for (var i=0; i<graph.nodes.length; i++) {
					if (node === graph.nodes[i]) {
						return i;
					}
				}
				return -1;
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
		
			// Find the indexes of an array of nodes on a given graph
			//
			/*
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
*/

			// Set up a new node to be displayed.
			//	- set various parameters such as size and rosInstanceId
			//	- Create a TopicViewer if it's a topic
			//
			var setUpNewNode = function(node, rosInstanceId) {
				node.size = node.psize = 0;
				node.width = node.height = circleRadius;
				node.uiNodes = [];
				setNodeFormatFromSize(node);
				if (node.rtype==='topic') {
					node.viewer = new TopicViewer.TopicViewer(node);
					if (rosInstanceId) {
						node.rosInstanceId = rosInstanceId;
					}
				}
			}
			module.setUpNewNode = setUpNewNode;
			// Can be called from hashTopicManager (incomplete)

			// Remove named node from uiFullGraph
			//	nameNodeToDelete - name of node to remove
			//
			var deleteNodeFromFullGraph = function(nameNodeToDelete) {
				deleteNodeFromGraph(uiFullGraph, nameNodeToDelete);	
			};

			// Set a flag on the node that will start a node dying.
			// This will trigger a "kill" animation in d3.
			// 	nameNodeToKill - ROS name of node/topic to kill
			//
			function triggerNodeDeath(nameNodeToKill) {
				for (var j=0; j<uiGraph.nodes.length; j++) {
					if (uiGraph.nodes[j].name === nameNodeToKill) {
						uiGraph.nodes[j].dying = true;
						console.log("set dying on " + nameNodeToKill);
					}	
				}							
			}
			
			// Functions to manipulate LINKS on the data graphs ====================
			//

			// Add a link from an update to the various graphs we maintain.
			//	link - reference to the original link object in uiFullGraph
			//
			function addLinkToAllGraphs(link) {
				link['value'] = 15;
				uiFullGraph.links.push(link);	
				
				insertLinkIntoIncompleteGraph(link);
				if (linkIsReadyForDisplay(link)) {
					moveLinkFromIncompleteToUiGraph(link);
				}
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
					shouldNodeWithNameBeDisplayed(sourceName)) {
					var newLink = copyLink(link);
					uiGraph.links.push(newLink);	

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
				link['source'] = findNodeInGraph(uiGraph, link['sourceName']);
				link['target'] = findNodeInGraph(uiGraph, link['targetName']);

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
				console.log("*************************** addGroupToUi ");
				console.log(group);

				var uiGroup = copyGroupToIncompleteGraph(group);
				moveGroupIfReady(uiGroup);
			}
			module.addGroupToUi = addGroupToUi;

			// Copy a group to the incomplete graph
			// Groups will sit here until all their leaves are displayable
			//	group - group to move
			//
			function copyGroupToIncompleteGraph(group) {
				var uiGroup = copyGroup(group);
				uiGraphIncomplete.groups.push(uiGroup);

				return uiGroup;
			}

			function copyGroup(group) {
				// Copy array
				var leaves = [];
				for (var i=0; i<group.leaves.length; i++) {
					var leaf = group.leaves[i];
					leaves.push(leaf);
				}

				// Copy group and add d3 specific padding
				var uiGroup = {
								leaves: leaves,
								title: group.title,
								gtype: group.gtype,
								padding: circleRadius,
							   };
				if (group.hostname) {
					uiGroup.hostname = group.hostname;
				}			   

				return uiGroup;				
			}

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
				console.log("checking if leaf " + leaf.name + " is on uiGraph");
				for (var i=0; i<uiGraph.nodes.length; i++) {
					var node = uiGraph.nodes[i];
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
				uiGraph.groups.push(uiGroup);

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
					console.log("Moving group to uiGraph");
					console.log(uiGroup);
					moveGroupFromIncompleteToUiGraph(uiGroup);
				}
			}

			// Create a new d3 group and add an array of nodes as the leaves.
			// 	existingNodes - an array of nodes that should be on uiGraph
			//	title - the name of the group TODO: Add a label to the display
			//	groupType - right now, we only have "machine" as a groupType
			//
			function createNewGroup(existingNodes, title, groupType) {
				//var indexNodes = convertNodesToIndexes(existingNodes, uiGraph);

				var newGroup = {
								//leaves: indexNodes, 
								leaves: existingNodes,
								title: title,
								gtype: groupType,
								padding: circleRadius
							   };
				if (groupType==="machine") {
					newGroup.hostname = title;
				}

				return newGroup;
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

			// Remove any unneeded dummies from a group. Once a "real" node has been added
			// there's no need to keep the dummy.
			//	group - reference to group object
			//
			function removeDummyNodesFromGroup(group) {
				var i = group.leaves.length;
				while (i--) {
					var leaf = group.leaves[i];
					if (leaf.rtype === "dummy") {
						group.leaves.splice(i, 1);
					}
				}
			}

			// Remove node from any groups on uiGraph and add a dummy node instead
			// if the group would otherwise be empty.
			//	node - reference to node object
			//
			function removeNodeFromAnyGroups(node) {

				var nodeIndex = findNodeByNameOnGraph(node.name, uiGraph);
				if (nodeIndex<0) {
					console.log(node);
					throw("Can't remove non-existant node.")
				}

				// A node could theoretically be in multiple groups
				for (var g=0; g<uiGraph.groups.length; g++) {
					var group = uiGraph.groups[g];

					removeNodeFromGroup(node, group);
					addDummyToGroupIfNecessary(group, uiGraph);
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

			// Convert the leaves on a group from references to indexes.
			// Hopefully can remove this one day when webcole is fixed.
			//
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
			function addMachineToAllGraphs(machine) {
				uiFullGraph.machines.push(machine);
				insertMachineIntoUI(machine);
			}

			// Add a machine to uiGraph and display it.
			//	machine - reference to machine object
			//
			function insertMachineIntoUI(machine) {
				uiGraph.machines.push(machine);
				createGroupForMachine(machine);
			}

			// Create a group for the ROS machine (a Linux host)
			// Look for any displayed ROS nodes that have the same hostname and pop them
			// into the group. If the group is empty, add a dummy.
			//	machine - reference to machine object on uiGraph
			//	
			function createGroupForMachine(machine) {
				var machineName = (machine.hostname || "unknown"),
					existingNodes = nodesWithHostnameOnGraph(machineName, uiGraph);

				// If there are no nodes in this group then make a dummy one
				if (existingNodes.length === 0)	{
					var dummyNode = createDummyNode("/dummy" + machineName);
					uiGraph.nodes.push(dummyNode);
					existingNodes.push(dummyNode);
				}

				// Create the group and add it to uiGraph
				var group = createNewGroup(existingNodes, machineName, "machine");
				//uiGraph.groups.push(group);
				addGroupToUi(group);
			}

			// In this case we add a ROS node to the graph and check if it matches any
			// existing machine-groups. If it does, we add it to the group.
			//
			function addNodeToMatchingMachineGroups(node) {
				var hostname = getHostnameOnNode(node);
				// If the d3 node has no hostname (e.g. it's a topic) then nothing further
				// to be done.
				if (!hostname) {
					return;
				}

				// Look for matching nodes. Remove any dummy nodes if we add a real one
				for (var i=0; i<uiGraph.groups.length; i++) {
					var group = uiGraph.groups[i];
					if (hostname === group.hostname) {
						addNodeToGroupOnUiGraph(node, group);
						removeDummyNodesFromGroup(group);
					}
				}
			}

			// =============== End of GRAPH MANIPULATION FUNCTIONS ======================

			// ======== Legacy code =====================================================
			//
			// TODO: Refactor this out and delete the crap.
			//

			// Make a copy of the node in uiFullGraph for storing in uiGraph and 
			// uiGraphIncomplete
			// We keep a pristine copy of the server graph in uiFullGraph,
			// untainted by what happens on the UI
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
					size: original.size,
					psize: original.psize,
					nodeFormat: original.nodeFormat,
					viewer: original.viewer,
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

			// This is probably not necessary
			// TODO: Check and eliminate
			//
			function copyFieldIfPresent(fieldName, originalNode, newNode) {
				if (originalNode[fieldName]) {
					newNode = originalNode[fieldName];
				}
			}

			// When you delete a ROS node on ROS, the associated topics seem to hang around
			// for a while. These are "orphaned topics" and we try not to show them.
			// TODO: There is an argument for filtering these on the ROS end of things, not the
			// client.
			//
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
    							deleteNodeFromGraph(uiGraph, nodeName);
    						}
  						}
					}
				}	
			};

			// TODO Clean up. hashTopic code unfinished.
			function updateNodeOnUiGraph(uiFullGraphNode) {
				
				if (HashTopicManager.seeIfUpdateRequiresNewUiNodes(uiFullGraphNode)) {
					uiGraphUpdate();
				}

				var hashTopic = HashTopicManager.isAHashableTopic(uiFullGraphNode),
					latestMessageHashTopicUiNodeName = "";

				if (hashTopic) {
					//latestMessageHashTopicUiNodeName = HashTopicManager.getLatestMessageHashTopicUiNodeName(uiFullGraphNode);
				}

				// uiFullGraphNodes carry a list of pointers to uiNodes
				for (var i=0; i<uiFullGraphNode.uiNodes.length; i++) {
					var uiNode = uiFullGraphNode.uiNodes[i];
					if ((latestMessageHashTopicUiNodeName === uiNode.name) || (!hashTopic)) {
						uiNode.data = uiFullGraphNode.data;
						uiNode.viewer.update(uiNode);
					}
				}
				
			}

			// End of legacy code ====================================================								

		}

		// Hash Topics Code ==========================================================
		// 
		// TODO: complete this!
		//
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







		