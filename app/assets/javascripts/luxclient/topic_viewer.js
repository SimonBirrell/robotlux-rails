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

        var VIEW_TYPES = [  'genericTopicView', 
                            'two3DGraphsTopicView', 
                            'test3DTopicView',
                            'diffRobotControlTopicView', 
                            'jointStateHashTopicView',
                            'floorPoseTopicView'
                            ];
        var NUMBER_GENERIC_VIEWS = 1,
            SHRINK_DURATION = null;

        // These are the ROS message types and the views we have available to render them.
        // All views can also be rendered as a GenericView    
        var ViewsAvailable = {
            "geometry_msgs/Twist" : ['diffRobotControlTopicView'],
            //"tf2_msgs/TFMessage" : ['two3DGraphsTopicView', 'test3DTopicView'],
            "sensor_msgs/foo" : ['two3DGraphsTopicView', 'test3DTopicView'],
            //"sensor_msgs/foo" : ['test3DTopicView'],            
            
            "sensor_msgs/JointState" : ['two3DGraphsTopicView', 'test3DTopicView', 'jointStateHashTopicView'],
            "sensor_msgs/Imu" : ['imuSimpleTopicView'],
            "nav_msgs/Odometry" : ['floorPoseTopicView']
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
        //  selection - The d3 node selection
        //  uiGraph - graph to join with
        //
    	module.topicDisplay = function(selection, uiGraph) {
            this.renderTopicBackground(selection);
            this.updateCurrentViews(selection, uiGraph);
		};

        // Render the grey circles that back each topic
        //  selection - The d3 node selection
        //
        module.renderTopicBackground = function(selection) {
            // Nothing to do yet
        }

        // Update the views of all topics on the screen.
        // Called whenever UI graph is updated
        //  selection - The d3 node selection
        //  uiGraph - pointer to uiGraph
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
        //  topicNode - Reference to the node object that represents a ROS topic
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
        //  node - reference to the topic node on uiGraph
        //
        module.TopicViewer.prototype.update = function(node) {
            if (this.currentView) {
                //console.log("- " + node.name);
                if (node.name===" /joint_states") {
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                    console.log("****************************************************");
                }
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
        //  offset - index of new view to display (into <TopicViewer>.views)
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

        function nameToDomId(name) {
            return name.trim().replace(/\//g, '--');
        }

        // Convert the most recent ROS message in a topic into an array of text 
        // strings for display in the GenericView.
        //  node - reference to the node on uiGraph
        //
        function messageTextArrayFromNode(node) {
            var header = node.data.type + " " + node.data.count,
                messageTextArray = [header],
                messageText = JSON.stringify(node.data.message) || "";

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

        // Return true if DOWN key is pressed for Position
        function keyPressedForPositionDown(node) {
            return node.focus && kd.W.isDown();
        }

        // Return true if RIGHT key is pressed for Position
        function keyPressedForPositionUp(node) {
            return node.focus && kd.Q.isDown();
        }

        // Return true if DOWN key is pressed for Velocity
        function keyPressedForVelocityDown(node) {
            return node.focus && kd.R.isDown();
        }

        // Return true if RIGHT key is pressed for Velocity
        function keyPressedForVelocityUp(node) {
            return node.focus && kd.E.isDown();
        }

        // Return true if DOWN key is pressed for Effort
        function keyPressedForEffortDown(node) {
            return node.focus && kd.Y.isDown();
        }

        // Return true if RIGHT key is pressed for Effort
        function keyPressedForEffortUp(node) {
            return node.focus && kd.T.isDown();
        }



        // Copy ROS message to a target node
        //  updateNode - 
        // TODO: Make this a full copy
        function copyUpdateToNode(updateNode, targetNode) {
            targetNode.data = updateNode.data;
        }

        // Clone (most) JavaScript objects
        //
        function clone(obj) {
            var copy;

            // Handle the 3 simple types, and null or undefined
            if (null == obj || "object" != typeof obj) return obj;

            // Handle Date
            if (obj instanceof Date) {
                copy = new Date();
                copy.setTime(obj.getTime());
                return copy;
            }

            // Handle Array
            if (obj instanceof Array) {
                copy = [];
                for (var i = 0, len = obj.length; i < len; i++) {
                    copy[i] = clone(obj[i]);
                }
                return copy;
            }

            // Handle Object
            if (obj instanceof Object) {
                copy = {};
                for (var attr in obj) {
                    if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
                }
                return copy;
            }

            throw new Error("Unable to copy obj! Its type isn't supported.");
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
        //  whenever an update (ie. ROS message) is received from the server.
        //
        //  3. Each topicView type has an updateViews() method that renders all the topicViews
        //  of that type in the uiGraph whenever the graph changes. This is sort of like a class method.
        //
        //  4. Each topicView type has a tick() method that is called from the D3/Cola tick()
        //  functions. This too is a class method equivalent.
        //
        //  5. Each topicView has an animateAndRender() method that is called each
        //  animation frame by the browser.
        //
        //  Uses Douglas Crockford's convention for inheritance
        //
        // TODO: Try splitting these into separate spurce files for convenience
        //
        // ===================================================== 

        // The base "class".
        //  spec - a hash of options from the creator
        //  my - a hash of options created by the subclasses
        //
        var topicView = function(spec, my) {

            var my = my || {};
            var that = {};

            that.viewType = my.viewType || "Abstract";

            // Called whenever a ROS message is received
            //  node - the d3 node selection
            //
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
        //  spec - a hash of options from the creator
        //  my - a hash of options created by the subclasses
        //
        module.genericTopicView = function(spec, my) {
            var spec = spec || {};
            var my = my || {};
            my.viewType = my.viewType || "genericTopicView";
            var that = topicView(spec, my);

            // Called whenever the UI graph is changed
            //  node - the d3 node selection
            //
            var update = function(node) {
                var messageTextArray = messageTextArrayFromNode(node); 
                for (var l=0; l<messageTextArray.length; l++) { 
                    var topicDisplayTextId = '#' + topicNameToId(node.name, l);
                    $(topicDisplayTextId).text(messageTextArray[l]);
                }
            };
            that.update = update;

            // Called by browser on each animation frame
            //
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

        // "Class method" called whenever graph is updated and force.start() called
        // Updates all visible GenericTopicViews
        //  selection - d3 selection of all nodes
        //  uiGraph - pointer to uiGraph
        //
        module.genericTopicView.updateViews = function(selection, uiGraph) {
            var NUMBER_TOPIC_DISPLAY_TEXT_LINES = 15,
                TOPIC_DISPLAY_TOP = -100,
                TOPIC_DISPLAY_TEXT_HEIGHT = 14,
                TOPIC_DISPLAY_LEFT_MARGIN = -100;

            // Join with a set of text lines that constitute the topic display.
            // Currently used in display for large generic topics.
            // For each matching topic, return an array of text lines.
            var topicDisplayTextLines = selection.selectAll(".topic-display")
                .data(function(d) {
                    // Join with the text list of large, visible GenericTopicViews
                    if ((d.nodeFormat==='large')&&
                            (d.rtype==='topic')&&
                            ((d.viewer.currentView.viewType==="genericTopicView") || 
                             (d.viewer.currentView.viewType==="diffRobotControlTopicView")) 
                            ) {
                        var list = [];
                        // This will display the ROS message as a list of text lines
                        for (var i=0; i<NUMBER_TOPIC_DISPLAY_TEXT_LINES; i++) {
                            list.push({name: d.name, index: i, message_type: d.message_type, node: d});
                        }
                        return list; 
                    }

                    return [];
                })
                ;

            // Fade in text on topic display when topic scales up to "large"
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
        //  spec - a hash of options from the creator
        //  my - a hash of options created by the subclasses
        //
        module.threeDTopicView = function(spec, my) {
            var my = my || {};
            var that = topicView(spec, my);

            // Called by subclasses to set the camera, scene and rendering window
            var setScene = function(canvas, renderWidth, renderHeight) {

                function init() {
                    console.log("3D init()");
                    console.log(canvas);
                    // "that" is the TopicView "instance"
                    that.scene = new THREE.Scene();

                    that.camera = new THREE.PerspectiveCamera( 30, renderWidth / renderHeight, 1, 10000 );
                    that.camera.position.z = 1000;

                    // Calls buildScene() method on subclasses
                    that.buildScene(that.scene, that.camera);

                    that.renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true});
                    that.rendererWidth = renderWidth;
                    that.rendererHeight = renderHeight;
                    that.renderer.setSize( renderWidth, renderHeight );
                    // Canvas background color is the same as the topic background
                    that.renderer.setClearColor( 0xbcc8da, 0 );
                }

                init();

            }
            that.setScene = setScene;

            // Called whenever a ROS message is received
            //  node - the d3 node selection
            //
            var update = function(node) {
                copyUpdateToNode(node, spec.node)
            };
            that.update = update; 

            // Called by subclasses during each animation frame. Sets the size of the 
            // rendered view on the canvas and then renders it.
            //
            var render3D = function() {
                if (that.renderer) {
                    /*
                    console.log("RENDER 3D==================");
                    console.log(that.rendererWidth);
                    console.log(that.rendererHeight);
                    console.log(that.scene);
                    console.log(that.camera);
                    console.log("RENDER 3D==================");
                    */
                    that.renderer.setSize( that.rendererWidth, that.rendererHeight );
                    that.renderer.render( that.scene, that.camera );
                }
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
            console.log("threeDTopicView.updateViews for " + viewType);

            updateCanvasesForViewType(uiGraph, viewType);
        };

        // 3D utility functions

        // Get the current canvas width on node d
        //  d - the d3 node for the ROS topic
        //
        function canvasWidth(d) {
            return widthWithinCircleOfSize(d.size);
        }

        // Get the previous canvas width on node d
        //  d - the d3 node for the ROS topic
        //
        function previousCanvasWidth(d) {
            return widthWithinCircleOfSize(d.psize);
        }

        // Get the width of the canvas within the node
        //  size - "size" 0, 1, 2, 3... of the node
        //
        function widthWithinCircleOfSize(size) {
            return (size + 1) * CircleRadius * 1.41421356237;
        }

        // Get the canvas x,y position with respect to the SVG window
        //  d - the d3 node for the ROS topic
        //  
        function getCanvasPosition(d) {
            var svgOffset = D3.transform(Svg.attr("transform"));
            var topicWidth = CircleRadius * 1.41421356237;
            var offset = (d.width/(CircleRadius*2)) * (2*CircleRadius - topicWidth) / 2;

            var x = d.x + svgOffset.translate[0] - d.width/2 + offset,
                y = d.y + svgOffset.translate[1] - d.height/2 + offset;

            return [x, y];
        }  

        // Add HTML canvases to 3D topics
        // Update their size when the containing topic is scaling
        // Get the current canvas width on node d
        //  d - the d3 node for the ROS topic
        //
        // Remove them when topic disappears
        //
        // When scaling we need to scale both the width, height of the <canvas> element
        // and the size of the renderer
        //
        // TODO: There's an issue if you click a topic while another one is still scaling
        // To clearly see the problem, increase SHRINK_DURANTION in ui.js to 5000
        //
        function updateCanvasesForViewType(uiGraph, viewType) {
            console.log("updateCanvasesForViewType " + viewType);
            console.log(nodeTopicsWithCurrentViewType(uiGraph, viewType));
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
                    console.log("Setting scene **********");
                    d.viewer.currentView.setScene(this, targetSize, targetSize);
                    return targetSize;
                })    
               ;

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
                        d.viewer.currentView.setTopicWindowSize(this, currentSize, currentSize);
                    };
                })
                ;

            // Remove exiting canvases for this viewType
            topicCanvases.exit().remove(); 

            // Save for use in tick() function
            module.threeDTopicView.topicCanvases = topicCanvases;
            module.threeDTopicView.uiGraph = uiGraph;
            module.threeDTopicView.canvasLayer = D3.select("#canvas-layer");            
        }

        // Called in each tick() of the force layout simulation
        //  viewType - type of current TopicView
        // This changes the canvas position to make it appear that the canvases are 
        // part of the SVG ROS topic.
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
                ;
   
        };

        // ==================== test3DTopicView ================ 

        // The spinning red cube. Used as a placeholderwhen we have a topic we know will be 
        // 3D, but we don't have an implementation yet.
        //  spec - a hash of options from the creator
        //  my - a hash of options created by the subclasses
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

            // Called by threeDTopicView superclass
            //  scene - THREE.js scene
            //  camera - THREE.js camera
            //
            var buildScene = function(scene, camera) {
                // Spinning red cube
                geometry = new THREE.BoxGeometry( 200, 200, 200 );
                //material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
                material = new THREE.MeshPhongMaterial( { color: 0xff0000 } );
                mesh = new THREE.Mesh( geometry, material );
                scene.add(mesh);

                // Set up some lights
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

            // Called by this class
            //
            var animate = function() {
                // Make the cube spin
                if (mesh) {
                    mesh.rotation.x += 0.01;
                    mesh.rotation.y += 0.02; 
                }
            };
            that.animate = animate;

            // Called by browser on each animation frame
            //
            var animateAndRender = function() {
                animate();
                // Call threeDTopicView superclass
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            return that;            
        };

        // Called each time the graph is changed
        //  selection - selection of nodes
        //  uiGraph - graph to join with
        //
        module.test3DTopicView.updateViews = function(selection, uiGraph) {
            console.log("test3DTopicView.updateViews");
            // Call superclass
            module.threeDTopicView.updateViews(selection, uiGraph, "test3DTopicView");
        };

        // Called in each tick() of the force layout simulation
        //
        module.test3DTopicView.tick = function() {
            // Call superclass
            module.threeDTopicView.tick("test3DTopicView");
        };

        // ==================== Two3DGraphsTopicView ================ 

        // Another "demo" 3D view. Currently just shows the basic 3D axes.
        //  spec - a hash of options from the creator
        //  my - a hash of options created by the subclasses
        //
        module.two3DGraphsTopicView = function(spec, my) {
            var viewType = "two3DGraphsTopicView";
            var my = my || {};
            my.viewType = my.viewType || viewType;
            var that = module.threeDTopicView(spec, my);

            // Three axes in six pieces
            //  length - length of each piece
            //
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

            // Build a single piece of an axis
            //  src - Where axis begins
            //  dst - Wher axis ends
            //  colorHex - color to make this piece of the axis
            //  dashed - true or false for styling
            //
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

            // Called by threeDTopicView superclass
            //  scene - THREE.js scene
            //  camera - THREE.js camera
            //
            var buildScene = function(scene, camera) {

                // Position the camera
                camera.position.x = 100;
                camera.position.y = 100;
                camera.position.z = 1000;

                // Build the axes
                var axes = buildAxes( 1000 );
                scene.add( axes );
            }
            that.buildScene = buildScene;

            // Called by this class
            //
            var animate = function() {
                // Nothing to do yet
            }
            that.animate = animate;

            // Called by browser on each animation frame
            //
            var animateAndRender = function() {
                // Call superclass
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            return that;            
        }

        // Called each time the graph is changed
        //  selection - selection of nodes
        //  uiGraph - graph to join with
        //
        module.two3DGraphsTopicView.updateViews = function(selection, uiGraph) {
            // Call superclass
            module.threeDTopicView.updateViews(selection, uiGraph, "two3DGraphsTopicView");
        };

        // Called in each tick() of the force layout simulation
        //
        module.two3DGraphsTopicView.tick = function() {
            // Call superclass
            module.threeDTopicView.tick("two3DGraphsTopicView");
        };

        // ==================== DiffRobotControlTopicView ================ 

        // Some tweakable constants for this view
        var ARROW_CONTROL_COLOR_HIGHLIGHT = 0x00ff00;
        var ARROW_CONTROL_COLOR_NORMAL = 0xffff00;
            var START_LINEAR_VELOCITY = 0.5,
                MAX_LINEAR_VELOCITY = 2.0,
                LINEAR_ACCELERATION = 0.75,
                START_ANGULAR_VELOCITY = 0.1,
                MAX_ANGULAR_VELOCITY = 0.6,
                ANGULAR_ACCELERATION = 0.25,
                CMD_VEL_MESSAGE_FREQUENCY = 10;

        // This view is used for the cmd_vel topic for differential drive robots.
        // It visualizes and allows control of the velocities that we want a two-wheeled
        // robot to move in. A puck is shown on a floor grid and may be controlled with the 
        // keyboard. 
        // It generates ROS messages specifiying a forward velocity and rotational angular velocity.
        //  spec - a hash of options from the creator
        //  my - a hash of options created by the subclasses
        //
        module.diffRobotControlTopicView = function(spec, my) {
            var viewType = "diffRobotControlTopicView";
            var my = my || {};
            my.viewType = my.viewType || viewType;
            var that = module.threeDTopicView(spec, my);
            var lastTimestamp = null;
            var linearVelocity = 0.0,
                angularVelocity = 0.0,
                lastVelocities = {linear: {x:0, y:0, z:0}, angular: {x:0, y:0, z:0}};

            // Build an interactive arrow for the puck
            function interactiveArrow(circle, x, y) {
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

            // Called by threeDTopicView superclass
            //  scene - THREE.js scene
            //  camera - THREE.js camera
            //
            var buildScene = function(scene, camera) {
                var grid, light;

                // base is an invisible object that carries the puck and the camera
                // It moves with the viewer
                that.base = new THREE.Object3D();
                that.base.add(camera);
                that.base.rosPosition = {x: 0.0, y: 0.0, z: 0.1};
                that.base.rosRotation = {x: 0.0, y: 0.0, z: 0.0};

                // Camera
                that.camera = camera;
                that.camera.rotation.x = - Math.PI / 15;
                that.camera.position.set(0.0, 0.6, 2.0);

                // Floor grid
                var grid = new THREE.GridHelper (20, 1);
                scene.add (grid);

                var material = new THREE.MeshLambertMaterial({
                    color: 0x2222ff
                });

                var radius = 0.5;
                var segments = 32;

                // Create a floating circle, the "puck"
                var circleGeometry = new THREE.CircleGeometry( radius, segments );              
                var circle = new THREE.Mesh( circleGeometry, material );
                circle.rotation.x = - Math.PI / 2;

                // Add four interactive arrows
                that.forwardArrow = interactiveArrow(circle, 0.0, 1.0);
                that.backwardArrow = interactiveArrow(circle, 0.0, -1.0);
                that.leftArrow = interactiveArrow(circle, -1.0, 0.0);
                that.rightArrow = interactiveArrow(circle, 1.0, 0.0);   

                // Add pck to invisible base
                that.base.add(circle);

                // Add a light to the base
                light = new THREE.PointLight( 0xffffff, 1, 10 );
                light.position.x = 0.5;
                light.position.y = 0.5;
                that.base.add(light);

                scene.add(that.base);
            }
            that.buildScene = buildScene;

            // Called by this class
            var animate = function() {
            }
            that.animate = animate;

            // ROS and THREE.js use different coordinate schemes, sadly
            //  position - position in ROS coordinates
            // Returns equivalent in THREE coordinates
            //
            function rosPositionToThreePosition(position) {
                return {x: -position.y, y: position.z, z: -position.x};
            }

            // Convert THREE object position and orientation from ROS
            // coordinates (already on object)
            //  object3D - THREE object
            //
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

            // Called by browser on each animation frame
            //
            var animateAndRender = function() {
                var node = spec.node,
                    messageFromServer = spec.node.data.message, deltaTime, now, pos,
                    messageForServer;

                // Detect if key is pressed and alter velocity accordingly
                // What a lot of parameters
                //  keyPressed - key handler callback
                //  arrow - reference to the THREE object for the interactive arrow
                //  velocity - current velocity
                //  direction - 1 or -1
                //  start_velocity - when you press a key, what velocity does it start with
                //  acceleration - just that
                //  max_velocity - maximum velocity (without sign) that puck can reach
                // Returns the new velocity
                //
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

                // The title says it all
                //  keyPressed - key handler callback
                //  arrow - reference to the THREE object for the interactive arrow
                //  velocity - current velocity
                //  direction - 1 or -1
                //  
                function adjustLinearVelocityIfKeyPressed(keyPressed, arrow, direction) {
                    linearVelocity = adjustVelocityIfKeyPressed( keyPressed, arrow, 
                                                            linearVelocity, direction, START_LINEAR_VELOCITY, 
                                                            LINEAR_ACCELERATION, MAX_LINEAR_VELOCITY);
                }

                // The title says it all
                //  keyPressed - key handler callback
                //  arrow - reference to the THREE object for the interactive arrow
                //  velocity - current velocity
                //  direction - 1 or -1
                //  
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
                // Call superclass
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            // Prepare the ROS message
            // Note that differential drive robot motion is defined by
            // linear velocity forwards or backwards 
            // and angular velocity left or right round the centre point
            //
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

            // Update the position of the base from the ROS message received
            // from the server (not from local keypresses). We always visualize
            // what the server tells us. 
            //  base - the THREE object that holds camera and puck
            //  message - the ROS message that contains linear and angular velocities
            //  deltaTime - time since last frame
            //
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

            // Return the text to d3 for a text line on the topic
            // We only use 2 text lines for this view
            //  d - the node
            //  i - the index of the text line 0, 1, 2...
            var textLine = function(d, index) {
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
        //  selection - selection of nodes
        //  uiGraph - graph to join with
        //
        module.diffRobotControlTopicView.updateViews = function(selection, uiGraph) {
            module.threeDTopicView.updateViews(selection, uiGraph, "diffRobotControlTopicView");
        };

        // Called in each tick() of the force layout simulation
        //
        module.diffRobotControlTopicView.tick = function() {
            module.threeDTopicView.tick("diffRobotControlTopicView");
        };

        // Don't overload the server with messages.
        //  node - the node that's sending the message
        //  messageForServer - the ROS message to send
        //  frequency - in Hz. Don't send moreoften than this
        //
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

        // ==================== Joint States ======================

        var PI_TIMES_2 = Math.PI * 2.0;

        var JOINT_STATE_MESSAGE_FREQUENCY = 10,
            JOINT_POSITION_VELOCITY = Math.PI,
            JOINT_VELOCITY_VELOCITY = Math.PI,
            JOINT_EFFORT_VELOCITY = Math.PI;

        // TopicView constructor.
        //  var topicView = TopicViewer.jointStateHashTopicView(spec)
        //  where spec is a hash of options for the creation of the topicView
        // 
        module.jointStateHashTopicView = function(spec, my) {
            var spec = spec || {},
                viewType = "jointStateHashTopicView",
                my = my || {};
            var node = spec.node,
                messageFromServer = spec.node.data.message, 
                deltaTime, now,
                messageForServer;    
            var lastTimestamp = null;
            var jointPosition = 0.0,
                jointVelocity = 0.0,
                jointEffort = 0.0;

            my.viewType = my.viewType || viewType;
            var that = topicView(spec, my);

            // Called whenever the UI graph is changed
            //  node - the node on uiGraph
            //
            var update = function(node) {
                var id = "#" + nameToDomId(node.name),
                    nodeD3 = Svg.selectAll(id).data([node]);

                // Update size and label of indicators
                updateIndicatorDialPositionAndNumber2(nodeD3, 'position');
                updateIndicatorDialPositionAndNumber2(nodeD3, 'velocity');
                updateIndicatorDialPositionAndNumber2(nodeD3, 'effort');
            };
            that.update = update;

            // Called by browser on each animation frame
            //
            var animateAndRender = function() {

                // Time since last iteration
                now = Date.now();
                if (!lastTimestamp) {
                    lastTimestamp = now - 10;
                }
                deltaTime = (now - lastTimestamp) /1000;
                lastTimestamp = now;

                var keyPressed = checkKeysForJointStateMessagesForServer(node);

                messageForServer = createJointStateMessage(node, jointPosition, jointVelocity, jointEffort);

                if (that.lastMessageSent) {
                    if (!jointStateMessagesEqual(messageForServer, that.lastMessageSent)) { 
                        sendRosMessageToTopicAtFrequency(node.parentNode, messageForServer, JOINT_STATE_MESSAGE_FREQUENCY);
                        that.lastMessageSent = messageForServer;
                    } else {
                        //console.log(messageForServer.position[0].toString() + ", " + messageForServer.position[1].toString());
                        //console.log(node);
                    }   
                } else {
                    // Send first message only if key pressed
                    if (keyPressed) {
                        console.log("First JointState message");
                        console.log(messageForServer);
                        sendRosMessageToTopicAtFrequency(node.parentNode, messageForServer, JOINT_STATE_MESSAGE_FREQUENCY);
                        that.lastMessageSent = messageForServer;                        
                    }
                }
            };
            that.animateAndRender = animateAndRender;

            function jointStateMessagesEqual(message1, message2) {
                return  arraysEqual(message1.name, message2.name) &&
                        arraysEqual(message1.position, message2.position) &&
                        arraysEqual(message1.velocity, message2.velocity) &&
                        arraysEqual(message1.effort, message2.effort);
            }

            function arraysEqual(array1, array2) {
                if (array1.length !== array2.length) {
                    return false;
                }

                for (var i=0; i<array1.length; i++) {
                    var item1 = array1[i],
                        item2 = array2[i];
                    if ((item1 instanceof Array) && (item2 instanceof Array)) {
                        if (!arraysEqual(item1, item2)) {
                            return false;
                        } 
                    } else {
                        if (item1 !== item2) {
                            return false;
                        }
                    }
                }
                return true;
            }

            function checkKeysForJointStateMessagesForServer(node) {
                var keyPressed = false;

                if (keyPressedForPositionDown(node)) {
                    jointPosition = jointPosition - JOINT_POSITION_VELOCITY * deltaTime;
                    jointPosition = Math.max(jointPosition, -PI_TIMES_2);
                    keyPressed = true;
                } else if (keyPressedForPositionUp(node)) {
                    jointPosition = jointPosition + JOINT_POSITION_VELOCITY * deltaTime;
                    jointPosition = Math.min(jointPosition, PI_TIMES_2);
                    keyPressed = true;
                }
                if (keyPressedForVelocityDown(node)) {
                    jointVelocity = jointVelocity - JOINT_VELOCITY_VELOCITY * deltaTime;
                    jointVelocity = Math.max(jointVelocity, -PI_TIMES_2);
                    keyPressed = true;
                } else if (keyPressedForVelocityUp(node)) {
                    jointVelocity = jointVelocity + JOINT_VELOCITY_VELOCITY * deltaTime;
                    jointVelocity = Math.min(jointVelocity, PI_TIMES_2);
                    keyPressed = true;
                }
                if (keyPressedForEffortDown(node)) {
                    jointEffort = jointEffort - JOINT_EFFORT_VELOCITY * deltaTime;
                    jointEffort = Math.max(jointEffort, -PI_TIMES_2);
                    keyPressed = true;
                } else if (keyPressedForEffortUp(node)) {
                    jointEffort = jointEffort + JOINT_EFFORT_VELOCITY * deltaTime;
                    jointEffort = Math.min(jointEffort, PI_TIMES_2);
                    keyPressed = true;
                }
                return keyPressed;
            }

            function createJointStateMessage(node, position, velocity, effort) {
                var newMessage = copyMessageFromNode(node),
                    subTopicIndex = node.subTopicIndex;

                if ((position !== undefined) && (position !== null)) {
                    newMessage.position[subTopicIndex] = position;
                }
                if ((position !== undefined) && (position !== null)) {
                    newMessage.velocity[subTopicIndex] = velocity;
                }
                if ((position !== undefined) && (position !== null)) {
                    newMessage.effort[subTopicIndex] = 0; // effort;
                }

                return newMessage;
            }

            function copyMessageFromNode(node) {
                //var cloneOfMessage = clone(node.data.message);
                var message = node.data.message;

                return {
                    name: copyArrayIfValid(message.name),
                    position: copyArrayIfValid(message.position),
                    velocity: copyArrayIfValid(message.velocity),
                    //effort: copyArrayIfValid(message.effort)
                    effort: [0,0]
                };
            }

            function copyArrayIfValid(array) {
                var newArray = [];
                for (var i=0; i<array.length; i++) {
                    var item = array[i];
                    if ((typeof item === "undefined") || (typeof item === "null")) {
                        return [];
                    }
                    newArray.push(item);
                }
                return newArray;
            }

            // Return the text to d3 for a text line on the topic
            // We only use 2 text lines for this view
            //  d - the node
            //  i - the index of the text line 0, 1, 2...
            var textLine = function(d, index) {
                if (index===0) {
                    return "Keys: QW (pos) ER (vel) TY (eff)";
                } 
                return "";
            };
            that.textLine = textLine;

            return that;
        }

        function filterJointStateHashTopicViews(d) {
            // Join with the text list of large, visible GenericTopicViews
            if ((d.rtype==='topic')&&
                (d.viewer)&&
                (d.viewer.currentView)&&
                (d.viewer.currentView.viewType==="jointStateHashTopicView")&&
                (d.data)&&
                (d.data.message)) {
                return [d]; 
            }

            return [];
        }

        function filterJointStateHashTopicViewsWithPosition(d) {
            return filterJointStateHashTopicViewsWithParameter(d, "position");
        }

        function filterJointStateHashTopicViewsWithPositionLarge(d) {
            console.log("Checking for large");
            return filterJointStateHashTopicViewsWithParameter(d, "position") && (d.nodeFormat === 'large');
        }

        function filterJointStateHashTopicViewsWithVelocity(d) {
            return filterJointStateHashTopicViewsWithParameter(d, "velocity");
        }

        function filterJointStateHashTopicViewsWithEffort(d) {
            return filterJointStateHashTopicViewsWithParameter(d, "effort");
        }

        function filterJointStateHashTopicViewsWithParameter(d, parameter) {
            var result = filterJointStateHashTopicViews(d);

            if ((result.length > 0) && (d.data.message[parameter]) && (d.data.message[parameter].length > 0)) {
                return result;
            }

            return [];
        }

        // "Class method" called once whenever graph is updated and force.start() called
        // Updates all visible jointStateHashTopicView
        //  selection - d3 selection of all nodes
        //  uiGraph - pointer to uiGraph
        //
        module.jointStateHashTopicView.updateViews = function(selection, uiGraph) {
            enteringJointStateTopicViews(selection);
            updateJointStateTopicViews(selection);
         }

        function enteringJointStateTopicViews(selection) {
            // Join
            var jointStateHashTopicViews = 
                    selection.selectAll(".joint-state-hash-topic-view")
                        .data(filterJointStateHashTopicViews, function(d) {return d.name});                        

            // Enter
            var newJointStates = jointStateHashTopicViews
                    .enter()
                    .append("g")
                        .attr("id", function(d) {return nameToDomId(d.name); })
                        .attr("class", "joint-state-hash-topic-view");                        

            var newJointStatesWithPosition = newJointStates
                                            .selectAll(".joint-state-hash-topic-view-position-backdrop")
                                            .data(filterJointStateHashTopicViewsWithPosition)
                                            .enter();
            var newJointStatesWithVelocity = newJointStates
                                            .selectAll(".joint-state-hash-topic-view-velocity-backdrop")
                                            .data(filterJointStateHashTopicViewsWithVelocity)
                                            .enter();
            var newJointStatesWithEffort = newJointStates
                                            .selectAll(".joint-state-hash-topic-view-effort-backdrop")
                                            .data(filterJointStateHashTopicViewsWithEffort)
                                            .enter();

            function appendKey(selection, key, direction, baseCSSClass) {
                var key = selection
                            .append("text")
                            .attr("class", baseCSSClass + "-key-" + direction + " key-indicator")
                            .text(key);
                var keyNode = key.node();
                if (keyNode) {
                    var bbox = key.node().getBBox();  
                    selection.append("rect")
                                .attr("class", baseCSSClass + "-key-" + direction + "-box key-box")
                                .attr("x", bbox.x - (bbox.width / 2))
                                .attr("y", bbox.y - (bbox.width * 0.2))
                                .attr("width", bbox.width * 2.0)
                                .attr("height", bbox.height * 1.2);
                }                
            }                                

            function appendIndicator(selection, parameter, label, keyMinus, keyPlus) {
                var baseCSSClass = "joint-state-hash-topic-view-" + parameter;

                selection.append("circle")
                            .attr("class", baseCSSClass + "-backdrop");
                selection.append("path")
                            .attr("class", baseCSSClass + "-indicator");
                selection.append("text")
                            .attr("class", baseCSSClass + "-indicator-label-top joint-state-hash-topic-view-label topic-view-label-shadow")
                            .text(label);
                selection.append("text")
                            .attr("class", baseCSSClass + "-indicator-label-top joint-state-hash-topic-view-label topic-view-label")
                            .text(label);
                selection.append("text")
                            .attr("class", baseCSSClass + "-indicator-label-bottom joint-state-hash-topic-view-label topic-view-label-shadow");
                selection.append("text")
                            .attr("class", baseCSSClass + "-indicator-label-bottom joint-state-hash-topic-view-label topic-view-label");

                appendKey(selection, keyMinus, 'minus', baseCSSClass);            
                appendKey(selection, keyPlus, 'plus', baseCSSClass);                                   
            }

            appendIndicator(newJointStatesWithPosition, 'position', 'Position', 'Q', 'W');
            appendIndicator(newJointStatesWithVelocity, 'velocity', 'Velocity', 'E', 'R');
            appendIndicator(newJointStatesWithEffort, 'effort', 'Effort', 'T', 'Y');
        }

        function jointStatePositionDialRadius(d) {
            return CircleRadius * (d.size + 1) * 0.6;
        }

        function jointStateVelocityDialRadius(d) {
            return CircleRadius * (d.size + 1) * 0.4;
        }

        function jointStateEffortDialRadius(d) {
            return CircleRadius * (d.size + 1) * 0.2;
        }

        function jointStateDialSizeToRadius(size, parameter) {
            if (parameter==='position') {
                return CircleRadius * (size + 1) * 0.6;
            } else if (parameter==='velocity') {
                return CircleRadius * (size + 1) * 0.4;
            } else {
                return CircleRadius * (size + 1) * 0.2;
            }
        }

        function jointStateDialParameterToRadius(d, parameter) {
            if (parameter==='position') {
                return jointStatePositionDialRadius(d);
            } else if (parameter==='velocity') {
                return jointStateVelocityDialRadius(d);
            } else {
                return jointStateEffortDialRadius(d);
            }
        }

        function topPositionLabelY(d) {
            return - CircleRadius * (d.size + 1) * 0.5;
        }

        function bottomPositionLabelY(d) {
            return CircleRadius * (d.size + 1) * 0.5;
        }

        function topVelocityLabelY(d) {
            return - CircleRadius * (d.size + 1) * 0.3;
        }

        function bottomVelocityLabelY(d) {
            return CircleRadius * (d.size + 1) * 0.3;
        }

        function topEffortLabelY(d) {
            return - CircleRadius * (d.size + 1) * 0.3;
        }

        function bottomEffortLabelY(d) {
            return CircleRadius * (d.size + 1) * 0.3;
        }

        function jointStateValue(d, parameter) {
            //return 2*Math.PI - Math.random(0, 4*Math.PI);

            if ((d.data)&&
                (d.data.message)&&
                (d.data.message[parameter])) {
                return d.data.message[parameter][d.subTopicIndex];
            }
            return 0;
        }

        function drawIndicator(d, radius, parameter) {
            var dialRadiusString = radius.toString(),
                startX = 0,
                startY = 0,
                topDialY = -radius, 
                theta = jointStateValue(d, parameter);

            // No values yet, don't draw path
            if (typeof theta !== 'number') {
                return "";    
            }

            var position = 2*Math.PI - ((theta + 2*Math.PI) % (4*Math.PI)),
                indicatorX = Math.sin(position) * radius,
                indicatorY = -Math.cos(position) * radius,
                longArc = (Math.abs(position) > Math.PI) ? "1" : "0",
                sweepFlag = (position >= 0) ? "1" : "0";

                return "M"+ startX.toString() + "," + startY.toString() +
                            " v" + topDialY.toString() +
                            " A" + dialRadiusString + "," + dialRadiusString +
                                " 0 " + longArc + "," + sweepFlag + " " +
                                indicatorX + "," + indicatorY +
                            " z";
        }

        function indicatorTween(parameter) {
            return function(d, i, a) {
                var startRadius = jointStateDialSizeToRadius(d.psize, parameter),
                    targetRadius = jointStateDialSizeToRadius(d.size, parameter);
                return function(t) {
                var radius = startRadius + t*(targetRadius - startRadius);
                    var dialRadiusString = radius.toString(),
                        startX = 0,
                        startY = 0,
                        topDialY = -radius, 
                        theta = jointStateValue(d, parameter);

                    // No values yet, don't draw path
                    if (typeof theta !== 'number') {
                        return "";    
                    }

                    var position = 2*Math.PI - ((theta + 2*Math.PI) % (4*Math.PI)),
                        indicatorX = Math.sin(position) * radius,
                        indicatorY = -Math.cos(position) * radius,
                        longArc = (Math.abs(position) > Math.PI) ? "1" : "0",
                        sweepFlag = (position >= 0) ? "1" : "0";

                        return "M"+ startX.toString() + "," + startY.toString() +
                                    " v" + topDialY.toString() +
                                    " A" + dialRadiusString + "," + dialRadiusString +
                                        " 0 " + longArc + "," + sweepFlag + " " +
                                        indicatorX + "," + indicatorY +
                                    " z";
                }
            }
        }

        function updateKey(selection, direction, xFn, sign, baseCSSClass) {
            selection.selectAll(baseCSSClass + "-key-" + direction)
                    .transition()
                    .duration(SHRINK_DURATION)                    
                    .attr("x", xFn)
                    .style("visibility", function(d) {
                        return d.nodeFormat === "large" ? "visible" : "hidden";
                    })
                    .attr("opacity", function(d) {
                        return d.nodeFormat === "large" ? 1.0 : 0.0;
                    });

            selection.selectAll(baseCSSClass + "-key-" + direction + "-box")
                    .transition()
                    .duration(SHRINK_DURATION)                    
                    .attr("x", function(d) {return xFn(d) - (this.getBBox().width/2); })
                    .style("visibility", function(d) {
                        return d.nodeFormat === "large" ? "visible" : "hidden";
                    })
                    .attr("opacity", function(d) {
                        return d.nodeFormat === "large" ? 1.0 : 0.0;
                    });
        }

        function updateIndicatorDialPositions(selection, baseCSSClass, parameter) {
            var jointStateHashTopicViewPositionIndicators = 
                    selection.selectAll(baseCSSClass + "-indicator")
                        .data(filterJointStateHashTopicViews, function(d) {return d.name});

            jointStateHashTopicViewPositionIndicators
                    .transition()
                    .duration(SHRINK_DURATION) 
                    .attrTween("d", indicatorTween(parameter));
        }

        function updateIndicatorDialPositions2(selection, baseCSSClass, parameter) {
            var jointStateHashTopicViewPositionIndicators = 
                    selection.selectAll(baseCSSClass + "-indicator")
                        .data(filterJointStateHashTopicViews, function(d) {return d.name});

            jointStateHashTopicViewPositionIndicators
                    .attr("d", function(d) { 
                        return drawIndicator(d, jointStateDialParameterToRadius(d, parameter), parameter);
                    });
        }

        function updateIndicatorNumber(selection, baseCSSClass, parameter) {
            selection.selectAll(baseCSSClass + "-indicator-label-bottom")
                    .text(function(d) {
                        var value;
                        if ((d.data) && (d.data.message) && (d.data.message[parameter]) && (typeof d.subTopicIndex === 'number')) {
                            value = d.data.message[parameter];
                            value = value[d.subTopicIndex].toString();
                        } else {
                            value = "-";
                        }
                        return value;
                    });                
        }

        function updateIndicatorDialPositionAndNumber(selection, parameter) {
            var baseCSSClass = ".joint-state-hash-topic-view-" + parameter;

            updateIndicatorDialPositions(selection, baseCSSClass);
            updateIndicatorNumber(selection, baseCSSClass, parameter);
        }

        function updateIndicatorDialPositionAndNumber2(selection, parameter) {
            var baseCSSClass = ".joint-state-hash-topic-view-" + parameter;

            updateIndicatorDialPositions2(selection, baseCSSClass, parameter);
            updateIndicatorNumber(selection, baseCSSClass, parameter);
        }

        function updateJointStateTopicViews(selection) {

            function updateIndicator(selection, parameter, radiusFn, topLabelY, bottomLabelY) {
                var baseCSSClass = ".joint-state-hash-topic-view-" + parameter;

                var jointStateHashTopicViewPositionBackdrops = 
                        selection.selectAll(baseCSSClass + "-backdrop")
                            .data(filterJointStateHashTopicViews, function(d) {return d.name});

                jointStateHashTopicViewPositionBackdrops
                        .transition()
                        .duration(SHRINK_DURATION)                    
                        .attr("r", radiusFn);

                updateIndicatorDialPositions(selection, baseCSSClass, parameter);    

                selection.selectAll(baseCSSClass + "-indicator-label-top")
                        .transition()
                        .duration(SHRINK_DURATION)                    
                        .attr("y", topLabelY)
                        .style("visibility", function(d) {
                            return (["large","medium"].includes(d.nodeFormat)) ? "visible" : "hidden";
                        })
                        .attr("opacity", function(d) {
                            return (["large","medium"].includes(d.nodeFormat)) ? 1.0 : 0.0;
                        });

                updateIndicatorNumber(selection, baseCSSClass, parameter);

                selection.selectAll(baseCSSClass + "-indicator-label-bottom")
                        .transition()
                        .duration(SHRINK_DURATION)                    
                        .attr("y", bottomLabelY)
                        .style("visibility", function(d) {
                            return (["large","medium"].includes(d.nodeFormat)) ? "visible" : "hidden";
                        })
                        .attr("opacity", function(d) {
                            return (["large","medium"].includes(d.nodeFormat)) ? 1.0 : 0.0;
                        });

                updateKey(selection, 'minus', topLabelY, -1, baseCSSClass);
                updateKey(selection, 'plus', bottomLabelY, +1, baseCSSClass);
            }

            selection.selectAll(".joint-state-hash-topic-view")
                        .attr("id", function(d) {return nameToDomId(d.name); });

            // Update
            updateIndicator(selection, 'position', jointStatePositionDialRadius, topPositionLabelY, bottomPositionLabelY);
            updateIndicator(selection, 'velocity', jointStateVelocityDialRadius, topVelocityLabelY, bottomVelocityLabelY);
            updateIndicator(selection, 'effort', jointStateEffortDialRadius, topEffortLabelY, bottomEffortLabelY);
        }

        //  Each topicView type has a tick() method that is called from the D3/Cole tick()
        //  functions. This too is a class method equivalent.
        //
        module.jointStateHashTopicView.tick = function() {

        }

        // ==================== Floor Pose Viewer ============================

        // Gneral-purpose viewer for showing the pose of floor-based robots.
        // Shows an arrow where a pose was defined at a moment in time. Old arrows 
        // decay. Camera moves smoothly to keep arrows in view.
        // Intended for odometry messges and similar.

        module.floorPoseTopicView = function(spec, my) {
            var viewType = "floorPoseTopicView";
            var my = my || {};
            my.viewType = my.viewType || viewType;
            var that = module.threeDTopicView(spec, my);

            var MAX_ODOMETRY_POINTS = 200;
            var TIME_BETWEEN_MARKERS = 0.2;

            var lastTimestamp = null, deltaTime;
            var fieldOfView = Math.PI /6.0;
            var vectorX = 1.0, vectorY = 1.0, vectorZ = 1.0;
            var cameraVelocityX = 0.2, cameraVelocityY = 0.2, cameraVelocityZ = 0.2;
            var lastMessageTimestamp = null;
            var topicScene = null;
            var odometryPoints = new Array;
            var lastPose;

            // Called by threeDTopicView superclass
            //  scene - THREE.js scene
            //  camera - THREE.js camera
            //
            var buildScene = function(scene, camera) {
                var grid, light;

                light = new THREE.PointLight( 0xffffff, 5, 600 );
                light.position.x = 30;
                light.position.y = 30;
                light.position.z = -10;
                scene.add(light);

                // Camera
                that.camera = camera;
                that.camera.rotation.x = - Math.PI / 15;
                that.camera.position.set(0.0, 20.0, 0.0);

                // Floor grid
                var grid = new THREE.GridHelper (75, 1);
                scene.add(grid);

                topicScene = scene;

            }
            that.buildScene = buildScene;

            // Called for each instance whenever mesage is received (?)
            //  node - the node on uiGraph
            //
            var update = function(node) {
                var messageFromServer = node.data.message,
                    pose = messageFromServer.pose.pose;

                if (topicScene) {

                    if ((!lastMessageTimestamp)||(((Date.now() - lastMessageTimestamp)/1000) > TIME_BETWEEN_MARKERS)) {

                        if (!that.marker) {
                            that.marker = createMarkerAtPose(pose);
                            topicScene.add(that.marker);
                        }
                        moveMarkerToPose(that.marker, pose);

                        /*
                        if (!that.centreMarker) {
                            that.centreMarker = createMarkerAtPose(pose);
                            topicScene.add(that.centreMarker);                            
                        }
                        if (that.boundingSphere) {
                            that.centreMarker.position.x = that.boundingSphere.centre.x;
                            that.centreMarker.position.y = that.boundingSphere.centre.y;
                            that.centreMarker.position.z = that.boundingSphere.centre.z;
                        }
                        */

                        // Lines
                        if (lastPose) {
                            var line = createLineToPose(pose, lastPose);
                            topicScene.add(line);
                            odometryPoints.push({line: line, pose: pose});
                            if (odometryPoints.length > MAX_ODOMETRY_POINTS) {
                                var oldLine = odometryPoints[0].line;
                                topicScene.remove(oldLine);
                                odometryPoints.shift();
                            }
                        }    
                        lastPose = pose;
                    }
                }
            };
            that.update = update;

            var lineMaterial;

            function createLineToPose(pose, lastPose) {
                var lineMaterial = (lineMaterial) ? lineMaterial : new THREE.LineBasicMaterial({ color: 0xff0000 });
                var geometry = new THREE.Geometry(); 
                geometry.vertices.push( 
                    new THREE.Vector3(-lastPose.position.y, lastPose.position.z, -lastPose.position.x), 
                    new THREE.Vector3(-pose.position.y, pose.position.z, -pose.position.x)
                    ); 
                var line = new THREE.Line( geometry, lineMaterial ); 
                return line;
            }

            function createMarkerAtPose(pose) {
                var mesh;

                mesh = createCubeAtPose(pose);

                return mesh;
            }

            function createCubeAtPose(pose) {
                var geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
                var material = new THREE.MeshPhongMaterial( { color: 0xff0000 } );
                var mesh = new THREE.Mesh( geometry, material );

                mesh.position.x = -pose.position.y;
                mesh.position.y = pose.position.z;
                mesh.position.z = -pose.position.x;


                var triangleGeometry = new THREE.Geometry();
                var v1 = new THREE.Vector3(0.1, 0.15, 0.1),
                    v2 = new THREE.Vector3(0.0, 0.15, -0.1),
                    v3 = new THREE.Vector3(-0.1, 0.15, 0.1);
                triangleGeometry.vertices.push(v1);
                triangleGeometry.vertices.push(v2);
                triangleGeometry.vertices.push(v3);

                triangleGeometry.faces.push( new THREE.Face3( 0, 1, 2 ) );
                triangleGeometry.computeFaceNormals();
                var triangleMesh = new THREE.Mesh(triangleGeometry, new THREE.MeshNormalMaterial() );
                mesh.add(triangleMesh);

                return mesh;
            }

            function moveMarkerToPose(marker, pose) {
                marker.position.x = -pose.position.y;
                marker.position.y = pose.position.z;
                marker.position.z = -pose.position.x;
                var quaternion = pose.orientation;
                var rotation = new THREE.Euler().setFromQuaternion(quaternion);
                marker.rotation.x = -rotation.y;
                marker.rotation.y = rotation.z;
                marker.rotation.z = -rotation.x;
            }

            function moveMarkerToPosition(marker, position) {
                marker.position.x = -position.y;
                marker.position.y = position.z;
                marker.position.z = -position.x;
            }

            // Called by this class
            var animate = function() {
            }
            that.animate = animate;

            // Called by browser on each animation frame
            //
            var animateAndRender = function() {
                var node = spec.node,
                    messageFromServer = spec.node.data.message, 
                    now;

                // Time since last iteration
                now = Date.now();
                if (!lastTimestamp) {
                    lastTimestamp = now - 10;
                }
                deltaTime = (now - lastTimestamp) /1000;
                lastTimestamp = now;

                that.boundingSphere = getBoundingSphereForOdometryPoints();
                moveCameraTowardsBestPositionToSeeSphere(that.boundingSphere);

                // Call superclass
                that.render3D();
            };
            that.animateAndRender = animateAndRender;

            function getBoundingSphereForOdometryPoints() {
                var minX = null, maxX = null, minZ = null, maxZ = null;

                for (var i=0; i<odometryPoints.length; i++) {
                    var point = odometryPoints[i].pose,
                        x = -point.position.y,
                        y = point.position.z,
                        z = -point.position.x;
                    //console.log(i.toString() + ": " + x.toString() + ", " + z.toString());

                    if ((minX === null) || (x < minX)) {
                        minX = x;
                    }
                    if ((maxX === null) || (x > maxX)) {
                        maxX = x;
                    }
                    if ((minZ === null) || (z < minZ)) {
                        minZ = z;
                    }
                    if ((maxZ === null) || (z > maxZ)) {
                        maxZ = z;
                    }
                }

                return boundingSphereFromSquareOnFloor(minX, maxX, minZ, maxZ);
            }

            function boundingSphereFromSquareOnFloor(minX, maxX, minZ, maxZ) {
                var offsetX = (maxX - minX) / 2,
                    offsetZ = (maxZ - minZ) / 2;

                var centreX = offsetX + minX,
                    centreZ = offsetZ + minZ,
                    centre = new THREE.Vector3(centreX, 0.0, centreZ);

                var radius = Math.sqrt(offsetX*offsetX + offsetZ*offsetZ);   

                var boundingSphere = {
                    centre: centre
                };
 
                boundingSphere.radius = (radius === 0) ? 2.0 : radius;

                return boundingSphere;
            }

            function moveCameraTowardsBestPositionToSeeSphere(boundingSphere) {
                var distance = boundingSphere.radius / Math.tan(fieldOfView / 2);

                var targetX = boundingSphere.centre.x + distance * vectorX;
                var targetY = boundingSphere.centre.y + distance * vectorY;
                var targetZ = boundingSphere.centre.z + distance * vectorZ;

                var deltaX = (targetX - that.camera.position.x) * cameraVelocityX * deltaTime;
                var deltaY = (targetY - that.camera.position.y) * cameraVelocityY * deltaTime;
                var deltaZ = (targetZ - that.camera.position.z) * cameraVelocityZ * deltaTime;

                that.camera.position.x += deltaX;
                that.camera.position.y += deltaY;
                that.camera.position.z += deltaZ;

                that.camera.lookAt(boundingSphere.centre);
            }

            return that;            
        }

        // Called each time the graph is changed
        //  selection - selection of nodes
        //  uiGraph - graph to join with
        //
        module.floorPoseTopicView.updateViews = function(selection, uiGraph) {
            module.threeDTopicView.updateViews(selection, uiGraph, "floorPoseTopicView");
        };

        // Called in each tick() of the force layout simulation
        //
        module.floorPoseTopicView.tick = function() {
            module.threeDTopicView.tick("floorPoseTopicView");
        };

        // ==================== SVG Topic View Template ======================

        // TopicView constructor.
        //  var topicView = TopicViewer.FOOTopicView(spec)
        //  where spec is a hash of options for the creation of the topicView
        // 
        module.FOOTopicView = function(spec, my) {
            var spec = spec || {},
                viewType = "FOOTopicView",
                my = my || {};
            my.viewType = my.viewType || viewType;
            var that = topicView(spec, my);

            // Called for each instance whenever the UI graph is changed
            //  node - the node on uiGraph
            //
            var update = function(node) {
            };
            that.update = update;

            // Called by browser for each instance on each animation frame
            //
            var animateAndRender = function() {
            };
            that.animateAndRender = animateAndRender;

            return that;
        }

        // "Class method" called once whenever graph is updated and force.start() called
        // Updates all visible FOOTopicViews
        //  selection - d3 selection of all nodes
        //  uiGraph - pointer to uiGraph
        //
        module.FOOTopicView.updateViews = function(selection, uiGraph) {

        }

        //  Each topicView type has a tick() method that is called from the D3/Cole tick()
        //  functions. This too is a class method equivalent.
        //
        module.FOOTopicView.tick = function() {

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

            // Called by browser on each animation frame
            //
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

