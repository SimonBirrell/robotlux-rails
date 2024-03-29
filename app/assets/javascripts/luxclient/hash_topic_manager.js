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


	function getLatestMessageHashTopicUiNodeNames(uiFullGraphNode) {
		var key = getHashKeyOfNodeMessage(uiFullGraphNode),
			namesString = uiFullGraphNode.data.message[key];

		return namesString;
	}
	module.getLatestMessageHashTopicUiNodeNames = getLatestMessageHashTopicUiNodeNames;

	function getHashKeyOfNodeMessage(uiFullGraphNode) {
		var mtype = findHashableTopic(uiFullGraphNode);
		if (mtype) {
			return mtype.keyFieldName;
		}
		return "";
	}

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
		// Cache result
		if ((node.hashTopicOrigin===true)||(node.hashTopicOrigin===false)) {
			return node.hashTopicOrigin;
		}

		var mType = findHashableTopic(node);
		if (mType) {
			node.hashTopicOrigin = true;
		} else {
			node.hashTopicOrigin = false;
		}

		return node.hashTopicOrigin;
	};
	module.isAHashableTopic = isAHashableTopic;

	// Check for hash topics that will require a new uiNode
	//	
	// Return true if the graph has changed (and uiGraphUpdate should therefore be called)
	//	uiFullGraphNode - node with latest message to check.
	//
	var seeIfUpdateRequiresNewUiNodes = function(uiFullGraphNode) {
		var newNodes = [];
 
		// If it's not a hash topic then there's nothing to do
		if (!isAHashableTopic(uiFullGraphNode)) {
			return false;
		}

		// Go through all received sub topic names and see if there's a uiNode for each one
		// Create one if not
		var uiNodeNames = getLatestMessageHashTopicUiNodeNames(uiFullGraphNode),
			updateRequired = false;
		for (var i=0; i<uiNodeNames.length; i++) {
			var uiNodeName = uiNodeNames[i],
				uiNode = getUiNodeOnUiFullGraphNodeWithName(uiFullGraphNode, uiNodeName);
			if (!uiNode) {
				var updateThisNode = createUiNodeOnUiFullGraph(uiFullGraphNode, uiNodeName, i);
				updateRequired = updateRequired || updateThisNode;
				uiNode = getUiNodeOnUiFullGraphNodeWithName(uiFullGraphNode, uiNodeName);
			}
			// Copy ROS message to all uiNodes
			copyRosMessageToUiNode(uiNode, uiFullGraphNode.data);
		}

		return updateRequired;
	}
	module.seeIfUpdateRequiresNewUiNodes = seeIfUpdateRequiresNewUiNodes;

	function getHashableMessageType(name) {
		for (var i=0; i<hashableMessageTypes.length; i++) {
			var hashableMessageType = hashableMessageTypes[i];
			if (hashableMessageType.name === name) {
				return hashableMessageType;
			}
		}	
		return null;
	}

	function copyRosMessageToUiNode(uiNode, data) {
		var subMessage = data.message,
			messageType = data.type;

		uiNode.data = uiNode.data || {};
		uiNode.data.message = subMessage;
		uiNode.data.type = messageType;
	}

	// We need a new uiNode for display. It could be the existing (first) one
	// or one that we create
	//	uiFullGraphNode - the "parent" of the uiNodes for this hash topic
	//	uiNodeName - name of node to create
	// 	index - index into arrays for subtopic on compound message
	// Return true if a uiNode has been added to the display (requiring a webcola update)
	//
	function createUiNodeOnUiFullGraph(uiFullGraphNode, uiNodeName, index) {
		// See if there's an "empty" uiNode to assign (generally, the first one)
		for (var i=0; i<uiFullGraphNode.uiNodes.length; i++) {
			var uiNode = uiFullGraphNode.uiNodes[i];
			if (!uiNode.hashSubTopicName) {
				console.log("ASSIGNING NODE " + uiNodeName + " TO " + uiNode.name);
				uiNode.hashSubTopicName = uiNodeName;
				uiNode.name = uiNodeName;
				uiNode.subTopicIndex = index;
				console.log(uiNode);
				return false;
			}
		}

		// Create a new node
		console.log("CREATING EXTRA NODE " + uiNodeName);
		uiNode = LuxUi.addNodeToUi(uiFullGraphNode, uiNodeName);
		uiNode.rosInstanceId = uiFullGraphNode.uiNodes[0].rosInstanceId;

		uiNode.hashSubTopicName = uiNodeName;
		uiNode.subTopicIndex = index;
		console.log(uiNode);
		putGroupOnAllUiNodes(uiFullGraphNode);

		return true;
	}

	function putGroupOnAllUiNodes(uiFullGraphNode) {
		// No group on the first topic
		if (uiFullGraphNode.uiNodes.length < 2) {
			return;
		}

		if (!uiFullGraphNode.hashTopicGroup) {
			// Trimmed name ' /jointStates' -> '/jointStates'
			// TODO: May need to do full multi-level label
			var trimmedName = uiFullGraphNode.name.substring(2);

			// Create group - how will the indexes work if topic is incomplete????
			var group = {
				leaves: uiFullGraphNode.uiNodes,
				title: trimmedName,
				gtype: "hashTopic",
				rosInstanceId: uiFullGraphNode.rosInstanceId
			}
			console.log("=================== G R O U P ======================================");
			console.log(group);
			LuxUi.addGroupToUi(group);
		} else {
			uiFullGraphNode.hashTopicGroup.leaves = uiFullGraphNode.uiNodes;
		}
	}

	function getUiNodeOnUiFullGraphNodeWithName(uiFullGraphNode, nodeName) {
		for (var i=0; i<uiFullGraphNode.uiNodes.length; i++) {
			var uiNode = uiFullGraphNode.uiNodes[i];
			if (uiNode.name === nodeName) {
				return uiNode;
			}
		}
		return null;
	}



	// LEGACY CODE
/*
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
	*/

	return module;
})();

