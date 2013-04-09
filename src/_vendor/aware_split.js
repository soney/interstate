/*jslint nomen: true  vars: true */
/*global window */

(function () {
    "use strict";

	var start_chars = ["(", "[", "{", "'", '"'];
	var end_chars =   [")", "]", "}", "'", '"'];

    var is_balanced = function (counts) {
        var i;
        for (i = counts.length - 1; i >= 0; i -= 1) {
            if (counts[i] !== 0) {
                return false;
            }
        }
        return true;
    };

    window.aware_split = function (str) {
        var counts = [];
        var i;
        for (i = start_chars.length - 1; i >= 0; i -= 1) {
            counts[i] = 0;
        }
    
        var rv = [];
        var rv_len = 0;
        var str_len = str.length;
        var char;
        var balanced = true;
        var curr_str = "";
        for (i = 0; i < str_len; i += 1) {
            char = str[i];
    
            if (char === " " && balanced) {
                rv_len += 1;
                rv[rv_len] = curr_str;
                curr_str = "";
            } else {
                curr_str += char;
                var endCharIndex = end_chars.indexOf(char);
                if (endCharIndex >= 0) {
                    counts[endCharIndex] -= 1;
                    if (counts[endCharIndex] === -1 && (char === "'" || char === '"')) {
                        counts[endCharIndex] = 1;
                        balanced = false;
                    } else {
                        balanced = is_balanced(counts);
                    }
                } else {
                    var startCharIndex = start_chars.indexOf(char);
                    if (startCharIndex >= 0) {
                        counts[startCharIndex] += 1;
                        balanced = is_balanced(counts);
                    }
                }
            }
        }
        rv.push(curr_str);
        return rv;
    };
}());
