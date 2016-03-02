// Development configuration with a local node.js server on 8080.
//
var LuxConfig = (function() {
	var module = {};

	module.socketsServer = "ws://localhost:8080/";

	return module;
})();