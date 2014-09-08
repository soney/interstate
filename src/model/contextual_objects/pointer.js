/*jslint nomen: true, vars: true */
/*global interstate,esprima,able,uid,console */

(function (ist) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	ist.find_stateful_obj_and_context = function (context) {
		var popped_item, last;
		while (!context.isEmpty()) {
			last = context.pointsAt();
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
		this._copies = (options && options.copies) || [];
		this._stack = (options && options.stack) || [];
		this._hashes = (options && options.hashes) || [];
	};
	(function (my) {
		var proto = my.prototype;
		proto.pointsAt = function (index) {
			if (!_.isNumber(index)) {
				index = this._stack.length - 1;
			} else if (index < 0) {
				index += this._stack.length;
			}
			return this._stack[index];
		};
		proto.copy = function (index) {
			if (!_.isNumber(index)) {
				index = this._copies.length - 1;
			} else if (index < 0) {
				index += this._copies.length;
			}

			return this._copies[index];
		};

		proto.length = function () { return this._stack.length; };
		proto.slice = function () {
			var args = _.toArray(arguments);
			return new ist.Pointer({
				stack: this._stack.slice.apply(this._stack, args),
				copies: this._copies.slice.apply(this._copies, args),
				hashes: this._hashes.slice.apply(this._hashes, args)
			});
		};
		proto.splice = function () {
			var stack_copy = _.clone(this._stack),
				copies_copy = _.clone(this._copies),
				hashes_copy = _.clone(this._hashes);

			stack_copy.splice.apply(stack_copy, arguments);
			copies_copy.splice.apply(copies_copy, arguments);
			hahes_copy.splice.apply(hashes_copy, arguments);

			return new ist.Pointer({
				stack: stack_copy,
				copies: copies_copy,
				hashees: hashes_copy
			});
		};
		proto.push = function (obj, copies) {
			//if(obj === this.pointsAt()) debugger;
			return new ist.Pointer({
				stack: this._stack.concat(obj),
				copies: this._copies.concat(copies),
				hashes: _.clone(this.hashes)
			});
		};
		proto.pushCopy = function(copies) {
			var len_minus_1 = this._stack.length-1,
				copies_clone = _.clone(this._copies);

			copies_clone[len_minus_1] = copies;

			return new ist.Pointer({
				stack: this._stack,
				copies: copies_clone,
				hashes: this._hashes.slice(0, len_minus_1)
			});
		};

		proto.replace = function (item) {
			var len_minus_1 = this._stack.length-1,
				stack_clone = _.clone(this._stack);

			stack_clone[len_minus_1] = item;

			return new ist.Pointer({
				stack: stack_clone,
				copies: this._copies,
				hashes: this._hashes.slice(0, len_minus_1)
			});
		};

		proto.popCopy = function() {
			var len_minus_1 = this._stack.length-1,
				copies_clone = _.clone(this._copies);

			copies_clone[len_minus_1] = undefined;

			return new ist.Pointer({
				stack: this._stack,
				copies: copies_clone,
				hashes: this._hashes.slice(0, len_minus_1)
			});
		};

		proto.pop = function () {
			var len_minus_1 = this._stack.length-1;
			return new ist.Pointer({
				stack: this._stack.slice(0, len_minus_1),
				copies: this._copies.slice(0, len_minus_1),
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

		proto.isEmpty = function () {
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
		proto._compute_hash = function () {
			var hash = 0,
				i = this._stack.length - 1,
				mini = Math.max(0, i - num_to_hash);

			while(i >= mini) {
				hash += this.itemHash(i--);
			}

			return hash;
		};

		proto._compute_item_hash = function(i) {
			var hash = 1, j = 0, lenj;
			if(this._stack[i].hash) {
				hash += this._stack[i].hash();
			}

			if(this._copies[i]) {
				hash += this._copies[i].index + 1;
			}

			return hash;
		};

		/* jshint -W093 */
		proto.hash = function() { return this.computed_hash || (this.computed_hash = this._compute_hash()); };
		proto.itemHash = function(i) { return this._hashes[i] || (this._hashes[i] = this._compute_item_hash(i)); };
		/* jshint +W093 */

		proto.toString = function () {
			return "pointer (" + _.map(this._stack, function (x, i) {
				var id = x.id ? uid.strip_prefix(x.id()) : x.toString();
				return id;
			}, this).join(", ") + ")";
		};
		proto.getContextualObject = function() {
			return ist.find_or_put_contextual_obj(this.pointsAt(), this);
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
	/*

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
	*/
}(interstate));
