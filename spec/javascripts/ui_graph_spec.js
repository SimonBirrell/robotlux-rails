describe("updates to UI", function() {

	var uiToProtocolInterpretMessage = null;
	var dummyProtocol = {
 		open: function(interpretMessage) {
 			uiToProtocolInterpretMessage = interpretMessage;
		}
	};	

	var uiGraphAddFn=null, uiGraphDelFn=null, uiGraphUpdFn=null, uiGraphClearFn=null;
	var dummyProtocolToUiLayer = {
 		open: function(uiGraphAdd, uiGraphDel, uiGraphUpd, uiGraphClear) {
 			uiGraphAddFn = uiGraphAdd;
 			uiGraphDelFn = uiGraphDel;
 			uiGraphUpdFn = uiGraphUpd;
 			uiGraphClearFn = uiGraphClear;
 		}	
	};

	var graphSegment = {
			nodes: [
				{name: '/rosout', rtype: 'node'},
				{name: ' /rosout_agg', rtype: 'topic', data: {'hostname': 'foo'}},
			],
			links: [
				{sourceName: '/rosout', targetName: ' /rosout_agg'}
			],
			machines: [
			]
		};
 
	var graphSegment2 = {
			nodes: [
				{name: '/rosout', rtype: 'node'},
				{name: ' /runtime_logger', rtype: 'topic'},
				{name: ' /orphan', rtype: 'topic'},
				{name: '/baz', rtype: 'node'},
			],
			links: [
				{sourceName: '/rosout', targetName: ' /runtime_logger'},
				{sourceName: '/baz', targetName: ' /runtime_logger'}
			],
			machines: [
			]
		};

	var graphSegment3 = {};

	function resetGraph3() {
		graphSegment3 = {
			nodes: [
				{name: '/rosout', rtype: 'node'},
				{name: ' /runtime_logger', rtype: 'topic'},
				{name: ' /orphan', rtype: 'topic'},
				{name: ' /root/next_level/foo', rtype: 'topic'},
				{name: ' /root/next_level/bar', rtype: 'topic'},
				{name: ' /root/next_level/baz', rtype: 'topic'},
				{name: '/one_level/leaf1', rtype: 'node'},
				{name: '/one_level/leaf2', rtype: 'node'},
				{name: ' /something', rtype: 'topic'},
				{name: '/else', rtype: 'node'},
				{name: '/baz', rtype: 'node'},
			],
			links: [
				{sourceName: '/else', targetName: ' /root/next_level/foo'},
				{sourceName: '/else', targetName: ' /root/next_level/bar'},
				{sourceName: '/baz', targetName: ' /root/next_level/baz'},
				{sourceName: '/else', targetName: '/one_level/leaf1'},
				{sourceName: '/else', targetName: '/one_level/leaf2'},
				{sourceName: '/else', targetName: ' /something'},
				{sourceName: '/rosout', targetName: ' /runtime_logger'},
				{sourceName: '/baz', targetName: ' /runtime_logger'}
			],
			machines: [
			]
		};
	}

	var uiGraph=null,
		uiFullGraph=null;

	LuxUi.open(dummyProtocolToUiLayer);

	beforeEach(function() {
		LuxUi.uncollapseAllPiles();
		resetGraph3();
	});	

	afterEach(function() {
		//LuxUi.close();
	});

	function clearGraphAndAddSegment(segment) {
		uiGraphClearFn();
		uiFullGraph = LuxUi.getUiFullGraph();
		expect(uiFullGraph.nodes.length).toEqual(0);

		uiGraphAddFn(segment);
		uiFullGraph = LuxUi.getUiFullGraph();
		uiGraph = LuxUi.getUiGraph();
	}

	it("should add and clear a graph with no filter", function() {
		LuxUi.setFilterOrphanedTopics(false);
		clearGraphAndAddSegment(graphSegment2);
		expect(uiFullGraph.nodes.length).toEqual(4);
		expect(uiFullGraph.links.length).toEqual(2);
	});

	it("filter orphans and /rosout with an orphan filter set", function() {
		LuxUi.setFilterOrphanedTopics(true);
		//LuxUi.setFilterDebugNodes(false);
		clearGraphAndAddSegment(graphSegment2);
		expect(uiFullGraph.nodes.length).toEqual(4);
		expect(uiFullGraph.links.length).toEqual(2);
		console.log(LuxUi.getFilterDebugNodes());
		console.log("===== result");
		console.log(uiGraph);
		expect(uiGraph.nodes.length).toEqual(2);
		expect(uiGraph.links.length).toEqual(1);
	});

	it("remove quiet nodes and /rosout with a quiet node filter set", function() {
		LuxUi.setFilterOrphanedTopics(false);
		LuxUi.setFilterDebugNodes(true);
		clearGraphAndAddSegment(graphSegment2);
		expect(uiFullGraph.nodes.length).toEqual(4);
		expect(uiFullGraph.links.length).toEqual(2);
		expect(uiGraph.nodes.length).toEqual(2);
		expect(uiGraph.links.length).toEqual(0);
	});

	it("should delete nodes", function() {
		LuxUi.setFilterOrphanedTopics(false);
		LuxUi.setFilterDebugNodes(true);
		clearGraphAndAddSegment(graphSegment2);
		expect(uiGraph.nodes.length).toEqual(2);
		uiGraphDelFn({nodes: ['/baz']});
		uiGraph = LuxUi.getUiGraph();
		expect(uiGraph.nodes[1].name).toEqual("/baz");
		expect(uiGraph.nodes[1].dying).toEqual(true);
	});

	it("collapses piles", function() {
		clearGraphAndAddSegment(graphSegment3);
		expect(uiGraph.nodes.length).toEqual(7);
		LuxUi.addPileUpLevel(' /root/next_level');
		LuxUi.uiGraphUpdate();
		uiGraph = LuxUi.getUiGraph();
		expect(uiGraph.nodes.length).toEqual(7);
	});

	it("collapses piles to a particular node", function() {
		LuxUi.setFilterOrphanedTopics(false);
		LuxUi.setFilterDebugNodes(false);
		clearGraphAndAddSegment(graphSegment3);
		expect(isNodeInGraph(uiGraph, " /root/next_level/baz")).toEqual(false);
		expect(uiGraph.nodes.length).toEqual(7);

		expect(uiGraph.links.length).toEqual(5);

		var targetNodeName = ' /root/next_level/bar',
			level = ' /root/next_level',
			pileName = level + '/...';
		LuxUi.addPileUpLevel(level, targetNodeName);
		LuxUi.uiGraphUpdate();
		uiGraph = LuxUi.getUiGraph();
		expect(uiGraph.nodes.length).toEqual(7);

		// Check only one node left
		var found = false;
		for (var i=0; i<uiGraph.nodes.length; i++) {
			if (uiGraph.nodes[i]['name']===pileName) {
				expect(uiGraph.nodes[i]['rtype']).toEqual('pileOfTopics');
				expect(uiGraph.nodes[i]['name']).toEqual(pileName);
				found = true;
			}
		}
		expect(found).toEqual(false);
		expect(isNodeInGraph(uiGraph, " /root/next_level/foo")).toEqual(false);
		expect(isNodeInGraph(uiGraph, " /root/next_level/bar")).toEqual(false);
		expect(isNodeInGraph(uiGraph, " /root/next_level/baz")).toEqual(false);
		expect(isNodeInGraph(uiGraph, " /root/next_level/...")).toEqual(false);

		// Check links consolidated
		expect(uiGraph.links.length).toEqual(5);
	});

	it("doesn't collapses pile if only one node", function() {
		graphSegment3.nodes.splice(4, 2);

		LuxUi.setFilterOrphanedTopics(false);
		LuxUi.setFilterDebugNodes(false);
		clearGraphAndAddSegment(graphSegment3);
		var targetNodeName = ' /root/next_level/bar',
			level = ' /root/next_level',
			pileName = level + '/...';
		LuxUi.addPileUpLevel(level, targetNodeName);
		LuxUi.uiGraphUpdate();
		uiGraph = LuxUi.getUiGraph();
		expect(isNodeInGraph(uiGraph, " /root/next_level/foo")).toEqual(true);
		expect(isNodeInGraph(uiGraph, " /root/next_level/bar")).toEqual(false);
		expect(isNodeInGraph(uiGraph, " /root/next_level/baz")).toEqual(false);
		expect(isNodeInGraph(uiGraph, " /root/next_level/...")).toEqual(false);
	});

	function logNodesAndLinks() {
		console.log("//////////////////////////");
		console.log("nodes");
		for (var i=0; i<uiGraph.nodes.length; i++) {
			console.log(uiGraph.nodes[i]);
		}
		console.log("links");
		for (var i=0; i<uiGraph.links.length; i++) {
			console.log(uiGraph.links[i]);
		}
	}

	function isNodeInGraph(graph, nodeName) {
		found = false;
		for (var i=0; i<graph.nodes.length; i++) {
			if (graph.nodes[i]['name'] === nodeName) {
				found = true;
			}
		}
		return found;
	}


});