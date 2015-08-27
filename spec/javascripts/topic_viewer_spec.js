describe("Topic Viewer", function() {

	it("should create topic views with correct name", function() {
		var topicView = TopicViewer.genericTopicView();
		expect(topicView.viewType).toEqual("genericTopicView");

		var topicView = TopicViewer.test3DTopicView();
		expect(topicView.viewType).toEqual("test3DTopicView");

		var topicView = TopicViewer.two3DGraphsTopicView();
		expect(topicView.viewType).toEqual("two3DGraphsTopicView");

	});

	it("generic topic should be created with default view", function() {
		var topicNode = {size: 3};
		topicViewer = new TopicViewer.TopicViewer(topicNode);

		expect(topicViewer.topicNode).toEqual(topicNode);
		expect(topicViewer.numberOfViews).toEqual(1);

		expect(topicViewer.size()).toEqual(3);
	});

	describe("tf2_msgs/TFMessage", function() {

		beforeEach(function() {
			var topicNode = {message_type: 'tf2_msgs/TFMessage'};
			topicViewer = new TopicViewer.TopicViewer(topicNode);
		});

		it("should be created with 2 views", function() {
			expect(topicViewer.numberOfViews).toEqual(3);
			expect(topicViewer.views.length).toEqual(3);
			expect(topicViewer.views[0].viewType).toEqual('genericTopicView');
			expect(topicViewer.views[1].viewType).toEqual('two3DGraphsTopicView');
		});

		it("should be possible to switch between 3 views", function() {
			expect(topicViewer.currentView).toEqual(topicViewer.views[2]);
			expect(topicViewer.nextView).toEqual(topicViewer.views[0]);

			var rotatedOk = topicViewer.rotateViewLeft();
			expect(rotatedOk).toEqual(true);
			expect(topicViewer.currentView).toEqual(topicViewer.views[1]);
			expect(topicViewer.nextView).toEqual(topicViewer.views[2]);

			var rotatedOk = topicViewer.rotateViewRight();
			expect(rotatedOk).toEqual(true);
			expect(topicViewer.currentView).toEqual(topicViewer.views[2]);
			expect(topicViewer.nextView).toEqual(topicViewer.views[0]);
		});

	});

});