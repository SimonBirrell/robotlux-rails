var TopicViewer = (function() { 
    	"use strict"; 

    	var module = {}; 
    	var D3 = null,
    		Svg = null,
    		Margin = null,
    		CircleRadius = null,
            Renderer = null;

        var VIEWS = ['genericTopicView', 'two3DGraphsTopicView', 'test3DTopicView','diffRobotControlTopicView'];
        var NUMBER_GENERIC_VIEWS = 1,
            SHRINK_DURATION = null;
        var ViewsAvailable = {
            "geometry_msgs/Twist" : ['diffRobotControlTopicView'],
            //"tf2_msgs/TFMessage" : ['two3DGraphsTopicView', 'test3DTopicView'],
            //"sensor_msgs/foo" : ['two3DGraphsTopicView', 'test3DTopicView'],
            "sensor_msgs/foo" : ['test3DTopicView'],
            "sensor_msgs/JointState" : ['two3DGraphsTopicView', 'test3DTopicView'],
            "sensor_msgs/Imu" : ['imuSimpleTopicView'],
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
    		this.messageType = (topicNode.data) ? topicNode.data.type : "";
    		this.numberOfViews = NUMBER_GENERIC_VIEWS;
            this.currentView = null;
            this.nextView = null;
            this.viewsSetUp = false;

            console.log(topicNode.name + " -> " + this.messageType);
			setUpViews(this);
    	};

    	function setUpViews(that) {
            var viewSpec;
            if ((!that.viewsSetUp)&&(that.messageType)) {
                console.log("setting up views for");
                console.log(that.messageType);
                that.views = [];
                viewSpec = {node: that.topicNode};
                var genericView = TopicViewer['genericTopicView'](viewSpec);
                that.views.push(genericView);

                var availableViews = [];
                if (that.messageType in ViewsAvailable) {
                    availableViews = ViewsAvailable[that.messageType];
                    for (var i=0; i<availableViews.length; i++) {
                        // Call constructor (no 'new')
                        var view = TopicViewer[availableViews[i]](viewSpec);
                        that.views.push(view);
                    }
                } else {
                    console.log("UNKNOWN TOPIC TYPE: " + that.messageType);
                }
                that.numberOfViews = NUMBER_GENERIC_VIEWS + availableViews.length;
                that.currentViewIndex = that.views.length -1;
                that.nextViewIndex = 0;
                setViewsFromIndexes(that);
                that.viewsSetUp = true;
            } else {
                console.log("NOT setting up views for");
                console.log(that);
            }
    	}

        module.TopicViewer.prototype.rotateViewLeft = function() {
            if (this.currentView) {
                return rotateView(this, -1);
            }
            console.log("WARNING: Can't rotate left a view that isn't set up");
            console.log(this);
        };

        module.TopicViewer.prototype.rotateViewRight = function() {
            if (this.currentView) {
                return rotateView(this, +1);
            }    
            console.log("WARNING: Can't rotate right a view that isn't set up");
            console.log(this);
        };

        module.TopicViewer.prototype.update = function(node) {
            if (this.currentView) {
                this.currentView.update(node);
            } else {
                setUpViews(this);  
            }
        };

        module.TopicViewer.prototype.animateAndRender = function() {
            if (this.currentView) {
                this.currentView.animateAndRender();
            }
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
            return uiGraph.nodes.filter(function(node){
                                            return  ((node.rtype==='topic') &&
                                                     (node.viewer) &&
                                                     (node.viewer.currentView) &&
                                                     (node.viewer.currentView.viewType===viewType)
                                                    );
                                            });
        }

        function topicName(d) {
            return d.name;
        }

        function getVelocitiesFromMessage(message) {
            var linear, angular,
                linearX = 0.0, linearY = 0.0, linearZ = 0.0,
                angularX = 0.0, angularY = 0.0, angularZ = 0.0;

            if (message) {
                angular = message.angular;
                linear = message.linear;
                if (linear) {
                    linearX = linear.x || 0.0;
                    linearY = linear.y || 0.0;
                    linearZ = linear.z || 0.0;
                }
                if (angular) {
                    angularX = angular.x || 0.0;
                    angularY = angular.y || 0.0;
                    angularZ = angular.z || 0.0;
                }
            }    

            return {
                linear: {x: linearX, y: linearY, z: linearZ},
                angular: {x: angularX, y: angularY, z: angularZ}
            };
        }

        function twoDecimalPlaces(number) {
            return Number(number).toFixed(2);
        }

        function keyPressedForNodeUp(node) {
            return kd.K.isDown();
        }

        function keyPressedForNodeDown(node) {
            return kd.M.isDown();
        }

        function keyPressedForNodeLeft(node) {
            return kd.Z.isDown();
        }

        function keyPressedForNodeRight(node) {
            return kd.X.isDown();
        }

        // TODO: Make this a full copy
        function copyUpdateToNode(updateNode, targetNode) {
            targetNode.data = updateNode.data;
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
        //  whenever an update is received from the server.
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

            var animateAndRender = function() {
            };
            that.animateAndRender = animateAndRender;

            var textLine = function(d, index) {
                var messageType = d.data.type || "Generic View";
                return ((index===0)) ? messageType : " ";
            };
            that.textLine = textLine;

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
                            ((d.viewer.currentView.viewType==="genericTopicView") || (d.viewer.currentView.viewType==="diffRobotControlTopicView"))
                            ) {
                        var list = [];
                        for (var i=0; i<NUMBER_TOPIC_DISPLAY_TEXT_LINES; i++) {
                            list.push({name: d.name, index: i, message_type: d.message_type, node: d});
                        }
                        return list; 
                    }

                    return [];
                })
                ;

            topicDisplay.enter()
                .append("text")
                    .attr("opacity", 0.0)
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

            topicDisplay
                    .text(function(d) {
                        var textLine = d.node.viewer.currentView.textLine(d.node, d.index);
                        return textLine;
                    })
    

            topicDisplay.exit().remove();   
        };

        module.genericTopicView.tick = function() {
        };

        module.genericTopicView.animateAndRender = function() {
            //console.log("NEW genericTopicView.animateAndRender");
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

            //console.log("*************");
            //console.log(that);

            var setScene = function(canvas, renderWidth, renderHeight) {

                function init() {
                    console.log("3D init()");
                    that.scene = new THREE.Scene();

                    that.camera = new THREE.PerspectiveCamera( 30, renderWidth / renderHeight, 1, 10000 );
                    that.camera.position.z = 1000;

                    //alert("Calling buildScene from setScene");
                    that.buildScene(that.scene, that.camera);

                    that.renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true});
                    that.renderer.setSize( renderWidth, renderHeight );
                    that.renderer.setClearColor( 0xbcc8da, 0 );
                }

                function animate() {
                    requestAnimationFrame( animate );
                    that.animate();
                    that.renderer.render( that.scene, that.camera );
                }

                init();

            }
            that.setScene = setScene;

            var update = function(node) {
                copyUpdateToNode(node, spec.node)
            };
            that.update = update;

            var render3D = function() {
                that.renderer.render( that.scene, that.camera );
            };
            that.render3D = render3D;

            var setTopicWindowSize = function(canvas, renderWidth, renderHeight) {
                that.renderer.setSize( renderWidth, renderHeight );
            };
            that.setTopicWindowSize = setTopicWindowSize;

            return that;            
        };

        module.threeDTopicView.render = function(selection, uiGraph, viewType) {
            console.log("threeDTopicView.render for");
            console.log(viewType);
            var topicWidth = CircleRadius * 1.41421356237;
            var topicCanvas = D3.select("#canvas-layer")
                                .selectAll(".topic-canvas-" + viewType)
                                    .data(nodeTopicsWithCurrentViewType(uiGraph, viewType), topicName);

            console.log(nodeTopicsWithCurrentViewType(uiGraph, viewType));
            //console.log(D3.select("#canvas-layer")[0].parentNode);

            topicCanvas.enter() 
                .append("canvas")
                .attr("id", function(d) {console.log("Adding canvas " + viewType);return "canvas-id";})
                .classed("topic-canvas-" + viewType + " topic-canvas", true)
                .attr("opacity", 0.0)
                .attr("targetSize", function(d) {
                    console.log("topic.enter()");
                    var targetSize = canvasWidth(d);
                    d.targetSize = targetSize;
                    d.viewer.currentView.setScene(this, targetSize, targetSize);
                    return targetSize;
                })    
               ;

            topicCanvas
                .attr("dummy", function(d) {
                    console.log("topic update");
                    if (typeof d.targetSize === 'undefined') {
                        d.targetSize = canvasWidth(d);
                    }
                    d.viewer.currentView.setTopicWindowSize(this, d.targetSize, d.targetSize);
                    return d.targetSize;
                })    
                .transition()
                .attr("targetSize", function(d) {
                    var targetSize = canvasWidth(d);
                    d.viewer.currentView.setTopicWindowSize(this, targetSize, targetSize);
                    return targetSize;
                })    
                .duration(SHRINK_DURATION)
                .attr("width", function(d) {return d.targetSize;})
                .attr("height", function(d) {return d.targetSize;})
                .tween("scaleCanvas", function(d, i) {
                    console.log(d);
                    var targetSize = d.targetSize,
                        startSize = 0;                        
                    console.log("START VALUES: " + startSize + " " + d.targetSize);    
                    return function(t) {
                        var currentSize = startSize + (targetSize - startSize) * t;
                        d.viewer.currentView.setTopicWindowSize(this, currentSize, currentSize);
                    };
                })
                ;

            topicCanvas.exit().remove(); 

            module.threeDTopicView.topicCanvas = topicCanvas;
            module.threeDTopicView.uiGraph = uiGraph;
            module.threeDTopicView.canvasLayer = D3.select("#canvas-layer");
        };

        module.threeDTopicView.tick = function(viewType) {
            module.threeDTopicView.canvasLayer
                .selectAll(".topic-canvas-" + viewType)
                .data(nodeTopicsWithCurrentViewType(module.threeDTopicView.uiGraph, viewType), topicName)
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
                mesh = null,
                light = null;

            var buildScene = function(scene, camera) {
                //alert('buildScene in test3DTopicView');
                geometry = new THREE.BoxGeometry( 200, 200, 200 );
                //material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
                material = new THREE.MeshPhongMaterial( { color: 0xff0000 } );
                mesh = new THREE.Mesh( geometry, material );
                scene.add(mesh);

                console.log(mesh);

                light = new THREE.PointLight( 0xffffff, 5, 600 );
                light.position.x = 300;
                light.position.y = 300;
                light.position.z = -100;
                scene.add(light);
                var light2 = new THREE.PointLight( 0xffffff, 10, 600 );
                light2.position.x = -300;
                light2.position.y = -300;
                light2.position.z = 300;
                scene.add(light2);

            };
            that.buildScene = buildScene;

            var animate = function() {
                mesh.rotation.x += 0.01;
                mesh.rotation.y += 0.02;
            };
            that.animate = animate;

            var animateAndRender = function() {
                //console.log("NEW test3DTopicView.animateAndRender");
                animate();
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            return that;            
        };

        module.test3DTopicView.render = function(selection, uiGraph) {
            //console.log("test3DTopicView.render");
            module.threeDTopicView.render(selection, uiGraph, "test3DTopicView");
        };

        module.test3DTopicView.tick = function() {
            module.threeDTopicView.tick("test3DTopicView");
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
                 //               alert('buildScene in two3DGraphsTopicView');

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

            var animateAndRender = function() {
                //console.log("NEW two3DGraphsTopicView.animateAndRender");
                //console.log(spec.node.data);
                //console.log(that);
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            return that;            
        }

        module.two3DGraphsTopicView.render = function(selection, uiGraph) {
            module.threeDTopicView.render(selection, uiGraph, "two3DGraphsTopicView");
        };

        module.two3DGraphsTopicView.tick = function() {
            module.threeDTopicView.tick("two3DGraphsTopicView");
        };

        // ==================== DiffRobotControlTopicView ================ 

        var ARROW_CONTROL_COLOR_HIGHLIGHT = 0x00ff00;
        var ARROW_CONTROL_COLOR_NORMAL = 0xffff00;
            var START_LINEAR_VELOCITY = 0.5,
                MAX_LINEAR_VELOCITY = 2.0,
                LINEAR_ACCELERATION = 0.75,
                START_ANGULAR_VELOCITY = 0.1,
                MAX_ANGULAR_VELOCITY = 0.6,
                ANGULAR_ACCELERATION = 0.25,
                CMD_VEL_MESSAGE_FREQUENCY = 10;

        function interactiveArrow(circle, x, y) {
            console.log("Create arrow");
            var dir = new THREE.Vector3(x, y, 0.0),
                origin = new THREE.Vector3( 0.0, 0.0, 0.0 ),
                length = 0.5,
                color = ARROW_CONTROL_COLOR_NORMAL,
                headLength = 0.1,
                headWidth = 0.1,
                arrow = new THREE.ArrowHelper(dir, origin, length, color, headLength, headWidth);

            arrow.position.z = 0.02;
            circle.add(arrow);

            return arrow;
        }

        module.diffRobotControlTopicView = function(spec, my) {
            var viewType = "diffRobotControlTopicView";
            var my = my || {};
            my.viewType = my.viewType || viewType;
            var that = module.threeDTopicView(spec, my);
            var lastTimestamp = null;
            var linearVelocity = 0.0,
                angularVelocity = 0.0,
                lastVelocities = {linear: {x:0, y:0, z:0}, angular: {x:0, y:0, z:0}};

            var buildScene = function(scene, camera) {
                //   alert("diffRobotControlTopicView.buildScene()")
                var grid, light;

                that.base = new THREE.Object3D();
                that.base.add(camera);
                that.base.rosPosition = {x: 0.0, y: 0.0, z: 0.1};
                that.base.rosRotation = {x: 0.0, y: 0.0, z: 0.0};

                // Camera
                that.camera = camera;
                that.camera.rotation.x = - Math.PI / 15;
                that.camera.position.set(0.0, 0.6, 2.0);

                var grid = new THREE.GridHelper (20, 1);
                scene.add (grid);

                var material = new THREE.MeshLambertMaterial({
                    color: 0x2222ff
                });

                var radius = 0.5;
                var segments = 32;

                // Create a floating circle
                var circleGeometry = new THREE.CircleGeometry( radius, segments );              
                var circle = new THREE.Mesh( circleGeometry, material );
                circle.rotation.x = - Math.PI / 2;

                // Add four interactive arrows
                that.forwardArrow = interactiveArrow(circle, 0.0, 1.0);
                that.backwardArrow = interactiveArrow(circle, 0.0, -1.0);
                that.leftArrow = interactiveArrow(circle, -1.0, 0.0);
                that.rightArrow = interactiveArrow(circle, 1.0, 0.0);   

                that.base.add(circle);

                // Add a light to the base
                light = new THREE.PointLight( 0xffffff, 1, 10 );
                light.position.x = 0.5;
                light.position.y = 0.5;
                that.base.add(light);

                scene.add(that.base);
            }
            that.buildScene = buildScene;

            var animate = function() {
            }
            that.animate = animate;

            function rosPositionToThreePosition(position) {
                return {x: -position.y, y: position.z, z: -position.x};
            }

            function setPositionFromRosPosition(object3D) {
                var pos = rosPositionToThreePosition(object3D.rosPosition),
                    rot = rosPositionToThreePosition(object3D.rosRotation);
                object3D.position.x = pos.x;
                object3D.position.y = pos.y;
                object3D.position.z = pos.z;
                object3D.rotation.x = rot.x;
                object3D.rotation.y = rot.y;
                object3D.rotation.z = rot.z;
            }

            var animateAndRender = function() {
                var node = spec.node,
                    messageFromServer = spec.node.data.message, deltaTime, now, pos,
                    messageForServer;

                function adjustVelocityIfKeyPressed(keyPressed, arrow, velocity, direction, start_velocity, acceleration, max_velocity) {
                    if (keyPressed(node)) {
                        arrow.setColor(ARROW_CONTROL_COLOR_HIGHLIGHT);
                        velocity = (velocity === 0.0) ? direction * start_velocity : velocity + (direction * acceleration * deltaTime);
                        if ((direction > 0)&&(velocity > max_velocity)) {
                            velocity = max_velocity;
                        }
                        if ((direction < 0)&&(velocity < -max_velocity)) {
                            velocity = -max_velocity;
                        }
                    } else {
                        arrow.setColor(ARROW_CONTROL_COLOR_NORMAL);                    
                        if (((velocity > 0.0)&&(direction>0)) || ((velocity < 0.0)&&(direction<0))) {
                            velocity = 0.0;
                        }
                    }   

                    return velocity;
                }

                function adjustLinearVelocityIfKeyPressed(keyPressed, arrow, direction) {
                    linearVelocity = adjustVelocityIfKeyPressed( keyPressed, arrow, 
                                                            linearVelocity, direction, START_LINEAR_VELOCITY, 
                                                            LINEAR_ACCELERATION, MAX_LINEAR_VELOCITY);
                }

                function adjustAngularVelocityIfKeyPressed(keyPressed, arrow, direction) {
                    angularVelocity = adjustVelocityIfKeyPressed( keyPressed, arrow, 
                                                            angularVelocity, direction, START_ANGULAR_VELOCITY, 
                                                            ANGULAR_ACCELERATION, MAX_ANGULAR_VELOCITY);
                }

                // Time since last iteration
                now = Date.now();
                if (!lastTimestamp) {
                    lastTimestamp = now - 10;
                }
                deltaTime = (now - lastTimestamp) /1000;

                // Check for key presses and send message to topic if necessary
                adjustLinearVelocityIfKeyPressed(keyPressedForNodeUp, that.forwardArrow, 1);                                            
                adjustLinearVelocityIfKeyPressed(keyPressedForNodeDown, that.backwardArrow, -1);                                            
                adjustAngularVelocityIfKeyPressed(keyPressedForNodeLeft, that.leftArrow, 1);                                            
                adjustAngularVelocityIfKeyPressed(keyPressedForNodeRight, that.rightArrow, -1); 
                messageForServer = createCmdVelMessageFromVelocities(linearVelocity, angularVelocity);
                if ((messageForServer !== that.lastMessageSent)) { 
                    sendRosMessageToTopicAtFrequency(node, messageForServer, CMD_VEL_MESSAGE_FREQUENCY);
                    that.lastMessageSent = messageForServer;
                }

                // Now update the position of the puck based on velocities received from 
                // server.
                if (messageFromServer) {
                    updateBasePosition(that.base, messageFromServer, deltaTime);
                    lastTimestamp = now;
                } 

                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            function createCmdVelMessageFromVelocities(linearVelocity, angularVelocity) {
                return {
                    "linear": {
                        "x": linearVelocity,
                        "y": 0.0,
                        "z": 0.0
                    },
                    "angular": {
                        "x": 0.0,
                        "y": 0.0,
                        "z": angularVelocity
                    }
                }; 
            }

            function updateBasePosition(base, message, deltaTime) {
                var distanceRosX, distanceRosY, distanceRosZ,
                    rotationRosX, rotationRosY, rotationRosZ,
                    linearX, linearY, linearZ, angularX, angularY, angularZ,
                    velocities = getVelocitiesFromMessage(message);
                linearX = velocities.linear.x;
                linearY = velocities.linear.y;
                linearZ = velocities.linear.z;
                angularX = velocities.angular.x;
                angularY = velocities.angular.y;
                angularZ = velocities.angular.z;

                distanceRosX = linearX * deltaTime;
                distanceRosY = linearY * deltaTime;
                distanceRosZ = linearZ * deltaTime;
                rotationRosX = angularX * deltaTime;
                rotationRosY = angularY * deltaTime;
                rotationRosZ = angularZ * deltaTime;

                // 3.x = -rosY  3.y = rosZ   3.z = -rosX
                // rotate base
                base.rotation.x += -rotationRosY;
                base.rotation.y += rotationRosZ;
                base.rotation.z += -rotationRosX;
                // move in base's frame of reference
                base.translateX(-distanceRosY);
                base.translateY(distanceRosZ);
                base.translateZ(-distanceRosX);
                // stay on floor grid
                base.position.x = (base.position.x % 5.0);
                base.position.z = (base.position.z % 5.0);
            }

            var textLine = function(d, index) {
                console.log("t");
                if (index===0) {
                    var message = d.data.message;
                    if (message) {
                        console.log(message);
                        var velocities = getVelocitiesFromMessage(message);

                        return "Forward Vel. " + twoDecimalPlaces(velocities.linear.x) + "    " + "Angular Vel. " + twoDecimalPlaces(velocities.angular.z);
                    }
                } else if (index === 1) {
                    return "Key controls: Z X K M";
                }
                return "";
            };
            that.textLine = textLine;

            return that;            
        }

        module.diffRobotControlTopicView.render = function(selection, uiGraph) {
            module.threeDTopicView.render(selection, uiGraph, "diffRobotControlTopicView");
        };

        module.diffRobotControlTopicView.tick = function() {
            module.threeDTopicView.tick("diffRobotControlTopicView");
        };

        function sendRosMessageToTopicAtFrequency(node, messageForServer, frequency) {
            var now = Date.now(),
                deltaTime;

            if (node.lastMessageSent) {
                // Subsequent messages to topic should be sent no more than specified
                // by frequency
                deltaTime = now - node.lastMessageSent;
                if (deltaTime >= 1000 / frequency) {
                    LuxUiToProtocol.sendRosTopicMessage(node.rosInstanceId, node.name, messageForServer);
                    node.lastMessageSent = now;
                }
            } else {
                // First message sent to this topic
                LuxUiToProtocol.sendRosTopicMessage(node.rosInstanceId, node.name, messageForServer);
                node.lastMessageSent = now;
            }
        }

        // ==================== ImuSimpleTopicView ================ 


        // Remove for demo
        /*

        module.imuSimpleTopicView = function(spec, my) {
            var viewType = "imuSimpleTopicView";
            var my = my || {};
            my.viewType = my.viewType || viewType;
            var that = module.threeDTopicView(spec, my);

            var geometry = null,
                material = null,
                mesh = null,
                light = null;

            var buildScene = function(scene, camera) {
                //   alert("buildScene in imuSimpleTopicView");
                geometry = new THREE.BoxGeometry( 200, 200, 200 );
                //material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
                material = new THREE.MeshPhongMaterial( { color: 0xff0000 } );
                mesh = new THREE.Mesh( geometry, material );
                scene.add(mesh);

                light = new THREE.PointLight( 0xffffff, 5, 600 );
                light.position.x = 300;
                light.position.y = 300;
                light.position.z = -100;
                scene.add(light);
                var light2 = new THREE.PointLight( 0xffffff, 10, 600 );
                light2.position.x = -300;
                light2.position.y = -300;
                light2.position.z = 300;
                scene.add(light2);

            };
            that.buildScene = buildScene;

            var animate = function() {
            };
            that.animate = animate;

            var animateAndRender = function() {
                var node = spec.node,
                    messageFromServer = spec.node.data.message,
                    o, orientation, rosRotateX, rosRotateY, rosRotateZ;

                if (messageFromServer) {
                    o = messageFromServer.orientation;
                    orientation = new THREE.Quaternion(o.x, o.y, o.z, o.w);
                    mesh.setRotationFromQuaternion(orientation);
                    rosRotateX = mesh.rotation.x;
                    rosRotateY = mesh.rotation.y;
                    rosRotateZ = mesh.rotation.z;
                    // Convert from ROS rotations to three.js rotations
                    mesh.rotation.x = - rosRotateZ;
                    mesh.rotation.y = - rosRotateX;
                    mesh.rotation.z = - rosRotateY;
                }   

                //animate();
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            return that;            
        };

        module.test3DTopicView.render = function(selection, uiGraph) {
            console.log("imuSimpleTopicView.render");
            module.threeDTopicView.render(selection, uiGraph, "imuSimpleTopicView");
        };

        module.test3DTopicView.tick = function() {
            module.threeDTopicView.tick("imuSimpleTopicView");
        };

       */ 

    return module;

})();

