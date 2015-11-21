// This module manages the top part of the menu on the left hand side of the screen.
// The menu lists the ROS instances available for this organization plus displays any connection
// warning messages.
//

var ConnectionPanel = (function() {
    "use strict";
    
    var module = {};

    var status = null;

    module.connecting = function() {
    	status = "connecting";
    	clearPanel();
    	$('#connection-panel-warning').show();
    };

    module.couldntConnect = function() {
    	status = "couldntConnect";
    	clearPanel();
    	$('#connection-panel-danger').show();
    };

    module.connectionLost = function() {
    	status = "connectionLost";
    	clearPanel();
    	$('#connection-panel-danger').show();
    };

    module.connectionOk = function() {
    	status = "connectionOk";
    	clearPanel();
    	$('#connection-panel-success').show();
    	setTimeout(function() {
    		if (status === 'connectionOk') {
		    	clearPanel();
    		}
    	}, 1500);
    };

    function clearPanel() {
    	$('#connection-panel-warning').hide();
    	$('#connection-panel-danger').hide();
    	$('#connection-panel-success').hide();
    }

    return module;
})();

