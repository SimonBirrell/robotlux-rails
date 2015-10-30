// The current config file
// Overwritten by either lux_config_development.js or lux_config_production.js
// dependig on how you configure the client.
//
var LuxConfig = (function() {
	var module = {};

	module.socketsServer = "ws://localhost:8080/";

	return module;
})();