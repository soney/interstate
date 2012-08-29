(function(red, $) {
var cjs = red.cjs, _ = cjs._;
var state = {
	IDLE: 0
	, EDITING: 1
};

$.widget("red.editable", {
	
	options: {
		str: ""
		, immediate_edits: true
	}

	, _create: function() {
		this._state = state.IDLE;

		var self = this;
		this.element.text(this.option("str"))
					.on("mousedown.editable", function(event) {
						if(self._state === state.IDLE) {
							event.preventDefault();
							event.stopPropagation();
							self._trigger("begin_editing");
						}
					});

		if(this.option("immediate_edits")) {
			this.element.on("editablebegin_editing.editable", function() {
				self.begin_edit();
			});
		}
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;
		if(key === "str") {
			this.element.text(value);
		} else if(key === "immediate_edits") {
			if(old_value) {
				this.element.off("editablebegin_editing.editable");
			}
			if(new_value) {
				this.element.on("editablebegin_editing.editable", function() {
					self.begin_edit();
				});
			}
		}

		this._super(key, value);
	}

	, _destroy: function() {
		this.element.off("mousedown.editable")
					.off("editablebegin_editing.editable");
		$(window).off("keydown.editable");
	}

	, begin_edit: function() {
		if(this._state === state.IDLE) {
			this._state = state.EDITING;

			this._before_editing_value = this.option("str");
			this.element.html("")
						.addClass("editing");

			this._edit_input = $("<input type='text' />")	.appendTo(this.element)
															.attr("value", this._before_editing_value)
															.select()
															.focus();
			var self = this;
			$(window).on("keydown.editable", function(event) {
				if(event.which === 27) { //Esc
					self.cancel_changes();
				} else if(event.which === 13) { //Enter
					self.commit_changes();
				}
			});
		}
	}

	, cancel_changes: function() {
		if(this._state === state.EDITING) {
			this._state = state.IDLE;
			$(window).off("keydown.editable");
			this._edit_input.remove();
			this.element.text(this._before_editing_value)
						.removeClass("editing");
		}
	}

	, commit_changes: function(value) {
		if(this._state === state.EDITING) {
			this._state = state.IDLE;
			$(window).off("keydown.editable");
			value = value || this._edit_input.attr("value");
			this._edit_input.remove();
			this.element.text(value)
						.removeClass("editing");

			this._trigger("setstr", null, {
				value: value
			});
		}
	}

});

}(red, jQuery));
