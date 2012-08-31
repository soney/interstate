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


		this.$_begin_edit_handler = _.bind(this._begin_edit_handler, this);
		this.$begin_edit = _.bind(this.begin_edit, this);
		this.$_on_keydown = _.bind(this._on_keydown, this);

		this.element.text(this.option("str"))
					.on("mousedown", this.$_begin_edit_handler);

		this._edit_input = $("<input type='text' />");	

		if(this.option("immediate_edits")) {
			this.element.on("editablebegin_editing", this.$begin_edit);
		}
	}

	, _setOption: function(key, value) {
		var old_value = this.option(key);
		var new_value = value;
		if(key === "str") {
			this.element.text(value);
		}

		this._super(key, value);
	}

	, _destroy: function() {
		this.element.off("mousedown", this.$_begin_edit_handler)
					.off("editablebegin_editing", this.$begin_edit);
		this._edit_input.off("keydown", this.$_on_keydown);	
	}

	, _begin_edit_handler: function(event) {
		if(this._state === state.IDLE) {
			event.preventDefault();
			event.stopPropagation();
			this._trigger("begin_editing");
		}
	}

	, begin_edit: function() {
		if(this._state === state.IDLE) {
			this._state = state.EDITING;

			this._before_editing_value = this.option("str");
			this.element.html("")
						.addClass("editing");

			this._edit_input.appendTo(this.element)
							.attr("value", this._before_editing_value)
							.select()
							.focus()
							.on("keydown", this.$_on_keydown);
		}
	}

	, _on_keydown: function(event) {
		if(this._state === state.EDITING) {
			if(this._edit_input.is(":focus")) {
				if(event.which === 27) { //Esc
					this.cancel_changes();
				} else if(event.which === 13) { //Enter
					this.commit_changes();
				}
			}
		}
	}

	, cancel_changes: function() {
		if(this._state === state.EDITING) {
			this._state = state.IDLE;
			this._edit_input.remove();
			this.element.text(this._before_editing_value)
						.removeClass("editing");
			this._edit_input.off("keydown", this.$_on_keydown);	
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
			this._edit_input.off("keydown", this.$_on_keydown);	
		}
	}

});

}(red, jQuery));
