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
			set = [], unset = [], key_change = [], value_change = [],
			// For every key in to_keys, its index in from_keys (or -1 if it was added). Keys that
			// arrayDiff doesn't list as added or index_changed are at the same index in both.
			from_indices = [],

			i = 0, j, to_len = to_keys.length,
			from, old_val, new_val, set_len, unset_len, si, ui;

		val_eq_check = val_eq_check || eqeqeq;

		for(i = 0; i < to_len; i++) { from_indices[i] = i; }
		_.each(key_diff.added, function(info) { from_indices[info.to] = -1; });
		_.each(key_diff.index_changed, function(info) { from_indices[info.to] = info.from; });

		for(i = 0; i < to_len; i++) {
			from = from_indices[i];
			new_val = to_vals[i];

			if(from < 0) { // added
				set.push({ key: to_keys[i], value: new_val, to: i});
			} else {
				old_val = from_vals[from];

				if(!val_eq_check(old_val, new_val)) {
					value_change.push({key: to_keys[i], from: old_val, to: new_val});
				}
			}
		}
		// (arrayDiff lists removed keys from back to front)
		_.each(key_diff.removed, function(info) {
			unset.unshift({key: info.from_item, value: from_vals[info.from], from: info.from});
		});
		// A key that was added with the same value as a removed key is treated as a renamed key
		i = 0;
		set_len = set.length;
		unset_len = unset.length;

		while(i < set_len) {
			si = set[i];
			j = 0;
			while(j < unset_len) {
				ui = unset[j];

				if(val_eq_check(from_vals[ui.from], to_vals[si.to])) {
					key_change.push({from: ui.key, to: si.key, value: si.value});

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
