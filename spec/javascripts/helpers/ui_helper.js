var uiTest = (function() {
	var module = {};

	var uiToProtocolInterpretMessage = null;
	var dummyProtocol = {
 		open: function(interpretMessage) {
 			uiToProtocolInterpretMessage = interpretMessage;
		}
	};	

	module.uiGraphAddFn=null;
	module.uiGraphDelFn=null;
	module.uiGraphUpdFn=null;
	module.uiGraphClearFn=null;
	var dummyProtocolToUiLayer = {
 		open: function(uiGraphAdd, uiGraphDel, uiGraphUpd, uiGraphClear) {
 			module.uiGraphAddFn = uiGraphAdd;
 			module.uiGraphDelFn = uiGraphDel;
 			module.uiGraphUpdFn = uiGraphUpd;
 			module.uiGraphClearFn = uiGraphClear;
 		}	
	};

	module.uiGraph=null;
	module.uiFullGraph=null;

	LuxUi.open(dummyProtocolToUiLayer);

	var clearGraphAndAddSegment = function(segment) {
		module.uiGraphClearFn();
		module.uiFullGraph = LuxUi.getUiFullGraph();
		expect(module.uiFullGraph.nodes.length).toEqual(0);

		module.uiGraphAddFn(segment);
		module.uiFullGraph = LuxUi.getUiFullGraph();
		module.uiGraph = LuxUi.getUiGraph();
	};
	module.clearGraphAndAddSegment = clearGraphAndAddSegment;
	return module;
})();
