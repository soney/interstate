/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael,RedMap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	cjs.registerCustomPartial("widgetList", {
		createNode: function(options) {
			return $("<div />").component_list(options);
		},
		destroyNode: function(node) {
			$(node).component_list("destroy");
		}
	});

	var tlate = cjs.createTemplate(
				"<div class='header'>" +
					"<h3>my programs</h3>" +
					"<p>whole files</p>" +
				"</div>" +
				"<div class='programs'>" +
					"{{#each programs}}" +
						"{{>widgetItem getWidgetItemOptions(this, '')}}" +
					"{{#else}}" +
						"{{#if !new_program}}" +
							"<div class='none'>no programs</div>" +
						"{{/if}}" +
					"{{/each}}" +
				"</div>" +
				"{{#if new_program}}" +
					"<div class='new_prog'>" +
						"{{>editing_text getDefaultSketchName()}}" +
						"<button type='button' class='btn btn-success btn-xs'>OK</button>" +
						"<button cjs-on-mousedown='cancel_newprog' type='button' class='btn btn-danger btn-xs'>Cancel</button>" +
					"</div>" +
				"{{/if}}" +
				"<div class='btn-group'>" +
					"<button disabled={{new_program}} class='new_sketch btn btn-sm btn-default' data-cjs-on-click='createNewSketch'>" +
						"<span class='glyphicon glyphicon-file'></span>" +
						" New" +
					"</button>" +
					"<button disabled={{disable_save_btn}} class='save_sketch btn btn-sm btn-default' data-cjs-on-click='saveSketch'>" +
						"{{#if dirty_program}}" +
							"<span class='glyphicon glyphicon-floppy-disk'></span>" +
							" Save" +
						"{{#else}}" +
							"<span class='glyphicon glyphicon-floppy-saved'></span>" +
							" Saved" +
						"{{/if}}" +
					"</button>" +
					"<button disabled={{new_program}} class='saveas_sketch btn btn-sm btn-default' data-cjs-on-click='saveSketchAs'>" +
						"<span class='glyphicon glyphicon-floppy-save'></span>" +
						" Save as..." +
					"</button>" +
					"<div disabled={{new_program}} style='position:relative' id='import_btn' class='btn btn-sm btn-default'>" +
						"<span class='glyphicon glyphicon-cloud-upload'></span>" +
						" Import" +
						"<input multiple data-cjs-on-change='onImport' style='width:100%;position:absolute;top:0px;left:-3px;height:30px;opacity:0' title='Import' type='file'/>" +
					"</div>" +
				"</div>" +
				"<div class='header components_header'>" +
					"<h3>my components</h3>" +
					"<p>reusable parts</p>" +
				"</div>" +

				"<div class='components component_drop' data-cjs-on-dragover=dragoverComponent data-cjs-on-dragout=dragoutComponent data-cjs-on-dragenter=dragEnterComponent data-cjs-on-dragleave=dragLeaveComponent>" +
					"{{#each components}}" +
						"{{>widgetItem getWidgetItemOptions(this, 'component')}}" +
					"{{#else}}" +
						"<div class='none component_drop'>(drop objects here)</div>" +
					"{{/each}}" +
				"</div>" +

				"<div class='toolbar'>" +
					"<div disabled={{new_program}} style='position:relative' id='import_btn' class='btn btn-sm btn-default'>" +
						"<span class='glyphicon glyphicon-cloud-upload'></span>" +
						" Import" +
						"<input multiple data-cjs-on-change='onImport' style='width:100%;position:absolute;top:0px;left:-3px;height:30px;opacity:0' title='Import' type='file'/>" +
					"</div>" +
				"</div>"
				);
	
	$.widget("interstate.component_list", {
		options: {
			info_servers: false,
			editor: false
		},
		_create: function() {
			var info_servers = this.option("info_servers").get();

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
			this.$dragging = this.option("editor").getDraggingClientConstraint();

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
				cancel_newprog: _.bind(function(event) {
					$(".new_prog > textarea", this.element).editing_text("cancel");
					event.preventDefault();
					event.stopPropagation();
					this.$new_program.set(false);
					return false;
				}, this),
				new_program: this.$new_program,
				dirty_program: this.$dirty_program,
				disable_save_btn: (this.$dirty_program.not()).or(this.$new_program),
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
				getWidgetItemOptions: _.bind(function(name, type) {
					return {
						name: name,
						selected: this.$loaded_program.eqStrict(name),
						storage_type: type,
						hover_tip: type === "component" ? "drag & drop in" : "",
						editor: this.option("editor")
					};
				}, this),
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
				}, this),
				dragoverComponent: _.bind(function(event) {
					event.preventDefault();
					event.stopPropagation();
					return false;
				}, this),
				dragoutComponent: _.bind(function(event) {
					event.preventDefault();
					event.stopPropagation();
					return false;
				}, this),
				dragEnterComponent: _.bind(function(event) {
					event.preventDefault();
					event.stopPropagation();
					return false;
				}, this),
				dragLeaveComponent: _.bind(function(event) {
					event.preventDefault();
					event.stopPropagation();
					return false;
				}, this)
			}, this.element);
		},
		_removeContentBindings: function() {
			cjs.destroyTemplate(this.element);
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

	cjs.registerCustomPartial("widgetItem", {
		createNode: function(options) {
			return $("<div />").component_item(options);
		},
		destroyNode: function(node) {
			$(node).component_item("destroy");
		}
	});

	var witem_tlate = cjs.createTemplate(
					"<div data-name='{{name}}' data-cjs-on-click='load_program'>" +
						"{{#fsm name_edit_state}}" +
							"{{#state idle}}" +
								"{{name}}" +
								"<span class='hover_tip'>{{hover_tip}}</span>" +
							"{{#state editing}}" +
								"{{>editing_text name 'input'}}" +
						"{{/fsm}}" +
					"</div>" +
					"{{#if show_menu}}" +
						"<ul class='menu'>" +
							"<li class='menu-item' data-action='export'>Export</li>" +
							"<li class='menu-item' data-action='delete'>Delete</li>" +
							"<li class='menu-item' data-action='rename'>Rename</li>" +
						"</ul>" +
					"{{/if}}"
					);
	
	$.widget("interstate.component_item", {
		options: {
			name: "",
			selected: false,
			storage_type: "",
			hover_tip: "",
			editor: false
		},
		_create: function() {
			this.$name = this.option("name");
			this.$selected = this.option("selected");
			this.$dragging = this.option("editor").getDraggingClientConstraint();

			var elem = this.element;
			this.name_edit_state = cjs	.fsm("idle", "editing")
										.startsAt("idle")
										.addTransition('editing', 'idle', function(dt) {
											elem.on('confirm_value', dt);
										})
										.addTransition('editing', 'idle', function(dt) {
											elem.on('cancel_value', dt);
										})
										.on('editing->idle', function(event) {
											if(event.type === 'confirm_value') {
												this._emit_new_name(event.value);
											}
										}, this);
			if(this.option("storage_type") === "component") {
				this.element.attr("draggable", true)
							.on("dragstart.ondragstart", _.bind(this.on_drag_start, this));
			}

			this._addMenu();
			this._addContentBindings();
			this._addClassBindings();
		},
		_destroy: function() {
			this._removeContentBindings();
			this._removeClassBindings();
			this._removeMenu();

			this._super();
		},
		_addMenu: function() {
			this.$show_menu  = cjs(false);
			this.menu_state = cjs.fsm("hidden", "holding", "on_release", "on_click")
									.addTransition("hidden", "holding", cjs.on("contextmenu", this.element[0]))
									.addTransition("holding", "on_click", cjs.on("mouseup"))
									.addTransition("holding", "on_release", cjs.on("timeout", 500))
									.addTransition("holding", "hidden", cjs.on("keydown").guard('keyCode', 27))
									.addTransition("on_click", "hidden", cjs.on("keydown").guard('keyCode', 27))
									.addTransition("on_release", "hidden", cjs.on("keydown").guard('keyCode', 27))
									.startsAt("hidden");
			var on_mup_holding = this.menu_state.addTransition("holding", "hidden"),
				on_mup_orelease = this.menu_state.addTransition("on_release", "hidden"),
				on_mup_oclick = this.menu_state.addTransition("on_click", "hidden");

			this.menu_state.on("hidden->holding", function(event) {
				this.$show_menu.set(true);
				event.stopPropagation();
				event.preventDefault();
				var my_position = this.element.position();
				
				return false;
			}, this);

			var on_click = function(event) {
				$(window).add("ul.menu > li", this.element).off('.menu_item');
				$("ul.menu > li", this.element).on('click.menu_item', _.bind(function(e) {
					this.on_menu_action(e.target.getAttribute('data-action'));
					on_mup_oclick(e);
					e.stopPropagation();
					e.preventDefault();
				}, this));
				$(window).on('mousedown.menu_item', function(e) {
					if(!$(e.target).parents().is($("ul.menu", this.element))) {
						on_mup_oclick(e);
						e.stopPropagation();
						e.preventDefault();
					}
				});
			},
			on_hold = function(event) {
				$("ul.menu > li", this.element).on('mouseup.menu_item', _.bind(function(e) {
					this.on_menu_action(e.target.getAttribute('data-action'));
					on_mup_holding(e);
					on_mup_orelease(e);
					e.stopPropagation();
					e.preventDefault();
				}, this));

				$(window).on('mouseup.menu_item', function(e) {
					if(!$(e.target).parents().is($("ul.menu", this.element))) {
						on_mup_holding(e);
						on_mup_orelease(e);
						e.stopPropagation();
						e.preventDefault();
					}
				});
			},
			on_hidden = function(event) {
				this.menu_state .off("on_click", on_click, this)
								.off("holding", on_hold, this)
								.off("hidden", on_hidden, this);
				this.$show_menu.set(false);
				$(window).add("ul.menu > li", this.element).off('.menu_item');
			};
			this.menu_state.on("on_click", on_click, this);
			this.menu_state.on("holding", on_hold, this);
			this.menu_state.on("hidden", on_hidden, this);
		},
		_removeMenu: function() {
			$("ul.menu > li", this.element).off('.menu_item');
			$(window).off('.menu_item');
			this.menu_state.destroy();
			this.$show_menu.destroy();
		},

		_emit_new_name: function(str) {
			if(str.length>0) {
				var event = new $.Event("rename_storage");
				event.from_name = cjs.get(this.$name);
				event.to_name = str;
				event.storage_type = this.option("storage_type");
				this.element.trigger(event);
			}
		},
		_addContentBindings: function() {
			witem_tlate({
				name: this.$name,
				selected: this.$selected,
				show_menu: this.$show_menu,
				load_program: _.bind(function(event) {
					if(!this.option("type")) {
						var e = new $.Event("load_program");
						e.storage_type = this.option("storage_type");
						e.name = $(event.target).attr("data-name");
						this.element.trigger(e);
					}
				}, this),
				hover_tip: this.option("hover_tip"),
				name_edit_state: this.name_edit_state
			}, this.element);
		},
		begin_rename: function() {
			this.name_edit_state._setState('editing');
		},
		_removeContentBindings: function() {
			cjs.destroyTemplate(this.element);
		},
		_addClassBindings: function() {
			this._cssBinding = cjs.bindClass(this.element, "program", "entry",
											this.$selected.iif("selected", ""),
											this.$show_menu.iif("menuized", ""));
		},
		_removeClassBindings: function() {
			this._cssBinding.destroy();
		},

		on_menu_action: function(action_name) {
			var event;
			if(action_name === 'delete') {
				event = new $.Event("remove_storage");
				event.name = cjs.get(this.$name);
				event.storage_type = this.option("storage_type");
				this.element.trigger(event);
			} else if(action_name === 'rename') {
				this.begin_rename();
			} else if(action_name === 'export') {
				event = new $.Event("download_program");
				event.name = cjs.get(this.$name);
				event.storage_type = this.option("storage_type");
				this.element.trigger(event);
			}
		},
		on_drag_start: function(event) {
			this.element.addClass("dragging");
			var name = this.option("name");
			this.$dragging.set(name);
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
				this.$dragging.set(false);
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
	});
}(interstate, jQuery));
