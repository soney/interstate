/*jslint nomen: true, vars: true */
/*global red,console */

(function (red) {
	"use strict";
	red.sample_apps = {};

	function loadjscssfile(filename, filetype){
		if (filetype === "js") { //if filename is a external JavaScript file
			var fileref=document.createElement('script')
			fileref.setAttribute("type","text/javascript")
			fileref.setAttribute("src", filename)
		}
		else if (filetype === "css") { //if filename is an external CSS file
			var fileref=document.createElement("link")
			fileref.setAttribute("rel", "stylesheet")
			fileref.setAttribute("type", "text/css")
			fileref.setAttribute("href", filename)
		}
		if (typeof fileref !== "undefined") {
			document.getElementsByTagName("head")[0].appendChild(fileref)
		}
	}

	var last_load_name, last_callback;
	red.load_sample_app = function(name, callback) {
		if(red.sample_apps.hasOwnProperty(name)) {
			var root = red.sample_apps[name];
			callback(root, name);
		} else {
			last_load_name = name;
			last_callback = callback;
			loadjscssfile("sample_apps/" + name + ".js", "js");
		}
	};

	red.on_sample_app_ready = function(root) {
		red.sample_apps[last_load_name] = root;
		last_callback(root, last_load_name);
	};
}(red));
