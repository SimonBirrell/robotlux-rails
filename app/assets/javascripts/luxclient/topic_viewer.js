// The TopicViewer is responsible for displaying TopicViews.
// These are the little diagrams in the displayed ROS topics that represent
// and manipulate the underlying ROS messages.
//
// TODO: Split this into various separate files
//

var TopicViewer = (function() { 
    	"use strict"; 

    	var module = {}; 
    	var D3 = null,
    		Svg = null,
    		Margin = null,
    		CircleRadius = null,
            Renderer = null;

        var VIEW_TYPES = ['genericTopicView', 'two3DGraphsTopicView', 'test3DTopicView','diffRobotControlTopicView'];
        var NUMBER_GENERIC_VIEWS = 1,
            SHRINK_DURATION = null;

        // These are the ROS message types and the views we have available to render them.
        // All views can also be rendered as a GenericView    
        var ViewsAvailable = {
            "geometry_msgs/Twist" : ['diffRobotControlTopicView'],
            //"tf2_msgs/TFMessage" : ['two3DGraphsTopicView', 'test3DTopicView'],
            //"sensor_msgs/foo" : ['two3DGraphsTopicView', 'test3DTopicView'],
            "sensor_msgs/foo" : ['test3DTopicView'],            
            
            "sensor_msgs/JointState" : ['two3DGraphsTopicView', 'test3DTopicView'],
            "sensor_msgs/Imu" : ['imuSimpleTopicView'],
        };

    	// "Class methods" called from UI.
        // This is the TopicViewer API.

        // When setting up the TopicViewer, it will need various items
        // from the UI level.
        //
    	module.setup = function(d3, svg, margin, circleRadius, shrinkDuration) {
    		D3 = d3;
    		Svg = svg;
    		Margin = margin;
    		CircleRadius = circleRadius;
            SHRINK_DURATION = shrinkDuration;
    	}; 
 
        // This is called when d3 calls the zoomAndPan() callback in the UI
        //
		module.zoomAndPan =	function () {
            module.tick();
		};	

        // Called from graph.tick() in the UI module, once per tick of force layout simulation
        //
    	module.tick = function() {
            // Call tick() for each view_type
            for (var v=0; v<VIEW_TYPES.length; v++) {
                var viewTypeName = VIEW_TYPES[v];
                this[viewTypeName].tick();
            }
    	};

        // Called whenever graph is updated and force.start() called
        //  selection - The node selection
        //  uiGraph - graph to join with
        //
    	module.topicDisplay = function(selection, uiGraph) {
            this.renderTopicBackground(selection);
            this.updateCurrentViews(selection, uiGraph);
		};

        // Render the grey circles that back each topic
        //
        module.renderTopicBackground = function(selection) {
            // Nothing to do yet
        }

        // Update the views of all topics on the screen.
        // Called whenever UI graph is updated
        //
        module.updateCurrentViews = function(selection, uiGraph) {
            for (var v=0; v<VIEW_TYPES.length; v++) {
                var viewName = VIEW_TYPES[v];
                this[viewName].updateViews(selection, uiGraph);
            }
        };

    	//
    	// The TopicViewer "Class"
    	//

        // One TopicViewer is created for each topic that needs one.
        // It is responsible for rendering and swapping between the different
        // TopicViews that are available.
        //
    	module.TopicViewer = function(topicNode) {
    		this.topicNode = topicNode;
    		this.messageType = (topicNode.data) ? topicNode.data.type : "";
    		this.numberOfViews = NUMBER_GENERIC_VIEWS;
            this.currentView = null;
            this.nextView = null;
            this.viewsSetUp = false;

            // Set up the individual TopicViews, if we're ready
			setUpViews(this);
    	};

        // Set up the different views that can appear on this TopicViewer
        // There's always at least a generic view and others if we have an implemented
        // viewer for the topic message type.
        //  that - reference to the TopicViewer
        //
    	function setUpViews(that) {
            var viewSpec;

            // Set up only if ready and the message type is understood
            if ((!that.viewsSetUp)&&(that.messageType)) {
                that.views = [];
                viewSpec = {node: that.topicNode};
                // Always have a generic view available
                var genericView = TopicViewer['genericTopicView'](viewSpec);
                that.views.push(genericView);

                var availableViews = [];
                // Check ViewsAvailable list to see what we have for each messageType
                if (that.messageType in ViewsAvailable) {
                    availableViews = ViewsAvailable[that.messageType];
                    for (var i=0; i<availableViews.length; i++) {
                        // Call constructor (no 'new')
                        var view = TopicViewer[availableViews[i]](viewSpec);
                        that.views.push(view);
                    }
                } else {
                    //console.log("UNKNOWN TOPIC TYPE: " + that.messageType);
                }
                that.numberOfViews = NUMBER_GENERIC_VIEWS + availableViews.length;
                that.currentViewIndex = that.views.length -1;
                that.nextViewIndex = 0;
                setViewsFromIndexes(that);
                that.viewsSetUp = true;
            } else {
                //console.log("NOT setting up views for");
                //console.log(that);
            }
    	}

        // Call to switch to previous view on this TopicViewer
        //
        module.TopicViewer.prototype.rotateViewLeft = function() {
            if (this.currentView) {
                return rotateView(this, -1);
            }
            console.log("WARNING: Can't rotate left a view that isn't set up");
            console.log(this);
        };

        // Call to switch to next view on this TopicViewer
        //
        module.TopicViewer.prototype.rotateViewRight = function() {
            if (this.currentView) {
                return rotateView(this, +1);
            }    
            console.log("WARNING: Can't rotate right a view that isn't set up");
            console.log(this);
        };

        // Topic has been updated with a ROS message (probably from server). 
        // Update the current view.
        //  node - reference to the node on uiGraph
        //
        module.TopicViewer.prototype.update = function(node) {
            if (this.currentView) {
                this.currentView.update(node);
            } else {
                setUpViews(this);  
            }
        };

        // Called by d3 within requestAnimationFrame
        // Used to update any animations in the TopicView
        //
        module.TopicViewer.prototype.animateAndRender = function() {
            if (this.currentView) {
                this.currentView.animateAndRender();
            }
        }

        // Change the view currently diaplayed.
        //  topicViewer - the TopicViewer
        //  offset - index of new view to display
        //
        function rotateView(topicViewer, offset) {
            var numberViews = topicViewer.views.length;
            if (numberViews > 1) {
                topicViewer.currentViewIndex = (topicViewer.currentViewIndex + offset + numberViews) % numberViews;
                topicViewer.nextViewIndex = (topicViewer.nextViewIndex + offset + numberViews) % numberViews;
                setViewsFromIndexes(topicViewer);
                updateUi();
                return true;
            } else {
                return false;
            }
        }

        // currentViewIndex and nextViewIndex are indexes 0, 1, 2...n into the list
        // of views on this TopicViewer
        //
        function setViewsFromIndexes(self) {
            self.currentView = self.views[self.currentViewIndex];
            self.nextView = self.views[self.nextViewIndex];
        }

        // Trigger an overall UI update
        // A bit drastic. Currently used when we swap to a new view (might have new
        // canvas)
        // TODO Check how necessray this is.
        //
        function updateUi() {
            LuxUi.uiGraphUpdate();
        }

    	//
    	// ================= VIEWS =====================
    	//

        // Utility Functions

        // Calculate the CSS id for a text line in a topic
        //  name - topic name
        //  i - index of text line
        //
        function topicNameToId(name, i) {
            name = name.replace(/\//g, '--');
            return 'topic-display-' + name.substring(2) + "-" + i.toString();
        }

        // Convert the most recent ROS message in a topic into an array of text 
        // strings for display in the GenericView.
        //  node - reference to the node on uiGraph
        //
        function messageTextArrayFromNode(node) {
            var header = node.data.type + " " + node.data.count,
                messageTextArray = [header],
                messageText = JSON.stringify(node.data.message);

            var messageSplitUp = messageText.split(",");

            messageTextArray = messageTextArray.concat(messageSplitUp);
            return messageTextArray;
        }

        // Return an array of topics from a graph that match a given view type
        // Used for D3 joins
        //
        function nodeTopicsWithCurrentViewType(uiGraph, viewType) {
            return uiGraph.nodes.filter(function(node){
                                            return  ((node.rtype==='topic') &&
                                                     (node.viewer) &&
                                                     (node.viewer.currentView) &&
                                                     (node.viewer.currentView.viewType===viewType)
                                                    );
                                            });
        }

        // Get the topic name from the d3 node
        //  d - Reference to the node in uiGraph
        //
        function topicName(d) {
            return d.name;
        }

        // Extract the angular and linear velocities from a standard
        // ROS message representation and extract them to a more manageable object.
        //  message - reference to ROS message object on a node
        //
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

        // Round to 2 decimal places
        //
        function twoDecimalPlaces(number) {
            return Number(number).toFixed(2);
        }

        // Return true if UP key is pressed
        function keyPressedForNodeUp(node) {
            return kd.K.isDown();
        }

        // Return true if DOWN key is pressed
        function keyPressedForNodeDown(node) {
            return kd.M.isDown();
        }

        // Return true if LEFT key is pressed
        function keyPressedForNodeLeft(node) {
            return kd.Z.isDown();
        }

        // Return true if RIGHT key is pressed
        function keyPressedForNodeRight(node) {
            return kd.X.isDown();
        }

        // Copy ROS message to a target node
        //  updateNode - 
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
        //  3. Each topicView type has an updateViews() method that renders all the topicViews
        //  of that type in the uiGraph whenever the graph changes. This is sort of like a class method.
        //
        //  4. Each topicView type has a tick() method that is called from the D3/Cole tick()
        //  functions. This too is a class method equivalent.
        //
        //  Uses Douglas Crockford's convention for inheritance
        //
        // ===================================================== 

        var topicView = function(spec, my) {

            var my = my || {};
            var that = {};

            that.viewType = my.viewType || "Abstract";

            that.update = function() {
                console.log("Unhandled update() function");
            };

            // Called when topic window size is changed
            //
            that.setTopicWindowSize = function(canvas, renderWidth, renderHeight) {
            };

            return that;
        }

        // ==================== GenericTopicView ================ 

        // Generic topic views are displayed when we don't have a specific topic view for
        // a given ROS message type on a topic. 
        // Currently, the topic is left blank unless it is large, in which case we display
        // a set of text lines that show the (poorly formatted) ROS message
        //

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

        module.genericTopicView.updateViews = function(selection, uiGraph) {
            var NUMBER_TOPIC_DISPLAY_TEXT_LINES = 15,
                TOPIC_DISPLAY_TOP = -100,
                TOPIC_DISPLAY_TEXT_HEIGHT = 14,
                TOPIC_DISPLAY_LEFT_MARGIN = -100;

            // Join with a set of text lines that constitute the topic display.
            // Currently used in display for large generic topics.
            // For each matching topic, return an array of text lines.
            //
            var topicDisplayTextLines = selection.selectAll(".topic-display")
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

            // Fade in text on topic display 
            //
            topicDisplayTextLines.enter()
                .append("text")
                    .attr("opacity", 0.0)
                    .attr("class", "topic-display")
                    .attr("id", function(d) {
                        console.log("opacity = 0");
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

            // Display each text line
            //
            topicDisplayTextLines
                    .text(function(d) {
                        var textLine = d.node.viewer.currentView.textLine(d.node, d.index);
                        return textLine;
                    })
    
            // Remove text lines we're done with
            //
            topicDisplayTextLines.exit().remove();   
        };

        // Nothing to update during on graph tick
        //
        module.genericTopicView.tick = function() {
        };

        // Nothing to animate during an animation frame
        //
        module.genericTopicView.animateAndRender = function() {
        };


        // ==================== ThreeDTopicView ================ 

        // This is the abstract class for a topic that displays a 3D animation
        // The topic contains an HTML canvas on which WebGL renders a 3D display.
        //

        // 3D utility functions
        function canvasWidth(d) {
            return widthWithinCircleOfSize(d.size);
        }

        function previousCanvasWidth(d) {
            return widthWithinCircleOfSize(d.psize);
        }

        function widthWithinCircleOfSize(size) {
            return (size + 1) * CircleRadius * 1.41421356237;
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

            var setScene = function(canvas, renderWidth, renderHeight) {

                function init() {
                    console.log("3D init()");
                    that.scene = new THREE.Scene();

                    that.camera = new THREE.PerspectiveCamera( 30, renderWidth / renderHeight, 1, 10000 );
                    that.camera.position.z = 1000;

                    that.buildScene(that.scene, that.camera);

                    that.renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true});
                    that.rendererWidth = renderWidth;
                    that.rendererHeight = renderHeight;
                    that.renderer.setSize( renderWidth, renderHeight );
                    that.renderer.setClearColor( 0xbcc8da, 0 );
                    //that.renderer.setClearColor( 0xffffff, 1 );
                }

                init();

            }
            that.setScene = setScene;

            var update = function(node) {
                copyUpdateToNode(node, spec.node)
            };
            that.update = update; 

            // Called during each animation frame. Sets the size of the rendered view on the
            // canvas and then renders it.
            //
            var render3D = function() {
                that.renderer.setSize( that.rendererWidth, that.rendererHeight );
                that.renderer.render( that.scene, that.camera );
            };
            that.render3D = render3D;

            // Record the desired size of the canvas and render window
            //
            var setTopicWindowSize = function(canvas, renderWidth, renderHeight) {
                that.rendererWidth = renderWidth;
                that.rendererHeight = renderHeight;
            };
            that.setTopicWindowSize = setTopicWindowSize;

            return that;            
        };

        // Called from subclass when graph is updated. 
        //  selection - selection of nodes
        //  uiGraph - graph to join with
        //  viewType - defines subclass, ie. type of TopicView
        //
        module.threeDTopicView.updateViews = function(selection, uiGraph, viewType) {
            console.log("threeDTopicView.updateViews for");
            console.log(viewType);

            updateCanvasesForViewType(uiGraph, viewType);
        };

        // Add HTML canvases to 3D topics
        // Update their size when the containing topic is scaling
        // Remove them when topic disappears
        //
        // When scaling we need to scale both the width, height of the <canvas> element
        // and the size of the renderer
        //
        // TODO: There's an issue if you click a topic while another one is still scaling
        // To clearly see the problem, increase SHRINK_DURANTION in ui.js to 5000
        //
        function updateCanvasesForViewType(uiGraph, viewType) {
            // Canvas is a square within a circle
            var topicWidth = CircleRadius * 1.41421356237;

            // Canvases are kept in a separate part of the DOM from the SVG
            var topicCanvases = D3.select("#canvas-layer")
                                .selectAll(".topic-canvas-" + viewType)
                                    .data(nodeTopicsWithCurrentViewType(uiGraph, viewType), topicName);

            // Create new canvases for this viewType
            topicCanvases.enter() 
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

            
            function endScaling(d) {
                d.psize = d.size;
            } 
             

            // Update existing canvases of this viewType
            topicCanvases
                .attr("dummy", function(d) {
                    console.log("topic update " + canvasWidth(d) + " " + d.targetSize);
                    d.targetSize = canvasWidth(d);
                    return d.targetSize;
                })    
                .transition()
                // Define targetSize when transition starts
                .attr("targetSize", function(d) {
                    var targetSize = canvasWidth(d);
                    console.log("Set target size to " + targetSize);
                    return targetSize;
                })    
                .duration(SHRINK_DURATION)
                .tween("scaleCanvas", function(d, i) {
                    // invoked for each selected element in the transition when transition starts
                    // Set up start and target sizes. These are accessed from the closure below
                    var targetSize = d.targetSize,
                        startSize = previousCanvasWidth(d);   
                    d.psize = d.size;             

                    // Returns tween closure to be called over course of the transition
                    return function(t) {
                        var currentSize = startSize + (targetSize - startSize) * t;
                        // Set renderer size during transition
                        //this.rendererWidth = renderWidth;
                        //this.rendererHeight = renderHeight;

                        d.viewer.currentView.setTopicWindowSize(this, currentSize, currentSize);
                    };
                })
                ;

            // Remove exitting canvases for this viewType
            topicCanvases.exit().remove(); 

            // Save for use in tick() function
            module.threeDTopicView.topicCanvases = topicCanvases;
            module.threeDTopicView.uiGraph = uiGraph;
            module.threeDTopicView.canvasLayer = D3.select("#canvas-layer");            
        }

        // Called in each tick() of the force layout simulation
        // TODO: Is this necessary on every tick?
        //
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
                    /*
                    .attr("width", function(d) {
                        var currentSize = D3.select(this).attr("targetSize");
                        return currentSize;
                    })
                    .attr("height", function(d) {
                        var currentSize = D3.select(this).attr("targetSize");
                        return currentSize;
                    })
*/
                ;
   
        };

        // ==================== test3DTopicView ================ 

        // The spinning red cube. Used when we have a topic we know will be 3D, but we
        // don't have an implementation yet.
        //
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

                //    console.log(mesh);

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

            // Called by d3 within requestAnimationFrame
            //
            var animateAndRender = function() {
                //console.log("NEW test3DTopicView.animateAndRender");
                if ((that.rendererHeight)&&(that.rendererWidth)) {

                }
                animate();
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            return that;            
        };

        // Called each time the graph is changed
        //
        module.test3DTopicView.updateViews = function(selection, uiGraph) {
            console.log("test3DTopicView.updateViews");
            module.threeDTopicView.updateViews(selection, uiGraph, "test3DTopicView");
        };

        // Called in each tick() of the force layout simulation
        //
        module.test3DTopicView.tick = function() {
            module.threeDTopicView.tick("test3DTopicView");
        };

        // ==================== Two3DGraphsTopicView ================ 

        // Another "demo" 3D view. Just shows the basic 3D axes.
        //

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

            // Called by d3 within requestAnimationFrame
            //
            var animateAndRender = function() {
                //console.log("NEW two3DGraphsTopicView.animateAndRender");
                //console.log(spec.node.data);
                //console.log(that);
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            return that;            
        }

        // Called each time the graph is changed
        //
        module.two3DGraphsTopicView.updateViews = function(selection, uiGraph) {
            module.threeDTopicView.updateViews(selection, uiGraph, "two3DGraphsTopicView");
        };

        // Called in each tick() of the force layout simulation
        //
        module.two3DGraphsTopicView.tick = function() {
            module.threeDTopicView.tick("two3DGraphsTopicView");
        };

        // ==================== DiffRobotControlTopicView ================ 

        // This view is used for the cmd_vel topic for differential drive robots.
        // It visualizes and allows control of the velocities that we want a two-wheeled
        // robot to move in. A puck is shown on a floor grid and may be controlled with the 
        // keyboard. 
        // It generates ROS messages specifiying a forward velocity and rotational angular velocity.
        //

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
            //console.log("Create arrow");
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

            // Called by d3 within requestAnimationFrame
            //
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
                // console.log("t");
                if (index===0) {
                    var message = d.data.message;
                    if (message) {
                        //console.log(message);
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

        // Called each time the graph is changed
        //
        module.diffRobotControlTopicView.updateViews = function(selection, uiGraph) {
            module.threeDTopicView.updateViews(selection, uiGraph, "diffRobotControlTopicView");
        };

        // Called in each tick() of the force layout simulation
        //
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

        // Uses the good old spinning red cube to represent the orientation
        // of an IMU (gyroscope).
        //

        // Not finished - Remove for ROScon 2015 demo
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

        module.test3DTopicView.updateViews = function(selection, uiGraph) {
            console.log("imuSimpleTopicView.updateViews");
            module.threeDTopicView.updateViews(selection, uiGraph, "imuSimpleTopicView");
        };

        module.test3DTopicView.tick = function() {
            module.threeDTopicView.tick("imuSimpleTopicView");
        };

       */ 

    return module;

})();

