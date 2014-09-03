/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.find_stateful_obj_and_context = function (context) {
		var popped_item, last;
		while (!context.is_empty()) {
			last = context.points_at();
			if (last instanceof ist.StatefulObj) {
				return {
					stateful_obj: last,
					context: context
				};
			}
			popped_item = last;
			context = context.pop();
		}
		return undefined;
	};

	ist.Pointer = function (options) {
		this._stack = (options && options.stack) || [];
		this._hashes = (options && options.hashes) || [];
	};
	(function (my) {
		var proto = my.prototype;
		proto.points_at = function (index) {
			if (!_.isNumber(index)) {
				index = this._stack.length - 1;
			} else if (index < 0) {
				index += this._stack.length;
			}
			return this._stack[index];
		};
		proto.length = function () { return this._stack.length; };
		proto.slice = function () {
			return new ist.Pointer({
				stack: this._stack.slice.apply(this._stack, arguments),
				hashes: this._hashes.slice.apply(this._hashes, arguments)
			});
		};
		proto.splice = function () {
			var stack_copy = _.clone(this._stack),
				hashes_copy = _.clone(this._hashes);

			stack_copy.splice.apply(stack_copy, arguments);
			hahes_copy.splice.apply(hashes_copy, arguments);
			return new ist.Pointer({
				stack: stack_copy,
				hashees: hashes_copy
			});
		};
		proto.push = function () {
			return new ist.Pointer({
				stack: this._stack.concat(arguments),
				hashes: _.clone(this.hashes)
			});
		};
		proto.pop = function () {
			var len_minus_1 = this._stack.length-1;
			return new ist.Pointer({
				stack: this._stack.slice(0, len_minus_1),
				hashes: this._hashes.slice(0, len_minus_1)
			});
		};
		proto.has = function (item) {
			return this.indexOf(item) >= 0;
		};
		proto.indexOf = function (item) {
			return this._stack.indexOf(item);
		};
		proto.lastIndexOf = function (item) {
			return this._stack.lastIndexOf(item);
		};
		proto.root = function () {
			return this._stack[0];
		};

		proto.is_empty = function () {
			return this._stack.length === 0;
		};

		proto.eq = function (other) {
			if(this === other) {
				return true;
			} else if(this.hash() !== other.hash()) {
				return false;
			} else  {
				var my_stack = this._stack,
					other_stack = other._stack,
					my_stack_len = my_stack.length,
					other_stack_len = other_stack.length;

				if (my_stack_len !== other_stack_len) {
					return false;
				}
				var i, j;
				for (i = my_stack_len - 1; i >= 0; i -= 1) {
					if (my_stack[i] !== other_stack[i]) {
						return false;
					}
				}
				return true;
			}
		};

		var num_to_hash = 2;
		proto.compute_hash = function () {
			var hash = 0,
				i = this._stack.length - 1,
				mini = Math.max(0, i - num_to_hash);

			while(i >= mini) {
				hash += this.itemHash(i--);
			}

			return hash;
		};

		proto.compute_item_hash = function(i) {
			var hash = 1, j = 0, lenj;
			if(this._stack[i].hash) {
				hash += this._stack[i].hash();
			}

			return hash;
		};

		/* jshint -W093 */
		proto.hash = function() {
			return this.computed_hash || (this.computed_hash = this.compute_hash());
		};
		proto.itemHash = function(i) {
			return this._hashes[i] || (this._hashes[i] = this.compute_item_hash(i));
		};
		/* jshint +W093 */

		proto.toString = function () {
			return "pointer (" + _.map(this._stack, function (x, i) {
				var id = x.id ? uid.strip_prefix(x.id()) : x.toString();
				return id;
			}, this).join(", ") + ")";
		};
		proto.getContextualObject = function() {
			return ist.find_or_put_contextual_obj(this.points_at(), this);
		};

		proto.getContextualObjects = function() {
			return _.map(this._stack, function(item, i) {
				return ist.find_or_put_contextual_obj(item, this.slice(0, i+1));
			}, this);
		};

		proto.summarize = function () {
			var stack_ids = _.map(this._stack, function (x) {
				return x.id();
			});
			return {
				stack_ids: stack_ids
			};
		};

		my.desummarize = function (obj) {
			var stack = _.map(obj.stack_ids, function (stack_id) {
					return ist.find_uid(stack_id);
				}),
				rv = new My({stack: stack});

			return rv;
		};
	}(ist.Pointer));

	ist.is_pointer = function (obj) {
		return obj instanceof ist.Cell || obj instanceof ist.StatefulProp;
	};


	ist.check_pointer_equality =  ist.check_pointer_equality_eqeqeq = function (itema, itemb) {
		if (itema instanceof ist.Pointer && itemb instanceof ist.Pointer) {
			return itema.eq(itemb);
		} else {
			return itema === itemb;
		}
	};

	ist.pointer_hash = function(item) {
		if(item && item.hash) {
			return item.hash();
		} else {
			return item.toString();
		}
	};
}(interstate));
