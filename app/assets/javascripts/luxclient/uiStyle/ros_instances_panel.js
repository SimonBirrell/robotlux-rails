// This module manages the panel that shows the ROS instances in this organization that are connected
// and available for displaying.
//

var RosInstancesPanel = (function() {
    "use strict";
    
    var module = {};

    var Svg = null;

    var NumberConnectedInstances = 0;
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

        var setNumberRosInstancesIndicator = function() {
            // Update number of instances on top panel
            $('#number-ros-instances-connected').text(instances.length.toString());

            if (instances.length >0) {
                $('#no-robots-detected').hide();
                $('#number-ros-instances-connected').removeClass('danger');
                $('#number-ros-instances-connected').removeClass('warning');
                $('#number-ros-instances-connected').removeClass('success');
                if (NumberConnectedInstances>0) {
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

        // Show 'no robots connected' message if number instances is zero
        setNumberRosInstancesIndicator();

        var rosInstanceMenuItems = d3.select("#ros-instances-list")
            .selectAll(".ros-instance")
            .data(instances, function(d) {return d.rosInstanceId;});

        var rosInstanceMenuItemsEntering = rosInstanceMenuItems    
            .enter()
            .append("li")
                .attr("class", "ros-instance")
                .on("click", function(d) {
                    var statusIcon = d3.select(this).select('.ros-instance-status'),
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
                            NumberConnectedInstances += 1;
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
                            NumberConnectedInstances -= 1;
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
                });

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

        links.each(function(d){
                    // <div class="hexagon">
                    d3.select(this).append('div')
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
                    d3.select(this).append('span')
                        .attr('class', 'text_info')
                        .text(function(d) {return d.rosInstanceHumanId; });
                    // <span class="time_info">    
                    d3.select(this).append('span')
                        .attr('class', 'time_info')
                        .text('Connecting...');                             
                });

        links.transition()
            .duration(blinkOnEnterDuration)
            .each('end', function(d) {
                d3.select(this).selectAll('.time_info')
                    .text("Connected ok");
                var statusIcon = d3.select(this).select('.ros-instance-status'),
                    chosenStatus = statusIcon.classed('chosen');   
                if (!chosenStatus) {
                    statusIcon.attr("class", "ros-instance-status outline-hexagon");
                }    
            });

        var rosInstanceMenuItemsExiting = rosInstanceMenuItems   
            .exit();

        // When connection is lost
        rosInstanceMenuItemsExiting
            .transition()
            .duration(blinkOnExitDuration)
            .each('end', function(d) {
                if (instances.length == 0) {
                    $('#no-robots-detected').show();
                }
            })
            .remove();

        rosInstanceMenuItemsExiting
            .selectAll(".ros-instance-status")
                .attr("class", "ros-instance-status hexagon danger");
        rosInstanceMenuItemsExiting
            .selectAll(".time_info")
                .text('Lost connection...');

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

