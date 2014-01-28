/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael,RedMap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	cjs.registerCustomPartial("widgetList", {
		createNode: function(info_servers) {
			return $("<div />").component_list({
				info_servers: info_servers
			});
		},
		destroyNode: function(node) {
			$(node).component_list("destroy");
		}
	});

	var tlate = cjs.createTemplate(
				"<div class='programs'>" +
					"<h3>my programs</h3>" +
					"{{#each programs}}" +
						"<div data-name='{{this}}' class='program entry {{this===loaded_program ? \"selected\" : \"\"}}' " +
							"data-cjs-on-click='load_program'>" +
							"{{this}}" +
							/*
							"{{#if this===loaded_program}}" +
								"<span class='saved'>(saved)</span>" +
							"{{/if}}" +
							*/
						"</div>" +
					"{{/each}}" +
					"{{#if new_program}}" +
						"<div class='new_prog'>" +
							"{{>editing_text getDefaultSketchName()}}" +
							"<button type='button' class='btn btn-success btn-xs'>OK</button>" +
							"<button cjs-on-mousedown='cancel_newprog' type='button' class='btn btn-danger btn-xs'>Cancel</button>" +
						"</div>" +
					"{{/if}}" +
					"<div class='btn-group'>" +
						"{{#if new_program}}" +
							"<button disabled class='new_sketch btn btn-sm btn-default'>" +
								"<span class='glyphicon glyphicon-file'></span>" +
								" New" +
							"</button>" +
						"{{#else}}" +
							"<button class='new_sketch btn btn-sm btn-default' data-cjs-on-click='createNewSketch'>" +
								"<span class='glyphicon glyphicon-file'></span>" +
								" New" +
							"</button>" +
						"{{/if}}" +
						"{{#if dirty_program}}" +
							"<button class='save_sketch btn btn-sm btn-default' data-cjs-on-click='saveSketch'>" +
								"<span class='glyphicon glyphicon-floppy-disk'></span>" +
								" Save" +
							"</button>" +
						"{{#else}}" +
							"<button disabled class='save_sketch btn btn-sm btn-default'>" +
								"<span class='glyphicon glyphicon-floppy-saved'></span>" +
								" Saved" +
							"</button>" +
						"{{/if}}" +
						"{{#if new_program}}" +
							"<button disabled class='saveas_sketch btn btn-sm btn-default'>" +
								"<span class='glyphicon glyphicon-floppy-save'></span>" +
								" Save as..." +
							"</button>" +
						"{{#else}}" +
							"<button class='saveas_sketch btn btn-sm btn-default' data-cjs-on-click='saveSketchAs'>" +
								"<span class='glyphicon glyphicon-floppy-save'></span>" +
								" Save as..." +
							"</button>" +
						"{{/if}}" +
						"{{#if new_program}}" +
							"<button disabled class='saveas_sketch btn btn-sm btn-default'>" +
								"<span class='glyphicon glyphicon-cloud-upload'></span>" +
								" Import" +
							"</button>" +
						"{{#else}}" +
							"<div style='position:relative' id='import_btn' class='btn btn-sm btn-default'>" +
								"<span class='glyphicon glyphicon-cloud-upload'></span>" +
								" Import" +
								"<input multiple data-cjs-on-change='onImport' style='width:100%;position:absolute;top:0px;left:-3px;height:30px;opacity:0' title='Import' type='file'/>" +
							"</div>" +
						"{{/if}}" +
					"</div>" +
				"</div>" +
				""
				/*
				"<div class='components'>" +
					"<h3>Components</h3>" +
					"{{#each components}}" +
						"<div class='component entry'>" +
							"{{this}}" +
						"</div>" +
					"{{/each}}" +
				"</div>"
				*/
				);
	
	$.widget("interstate.component_list", {
		options: {
			info_servers: false
		},
		_create: function() {
			var info_servers = this.option("info_servers");

			this.$program_names = cjs(function() {
				return info_servers.programs.get();
			});
			this.$component_names = cjs(function() {
				return info_servers.components.get();
			});
			this.$loaded_program = cjs(function() {
				return info_servers.loaded_program.get();
			});
			this.$dirty_program = cjs(function() {
				return info_servers.dirty_program.get();
			});
			this.$dirty_program = cjs(function() {
				return info_servers.dirty_program.get();
			});
			this.$new_program = cjs(false);

			this._addContentBindings();
			this._addClassBindings();
		},
		_destroy: function() {
			this._removeContentBindings();
			this._removeClassBindings();

			this._super();
		},
		_addContentBindings: function() {
			this.element.on('confirm_value', _.bind(function(event) {
							var event_type;
							if(this.__next_action === 'create') {
								event_type = "create_program";
							} else if(this.__next_action === 'saveAs') {
								event_type = "save_curr_as";
							} else {
								return;
							}

							var e = new $.Event(event_type);
							e.name = event.value;
							this.element.trigger(e);
							
							this.$new_program.set(false);
							delete this.__next_action;
						}, this))
						.on('cancel_value', _.bind(function(event) {
							this.$new_program.set(false);
						}, this));

			tlate({
				programs: this.$program_names,
				components: this.$component_names,
				load_program: _.bind(function(event) {
					var e = new $.Event("load_program");
					e.storage_type = 'program';
					e.name = $(event.target).attr("data-name");
					this.element.trigger(e);
				}, this),
				cancel_newprog: _.bind(function(event) {
					$(".new_prog > textarea", this.element).editing_text("cancel");
					event.preventDefault();
					event.stopPropagation();
					this.$new_program.set(false);
					return false;
				}, this),
				loaded_program: this.$loaded_program,
				new_program: this.$new_program,
				createNewSketch: _.bind(function() {
					this.__next_action = 'create';
					this.$new_program.set(true);
				}, this),
				saveSketch: _.bind(function() {
					var e = new $.Event("save_curr");
					this.element.trigger(e);
				}, this),
				saveSketchAs: _.bind(function() {
					this.__next_action = 'saveAs';
					this.$new_program.set(true);
				}, this),
				dirty_program: this.$dirty_program,
				getDefaultSketchName: _.bind(function() {
					var names = this.$program_names.get(),
						original_name = "sketch_"+(names.length+1),
						i = 1,
						name = original_name;

					while(names.indexOf(name)>=0) {
						name = original_name + "_" + i;
						i++;
					}
					return name;
				}, this),
				onImport: _.bind(function(event) {
					var files = event.target.files || event.dataTransfer.files;
					if(files && files.length > 0) {
						var also_load_index = files.length-1;
						_.each(files, function(file, index) {
							var fr = new FileReader();
							fr.onload = _.bind(function() {
								var result = fr.result,name = file.name;
								_.defer(_.bind(function() {
									var event = new $.Event("load_saved_file");
									event.filecontents = result;
									event.filename = name;
									event.also_load = also_load_index === index;

									this.element.trigger(event);
								}, this));

								delete fr.onload;
								fr = null;
							}, this);
							fr.readAsText(file);
						}, this);
					}
				}, this)
			}, this.element);
		},
		_removeContentBindings: function() {
			cjs.destroyTemplate(this.element);
		},
		_addClassBindings: function() {
			this.element.addClass("component_list");
		},
		_removeClassBindings: function() {
		}
	});
				/*
	$.widget("interstate.component_list", {
		dragover.replace_program", _.bind(function(eve) {
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
						var event = new $.Event("save_curr");
						event.name = val;
						event.storage_type = "";
						this.element.trigger(event);
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
			this.element.addClass("entry " + this.option("type"));
			this.close_button = $("<a>").attr("href", "javascript:void(0)")
										.appendTo(this.element)
										.addClass("action")
										.text("(delete)")
										.on("click", _.bind(this.close, this));
			this.download_button = $("<a>") .attr("href", "javascript:void(0)")
										.appendTo(this.element)
										.addClass("action")
										.text("(download)")
										.on("click", _.bind(this.download, this));
			this.label = $("<a />")	.text(this.option("name"))
									.attr("href", "javascript:void(0)")
									.addClass("name")
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
	*/
}(interstate, jQuery));
