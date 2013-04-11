module.exports = function(grunt) {

	var ends_with = function (str1, str2) {
		return str1.slice(str1.length-str2.length) == str2;
	};
	var cjs_inc = require('./include_libs');

	var src_js = cjs_inc.main_src.filter(function(f) { return ends_with(f, ".js");});
	var src_css = cjs_inc.main_src.filter(function(f) { return ends_with(f, ".css");});

	var exclude_regexes = [
		"jquery-.*\\.js",
		"raphael\\.js",
		"underscore\\.js"
	];

	var my_src_files = src_js.filter(function(f) { 
		for(var i = 0; i<exclude_regexes.length; i++) {
			var exclude_regex = new RegExp(exclude_regexes[i]);
			if(f.match(exclude_regex)) {
				return false;
			}
		}
		return true;
	});
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			build: {
				src: my_src_files
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
						'<%= grunt.template.today("yyyy-mm-dd") %> */',
				global_defs: {
					DEBUG: false
				}
			},
			build: {
				src: src_js,
				dest: "build/red.min.js"
			}
		},
		concat: {
			options: {
				banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
						'<%= grunt.template.today("yyyy-mm-dd") %> */'
			},
			js: {
				src: src_js,
				dest: "build/red.js"
			}
		},
		copy: {
			css: {
				files: [
					{ expand: true, cwd: "src/view/style/", src: ["**"], dest: "build/style" }
				]
			},

			sample_apps: {
				files: [
					{ expand: true, cwd: "sample_apps/", src: ["**"], dest: "build/sample_apps" }
				]
			},

			dist: {
				files: [
					{ expand: true, cwd: "dist/", src: ["**"], dest: "build/" }
				]
			}
		},
		clean: {
			build: ["build/"]
		}
	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');

	// Default task(s).
	grunt.registerTask('default', ['concat', /*'uglify',*/ 'copy']);
	grunt.registerTask('test', ['jshint']);
};
