describe("hash topic", function() {
// Code incomplete


	var graphWithArrayTopic = {
		nodes: [
			{name: '/foo', rtype: 'node'},
			{name: ' /bar', rtype: 'topic', data: {type: 'sensor_msgs/foo'}},
			{name: ' /some_hash_topic', rtype: 'topic', data: {type: 'sensor_msgs/JointState'}}
		],
		links: [
			{sourceName: '/foo', targetName: ' /bar'}
		],
		machines: [
		]
	};

	var emptyTopic = {nodes: [
				{	
					'name': ' /some_hash_topic', 
					'rtype': 'topic', 
					'group': 1, 
					'width': 64, 
					'height': 64, 
					'x': 0, 
					'y': 0
				}
			]};

	var jointStateMessage = {
		type: 'sensor_msgs/JointState',
		count: 0,
		message: {
			header: {
				seq: 0,
				stamp: [0, 0],
				frame_id: 0
			},
			name: ['joint_one', 'joint_three'],
			position: [0.0, 1.0],
			velocity: [1.0, -2.0],
			effort: [0.5, -0.5]
		}
	};	

	beforeEach(function() {
		uiTest.clearGraphAndAddSegment(graphWithArrayTopic);
	});

	it("detects hashable topics", function() {
		expect(HashTopicManager.isAHashableTopic(uiTest.uiGraph.nodes[1])).toEqual(false);
		expect(HashTopicManager.isAHashableTopic(uiTest.uiGraph.nodes[2])).toEqual(true);
	});

	it("converts to single node with no box", function() {
		expect(uiTest.uiFullGraph.nodes.length).toEqual(3);
		expect(uiTest.uiGraph.nodes.length).toEqual(3);
		expect(uiTest.uiGraph.groups.length).toEqual(0);
		// No messages yet, so we don't know what name of first node will be.
		// For the time being, use the topic name.
		var topic = uiTest.uiGraph.nodes[2];
		expect(topic.name).toEqual(' /some_hash_topic');
	});

	it("saves messages received to subtopics", function() {
		// Create update and send to graph
		var update = emptyTopic;
		update.nodes[0].data = jointStateMessage;
		console.log("****************** sending update ********************");
		uiTest.uiGraphUpdFn(update);

		// Check that subtopics are created
		var uiTopic1 = findNodeWithName("joint_one"),
			uiTopic3 = findNodeWithName("joint_three");
		expect(uiTopic1).not.toBeNull();	
		expect(uiTopic3).not.toBeNull();	

		// Check group
		expect(uiTest.uiGraph.groups.length).toEqual(1);



	});

	function findNodeWithName(name) {
		var uiGraph = LuxUi.getUiGraph();
		for (var i=0; i<uiGraph.nodes.length; i++) {
			var uiNode = uiGraph.nodes[i];
			console.log(uiNode);
			if (uiNode.name === name) {
				return uiNode;
			}
		}
		return null;
	}

});

