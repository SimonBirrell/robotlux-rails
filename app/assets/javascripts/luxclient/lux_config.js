// Production configuration with node.js server on Heroku, port 80
//

var LuxConfig = (function() {
	var module = {};

	module.socketsServer = "ws://luxserver.herokuapp.com/"; 

	return module;
})();