// This module manages the panel that shows the ROS instances in this organization that are connected
// and available for displaying.
//

var RosInstancesPanel = (function() {
    "use strict";
    
    var module = {};

    var Svg = null;

    module.setOrganization = function(organization) {

    };

    module.updateInstances = function(instances) {
        console.log("Updating ROS Instances panel");
        //console.log(instances[0]['rosInstanceId']);

        var rosInstanceMenuItems = d3.select("#ros-instances-list")
            .selectAll("li")
            .data(instances, function(d) {return d.rosInstanceId;});

        var rosInstanceMenuItemsEntering = rosInstanceMenuItems    
            .enter()
            .append("li")
                .attr("class", function(d) {
                    return "ms-hover";
                });

        rosInstanceMenuItemsEntering
            .append("input")
                .attr("type", "checkbox")
                .attr("id", function(d) {return rosInstanceIdToCssId(d.rosInstanceId)});

        var rosInstanceMenuItemsLabel = rosInstanceMenuItems
            .append("label")
                .attr("for", function(d) {return rosInstanceIdToCssId(d.rosInstanceId)});

        rosInstanceMenuItemsLabel
            .append("span")
            .text(" ");

        rosInstanceMenuItemsLabel
            .append("strong")
            .text(function(d) {return d.rosInstanceId; });

        var rosInstanceMenuItemsExiting = rosInstanceMenuItems   
            .exit();

        rosInstanceMenuItemsExiting
            .attr("class", "connection-lost")
            .transition()
            .duration(5000)
            .remove();

        rosInstanceMenuItemsExiting
            .selectAll("strong")
                .attr("class", "connection-lost blink");

    };

    function rosInstanceIdToCssId(rosInstanceId) {
        // TODO
        return "ros-instance-";
    }

    return module;
})();

