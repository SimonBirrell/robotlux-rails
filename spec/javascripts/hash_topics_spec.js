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
		console.log("******************** Nodes *************************");
		console.log(uiTest.uiGraph.nodes[1]);
		console.log(uiTest.uiGraph.nodes[2]);
		console.log("****************************************************");
		expect(HashTopicManager.isAHashableTopic(uiTest.uiGraph.nodes[1])).toEqual(false);
		expect(HashTopicManager.isAHashableTopic(uiTest.uiGraph.nodes[2])).toEqual(true);
	});

	it("converts to single node in a box", function() {
		expect(uiTest.uiFullGraph.nodes.length).toEqual(3);
		expect(uiTest.uiGraph.nodes.length).toEqual(3);
		expect(uiTest.uiGraph.groups.length).toEqual(1);
		expect(uiTest.uiGraph.groups[0].leaves[0].name).toEqual(' /some_hash_topic');
		// No messages yet, so we don't know what name of first node will be.
		// For the time being, use the topic name.
		var topic = uiTest.uiGraph.nodes[2];
		expect(topic.hashSubTopics[0].subTopicKey).toEqual(' /some_hash_topic');
		// Should be a pointer back to the group on the topic
		expect(uiTest.uiGraph.groups[0]).toEqual(topic.subTopicGroup);

	});

	it("saves messages received to subtopics", function() {
		// Create update and send to graph
		var update = emptyTopic;
		update.nodes[0].data = jointStateMessage;
		uiTest.uiGraphUpdFn(update);

		// Check that node on uiGraph contains a hash of messages
		var topic = uiTest.uiGraph.nodes[2];
		expect(topic.hashSubTopics.length).toEqual(2);
		expect(uiTest.uiGraph.groups.length).toEqual(1);

		var jointTopicNodeOne = topic.hashSubTopics[0],
			jointTopicNodeThree = topic.hashSubTopics[1],
			group = uiTest.uiGraph.groups[0];

		// Check that group contains the two topics
		expect(group.leaves.length).toEqual(2);
		expect(group.leaves[0]).toEqual(jointTopicNodeOne);
		expect(group.leaves[1]).toEqual(jointTopicNodeThree);

		// Check Joint One is a subtopic (the original topic)	
		expect(jointTopicNodeOne.subTopicKey).toEqual('joint_one');
		expect(jointTopicNodeOne.subTopicIndex).toEqual(0);
		expect(jointTopicNodeOne.data.message.name[0]).toEqual('joint_one');

		// Check Joint Three is a subtopic
		expect(jointTopicNodeThree.subTopicKey).toEqual('joint_three');
		expect(jointTopicNodeThree.subTopicIndex).toEqual(1);
		expect(jointTopicNodeThree.data.message.name[1]).toEqual('joint_three');

		// Now update the graph
		LuxUi.uiGraphUpdate();

		// Topic viewers should be present on both sub topics
		jointTopicNodeOne.viewer.rotateViewLeft();
		jointTopicNodeThree.viewer.rotateViewLeft();

		// There should be an (invisible) link between the two subtopics to keep them together
		var links = uiTest.uiGraph.links;
		console.log("******************");
		console.log("******************");
		console.log(links);
		console.log("******************");
		console.log("******************");
		expect(links.length).toEqual(2);

	});

});

