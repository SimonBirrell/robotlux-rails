
describe("UI to protocol layer", function() {

	var uiToProtocolInterpretMessage = null;

		var rosInstanceGraphMessage = JSON.stringify({	
									'mtype':'rosInstanceGraph',
									'mbody':{	
												'rosInstance':'org_id 0 ros_instance_base',
												'graph':{
													'n /rosout':{},
													't  /rosout_agg':{},
													't  /rosout':{},
													'n /map_odom_broadcaster':{},
													'n /map_server':{},
													'n /move_base':{},
													'n /fake_localization':{},
													't  /move_base_simple/goal':{},
													't  /particlecloud':{},
													't  /initialpose':{},
													't  /move_base/current_goal':{},
													't  /move_base/goal':{},
													't  /base_pose_ground_truth':{},
													't  /tf_static':{},
													't  /amcl_pose':{},
													't  /map':{},
													't  /map_metadata':{},
													't  /tf':{},
													't  /cmd_vel':{},
													'e /map_odom_broadcaster |  /rosout':{'label':''},
													'e /map_odom_broadcaster |  /tf':{'label':''},
													'e /move_base |  /rosout':{'label':''},
													'e /fake_localization |  /rosout':{'label':''},
													'e /fake_localization |  /tf':{'label':''},
													'e /map_server |  /rosout':{'label':''},
													'e  /tf | /fake_localization':{'label':''},
													'e  /tf | /move_base':{'label':''},
													'e  /rosout | /rosout':{'label':''}
												}
											}
										});

	var dummyProtocol = {

 		open: function(interpretMessage) {
 			uiToProtocolInterpretMessage = interpretMessage;
		}

	};	

	var dummyUiGraphAdd=null, dummyUiGraphClear=null, dummyUiGraphDel=null, dummyUiGraphUpd=null;
	var serverGraph = null;

	beforeEach(function(){
		dummyUiGraphAdd = jasmine.createSpy('dummyUiGraphAdd');
		dummyUiGraphClear = jasmine.createSpy('dummyUiGraphClear');								
		dummyUiGraphUpd = jasmine.createSpy('dummyUiGraphUpd');								
		dummyUiGraphDel = jasmine.createSpy('dummyUiGraphDel');	
		LuxUiToProtocol.setProtocol(dummyProtocol);		
					
		LuxUiToProtocol.open(dummyUiGraphAdd, dummyUiGraphDel, dummyUiGraphUpd, dummyUiGraphClear);


	});


	describe("sets up a new graph on receiving rosInstanceGraph", function() {
		var setUpGraph = function() {
			// Initial graph
			uiToProtocolInterpretMessage(rosInstanceGraphMessage);
			serverGraph = LuxUiToProtocol.getServerGraph();

			expect(serverGraph['n /rosout']).toEqual({});
			expect(serverGraph['t  /cmd_vel']).toEqual({});
			expect(serverGraph['e /map_odom_broadcaster |  /rosout']).toEqual({'label':''});
			expect(dummyUiGraphClear.calls.count()).toEqual(1);
			expect(dummyUiGraphAdd.calls.count()).toEqual(1); 
			var uiGraph = dummyUiGraphAdd.calls.argsFor(0)[0];
			expect(uiGraph.nodes).toEqual(jasmine.arrayContaining([{ name: ' /tf', rtype: 'topic', group: 1, width: 64, height: 64, x: 0, y: 0, data: { } }]));
			expect(uiGraph.nodes).toEqual(jasmine.arrayContaining([{ name: '/move_base', rtype: 'node', group: 1, width: 64, height: 64, x: 0, y: 0, data: { } }]));
			expect(uiGraph.links).toEqual(jasmine.arrayContaining([{ sourceName: '/fake_localization', targetName: ' /tf', data: {label: ''}}]));	
			return uiGraph;
		};

		it("with no filter", function() {
			var uiGraph = setUpGraph();
			expect(uiGraph.nodes.length).toEqual(19);
			expect(uiGraph.links.length).toEqual(9);
		});

	});

	describe("with no filter", function() {

		it("adds new nodes to an existing graph", function() {
			// Initial graph
			uiToProtocolInterpretMessage(rosInstanceGraphMessage);
			serverGraph = LuxUiToProtocol.getServerGraph();

			expect(Object.keys(serverGraph).length).toEqual(28);
			var uiGraph = dummyUiGraphAdd.calls.argsFor(0)[0];
			expect(uiGraph.nodes.length).toEqual(19);
			expect(uiGraph.links.length).toEqual(9);

			// Add new nodes
			var newGraphMessage = JSON.stringify({	
										'mtype':'rosInstanceGraphAdd',
										'mbody':{	
													'rosInstance':'org_id 0 ros_instance_base',
													'graph':{
														'n /foo':{},
														't /bar':{},
														'e /foo | /cmd_vel':{'baz':'boo'}
													}
												}
										});
			uiToProtocolInterpretMessage(newGraphMessage);
											
			// Check extended server graph
			serverGraph = LuxUiToProtocol.getServerGraph();
			expect(serverGraph['n /foo']).toEqual({});
			expect(serverGraph['t /bar']).toEqual({});
			expect(serverGraph['e /foo | /cmd_vel']).toEqual({'baz':'boo'});
			uiGraph = dummyUiGraphAdd.calls.argsFor(1)[0];
			expect(uiGraph.nodes.length).toEqual(2);
			expect(uiGraph.links.length).toEqual(1);

		});

		it("update nodes on an existing graph, ignoring ones that don't exist", function() {
			// Initial graph
			uiToProtocolInterpretMessage(rosInstanceGraphMessage);
			serverGraph = LuxUiToProtocol.getServerGraph();

			expect(Object.keys(serverGraph).length).toEqual(28);
			var uiGraph = dummyUiGraphAdd.calls.argsFor(0)[0];
			expect(uiGraph.nodes.length).toEqual(19);
			expect(uiGraph.links.length).toEqual(9);

			// Add new nodes
			var newGraphMessage = JSON.stringify({	
										'mtype':'rosInstanceGraphUpd',
										'mbody':{	
													'rosInstance':'org_id 0 ros_instance_base',
													'graph':[
														['n /foo', {'hello': 'world'}],
														['t  /bar', {}],
														['t  /cmd_vel', {'changedNode':true}],
														['e /foo | /cmd_vel', {'baz':'boo'}]
													]
												}
										});
			uiToProtocolInterpretMessage(newGraphMessage);
											
			// Check extended server graph
			serverGraph = LuxUiToProtocol.getServerGraph();
			expect(serverGraph['n /foo']).not.toBeDefined();
			expect(serverGraph['t  /bar']).not.toBeDefined();
			expect(serverGraph['e /foo | /cmd_vel']).not.toBeDefined();
			expect(serverGraph['t  /cmd_vel']).toEqual({'changedNode':true});

			// Check nodes passed to UI
			uiGraph = dummyUiGraphUpd.calls.argsFor(0)[0];
			expect(uiGraph.nodes.length).toEqual(1);
			expect(uiGraph.links.length).toEqual(0);

		});

		it("deletes nodes from existing graph, ignoring non-existant ones", function() {
			// Initial graph
			uiToProtocolInterpretMessage(rosInstanceGraphMessage);
			serverGraph = LuxUiToProtocol.getServerGraph();

			expect(Object.keys(serverGraph).length).toEqual(28);
			var uiGraph = dummyUiGraphAdd.calls.argsFor(0)[0];
			expect(uiGraph.nodes.length).toEqual(19);
			expect(uiGraph.links.length).toEqual(9);

			expect(serverGraph['n /map_server']).toBeDefined();
			expect(serverGraph['t  /map']).toBeDefined();

			// Delete nodes
			// TODO: Should include rosInstance for Add, Upd, Del on Agent and server!
			var delGraphMessage = JSON.stringify({	
										'mtype':'rosInstanceGraphDel',
										'mbody': {
											'rosInstance': 'instance',
											'graph': [
												'n /map_server',
												't  /map',
												'e /fake_localization |  /tf'
												]
											}
									});

			uiToProtocolInterpretMessage(delGraphMessage);

			// Check server graph
			expect(serverGraph['n /map_server']).not.toBeDefined();
			expect(serverGraph['t  /map']).not.toBeDefined();

			// Check nodes passed to UI
			nodesToDelete = dummyUiGraphDel.calls.argsFor(0)[0];
			console.log(nodesToDelete.links);
			expect(nodesToDelete).toEqual({nodes: ['/map_server',' /map'], 
												links: [
													{sourceName: '/fake_localization', targetName: ' /tf'}
												]});

		});
 

		it("should create a hierarchical machine graph", function() {
			var sampleServerMachineGraph = {
				 'machine_details' : {
	                'human_name' : 'Pi Robot',
	                'machine_type' : 'embedded'
	            },

				"package_tree": {
					"audio_capture": {
						"s":["foo"],
						"l":["bar1","bar2"],
						"n":[]
					},
					"rbx1_speech":{
						"s":[],
						"l":["foo","bar"],
						"n":["baz","boo"]
					}
				}
			};

			var convertedGraph = LuxUiToProtocol.serverMachineToUiMachine("m machine_id", sampleServerMachineGraph);
			expect(convertedGraph).toEqual({
				'name' : "Pi Robot",
				'node_type' : "embedded",
				'hostname': 'machine_id',
				'children' : [
					{
						'name' : 'audio_capture',
						'node_type' : 'package',
						'children' : [
							{'name' : 'bar1', 'node_type' : 'launch', 'package' : 'audio_capture'},
							{'name' : 'bar2', 'node_type' : 'launch', 'package' : 'audio_capture'},
							{'name' : 'foo', 'node_type' : 'script', 'package' : 'audio_capture'}
						]

					},
					{
						'name' : 'rbx1_speech',
						'node_type' : 'package',
						'children' : [
							{'name' : 'baz', 'node_type' : 'node', 'package' : 'rbx1_speech'},
							{'name' : 'boo', 'node_type' : 'node', 'package' : 'rbx1_speech'},
							{'name' : 'foo', 'node_type' : 'launch', 'package' : 'rbx1_speech'},
							{'name' : 'bar', 'node_type' : 'launch', 'package' : 'rbx1_speech'}
						]
					},
				]
			});
		});




	});




});

