// This module manages the menu on the left hand side of the screen.
// The menu lists the ROS packages and rosrun / roslaunch targets supplied by
// the server. d3 is used to render the menu.
//

var MachineTreeMenu = (function() {
    "use strict";
    
    var module = {};

    function humanName(key) {
    	key = key.replace(/_/g, ' ');
    	return key.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    // Called from UI to indicate that the machine menu (currently on screen left)
    // needs updating.
    //	machineTreeMenu - d3 selection of the <div> containing the machine menu
    //	uiGraph - The graph that holds the UI contents
    //	DragDropManager - Object that allows you to drag and drop from HTML to SVG
    //	ProtocolToUiLayer - the layer that handles communication with the server
    //
	module.updateMachineMenu = function(machineTreeMenu, uiGraph, DragDropManager, ProtocolToUiLayer) {
	
		// Lookup table that converts a package content type with the CSS class of an icon
		var machineTypesToIcons = {
			'embedded' : 'icon ti-package',
			'cloud' : 'icon ti-cloud',
			'desktop' : 'icon ti-desktop',
			'node' : 'icon ti-control-record',
			'launch' : 'icon ti-layers-alt',
			'script' : 'icon ti-receipt'
		};

		// Save some data on the DOM element
		machineTreeMenu
			.datum({name:'', node_type: 'root', children : uiGraph.machines});

		// Render a hierarchical menu where the top level is "machine"
		var machines = machineTreeMenu.selectAll(".menu-machine")	
			.data(function(d) { return (d.children) ? (d.children) : []});	
		var newMachines = machines.enter()
							  		.append('div')
							  		.attr('class', 'panel panel-default menu-machine')
							  		.each(function(d, i) {
							  			var machineNumber = i.toString(); 
							  			d3.select(this).append('div')
							  				.attr('class', 'panel-heading')
							  				.attr('role', 'tab')
							  				.attr('id', 'headingModal' + machineNumber)
							  				
							  				.each(function(d){
							  					d3.select(this).append('h4')
							  						.attr('class', 'panel-title')
							  						.each(function(d){
							  							d3.select(this).append('a')
							  								.attr('class', 'collapsed')
							  								.attr('data-toggle', 'collapse')
							  								.attr('data-parent', '#accordionOne')
							  								.attr('href', '#collapseModal' + machineNumber)
							  								.attr('aria-expanded', 'true')
							  								.attr('aria-controls', 'collapse' + machineNumber)
							  								.text(d.name)
							  								.each(function(d){
							  									d3.select(this).append('i')
							  										.attr('class', 'chevron ti-angle-down');
							  								});
							  						});
							  				})
																						/*
							  				.append('div')
							  					.attr('id', 'collapseModal' + machineNumber)
							  					.attr('class', 'panel-collapse collapse in')
							  					.attr('role', 'tab-panel')
							  					.attr('aria-labelledby', 'heading' + machineNumber)
							  					.each(function(d) {
							  						d3.select(this).append('div')
							  							.attr('class', 'panel-body no_padding')
							  							.each(function(d) {
							  								d3.select(this).append('ul')
							  									.attr('class', 'list-group contacts-list menu-packages');
							  							});
							  					});
							  				*/	
							  		});

/*
		newMachines.each(function(d){
	  					d3.select(this).append('h4')
	  						.attr('class', 'panel-title')
	  						.each(function(d){
	  							d3.select(this).append('a')
	  								.attr('class', 'collapsed')
	  								.attr('data-toggle', 'collapse')
	  								.attr('data-parent', '#accordionOne')
	  								.attr('href', '#collapseModal' + machineNumber)
	  								.attr('aria-expanded', 'true')
	  								.attr('aria-controls', 'collapse' + machineNumber)
	  								.text(d.name)
	  								.each(function(d){
	  									d3.select(this).append('i')
	  										.attr('class', 'chevron ti-angle-down');
	  								});
	  						});
	  				});
*/
		var machineNumber = "x";

		newMachines.append('div')
						.attr('id', 'collapseModal' + machineNumber)
						.attr('class', 'panel-collapse collapse in')
						.attr('role', 'tab-panel')
						.attr('aria-labelledby', 'heading' + machineNumber)
						.each(function(d) {
							d3.select(this).append('div')
								.attr('class', 'panel-body no_padding')
								.each(function(d) {
									d3.select(this).append('ul')
										.attr('class', 'list-group contacts-list menu-packages');
							  	});
						});


		// render the menu rows that display the machine name and icon							  		
		//addMachines(newMachines);

		// Remove any disconnected machines
		machines.exit().remove();

		// Each machine contains packages
		machines.each(function(d) {
			if (d.children) {
				var packages = machines.selectAll(".menu-packages")
								.selectAll(".menu-package")
								.data(function(d) { return (d.children) ? (d.children) : []});
				// Create rows for new packages								
				var newPackages = packages.enter()
											.append('li')
											.attr("class", "list-group-item menu-package")
											.each(function(d){
												d3.select(this).append('a')
													.attr('href', '#')
												.each(function(d){
													d3.select(this).append('div')
														.attr('class', 'avatar')
														.each(function(d){
															d3.select(this).append('img')
																.attr('src', '/assets/piluku/avatar/one.png')
																.attr('alt', '');
															});
													d3.select(this).append('span')
														.attr('class', 'name')
														.text(humanName(d.name));
													d3.select(this).append('i')
														.attr('class', 'ion ion-record online');	
												});	
											});

				// Render package rows											
				//addPackages(newPackages);
				packages.exit().remove();
				/*
				packages.each(function(d) {
					if (d.children) {
						// Render a row for each target
						var targets = packages.selectAll(".menu-targets")
										.selectAll(".menu-target")
										.data(function(d) { return (d.children) ? (d.children) : []});
						var newTargets = targets.enter()
												  .append("li")
												  .attr("class", "submenu menu-target");
						addTargets(newTargets)
							.attr("id", function(d) {var targetId = d.node_type + "-" + packages.datum().name + "-" + d.name; return targetId;});	

						targets.exit().remove();										
					}
				});
				*/										
			}
		});
		setAllTargetsToBeDraggable();

		// Each machine has a row with an icon, machine name and an arrow
		//	menuItem - d3 selection of <div>s for rendering machines into 
		//
		function addMachines(menuItem) {
			var link = newLink(menuItem, "#menu_levels", "");

			link.append("i")
				.attr("class", function(d) { return machineTypesToIcons[d.node_type]});

			link.append("span")
				.attr("class", "text")
				.text(function(d) {return d.name});							

			link.append("i")
				.attr("class", "chevron ti-angle-right");

			var list = newList(menuItem, "#menu_levels", "menu-packages");								
			return link;
		}

		// Each package has a row with the package name and an arrow
		//	menuItem - d3 selection of <div>s for rendering packages into 
		//
		function addPackages(menuItem) {
			var link = newLink(menuItem, "#menu_level_one", "");

			link.text(function(d) {return d.name});	

			link.append("span")
				.attr("class", "pull-right drop-arrow")
				.append("i")
				.attr("class", "drop-indicator chevron ti-angle-right");

			var list = newList(menuItem, "#menu_level_one", "menu-targets");								

			return link;
		}

		// Each target has a row with an icon, target name and an arrow
		//	menuItem - d3 selection of <div>s for rendering targets into 
		//
		function addTargets(menuItem) {
			var link = newLink(menuItem, "#menu_level_one", "drag-to-launch");	

			link.append("i")
				.attr("class", function(d) {return machineTypesToIcons[d.node_type]});	

			link.append("span")
				.text(function(d) {return d.name});

			var list = newList(menuItem, "#menu_level_two", "menu_none");								
			return link;
		}

		// Render an <a href> link on the menu
		//	menuItem - d3 selection of <div>s
		//	href - URL to link to
		//	extraClass - additional CSS class to render
		//
		function newLink(menuItem, href, extraClass) {
			return menuItem
				.append("a")
				.attr("class", "waves-effect waves-light " + extraClass)
				.attr("href", href);
		}

		// Render a <ul> list on the menu
		//	menuItem - d3 selection of <div>s
		//	listId - CSS ID to add to the list
		//	levelDefinition - another CSS class that defines the level
		//
		function newList(menuItem, listId, levelDefinition) {
			return menuItem
				.append("ul")
				.attr("class", "machine-menu-item list-unstyled " + levelDefinition)	
				.attr("id", listId);	
		}

		// All targets in the menu can be dragged onto the SVG display
		// This function sets it up.
		//
		function setAllTargetsToBeDraggable() {
			var body = d3.select("body");

			$('.drag-to-launch').draggable({
				cursor: 'move',
				appendTo: 'body',
				helper: 'clone',
				cursorAt: { left: -20, top: -20 },

				// Register what we're dragging with the drop manager
				start: function (event) {
					// Getting the datum from the standard event target requires more work.
					DragDropManager.dragged = d3.select(event.target).datum();
				},
				// Set cursors based on matches, prepare for a drop
				drag: function (event) {
					var matches = DragDropManager.draggedMatchesTarget();
					body.style("cursor",function() {
						return (matches) ? "copy" : "move";
					});
					// Eliminate the animation on revert for matches.
					// We have to set the revert duration here instead of "stop"
					// in order to have the change take effect.
					//console.log(matches);
					//$(event.target).draggable("option","revert", matches);
					//$(event.target).draggable("option","revertDuration",(matches) ? 0 : 200);
				},
				// Handle the end state. For this example, disable correct drops
				// then reset the standard cursor.
				stop: function (event,ui) {
					// Dropped on a non-matching target.
					if (!DragDropManager.draggedMatchesTarget()) return;
					var draggedItem = d3.select(event.target).datum();
					$("body").css("cursor","");
					droppedDraggableItemOntoGroup(draggedItem, DragDropManager.droppable);
				}
			});

		}

		// User has dragged a draggable item and released it on top of a machine
		// This callback gets called and the corresponding action is triggered on
		// the UI to protocol layer.
		//	draggedItem - 	the dragged DOM <a href>
		//	dropTarget - 	the DOM element (the group) where the link is dragged to. This contains
		//					a hostname that is the place to do rosrun / roslaunch in the real world.
		//
		function droppedDraggableItemOntoGroup(draggedItem, dropTarget) {
			if (draggedItem.node_type === 'node') {
				ProtocolToUiLayer.rosrun(dropTarget.hostname, draggedItem.package, draggedItem.name);
			} else if (draggedItem.node_type === 'launch') {
				ProtocolToUiLayer.roslaunch(dropTarget.hostname, draggedItem.package, draggedItem.name);
			} else if (draggedItem.node_type === 'script') {
				ProtocolToUiLayer.rosrun(dropTarget.hostname, draggedItem.package, draggedItem.name);
			} else {
				throw("Unknown type");
			}
		}


	}


    return module;
})();



