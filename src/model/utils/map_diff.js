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
	/*
	var compute_map_diff = function (key_diff, value_diff, key_eq, val_eq) {
		var set = [], unset = [], key_change = [], value_change = [], index_changed = [], moved = [];
		var i, j, added_key, removed_key;
		console.log(key_diff, value_diff);
		for(i = 0; i<key_diff.added.length; i++) {
			added_key = key_diff.added[i];
			for(j = 0; j<key_diff.removed.length; j++) {
				removed_key = key_diff.removed[j];
				if (added_key.to === removed_key.from) {
					console.log('a');
					key_change.push({index: added_key.to, from: removed_key.from_item, to: added_key.item});
					
					removeIndex(key_diff.added, i--);
					removeIndex(key_diff.removed, j);
					break;
				}
			}
		}
		for(i = 0; i<value_diff.added.length; i++) {
			var added_value = value_diff.added[i];
			for(j = 0; j<value_diff.removed.length; j++) {
				var removed_value = value_diff.removed[j];
				if (added_value.to === removed_value.from) {
					console.log('b');
					value_change.push({index: added_value.to, from: removed_value.from_item, to: added_value.item});
					
					removeIndex(value_diff.added, i--);
					removeIndex(value_diff.removed, j);
					break;
				}
			}
		}
		for(i = 0; i<key_diff.added.length; i++) {
			added_key = key_diff.added[i];
			for(j = 0; j<value_diff.added.length; j++) {
				var added_val = value_diff.added[j];
				console.log(i,j,added_key,added_val);
				if (added_key.to === added_val.to) {
					console.log('c');
					set.push({index: added_key.to, key: added_key.item, value: added_val.item});
		
					removeIndex(key_diff.added, i--);
					removeIndex(value_diff.added, j);
					break;
				}
			}
		}
		for(i = 0; i<key_diff.removed.length; i++) {
			removed_key = key_diff.removed[i];
			for(j = 0; j<value_diff.removed.length; j++) {
				var removed_val = value_diff.removed[j];
				if (removed_key.to === removed_val.to) {
					console.log('d');
					unset.push({from: removed_key.from, key: removed_key.from_item, value: removed_val.from_item});

					removeIndex(key_diff.removed, i--);
					removeIndex(value_diff.removed, j);
					break;
				}
			}
		}

		for (i = 0; i<key_diff.moved.length; i++) {
			var moved_key = key_diff.moved[i];
			for (j = 0; j<value_diff.moved.length; j++) {
				var moved_val = value_diff.moved[j];
				if (moved_key.to === moved_val.to && moved_key.from === moved_val.from) {
					console.log('e');
					moved.push({from: moved_key.from, to: moved_key.to, key: moved_key.item, value: moved_val.item, insert_at: moved_key.insert_at});

					removeIndex(key_diff.moved, i--);
					removeIndex(value_diff.moved, j);
					break;
				}
			}
		}
		for (i = 0; i<key_diff.index_changed.length; i++) {
			var index_changed_key = key_diff.index_changed[i];
			for (j = 0; j<value_diff.index_changed.length; j++) {
				var index_changed_val = value_diff.index_changed[j];
				if (index_changed_key.to === index_changed_val.to && index_changed_key.from === index_changed_val.from) {
					index_changed.push({from: index_changed_key.from, to: index_changed_key.to, key: index_changed_key.item, value: index_changed_val.item});

					removeIndex(key_diff.index_changed, i--);
					removeIndex(value_diff.index_changed, j);
					
					break;
				}
			}
		}
		return { set: set, unset: unset, key_change: key_change, value_change: value_change, index_changed: index_changed, moved: moved};
	};

		val_diff = cjs.arrayDiff(from_vals, to_vals, val_eq_check);
		return compute_map_diff(key_diff, val_diff, key_eq_check||eqeqeq, val_eq_check||eqeqeq);
		*/
	ist.get_map_diff = function(from_keys, to_keys, from_vals, to_vals, key_eq_check, val_eq_check) {
		var key_diff = cjs.arrayDiff(from_keys, to_keys, key_eq_check),
			set = [], unset = [], key_change = [], value_change = [], index_changed = [], moved = [],
			i, j, added_key, removed_key, moved_key,
			to_val_clone = _.clone(to_vals),
			from_val_clone = _.clone(from_vals),
			added_to, removed_from, moved_from, moved_to,
			key_diff_added = key_diff.added,
			key_diff_removed = key_diff.removed,
			key_diff_moved = key_diff.moved,
			key_diff_removed_len = key_diff_removed.length,
			key_diff_added_len = key_diff_added.length,
			key_diff_moved_len = key_diff_moved.length,
			explained_from_keys = _.map(from_keys, function() { return false; }),
			explained_to_keys = _.map(to_keys, function() { return false; });
		
		val_eq_check = val_eq_check || eqeqeq;

		console.log(key_diff);

		for(i = 0; i<key_diff_removed_len; i++) {
			removed_key = key_diff_removed[i];
			removed_from = removed_key.from;
			for(j = 0; j<key_diff_added_len; j++) {
				added_key = key_diff_added[j];
				added_to = added_key.to;

				if(val_eq_check(from_vals[removed_from], to_vals[added_to])) {
					key_change.push({index: added_to, from: removed_key.from_item, to: added_key.item});

					removeIndex(key_diff_removed, i);
					removeIndex(key_diff_added, j);

					explained_from_keys[removed_from] = 'renamed';
					explained_to_keys[added_to] = 'renamed';

					i--;
					key_diff_removed_len--;
					key_diff_added_len--;
					break; 
				}
			}
		}

		for(i = 0; i<key_diff_removed_len; i++) {
			removed_key = key_diff_removed[i];
			removed_from = removed_key.from;
			
			unset.push({from: removed_from, key: removed_key.from_item, value: from_vals[removed_from]});
			removeIndex(key_diff_removed, i);

			explained_from_keys[removed_from] = 'unset';

			i--;
			key_diff_removed_len--;
		}

		for(i = 0; i<key_diff_added_len; i++) {
			added_key = key_diff_added[i];
			added_to = added_key.to;
			
			set.push({index: added_to, key: added_key.item, value: to_vals[added_to]});
			removeIndex(key_diff_added, i);

			explained_to_keys[added_to] = 'set';

			i--;
			key_diff_added_len--;
		}

		for(i = 0; i<key_diff_moved_len; i++) {
			moved_key = key_diff_moved[i];

			moved_from = moved_key.from;
			moved_to = moved_key.to;
			if(val_eq_check(from_vals[moved_from], to_vals[moved_to])) {
				moved.push({from: moved_from, to: moved_to, key: moved_key.item, value: to_vals[moved_to]});

				removeIndex(key_diff_moved, i);
				i--;
				key_diff_moved_len--;
			}
		}



		/*
		for(i = 0; i<explained_from_keys.length;i++) {
			if(!explained_from_keys[i]) {
			}
		}


		if(!_.every(explained_from_keys) || !_.every(explained_to_keys)) {
			console.log(explained_from_keys);
			console.log(explained_to_keys);
		}


		for(i = 0; i<key_diff_removed_len; i++) {
			removed_key = key_diff_removed[i];
			removed_from = removed_key.from;
			for(j = 0; j<key_diff_added_len; j++) {
				added_key = key_diff_added[j];
				added_to = added_key.to;

				if(val_eq_check(from_val_clone[removed_from], to_val_clone[added_to])) {
					key_change.push({index: added_to, from: removed_key.from_item, to: added_key.item});

					removeIndex(key_diff_added, i);
					removeIndex(key_diff_removed, j);
					removeIndex(to_val_clone, added_to);
					removeIndex(from_val_clone, removed_from);

					i--;
					key_diff_removed_len--;
					key_diff_added_len--;
					break; 
				}
			}
		}
		/*
		for(i = 0; i<value_diff.added.length; i++) {
			var added_value = value_diff.added[i];
			for(j = 0; j<value_diff.removed.length; j++) {
				var removed_value = value_diff.removed[j];
				if (added_value.to === removed_value.from) {
					console.log('b');
					value_change.push({index: added_value.to, from: removed_value.from_item, to: added_value.item});
					
					removeIndex(value_diff.added, i--);
					removeIndex(value_diff.removed, j);
					break;
				}
			}
		}
		for(i = 0; i<key_diff.added.length; i++) {
			added_key = key_diff.added[i];
			for(j = 0; j<value_diff.added.length; j++) {
				var added_val = value_diff.added[j];
				console.log(i,j,added_key,added_val);
				if (added_key.to === added_val.to) {
					console.log('c');
					set.push({index: added_key.to, key: added_key.item, value: added_val.item});
		
					removeIndex(key_diff.added, i--);
					removeIndex(value_diff.added, j);
					break;
				}
			}
		}
		for(i = 0; i<key_diff.removed.length; i++) {
			removed_key = key_diff.removed[i];
			for(j = 0; j<value_diff.removed.length; j++) {
				var removed_val = value_diff.removed[j];
				if (removed_key.to === removed_val.to) {
					console.log('d');
					unset.push({from: removed_key.from, key: removed_key.from_item, value: removed_val.from_item});

					removeIndex(key_diff.removed, i--);
					removeIndex(value_diff.removed, j);
					break;
				}
			}
		}

		for (i = 0; i<key_diff.moved.length; i++) {
			var moved_key = key_diff.moved[i];
			for (j = 0; j<value_diff.moved.length; j++) {
				var moved_val = value_diff.moved[j];
				if (moved_key.to === moved_val.to && moved_key.from === moved_val.from) {
					console.log('e');
					moved.push({from: moved_key.from, to: moved_key.to, key: moved_key.item, value: moved_val.item, insert_at: moved_key.insert_at});

					removeIndex(key_diff.moved, i--);
					removeIndex(value_diff.moved, j);
					break;
				}
			}
		}
		for (i = 0; i<key_diff.index_changed.length; i++) {
			var index_changed_key = key_diff.index_changed[i];
			for (j = 0; j<value_diff.index_changed.length; j++) {
				var index_changed_val = value_diff.index_changed[j];
				if (index_changed_key.to === index_changed_val.to && index_changed_key.from === index_changed_val.from) {
					index_changed.push({from: index_changed_key.from, to: index_changed_key.to, key: index_changed_key.item, value: index_changed_val.item});

					removeIndex(key_diff.index_changed, i--);
					removeIndex(value_diff.index_changed, j);
					
					break;
				}
			}
		}
		*/
		return { set: set, unset: unset, key_change: key_change, value_change: value_change, index_changed: index_changed, moved: moved};
	};
/*
	var get_map_diff = function (from_obj, to_obj, equality_check) {
		var from_keys = keys(from_obj),
			to_keys = keys(to_obj),
			from_values = values(from_obj),
			to_values = values(to_obj),
			key_diff = get_array_diff(from_keys, to_keys, equality_check),
			value_diff = get_array_diff(from_values, to_values, equality_check);

		return compute_map_diff(key_diff, value_diff);
	};
	*/
}(interstate, jQuery));
