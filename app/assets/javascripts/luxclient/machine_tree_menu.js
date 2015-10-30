// This module manages the menu on the left hand side of the screen.
// The menu lists the ROS packages and rosrun / roslaunch targets supplied by
// the server. d3 is used to render the menu.
//

var MachineTreeMenu = (function() {
    "use strict";
    
    var module = {};


	module.updateMachineMenu = function(machineTreeMenu, uiGraph, DragDropManager, ProtocolToUiLayer) {
		var machineTypesToIcons = {
			'embedded' : 'icon ti-package',
			'cloud' : 'icon ti-cloud',
			'desktop' : 'icon ti-desktop',
			'node' : 'icon ti-control-record',
			'launch' : 'icon ti-layers-alt',
			'script' : 'icon ti-receipt'
		};

		machineTreeMenu
			.datum({name:'', node_type: 'root', children : uiGraph.machines});

		var machines = machineTreeMenu.selectAll(".menu-machine")	
			.data(function(d) { return (d.children) ? (d.children) : []});	
		var newMachines = machines.enter()
							  		.append('li')
							  		.attr("class", "submenu menu-machine");
		addMachines(newMachines);
		machines.exit().remove();
		machines.each(function(d) {
			if (d.children) {
				var packages = machines.selectAll(".menu-packages")
								.selectAll(".menu-package")
								.data(function(d) { return (d.children) ? (d.children) : []});
				var newPackages = packages.enter()
											.append('li')
											.attr("class", "submenu menu-package");
				addPackages(newPackages);
				packages.exit().remove();
				packages.each(function(d) {
					if (d.children) {
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
			}
		});
		setAllTargetsToBeDraggable();

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

		function addTargets(menuItem) {
			var link = newLink(menuItem, "#menu_level_one", "drag-to-launch");	

			link.append("i")
				.attr("class", function(d) {return machineTypesToIcons[d.node_type]});	

			link.append("span")
				.text(function(d) {return d.name});

			var list = newList(menuItem, "#menu_level_two", "menu_none");								
			return link;
		}

		function newLink(menuItem, href, extraClass) {
			return menuItem
				.append("a")
				.attr("class", "waves-effect waves-light " + extraClass)
				.attr("href", href);
		}

		function newList(menuItem, listId, levelDefinition) {
			return menuItem
				.append("ul")
				.attr("class", "machine-menu-item list-unstyled " + levelDefinition)	
				.attr("id", listId);	
		}

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
		function droppedDraggableItemOntoGroup(draggedItem, dropTarget) {
			console.log(draggedItem);
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



