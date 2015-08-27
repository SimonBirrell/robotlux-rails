var TopicViewer = (function() { 
    	"use strict";

    	var module = {}; 
    	var D3 = null,
    		Svg = null,
    		Margin = null,
    		CircleRadius = null;

        //var VIEWS = ['Generic', 'Two3DGraphs', 'Test3DView'];
        var VIEWS = ['genericTopicView', 'two3DGraphsTopicView', 'test3DTopicView'];
        var NUMBER_GENERIC_VIEWS = 1,
            SHRINK_DURATION = null;
        var ViewsAvailable = {
            "tf2_msgs/TFMessage" : ['two3DGraphsTopicView', 'test3DTopicView']
            //"tf2_msgs/TFMessage" : ['Two3DGraphs', 'Test3DView']
        };

    	// "Class methods" called from UI.

    	module.setup = function(d3, svg, margin, circleRadius, shrinkDuration) {
    		D3 = d3;
    		Svg = svg;
    		Margin = margin;
    		CircleRadius = circleRadius;
            SHRINK_DURATION = shrinkDuration;
    	}; 
 
		module.zoomAndPan =	function () {
            module.tick();
		};	

    	module.tick = function() {
            for (var v=0; v<VIEWS.length; v++) {
                var viewName = VIEWS[v];
                this[viewName].tick();
            }
    	};

    	module.topicDisplay = function(selection, uiGraph) {
            this.renderTopicBackground(selection);
            this.renderCurrentViews(selection, uiGraph);
		};

        // Render the grey circles that back each topic
        module.renderTopicBackground = function(selection) {
        }

        // Render the views of all topics on the screen
        module.renderCurrentViews = function(selection, uiGraph) {
            for (var v=0; v<VIEWS.length; v++) {
                var viewName = VIEWS[v];
                this[viewName].render(selection, uiGraph);
            }
        };

    	//
    	// The TopicViewer "Class"
    	//

    	module.TopicViewer = function(topicNode) {
    		this.topicNode = topicNode;
    		this.messageType = topicNode['message_type'];
    		this.numberOfViews = NUMBER_GENERIC_VIEWS;
            this.currentView = null;
            this.nextView = null;

			setUpViews(this);
    	};

    	function setUpViews(self) {
    		self.views = [];
    		//var genericView = new TopicViewer['Generic']();
            var genericView = TopicViewer['genericTopicView']();
    		self.views.push(genericView);

            var availableViews = [];
    		if (self.messageType in ViewsAvailable) {
    			availableViews = ViewsAvailable[self.messageType];
    			for (var i=0; i<availableViews.length; i++) {
    				//var view = new TopicViewer[availableViews[i]]();
                    // Call constructor
                    var view = TopicViewer[availableViews[i]]();
    				self.views.push(view);
    			}
    		} else {
    			console.log("UNKNOWN TOPIC TYPE: " + self.messageType);
    		}
            self.numberOfViews = NUMBER_GENERIC_VIEWS + availableViews.length;
            self.currentViewIndex = self.views.length -1;
            self.nextViewIndex = 0;
            setViewsFromIndexes(self);
    	}

        module.TopicViewer.prototype.rotateViewLeft = function() {
            return rotateView(this, -1);
        };

        module.TopicViewer.prototype.rotateViewRight = function() {
            return rotateView(this, +1);
        };

        module.TopicViewer.prototype.update = function(node) {
            node.currentView.update(node);
        }

        function rotateView(self, offset) {
            var numberViews = self.views.length;
            if (numberViews > 1) {
                self.currentViewIndex = (self.currentViewIndex + offset + numberViews) % numberViews;
                self.nextViewIndex = (self.nextViewIndex + offset + numberViews) % numberViews;
                setViewsFromIndexes(self);
                updateUi();
                return true;
            } else {
                return false;
            }
        }

        function setViewsFromIndexes(self) {
            self.currentView = self.views[self.currentViewIndex];
            self.nextView = self.views[self.nextViewIndex];
        }

        function updateUi() {
            LuxUi.uiGraphUpdate();
        }

        // Test functions TODO: delete
    	module.TopicViewer.prototype.size = function() {
    		return this.topicNode.size;
    	}

    	module.TopicViewer.prototype.foo = function() {
    		return true;
    	};

    	//
    	// ================= VIEWS =====================
    	//

        // Utility Functions

        function topicNameToId(name, i) {
            name = name.replace(/\//g, '--');
            return 'topic-display-' + name.substring(2) + "-" + i.toString();
        }

        function messageTextArrayFromNode(node) {
            var header = node.data.type + " " + node.data.count,
                messageTextArray = [header],
                messageText = JSON.stringify(node.data.message);

            var messageSplitUp = messageText.split(",");

            messageTextArray = messageTextArray.concat(messageSplitUp);
            return messageTextArray;
        }

        function nodeTopicsWithCurrentViewType(uiGraph, viewType) {
            console.log("CURRENT VIEW");
            console.log(uiGraph.nodes);
            return uiGraph.nodes.filter(function(node){
                                            return  ((node.rtype==='topic')
                                                     &&
                                                     (node.viewer.currentView.viewType===viewType)
                                                    );
                                            });
        }

        function topicName(d) {
            return d.name;
        }

        // ===================================================== 
        //
        // New view inheritance system
        //
        // Functional inheritance used (see Crockford p52)
        //
        //  1. Each topicView has a constructor that is called directly (without new)
        //  e.g.
        //  var topicView = TopicViewer.genericTopicView(spec)
        //  where spec is a hash of options for the creation of the topicView
        //
        //  2. Each topicView has an "instance method" called update(), called
        // whenever an update is received from the server.
        //
        //  3. Each topicView type has a render() method that renders all the topicViews
        //  of that type in the uiGraph. This is sort of like a class method.
        //
        //  4. Each topicView type has a tick() method that is called from the D3/Cole tick()
        //  functions. This too is a class method equivalent.
        //
        // ===================================================== 

        // RESTART
        // ROS book p87
        // roslaunch rbx1_bringup fake_turtlebot.launch

        var topicView = function(spec, my) {

            var my = my || {};
            var that = {};

            that.viewType = my.viewType || "Abstract";

            that.update = function() {
                console.log("Unhandled update() function");
            };

            return that;
        }

        // ==================== GenericTopicView ================ 

        module.genericTopicView = function(spec, my) {
            var spec = spec || {};
            var my = my || {};
            my.viewType = my.viewType || "genericTopicView";
            var that = topicView(spec, my);

            var update = function(node) {
                var messageTextArray = messageTextArrayFromNode(node); 
                for (var l=0; l<messageTextArray.length; l++) { 
                    var topicDisplayTextId = '#' + topicNameToId(node.name, l);
                    $(topicDisplayTextId).text(messageTextArray[l]);
                }
            };
            that.update = update;

            return that;            
        };

        module.genericTopicView.render = function(selection, uiGraph) {
            var NUMBER_TOPIC_DISPLAY_TEXT_LINES = 15,
                TOPIC_DISPLAY_TOP = -100,
                TOPIC_DISPLAY_TEXT_HEIGHT = 14,
                TOPIC_DISPLAY_LEFT_MARGIN = -100,
                SHRINK_DURATION = 1000;

            var topicDisplay = selection.selectAll(".topic-display")
                .data(function(d) {
                    
                    if ((d.nodeFormat==='large')&&
                            (d.rtype==='topic')&&
                            (d.viewer.currentView.viewType==="genericTopicView")) {
                        var list = [];
                        for (var i=0; i<NUMBER_TOPIC_DISPLAY_TEXT_LINES; i++) {
                            list.push({name: d.name, index: i, message_type: d.message_type});
                        }
                        return list; 
                    }

                    return [];
                });

            topicDisplay.enter()
                .append("text")
                    .attr("opacity", 0.0)
                    .text(function(d) {
                        var messageType = d['message_type'] || "Generic View";
                        return ((d.index===0)) ? messageType : " ";
                    })
                    .attr("class", "topic-display")
                    .attr("id", function(d) {
                        return topicNameToId(d.name, d.index);
                    })
                    .attr("alignment-baseline", "middle")
                    .attr("stroke", "white")
                    .transition()
                    .duration(SHRINK_DURATION)
                    .attr("opacity", 1.0)
                    .attr("x", TOPIC_DISPLAY_LEFT_MARGIN)
                    .attr("y", function(d) {
                        return TOPIC_DISPLAY_TOP + d.index * TOPIC_DISPLAY_TEXT_HEIGHT;
                    });

            topicDisplay.exit().remove();   
        };

        module.genericTopicView.tick = function() {
        };

        // ==================== ThreeDTopicView ================ 

        // 3D utility functions
        function canvasWidth(d) {
            return (d.size + 1) * CircleRadius * 1.41421356237;
        }

        function getCanvasPosition(d) {
            var svgOffset = D3.transform(Svg.attr("transform"));
            var topicWidth = CircleRadius * 1.41421356237;
            var offset = (d.width/(CircleRadius*2)) * (2*CircleRadius - topicWidth) / 2;

            var x = d.x + svgOffset.translate[0] - d.width/2 + offset,
                y = d.y + svgOffset.translate[1] - d.height/2 + offset;

            return [x, y];
        }  

        module.threeDTopicView = function(spec, my) {
            var my = my || {};
            var that = topicView(spec, my);
            var scene, camera, renderer;

            var setScene = function(canvas, renderWidth, renderHeight) {

                function init() {

                    if(!scene) {
                        scene = new THREE.Scene();

                        camera = new THREE.PerspectiveCamera( 30, renderWidth / renderHeight, 1, 10000 );
                        camera.position.z = 1000;

                        that.buildScene(scene, camera);

                        renderer = new THREE.WebGLRenderer({canvas: canvas});
                    }
                    renderer.setSize( renderWidth, renderHeight );
                }

                function animate() {
                    requestAnimationFrame( animate );
                    that.animate();
                    renderer.render( scene, camera );
                }

                init();
                animate();

            }
            that.setScene = setScene;

            var update = function() {
            }
            that.update = update;

            return that;            
        };

        module.threeDTopicView.render = function(selection, uiGraph, viewType) {
            console.log("threeDTopicView.render");
            var topicWidth = CircleRadius * 1.41421356237;
            var topicCanvas = D3.select("#canvas-layer")
                                .selectAll(".topic-canvas-" + viewType)
                                    .data(nodeTopicsWithCurrentViewType(uiGraph, viewType), topicName);

            topicCanvas.enter() 
                .append("canvas")
                .attr("id", function(d) {console.log("Adding canvas " + viewType);return "canvas-id";})
                .classed("topic-canvas-" + viewType + " topic-canvas", true)
                .attr("opacity", 0.0)
               ;

            topicCanvas
                .transition()
                .duration(SHRINK_DURATION)
                .attr("targetSize", function(d) {
                    var targetSize = canvasWidth(d);
                    d.targetSize = targetSize;
                    d.viewer.currentView.setScene(this, targetSize, targetSize);
                    return targetSize;
                })    
                .attr("width", function(d) {return d.targetSize;})
                .attr("height", function(d) {return d.targetSize;})
                ;

            topicCanvas.exit().remove(); 

            module.threeDTopicView.topicCanvas = topicCanvas;
        };

        module.threeDTopicView.tick = function() {
            module.threeDTopicView.topicCanvas
                .attr("style", function(d) {
                    var position = getCanvasPosition(d),
                    x = position[0],
                    y = position[1];
                    
                    return "top:" + y.toString() + "px; left:" + x.toString() + "px;";
                })
                .attr("width", function(d) {
                    var currentSize = D3.select(this).attr("targetSize");
                    return currentSize;
                })
                .attr("height", function(d) {
                    var currentSize = D3.select(this).attr("targetSize");
                    return currentSize;
                })
                ;
        };

        // ==================== test3DTopicView ================ 

        module.test3DTopicView = function(spec, my) {
            var viewType = "test3DTopicView";
            var my = my || {};
            my.viewType = my.viewType || viewType;
            var that = module.threeDTopicView(spec, my);

            var geometry = null,
                material = null,
                mesh = null;

            var buildScene = function(scene, camera) {
                geometry = new THREE.BoxGeometry( 200, 200, 200 );
                material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

                mesh = new THREE.Mesh( geometry, material );
                scene.add(mesh);
            };
            that.buildScene = buildScene;

            var animate = function() {
                mesh.rotation.x += 0.01;
                mesh.rotation.y += 0.02;
            };
            that.animate = animate;

            return that;            
        };

        module.test3DTopicView.render = function(selection, uiGraph) {
            module.threeDTopicView.render(selection, uiGraph, "test3DTopicView");
        };

        module.test3DTopicView.tick = function() {
            module.threeDTopicView.tick();
        };

       // ==================== Two3DGraphsTopicView ================ 

        module.two3DGraphsTopicView = function(spec, my) {
            var viewType = "two3DGraphsTopicView";
            var my = my || {};
            my.viewType = my.viewType || viewType;
            var that = module.threeDTopicView(spec, my);

            function buildAxes( length ) {
                var axes = new THREE.Object3D();

                axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), 0xFF0000, false ) ); // +X
                axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), 0xFF0000, true) ); // -X
                axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), 0x00FF00, false ) ); // +Y
                axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), 0x00FF00, true ) ); // -Y
                axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), 0x0000FF, false ) ); // +Z
                axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), 0x0000FF, true ) ); // -Z

                return axes;
            }

            function buildAxis( src, dst, colorHex, dashed ) {
                var geom = new THREE.Geometry(), mat; 

                if(dashed) {
                    mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
                } else {
                    mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
                }

                geom.vertices.push( src.clone() );
                geom.vertices.push( dst.clone() );
                geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

                var axis = new THREE.Line( geom, mat, THREE.LinePieces );

                return axis;
            }

            var buildScene = function(scene, camera) {
                camera.position.x = 100;
                camera.position.y = 100;
                camera.position.z = 1000;

                var axes = buildAxes( 1000 );
                scene.add( axes );
            }
            that.buildScene = buildScene;

            var animate = function() {
                //mesh.rotation.x += 0.01;
                //mesh.rotation.y += 0.02;

                //  controls.update();                
            }
            that.animate = animate;

            return that;            
        }

        module.two3DGraphsTopicView.render = function(selection, uiGraph) {
            module.threeDTopicView.render(selection, uiGraph, "two3DGraphsTopicView");
        };

        module.two3DGraphsTopicView.tick = function() {
            module.threeDTopicView.tick();
        };


    return module;

})();

