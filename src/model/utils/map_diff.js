/*jslint nomen: true, vars: true, white: true */
/*jshint scripturl: true */
/*global interstate,esprima,able,uid,console,window,jQuery,Raphael,RedMap */

(function (ist, $) {
	"use strict";
	var cjs = ist.cjs,
		_ = ist._;

	var removeIndex = function(arr, i) { arr.splice(i, 1); },
		eqeqeq = function(a,b) { return a === b; };

	// Compute the differences between two objects
	ist.get_map_diff = function(from_keys, to_keys, from_vals, to_vals, key_eq_check, val_eq_check) {
		var key_diff = cjs.arrayDiff(from_keys, to_keys, key_eq_check),
			set = [], unset = [], key_change = [], value_change = [], index_changed = [], moved = [],

			i = 0, j, mapping = key_diff.mapping, mapping_len = mapping.length,
			mi, from,from_item,item,to,to_item, old_val, new_val, set_len, unset_len, si, ui;

		val_eq_check = val_eq_check || eqeqeq;

		while(i < mapping_len) {
			mi = mapping[i];
			if(!_.has(mi, 'from')) { // added
				to = mi.to;
				to_item = mi.to_item;

				new_val = to_vals[to];

				set.push({ key: to_item, value: new_val, to: to});
			} else if(!_.has(mi, 'to')) { // removed
				from = mi.from;
				from_item = mi.from_item;

				old_val = from_vals[from];
				unset.push({key: from_item, value: old_val, from: from});
			} else {
				from = mi.from;
				to = mi.to;
				from_item = mi.from_item;
				to_item = mi.to_item;

				old_val = from_vals[from];
				new_val = to_vals[to];
				
				if(!val_eq_check(old_val, new_val)) {
					value_change.push({key: to_item, from: old_val, to: new_val});
				}
			}

			i++;
		}
		i = 0;
		set_len = set.length;
		unset_len = unset.length;

		while(i < set_len) {
			si = set[i];
			j = 0;
			while(j < unset_len) {
				ui = unset[i];

				if(val_eq_check(from_vals[ui.from], to_vals[si.to])) {
					key_change.push({from: ui.key, to: si.key});

					removeIndex(set, i);
					removeIndex(unset, j);

					i--;
					unset_len--;
					set_len--;
					break;
				}

				j++;
			}
			i++;
		}
		return { set: set, unset: unset, key_change: key_change, value_change: value_change };
	};
}(interstate, jQuery));
