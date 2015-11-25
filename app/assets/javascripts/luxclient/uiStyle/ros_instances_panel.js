// This module manages the panel that shows the ROS instances in this organization that are connected
// and available for displaying.
//

var RosInstancesPanel = (function() {
    "use strict";
    
    var module = {};

    var Svg = null;

    // Call this when you know what organization the user belongs to.
    // It will display as the title of the ROS Instances Panel.
    //  organization - string name of Organization
    //
    module.setOrganization = function(organization) {
        d3.select("#connection-org").text(organization);
    };

    // Call this functio whenever the list of ROS instances gains or loses members
    // Displays ROS Instance panel and makes items blink when appropriate
    //  instances - An array of instance, each one being an object with .rosInstanceId and .rosInstanceHumanId attributes
    //  displayInstance - A callback that is called when a ROS Instance should now be displayed
    //  hideInstance - A callback that is called when a ROS Instance should now be hidden
    //  dontBlinkOnEntry - Set to true if you don't want a green blink for new items
    //
    module.updateInstances = function(instances, displayInstance, hideInstance, dontBlinkOnEntry) {
        var blinkOnEnterDuration = ((dontBlinkOnEntry) ? 0 : 5000),
            blinkOnExitDuration = 5000;

        console.log("Updating ROS Instances panel");

        var rosInstanceMenuItems = d3.select("#ros-instances-list")
            .selectAll("li")
            .data(instances, function(d) {return d.rosInstanceId;});

        var rosInstanceMenuItemsEntering = rosInstanceMenuItems    
            .enter()
            .append("li")
                .attr("class", "connection-new")
                .on("click", function(d) {
                    var inputTag = d3.select(this).select("input")[0][0];
                    if ((!d.display)&&(inputTag.checked)) {
                        d.display = true;
                        displayInstance(d);
                    } else if ((d.display)&&(!inputTag.checked)) {
                        d.display = false;
                        hideInstance(d);
                    };
                });

        rosInstanceMenuItemsEntering  
            .transition()
            .duration(blinkOnEnterDuration)
            .each('end', function(d) {
                d3.select(this).attr("class", "connection-ok");
            });

        rosInstanceMenuItemsEntering
            .append("input")
                .attr("type", "checkbox")
                .attr("id", function(d) {return rosInstanceIdToCssId(d.rosInstanceId)});

        var rosInstanceMenuItemsLabel = rosInstanceMenuItemsEntering
            .append("label")
                .attr("for", function(d) {return rosInstanceIdToCssId(d.rosInstanceId)});

        rosInstanceMenuItemsLabel
            .append("span")
            .text(" ");

        rosInstanceMenuItemsLabel
            .append("strong")
            .attr("class", "connection-new blink")
            //.text(function(d) {return d.rosInstanceId; })
            .text(function(d) {return d.rosInstanceHumanId; })
            .transition()
            .duration(blinkOnEnterDuration)
            .each('end', function(d) {
                d3.select(this).attr("class", "connection-ok");
            });

        var rosInstanceMenuItemsExiting = rosInstanceMenuItems   
            .exit();

        rosInstanceMenuItemsExiting
            .attr("class", "connection-lost")
            .transition()
            .duration(blinkOnExitDuration)
            .remove();

        rosInstanceMenuItemsExiting
            .selectAll("strong")
                .attr("class", "connection-lost blink");

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

