// RenderUi is responsible for the actual rendering of the UI to HTML and d3/SVG
//
// (c) 2016 Simon Birrell. All Rights Reserved.

var RenderUi = (function() { 
    "use strict"; 
    var module = {}; 

	var SHRINK_DURATION = 1000;  
	var KILL_DURATION = 1000;  
	var PILE_CONSOLIDATION_DURATION = 3000;
	var	NODE_LABEL_TOP = 20,
		NODE_LABEL_TEXT_HEIGHT = 16;

	var NODE_PADDING_WIDTH = 30;
	var NODE_PADDING_HEIGHT = 30;

	// Callbacks to save
	var CallbackUnfoldPile,
		CallbackAddPileUpLevel,
		CallbackCollapsePiles,
		CallbackKill,
		CallbackRemoveNodeAndAssociatedLinksFromUiGraph,
		CallbackRemoveNodeAndAssociatedLinksFromFullGraph;

	// Global variables to this module
	var uiGraph = {nodes: [], links: [], groups: [], machines: []};
	var svg;
	var dragColaSetup;
	var force;
	var circleRadius = 32;
	var forced;
	var machineTreeMenu = {};
	var DragDropManager;
	var margin;

	// End of global variables

	module.open = function(callbackUnfoldPile, callbackAddPileUpLevel, collapsePiles, kill, removeNodeAndAssociatedLinksFromUiGraph, removeNodeAndAssociatedLinksFromFullGraph) {

		// Save callbacks
		CallbackUnfoldPile = callbackUnfoldPile;
		CallbackAddPileUpLevel = callbackAddPileUpLevel;
		CallbackCollapsePiles = collapsePiles;
		CallbackKill = kill;
		CallbackRemoveNodeAndAssociatedLinksFromUiGraph = removeNodeAndAssociatedLinksFromUiGraph;
		CallbackRemoveNodeAndAssociatedLinksFromFullGraph = removeNodeAndAssociatedLinksFromFullGraph;

		// Basic parameters
		var width = 1500,
		    height = 1500,
		    fullWidth = width,
		    fullHeight = height,
			groupPadding = (circleRadius / 2),
			colorText = "#042029",
			color = d3.scale.category20();
		
		// The webcola adaptor replaces d3's built-in force constrained graph
		force = cola.d3adaptor()
		    .linkDistance(circleRadius * 5)
			    .handleDisconnected(false)
		    .avoidOverlaps(true)
			    .size([width, height]);
							
		// Allow the user to drag the background with the mouse    									
		dragColaSetup = force.drag()
			.origin(function(d) { return d; })
		    .on("dragstart", dragstarted)
		    .on("drag", draggedCola)
		    .on("dragend", dragended)
			;

		// The margin of the viewing area
		margin = {top: 200, right: 20, bottom: 20, left: 300},
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
		svg = d3.select("#robotlux").append("svg")
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
		machineTreeMenu = d3.select("#mainMenu");
		module.machineTreeMenu = machineTreeMenu;

		// Drag HTML to SVG
		// http://bl.ocks.org/thudfactor/6611441
		DragDropManager = {
			dragged: null,
			droppable: null,
			draggedMatchesTarget: function() {
				if (!this.droppable) return false;
					return true;
			}
		}	
		module.DragDropManager = DragDropManager;	

	} // End of open()

	module.setUpAnimation = function() {
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
	}

	module.clearGraph = function() {
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
	}

	// Remove all items in the array
	// We don't want to overwrite the array with [] because d3 has a reference to
	// it.
	//
	function emptyArray(array) {
		array.splice(0, array.length);
	}
			
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
				var widthOnDomElement = parseInt(d3.select(this).attr("width")) || 0;
				// Set size on data to allow bounding box to transition smoothly
				// d points to node on uiGraph
				// TODO Add padding here based on size of labels
				// TODO This will mean adjusting the canvas position too
				d.width = widthOnDomElement + NODE_PADDING_WIDTH; //+ 25;
				d.height = widthOnDomElement + NODE_PADDING_HEIGHT; //+ 25;
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
			groupSelection.selectAll("rect")
				 .attr("x", function (d) { return d.bounds.x; })
                 .attr("y", function (d) { return d.bounds.y; })
                 .attr("width", function (d) { return d.bounds.width(); })
                 .attr("height", function (d) { return d.bounds.height(); });

            groupSelection.selectAll(".group-label")
				 .attr("x", function (d) { return d.bounds.x + d.bounds.width()/2; })
                 .attr("y", function (d) { return d.bounds.y + d.bounds.height() + 14; });
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
        	.append("g")
        		.attr("class", "group");

       	// Draw rectangle
		newGroups		        		
			.append("rect")
            	.attr("rx", 8).attr("ry", 8)
            	.attr("class", function(d) {
            		if (d.gtype === "hashTopic") {
            			return "group-hash-topic";
            		}
            		return "group-machine";
            	})
            	.attr("id", function(d) {
            		if (d.gtype === "hashTopic") {
            			return "";
            		}
            		return "machine_" + d.hostname;
            	});

        // Add group label
		newGroups		        		
			.append("text")
				.attr("class", function(d) {
					var labelGroup = (d.gtype === "hashTopic") ? "group-label-hash-topic" : "group-label-machine";
					return "group-label " + labelGroup;
				})
				.text(function(d) {return d.title;});
            	
        // When mouse is over a group, tell the DragDropManager that it's available
        // as a drop target
        // TODO: Can't drag onto a hash topic
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
	        .attr("class", function(d) { return "node-backdrop node-" + d.rtype; })
	        .on("dblclick", nextNodeSize)
	        ;

	    //appendNodeLabels(nodeEnter);
	    appendNodeLabels(nodeSelection);

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
		//collapsePiles();

		// Set up groups
		//createGroupsOnGraph(uiGraph);


		// Hash-style topics and groups
		// New feature - incomplete code!
		//HashTopicManager.addStrutsToHashTopics(uiGraph);


		// Data joins			
		var group = svg.selectAll(".group")
          .data(uiGraph.groups, function(d) {return d.rosInstanceId + " " + d.title;});
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
		console.log(uiGraph.links.length);

		// Apply force to entering and updating elements
		// http://stackoverflow.com/questions/11368339/drawing-multiple-edges-between-two-nodes-with-d3
		
		force.on("tick", function() {
			graphTick(link, node, group);
		});	

		// Package tree added to menu
		//MachineTreeMenu.updateMachineMenu(machineTreeMenu, uiFullGraph, DragDropManager, ProtocolToUiLayer);
		console.log("Finished update2 --------------------------");
		console.log(uiGraph.links.length);
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
		var nodeLabels = nodeEnter.selectAll('.nodetopic-label') 
		    .data(function(d) {
		    	// Make a join with an array of text labels
		    	var nameChunks = (d.rtype === "dummy") ? "" : prepareLabels(d.name, d);
		    	return nameChunks;
		    });

		nodeLabels.enter()
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
		CallbackAddPileUpLevel(this.pileLevel);
		CallbackCollapsePiles();
		uiGraphUpdate();
	}

	// Click handler for a node label that will "unfold" child nodes
	//	this - d3 node that has been clicked
	//
	function unfold() {
		var summaryNode = this.node;
		var levelToUnfold = this.pileLevel.substring(0, this.pileLevel.length-4);
		CallbackUnfoldPile(levelToUnfold, summaryNode);
		CallbackCollapsePiles();
		uiGraphUpdate();
	}

	// Update the d3 selection of node labels in case they're on a node that's 
	// being scaled up or down.
	//
	function updateNodeLabels(node) {
	    var nodeLabels = node.selectAll(".nodetopic-label")
			.text(function(d) {
			    console.log("************* >>>>> Changed label in UPDATE <<<<< ****************");
			    return d.chunkName;
			})			   		
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
		        d.psize = d.size;
	        });

		nodeSelection.selectAll(".node-backdrop")
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
	    			console.log("setUpDyingNodes");
	    			console.log(d);
	    			CallbackRemoveNodeAndAssociatedLinksFromUiGraph(d);
	    			//deleteLinksFromFullGraphConnectedTo(d.name);
					//deleteNodeFromFullGraph(d.name);
					CallbackRemoveNodeAndAssociatedLinksFromFullGraph(d.name);
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
				&&(d.viewer)
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
	module.triggerNodeDeath = triggerNodeDeath;

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
	    		CallbackKill(d.hostname, d.pid);
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
	module.setNodeFormatFromSize = setNodeFormatFromSize;

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

	// ======================= DEBUGGING FUNCTIONS ==============================

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

	// ======================= Access to uiGraph ================================

	// Call callback once per node
	// callback(node, nodeName, i);
	//
	module.iterateDownUiNodes = function(callback) {
      var i = uiGraph.nodes.length;

      while (i--) {
      	var node = uiGraph.nodes[i],
      		nodeName = node.name;

      	callback(node, nodeName, i);	
      }
    }

	// Call callback once per node
	// callback(node, nodeName, i);
	//
	module.iterateUpUiNodes = function(callback) {
      for (var i=0; i<uiGraph.nodes.length; i++) {
      	var node = uiGraph.nodes[i],
      		nodeName = node.name;

      	callback(node, nodeName, i);	
      }
    }

	// Call callback once per link
	// callback(link, i);
	//
	module.iterateDownUiLinks = function(callback) {
      var i = uiGraph.links.length;

      while (i--) {
      	var link = uiGraph.links[i];

      	callback(link, i);	
      }
    }

    // ==========================================================================



	// === To be resettled ======================================================

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
					console.log(l);
					console.log(leaf);
					console.log(graph);
					throw "Node not found in resetLeavesOnGroup()";
				}	
				group.leaves[l] = index;	
				//console.log("Reset leaf " + l.toString() + " to " + index + " = " + graph.nodes[index].name + " on group " + group.title);
			}
		}
	}

	// May not be necessary
	module.forceStop = function() {
		force.stop();
	}

	// Set up a new node to be displayed.
	//	- set various parameters such as size and rosInstanceId
	//	- Create a TopicViewer if it's a topic
	//
	module.setUpNewNode = function(node, rosInstanceId) {
		node.rosInstanceId = rosInstanceId;
		node.size = node.psize = 0;
		node.width = node.height = circleRadius;
		node.uiNodes = [];
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
						rosInstanceId: group.rosInstanceId
					   };
		if (group.hostname) {
			uiGroup.hostname = group.hostname;
		}			   

		return uiGroup;				
	}
	module.copyGroup = copyGroup;

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

	// Create a new d3 group and add an array of nodes as the leaves.
	// 	existingNodes - an array of nodes that should be on uiGraph
	//	title - the name of the group TODO: Add a label to the display
	//	groupType - right now, we only have "machine" as a groupType
	//
	function createNewGroup(existingNodes, title, groupType, rosInstanceId) {
		//var indexNodes = convertNodesToIndexes(existingNodes, uiGraph);

		var newGroup = {
						//leaves: indexNodes, 
						leaves: existingNodes,
						title: title,
						gtype: groupType,
						padding: circleRadius,
						rosInstanceId: rosInstanceId
					   };
		if (groupType==="machine") {
			newGroup.hostname = title;
		}

		return newGroup;
	}
	module.createNewGroup = createNewGroup;

	// Remove a node from uiGraph and the display.
	// 	nodeToDelete - reference to the node object on uiGraph
	// This does not delete the associated links.
	//
	function removeNodeFromUi(nodeToDelete) {
		//removeFromNameSpaceTree(node);
		var i = RenderUi.uiGraph.nodes.length;
		while (i--) {
			var node = RenderUi.uiGraph.nodes[i];
			if (node === nodeToDelete) {
				RenderUi.uiGraph.nodes.splice(i, 1);
			}
		}
	}
	module.removeNodeFromUi = removeNodeFromUi;

	// Completely remove group and amy dummy nodes from uiGraph
	//	targetGroup - reference to group to delete
	//
	function removeGroupFromUi(targetGroup) {
		var dummyNode = RenderUi.removeDummyNodesFromGroup(targetGroup);
		RenderUi.removeNodeFromUi(dummyNode);
		for (var i=0; i<RenderUi.uiGraph.groups.length; i++) {
			var group = RenderUi.uiGraph.groups[i];
			console.log(group);
			if (group === targetGroup) {
				RenderUi.uiGraph.groups.splice(i, 1);
				return;
			}
		}
	}
	module.removeGroupFromUi = removeGroupFromUi;

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
				return leaf;
			}
		}
	}
	module.removeDummyNodesFromGroup = removeDummyNodesFromGroup;

	// Externally accessible variables - TEMPORARY //
	module.uiGraph = uiGraph;
	module.DragDropManager = DragDropManager;
	// End of externally accessible variables 

    return module;
})();

