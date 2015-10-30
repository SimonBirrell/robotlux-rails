// The HashTopicManager is responsible for detecting Hash Topics, i.e.
// ROS topics that need to be displayed not as a single circle, but as a group of
// circles. They are called "hash" topics because one of the variables inside the topic
// message acts as a "key" that separates out the different messages into different circles.
// This is often the "name" attribute.
// So a single topic from ROS's point of view becomes an array of topics (from RobotLux's point
// of view). The Robot Lux topics are bounded by a group.

// This code is not working yet and is not complete, hence largely undocumented!
//

var HashTopicManager = (function() {
	"use strict"; 

	var module = {};

	var hashableMessageTypes = [
		{name: 'sensor_msgs/JointState', keyFieldName: 'name', arrayFieldNames: ['position', 'velocity', 'effort']}
	];

	function findHashableTopic(node) {
		var targetMessageType = node.data ? node.data.type : "";

		if ((node.rtype === 'topic') && (targetMessageType !== '')) {
			for (var i=0; i<hashableMessageTypes.length; i++) {
				var mType = hashableMessageTypes[i];
				if (mType.name === targetMessageType) {
					return mType;
				}
			}
		}
		return null;
	}

	var isAHashableTopic = function(node) {
		return false;
		// Cache result
		if ((node.hashTopicOrigin===true)||(node.hashTopicOrigin===false)) {
			return node.hashTopicOrigin;
		}

		var mType = findHashableTopic(node);
		if (mType) {
			node.hashTopicOrigin = true;
			node.hashTopic = true;
			node.subTopicKey = node.name;
			node.hashSubTopics = [node];
			node.subTopicIndex = 0;
			return true;
		} else {
			node.hashTopicOrigin = false;
		}

		return false;
	};
	module.isAHashableTopic = isAHashableTopic;

	// Generate any additional nodes necessary to display this hash topic
	var getAdditionalNodes = function(node) {
		return [];
	};
	module.getAdditionalNodes = getAdditionalNodes;

	// Return index of node in uiGraph
	function indexInGraph(node, graph) {
		for (var i=0; i<graph.nodes.length; i++) {
			if (graph.nodes[i] === node) {
				return i;
			}
		}
		return null;
		throw "Node not found";
	}

	// Create a group that encompasses all topic circles
	var createGroup = function(node, additionalNodes, graph) {
		var group = {
			leaves: [indexInGraph(node, graph)]
		};

		/*
		for (var i=0; i<additionalNodes.length; i++) {
			var additionalNode = additionalNodes[i];
			group.leaves.append(indexInGraph(additionalNode, graph));
			additionalNode.subTopicGroup = group;
		}
		*/
		
		node.subTopicGroup = group;

		return group;
	};
	module.createGroup = createGroup;

	function makeCloneOfOriginalTopic(graph, subTopics, key) {
			var newSubTopic = makeDeepCopyOfTopic(subTopics[0]);
			newSubTopic.subTopicIndex = subTopics.length;
			// Name should be different to avoid incorrect linking
			newSubTopic.name += (' ' + subTopics.length.toString());
			newSubTopic.subTopicKey = key;
			LuxUi.setUpNewNode(newSubTopic);
			// Add to graph and sub-topic array on original node
			graph.nodes.push(newSubTopic);
			subTopics.push(newSubTopic);
			// Add to group
			var group = subTopics[0].subTopicGroup;
			group.leaves.push(newSubTopic);
			console.log("??????????????????????");
			console.log(group);
			console.log(graph.groups);
			console.log(graph.nodes);
			console.log("??????????????????????");
			//graph.groups.push(newSubTopic);		
	}

	function updateSubTopicFromMessageCreatingIfNecessary(graph, subTopics, message, key, index) {
		var found = false,
			newSubTopic = null;

		for (var i=0; i<subTopics.length; i++) {
			var subtopic = subTopics[i];
			if (subtopic.subTopicKey === key) {
				found = true;
			}
		}

		if (!found) {
			console.log("cloning -> " + key);
			// TODO Restore and clean up mess
			//makeCloneOfOriginalTopic(graph, subTopics, key);
		} else {
		}

		return !found;
	}

	// TODO move this function somewhere more appropriate
	function makeDeepCopyOfTopic(topic) {
		var copy = {
						name: topic.name,
						rtype: topic.rtype,
						width: topic.width,
						height: topic.height,
						x: topic.x,
						y: topic.y,
						subTopicGroup: topic.subTopicGroup,
						data: {
							type: topic.data.type,
							count: topic.data.count,
							message: topic.data.message
						}
					};			

		return copy;
	}

	// Receive an update from the server. This is already stored in the data attribute
	// but we need to split it into a hash of updates, one key-value for each separate subtopic.
	// This split can in turn generate new nodes.
	var update = function(graph, node, data) {
		var data = node.data,
			message = data.message,
			newSubTopic = null,
			updateRequired = false;

		// Cache mType on node
		if (!node.mType) {
			node.mType = findHashableTopic(node);			
		}
		var keyFieldName = node.mType.keyFieldName,
			keys = message[keyFieldName];

		// If the topic hasn't received any messages yet then the subTopicKey will
		// be the same as the name. Now let's rename it as the first subtopic received.
		if (node.subTopicKey === node.name) {
			node.subTopicKey = keys[0];
		}

		// The message may contain multiple keys. See if there's an existing sub-topic
		// for each key and if not, create it.
		// keyFieldName will name a parameter from the ROS message that should be an
		// array of strings.
		for (var k=0; k<keys.length; k++) {
			var key = keys[k];
			updateRequired = updateRequired || updateSubTopicFromMessageCreatingIfNecessary(graph, node.hashSubTopics, message, key, k);
		}

		if (updateRequired) {
			console.log("&&&&&&&&&&&&&&&&&&&&");
			console.log("Triggered update");
			console.log("&&&&&&&&&&&&&&&&&&&&");
			clearLinksOnSubTopics(graph, node.hashSubTopics);
			setLinksOnSubTopics(graph, node.hashSubTopics);
			LuxUi.uiGraphUpdate();
		}

	};
	module.update = update;

	var addStrutsToHashTopics = function(graph) {
		for (var i=0; i<graph.nodes.length; i++) {
			var node = graph.nodes[i];
			if (isAHashableTopic(node)) {
				console.log("addStrutsToHashTopics()");
				console.log(indexInGraph(node, graph));
				for (var z=0; z<node.hashSubTopics.length; z++) {
					console.log(indexInGraph(node.hashSubTopics[z], graph));
				}
				clearLinksOnSubTopics(graph);
				setLinksOnSubTopics(graph, node.hashSubTopics);
				console.log("added");
			}
		}
	}
	module.addStrutsToHashTopics = addStrutsToHashTopics;

	function clearLinksOnSubTopics(graph) {
		var links = graph.links, 
			i = links.length,
			link;
		while (i--) {
			link = links[i];
			// Remove any purely internal links (struts) 
			if ((link.source) && (link.target)) {
				if ((link.source.subTopicGroup) && (link.source.subTopicGroup === link.target.subTopicGroup)) {
					links.splice(i, 1);
				}
			} else {
				console.log("WARNING: Link with no source or target");
				console.log(link);
				console.log("--------------------------------------");
			}
		}
	}

	// Subtopics are linked together to keep them in place
	// These links are 'struts' and should look different to the links that indicate
	// data flow
	var setLinksOnSubTopics = function(graph, subTopics) {
		var n = subTopics.length,
			x = Math.ceil(Math.sqrt(n)),
			xIndex, yIndex, node,
			xLimit = x - 1;

		for (var i=0; i<n; i++) {
			node = subTopics[i];
			console.log("Adding struts to node ");
			console.log(node);
			console.log(indexInGraph(node, graph));
			xIndex = i % x;
			yIndex = Math.floor(i / x);
			// Horizontal struts
			if (xIndex > 0) {
				addLink(graph, node, subTopics[i-1]);
			}
			// vertical struts
			if (yIndex > 0) {
				addLink(graph, node, subTopics[i-x]);
			}
			// Diagonal struts
			if ((xIndex > 0) && (yIndex > 0)) {
				addLink(graph, node, subTopics[i-x-1]);
			}
			if ((xIndex < xLimit) && (yIndex > 0)) {
				addLink(graph, node, subTopics[i-x+1]);
			}
		}	
		console.log("Added struts");
		console.log(graph.links.length);
	}
	module.setLinksOnSubTopics = setLinksOnSubTopics;

	function addLink(graph, node1, node2) {
		var newLink = {
			source: indexInGraph(node1, graph),
			target: indexInGraph(node2, graph),
			sourceName: node1.name,
			targetName: node2.name,
			length: 1.0,
			value: 1.0
		};
		console.log("ADDED LINK");
		console.log(newLink);
		console.log("TO");
		console.log(graph.links);
		console.log(indexInGraph(node1, graph));
		console.log(indexInGraph(node2, graph));
		//graph.links.push(newLink);
	}

	return module;
})();

