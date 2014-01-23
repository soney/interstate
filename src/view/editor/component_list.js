/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael,RedMap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;
	var insert_at = function (child_node, parent_node, index) {
		var children = parent_node.childNodes;
		if (children.length <= index) {
			parent_node.appendChild(child_node);
		} else {
			var before_child = children[index];
			parent_node.insertBefore(child_node, before_child);
		}
	};
	var remove = function (child_node) {
		var parent_node = child_node.parentNode;
		if (parent_node) {
			parent_node.removeChild(child_node);
		}
	};
	var move = function (child_node, from_index, to_index) {
		var parent_node = child_node.parentNode;
		if (parent_node) {
			if (from_index < to_index) { //If it's less than the index we're inserting at...
				to_index += 1; //Increase the index by 1, to make up for the fact that we're removing me at the beginning
			}
			insert_at(child_node, parent_node, to_index);
		}
	};
	$.widget("interstate.component_list", {
		options: {
			info_servers: false
		},

		_create: function() {
			var info_servers = this.option("info_servers");
			this.element.addClass("component_list");
			this.$programs = cjs(function() {
				return info_servers.programs.get();
			}, {
				context: this
			});
			this.$components = cjs(function() {
				return info_servers.components.get();
			}, {
				context: this
			});
			var close_button = $("<a href='javascript:void(0)' class='close'>x</a>").appendTo(this.element).on("click", _.bind(function() {
				this.element.hide();
			}, this));
			
			$("<h3 />").text("Programs").appendTo(this.element);
			this.progs = $("<div />")	.addClass("programs")
										.appendTo(this.element);
			this.save_button = $("<a>").attr("href", "javascript:void(0)")
										.addClass("save")
										.appendTo(this.element)
										.text("save")
										.on("click", _.bind(this.save_curr, this));
			$("<h3 />").text("Components").appendTo(this.element);
			this.components = $("<div />")	.addClass("components")
											.appendTo(this.element);
			var old_progs = [];
			this.progs_change_listener = cjs.liven(function() {
				var progs = this.$programs.get();
				var children = progs ? progs : [];
				var diff = _.diff(old_progs, children);

				_.forEach(diff.removed, function (info) {
					var index = info.from, child = info.from_item;
					var child_disp = this.progs.children().eq(index);
					child_disp	.component_item("destroy")
								.remove();
				}, this);
				_.forEach(diff.added, function (info) {
					var index = info.to, child = info.item;
					var child_disp = $("<div />").component_item({
						name: child,
						type: "program"
					});
					insert_at(child_disp[0], this.progs[0], index);
				}, this);
				_.forEach(diff.moved, function (info) {
					var from_index = info.from, to_index = info.to, child = info.item;
					var child_disp = this.progs.children().eq(from_index);
					move(child_disp[0], from_index, to_index);
				}, this);
				old_progs = children;
			}, {
				context: this,
				on_destroy: function() {
				}
			});

			var old_components = [];
			this.components_change_listener = cjs.liven(function() {
				var progs = this.$components.get();
				var children = progs ? progs : [];
				var diff = _.diff(old_components, children);

				_.forEach(diff.removed, function (info) {
					var index = info.from, child = info.from_item;
					var child_disp = this.components.children().eq(index);
					child_disp	.component_item("destroy")
								.remove();
				}, this);
				_.forEach(diff.added, function (info) {
					var index = info.to, child = info.item;
					var child_disp = $("<div />").component_item({
						name: child,
						type: "component"
					});
					insert_at(child_disp[0], this.components[0], index);
				}, this);
				_.forEach(diff.moved, function (info) {
					var from_index = info.from, to_index = info.to, child = info.item;
					var child_disp = this.components.children().eq(from_index);
					move(child_disp[0], from_index, to_index);
				}, this);
				old_components = children;
			}, {
				context: this,
				on_destroy: function() {
				}
			});

			$(this.element) .on("dragover.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.show_drag_over();
														return false;
													}, this))
						.on("dragout.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.hide_drag_over();
														return false;
													}, this))
						.on("dragenter.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.show_drag_over();
														return false;
													}, this))
						.on("dragleave.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														this.hide_drag_over();
													}, this))

						.on("drop.replace_program", _.bind(function(eve) {
														var event = eve.originalEvent;
														event.preventDefault();
														event.stopPropagation();
														var files = event.target.files || event.dataTransfer.files;
														if(files && files.length > 0) {
															// fetch FileList object
															var file = files[0];
															var fr = new FileReader();
															fr.onload = _.bind(function() {
																var result = fr.result,name = file.name;
																_.defer(_.bind(function() {
																	var event = new $.Event("load_saved_file");
																	event.filecontents = result;
																	event.filename = name;
																	this.element.trigger(event);
																}, this));

																delete fr.onload;
																fr = null;
															}, this);
															fr.readAsText(file);
														}
														this.hide_drag_over();
														return false;
													}, this));
		},

		_destroy: function() {
			this._super();
		},
		_setOption: function(key, value) {
			this._super(key, value);
		},
		save_curr: function(e) {
			var inp = $("<input type='text'>").insertBefore(e.target).focus();
			inp.on("blur", function() {
				inp.remove();
			}).on("keydown", _.bind(function(event) {
				if(event.keyCode === 13) {
					var val = inp.val();
					if(val.length > 0) {
						var new_event = new $.Event("save_curr");
						new_event.name = val;
						new_event.storage_type = "";
						this.element.trigger(new_event);
					}
					inp.remove();
				} else if(event.keyCode === 27) {
					inp.remove();
				}
			}, this));
			
		},
		show_drag_over: function() {
			$(this.element).addClass("drop_target");
			if(!this.hasOwnProperty("overlay")) {
				this.overlay = $("<div />")	.addClass("overlay")
											.css({
												"background-color": "#555",
												"opacity": "0.8",
												"position": "absolute",
												//"left": "0px",
												//"top": "0px",
												"width": "100%",
												"height": "100%",
												"pointer-events": "none",
												"border": "10px dashed #DDD",
												"box-sizing": "border-box"
											})
											.prependTo(this.element);
			}
		},

		hide_drag_over: function() {
			$(this.element).removeClass("drop_target");
			this.overlay.remove();
			delete this.overlay;
		},
	});

	$.widget("interstate.component_item", {
		options: {
			name: name,
			type: ""
		},

		_create: function() {
			this.element.addClass("row " + this.option("type"));
			this.close_button = $("<a>").attr("href", "javascript:void(0)")
										.appendTo(this.element)
										.addClass("action")
										.text("(delete)")
										.on("click", _.bind(this.close, this));
			this.download_button = $("<a>") .attr("href", "javascript:void(0)")
										.appendTo(this.element)
										.addClass("action")
										.text("(save)")
										.on("click", _.bind(this.download, this));
			this.label = $("<a />")	.text(this.option("name"))
									.attr("href", "javascript:void(0)")
									.addClass("label")
										//.editable_text({ text: this.option("name") })
										.appendTo(this.element);
			if(this.option("type") === "component") {
				this.element.attr("draggable", true)
							.on("dragstart.ondragstart", _.bind(this.on_drag_start, this));
			} else {
				this.label.on("click", _.bind(this.load, this));
				//this.load_button = $("<a>") .attr("href", "javascript:void(0)")
											//.appendTo(this.element)
											//.text("^")
											//.on("click", _.bind(this.load, this));
			}
		},

		_destroy: function() {
			this._super();
			//this.label.editable_text("destroy");
		},
		_setOption: function(key, value) {
			this._super(key, value);
		},
		close: function() {
			var event = new $.Event("remove_storage");
			event.storage_type = this.option("type");
			event.name = this.option("name");
			this.element.trigger(event);
		},
		on_drag_start: function(event) {
			this.element.addClass("dragging");
			var name = this.option("name");
			event.preventDefault();
			event.stopPropagation();
			var curr_target = false;
			var above_below = false;
			var on_mmove = function(e) {
				above_below = 2 * e.offsetY > curr_target.height() ? "below" : "above";
				curr_target.addClass(above_below === "above" ? "dragtop" : "dragbottom");
				curr_target.removeClass(above_below === "above" ? "dragbottom" : "dragtop");
			};
			var on_mover_child = function(e) {
				curr_target = $(this);
				curr_target.addClass("dragtop");
				curr_target.on("mousemove", on_mmove);
			};
			var on_mout_child = function(e) {
				if(curr_target) {
					curr_target.removeClass("dragtop dragbottom");
					curr_target.off("mousemove", on_mmove);
					curr_target = false;
				}
			};
			var on_mup = _.bind(function() {
				targets.off("mouseover", on_mover_child);
				targets.off("mouseout", on_mout_child);
				$(window).off("mouseup", on_mup);
				this.element.removeClass("dragging");
				if(curr_target) {
					var my_obj = this.option("obj"),
						my_name = this.option("name");
					var target_name, target_obj;
					if(curr_target.is("tr.no_children")) {
						target_obj = curr_target.parents(".col").column("option", "client");
						target_name = false;
					} else {
						target_obj = curr_target.prop("option", "obj");
						target_name = curr_target.prop("option", "name");
					}

					curr_target.removeClass("dragtop dragbottom");
					curr_target.off("mousemove", on_mmove);
					curr_target = false;


					var event = new $.Event("copy_component");
					event.name = name;
					event.target_obj_id = target_obj.obj_id;
					event.above_below = above_below;
					this.element.trigger(event);
				}
			}, this);
			var targets = $("tr.child").not(".inherited").add("tr.no_children");

			targets.on("mouseover", on_mover_child);
			targets.on("mouseout", on_mout_child);
			$(window).on("mouseup", on_mup);
		},
		download: function() {
			var event = new $.Event("download_program");
			event.storage_type = this.option("type");
			event.name = this.option("name");
			this.element.trigger(event);
		},
		load: function() {
			var event = new $.Event("load_program");
			event.storage_type = this.option("type");
			event.name = this.option("name");
			this.element.trigger(event);
		}
	});
}(interstate, jQuery));
