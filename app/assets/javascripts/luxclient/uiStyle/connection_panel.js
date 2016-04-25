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
        setConnectionIconStatus('warning');
    };

    module.couldntConnect = function() {
    	status = "couldntConnect";
    	clearPanel();
    	$('#connection-panel-danger').show();
        setConnectionIconStatus('danger');
    };

    module.connectionLost = function(secondsToReconnect, reconnectCallback) {
    	status = "connectionLost";
    	clearPanel();
        module.connectionLostUpdateReconnectSeconds(secondsToReconnect);
        $('#connection-panel-reconnect-retry').click(reconnectCallback);
    	$('#connection-panel-danger').show();  
        setConnectionIconStatus('danger');
    };

    module.connectionLostUpdateReconnectSeconds = function(secondsToReconnect) {
        $('#connection-panel-reconnect-seconds').text(secondsToReconnect);
    };

    module.connectionOk = function() {
    	status = "connectionOk";
    	clearPanel();
    	$('#connection-panel-success').show();
        setConnectionIconStatus('success');
    };

    function clearPanel() {
    	$('#connection-panel-warning').hide();
    	$('#connection-panel-danger').hide();
    	$('#connection-panel-success').hide();
    }

    function setConnectionIconStatus(status) {
        $('#server-connection-status').removeClass('danger');        
        $('#server-connection-status').removeClass('warning');        
        $('#server-connection-status').removeClass('success');        
        $('#server-connection-status').addClass(status);        
    }

    return module;
})();

