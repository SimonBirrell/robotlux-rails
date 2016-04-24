// This module manages the panel that shows the ROS instances in this organization that are connected
// and available for displaying.
//

var RosInstancesPanel = (function() {
    "use strict";
    
    var module = {};

    var Svg = null;

    var ConnectedInstances = [];

    // Call this when you know what organization the user belongs to.
    // It will display as the title of the ROS Instances Panel.
    //  organization - string name of Organization
    //
    module.setOrganization = function(organization) {
        d3.select("#connection-org").text(organization);
    };

    function getPanelTitleFromInstances() {
        var title = "";
        for (var i=0; i<ConnectedInstances.length; i++) {
            var instance = ConnectedInstances[i];
            title = title + instance.rosInstanceHumanId + ", ";
        }
        if (title.length>0) {
            title = title.substring(0, title.length - 2);
        } else {
            title = " ";
        }
        return title;
    }

    // Call this functio whenever the list of ROS instances gains or loses members
    // Displays ROS Instance panel and makes items blink when appropriate
    //  instances - An array of instance, each one being an object with .rosInstanceId and .rosInstanceHumanId attributes
    //  displayInstance - A callback that is called when a ROS Instance should now be displayed
    //  hideInstance - A callback that is called when a ROS Instance should now be hidden
    //  dontBlinkOnEntry - Set to true if you don't want a green blink for new items
    //
    module.updateInstances = function(instances, displayInstance, hideInstance, dontBlinkOnEntry) {
        var blinkOnEnterDuration = ((dontBlinkOnEntry) ? 0 : 5000),
            blinkOnExitDuration = 3000;

        // Control the appearance of the Connection icon on the top bar
        // The colour indicates the status 
        //  - Red means no ROS instances are connected
        //  - Orange means at least one ROS instances is connected, but none are visualized
        //  - Green means at least one ROS instance is connected and visualized
        // The number in a circle represents the number of connected ROS instances
        //
        var setNumberRosInstancesIndicator = function() {
            // Update number of instances on top panel
            $('#number-ros-instances-connected').text(instances.length.toString());

            if (instances.length >0) {
                $('#no-robots-detected').hide();
                $('#number-ros-instances-connected').removeClass('danger');
                $('#number-ros-instances-connected').removeClass('warning');
                $('#number-ros-instances-connected').removeClass('success');
                if (ConnectedInstances.length>0) {
                    $('#number-ros-instances-connected').addClass('success');
                } else {
                    $('#number-ros-instances-connected').addClass('warning');
                }
            } else {
                $('#number-ros-instances-connected').addClass('danger');
                $('#number-ros-instances-connected').removeClass('warning');            
                $('#number-ros-instances-connected').removeClass('success');            
            }
        };    

        // User has clicked on an instance in the connection menu
        //
        var changeInstanceStatus = function(that, d) {
            var statusIcon = d3.select(that).select('.ros-instance-status'),
                chosenStatus = statusIcon.classed('chosen');   
            // If connection lost, choosing has no effect
            if (!statusIcon.classed('danger')) {
                chosenStatus = !chosenStatus;    
                statusIcon.classed('chosen', chosenStatus);
                if (chosenStatus) {
                    statusIcon.classed('success', true);
                    statusIcon.classed('hexagon', true);
                    statusIcon.classed('warning', false);
                    statusIcon.classed('outline-hexagon', false);
                    ConnectedInstances.push(d);
                    displayInstance(d);
                } else {
                    statusIcon.classed('outline-hexagon', true);
                    statusIcon.classed('hexagon', false);
                    statusIcon.classed('success', false);
                    statusIcon.classed('warning', false);
                    var index = ConnectedInstances.indexOf(d);
                    if (index > -1) {
                        ConnectedInstances.splice(index, 1);
                    }
                    hideInstance(d);
                }
                setNumberRosInstancesIndicator();
                // Set panel name
                $('#ros-space-panel-title').text(getPanelTitleFromInstances(instances));
                // Remove menu one second later (enough time to see instance selected)
                setTimeout(function() {
                    $('#ros-connection-menu').removeClass('open', false);
                }, 1000);
            }
            // Selecting / de-selecting doesn't remove menu immediately
            d3.event.stopPropagation();
        };

        // When an instance disconnects, display red for a few seconds
        //
        var displayExitingInstances = function(selection) {
            selection
                .transition()
                .duration(blinkOnExitDuration)
                .each('end', function(d) {
                    if (instances.length == 0) {
                        $('#no-robots-detected').show();
                    }
                })
                .remove();

            selection
                .selectAll(".ros-instance-status")
                    .attr("class", "ros-instance-status hexagon danger");
            selection
                .selectAll(".time_info")
                    .text('Lost connection...');
        };

        // Render Status icon inside link
        //
        var addStatusIcon = function(that) {
            // <div class="hexagon">
            d3.select(that).append('div')
                .attr('class', 'ros-instance-status hexagon warning')
                .each(function(d){
                    // <i class="ion bug"></i>
                    d3.select(this).append('span')
                        .each(function(d){
                            d3.select(this).append('i')
                                .attr('class', 'ion-bug');
                        })
                });
            // <span class="text_info">    
            d3.select(that).append('span')
                .attr('class', 'text_info')
                .text(function(d) {return d.rosInstanceHumanId; });
            // <span class="time_info">    
            d3.select(that).append('span')
                .attr('class', 'time_info')
                .text('Connecting...');                             
        };

        // Change status hexagon to be connected
        //
        var switchToConnectedStatusIcon = function(that) {
            d3.select(that).selectAll('.time_info')
                .text("Connected ok");
            var statusIcon = d3.select(that).select('.ros-instance-status'),
                chosenStatus = statusIcon.classed('chosen');   
            if (!chosenStatus) {
                statusIcon.attr("class", "ros-instance-status outline-hexagon");
            }    
        };

        // For each new Menu Item, add a an <li> item with a link inside
        // The link should change status when clicked.
        //
        var addLinksForNewRosInstances = function(rosInstanceMenuItems) {
            // Selection of new instances since last update
            var rosInstanceMenuItemsEntering = rosInstanceMenuItems    
                .enter()
                // <li class="ros-instance">
                .append("li")
                    .attr("class", "ros-instance")
                    .on("click", function(d) {
                        changeInstanceStatus(this, d);
                    });

            // New instances stay orange for a few seconds then become clear outlines
            rosInstanceMenuItemsEntering  
                .transition()
                .duration(blinkOnEnterDuration)
                .each('end', function(d) {
                    d3.select(this).attr("class", "ros-instance");
                });

            // Connection link
            // <a href="#">
            var links = rosInstanceMenuItemsEntering            
                .append("a")
                    .attr('href', '#');

            return links;
        };

        //////////////////////////////////////////////////////////////////////////
        // The update code starts here

        // Show 'no robots connected' message if number instances is zero
        setNumberRosInstancesIndicator();

        // Selection of instances to display
        var rosInstanceMenuItems = d3.select("#ros-instances-list")
            .selectAll(".ros-instance")
            .data(instances, function(d) {return d.rosInstanceId;});

        var newLinks = addLinksForNewRosInstances(rosInstanceMenuItems);

        newLinks.each(function(d){
            addStatusIcon(this);
        });

        newLinks.transition()
            .duration(blinkOnEnterDuration)
            .each('end', function(d) {
                switchToConnectedStatusIcon(this);
            });

        var rosInstanceMenuItemsExiting = rosInstanceMenuItems.exit();
        displayExitingInstances(rosInstanceMenuItemsExiting);    
    };

    function rosInstanceIdToCssId(rosInstanceId) {
        var spacesToDashes = rosInstanceId.replace();

        spacesToDashes = spacesToDashes.toLowerCase();
        spacesToDashes = spacesToDashes.replace(/(^\s+|[^a-zA-Z_0-9 ]+|\s+$)/g,"");   
        spacesToDashes = spacesToDashes.replace(/\s+/g, "-");

        return "ros-instance-" + spacesToDashes;
    }

    return module;
})();

