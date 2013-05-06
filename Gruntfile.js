module.exports = function(grunt) {

	var ends_with = function (str1, str2) {
		return str1.slice(str1.length-str2.length) == str2;
	};
	var inc_libs = require('./include_libs');

	var runtime_and_editor = inc_libs.runtime.concat(inc_libs.editor);

	var src_js = runtime_and_editor.filter(function(f) { return ends_with(f, ".js");});

	var exclude_regexes = [
		"jquery-.*\\.js",
		"raphael\\.js",
		"underscore\\.js",
		"underscore\\.deferred\\.js",
		"esprima\\.js"
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

	var package = grunt.file.readJSON('package.json');
	// Project configuration.
	grunt.initConfig({
		pkg: package,
		jshint: {
			build: {
				src: my_src_files
			}
		},
		uglify: {
			build: {
				options: {
					banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
							'<%= grunt.template.today("yyyy-mm-dd h:MM:ss TT") %> */',
					global_defs: {
						DEBUG: false
					}
				},
				src: "build/red.js",
				dest: "build/red.min.js"
			}
		},
		concat: {
			js: {
				options: {
					banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
							'<%= grunt.template.today("yyyy-mm-dd h:MM:ss TT") %> */',
					process: {
						data: {
							version: package.version,
							build_time: grunt.template.today("yyyy-mm-dd h:MM:ss TT")
						}
					}
				},
				src: src_js,
				dest: "build/red.js"
			},
			esprima: {
				src: "src/_vendor/esprima/esprima.js",
				dest: "build/_vendor/esprima.js"
			},
			box2d: {
				src: "src/_vendor/box2d/Box2dWeb-2.1.a.3.min.js",
				dest: "build/_vendor/Box2dWeb-2.1.a.3.min.js"
			}
		},
		sass: {
			dist: {
				editor_style: {
					"build/style/editor_style.css": "src/view/style/editor_style.sass"
				}
			}
		},
		copy: {
			css: {
				files: [
					{ expand: true, cwd: "src/view/style/images", src: ["**"], dest: "build/style/images" },
					{ expand: true, cwd: "src/view/style/fonts", src: ["**"], dest: "build/style/fonts" }
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
	grunt.loadNpmTasks('grunt-contrib-sass');

	// Default task(s).
	grunt.registerTask('full', ['jshint', 'concat', 'uglify', 'sass', 'copy']);
	grunt.registerTask('default', ['concat', 'uglify', 'sass', 'copy']);
	grunt.registerTask('quick', ['jshint', 'concat', 'sass', 'copy']);
	grunt.registerTask('test', ['jshint']);
};
