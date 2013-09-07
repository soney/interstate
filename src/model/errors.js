/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var ERROR_TYPE = {
		WARNING: 1,
		ERROR: 2
	};

	ist.Error = (function(My) {
		var proto = My.prototype;

		proto.type = function() { return this.options.type; };
		proto.message = function() { return this.options.message; };

        ist.register_serializable_type("error",
            function (x) {
                return x instanceof My;
            },
            function () {
                return {type: this.type(), message: this.message()};
            },
            function (obj) {
                var rv = new My({type: obj.type, message: obj.message});
                return rv;
            });

		return My;
	}(function(options) {
		this.options = _.extend({
			type: ERROR_TYPE.ERROR,
			message: ""
		}, options);
	}));

	var valid_prop_name_regex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
	ist.is_valid_prop_name = function(name) {
		return name.match(valid_prop_name_regex);
	};

	ist.get_prop_name_error = function(name) {
		if(name.length === 0) {
			return "Must be at least one character";
		} else if(name[0].match(/[0-9]/)) {
			return "First letter should not be a number";
		} else if(!name[0].match(/[a-zA-Z_$]/)) {
			return "First character should be a letter";
		} else if(name.match(/\s/)) {
			return "Should not contain spaces";
		} else {
			var invalid_chars = [];
			var char;
			var char_regex = /[0-9a-zA-Z_$]/;
			for(var i = 1; i<name.length; i++) {
				char = name[i];
				if(!char.match(char_regex )) {
					invalid_chars.push(char);
				}
			}


			var invalid_char_str = _.map(invalid_chars, function(char, i) {
				if(i === invalid_chars.length-1) {
					return "and '"+char+"'";
				} else {
					return "'"+char+"'";
				}
			}).join(", ");

			return "Invalid characters: " + invalid_char_str + ".";
		}
	};
}(interstate));
