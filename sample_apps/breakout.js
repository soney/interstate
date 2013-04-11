/*global red */

(function(red) {
	"use strict";

	var env = red.create("environment");
	env
.set("w", "600")
.set("h", "400")
.cd("child_nodes")
	.set("ball", "<stateful>")
	.cd("ball")
		.set("(prototypes)", "INIT", "dom")
		.set("tag", "INIT", "'div'")
		.set("attr", "<dict>")
		.cd("attr")
			.up()
		.set("css", "<dict>")
		.cd("css")
			.set("position", "'absolute'")
			.set("left", "x+'px'")
			.set("top", "y+'px'")
			.set("width", "ballWidth+'px'")
			.set("height", "ballHeight+'px'")
			.set("backgroundColor", "'red'")
			.up()
		.set("x", "(start) -> INIT", "w/2")
		.set("y", "(start) -> INIT", "h/2")
		.set("vx", "(start) -> INIT", "480")
		.set("vy", "(start) -> INIT", "-280")
		.set("FPS", "60")
		.add_transition("INIT", "INIT", "on('timeout', 1000/FPS)")
		.set("x", "INIT -0> INIT", "max(0, min(x+(vx/FPS), w-ballWidth))")
		.set("y", "INIT -0> INIT", "max(0, y+(vy/FPS))")
		.add_transition("INIT", "INIT", "x <= 0")
		.set("vx", "INIT -1> INIT", "-vx")
		.add_transition("INIT", "INIT", "x + ballWidth >= w")
		.set("vx", "INIT -2> INIT", "-vx")
		.add_transition("INIT", "INIT", "y <= 0")
		.set("vy", "INIT -3> INIT", "-vy")
		.add_transition("INIT", "INIT", "y + ballHeight >= h")
		.set("vy", "INIT -4> INIT", "0")
		.set("vx", "INIT -4> INIT", "0")
		.add_transition("INIT", "INIT", "hit(x, y, ballWidth, ballHeight, paddle.x, paddle.y, paddle.pw, paddle.ph)")
		.set("vy", "INIT -5> INIT", "-1.01*vy")
		.add_transition("INIT", "INIT", "on('alive -> deady', blocks)")
		.set("vy", "INIT -6> INIT", "-vy")
		.add_transition("INIT", "INIT", "on('alive -> deadx', blocks)")
		.set("vx", "INIT -7> INIT", "-vx")
		.up()
	.set("paddle", "<stateful>")
	.cd("paddle")
		.set("(prototypes)", "INIT", "dom")
		.set("tag", "INIT", "'div'")
		.set("pw", "(start) -> INIT", "90")
		.set("ph", "(start) -> INIT", "20")
		.set("x", "(start) -> INIT", "(w-pw)/2")
		.set("y", "(start) -> INIT", "h-ph")
		.add_transition("INIT", "INIT", "on('keydown').when_eq('keyCode', 37)")
		.set("x", "INIT-0>INIT", "max(0, x-5)")
		.add_transition("INIT", "INIT", "on('keydown').when_eq('keyCode', 39)")
		.set("x", "INIT-1>INIT", "min(w-pw, x+5)")
		.set("x", "INIT", "min(max(ball.x-pw/2, 0), w-pw)")

		.set("attr", "<dict>")
		.cd("attr")
			.up()
		.set("css", "<dict>")
		.cd("css")
			.set("position", "'absolute'")
			.set("top", "y+'px'")
			.set("width", "pw+'px'")
			.set("height", "ph+'px'")
			.set("backgroundColor", "'black'")
			.set("left", "x+'px'")
			.up()
		.up()
	.set("blocks", "<stateful>")
	.cd("blocks")
		.rename_state("INIT", "alive")
		.add_state("deadx")
		.add_state("deady")
		.set("(prototypes)", "alive", "dom")
		.set("(copies)", "num_cols*num_rows")
		.add_transition("alive", "deadx", "hitleftright(ball.x, ball.y, ballWidth, ballHeight, x, y, block_width, block_height)")
		.add_transition("alive", "deady", "hittopbottom(ball.x, ball.y, ballWidth, ballHeight, x, y, block_width, block_height)")
		.add_transition("deadx", "alive", "on('level_up', root)")
		.add_transition("deady", "alive", "on('level_up', root)")
		.set("x", "(start) -> alive", "(col*block_width)")
		.set("y", "(start) -> alive", "(row*block_height)")
		.set("row", "((my_copy-1) - ((my_copy-1) % num_cols))/num_cols")
		.set("col", "(my_copy-1) % num_cols")
		.set("css", "<dict>")
		.cd("css")
			.set("position", "alive", "'absolute'")
			.set("left", "alive", "x+'px'")
			.set("top", "alive", "y+'px'")
			.set("width", "alive", "block_width + 'px'")
			.set("height", "alive", "block_height + 'px'")
			.set("border", "alive", "'1px solid black'")
			.set("visibility", "alive", "'visible'")
			.set("visibility", "deadx", "'hidden'")
			.set("visibility", "deady", "'hidden'")
			.set("backgroundColor", "alive", "colors[(my_copy-1)%colors.length]")
			.up()
		.up()
	.set("container", "<stateful>")
	.cd("container")
		.set("(prototypes)", "INIT", "dom")
		.set("text", "'Level ' + level_track.level")
		.set("css", "<dict>")
		.cd("css")
			.set("position", "INIT", "'absolute'")
			.set("left", "INIT", "'0px'")
			.set("top", "INIT", "'0px'")
			.set("width", "INIT", "w+'px'")
			.set("height", "INIT", "h+'px'")
			.set("border", "INIT", "'1px solid black'")
			.set("text-align", "INIT", "'right'")
			.set("font-size", "INIT", "'2em'")
			.up()
		.up()
	.up()
.set("num_cols", "colors.length-1")
.set("num_rows", "2")
.set("block_width", "w/num_cols")
.set("block_height", "30")
.set("colors", "['red', 'orange', 'yellow', 'green', 'blue', 'purple']")
.set("ballWidth", "30")
.set("ballHeight", "ballWidth")
.set("abs", "function(x) { if(x>0) { return x; } else { return -x; }}")
.set("hit", "function(x1,y1,w1,h1,x2,y2,w2,h2) {\n" +
	"if((x1 + w1 >= x2) && (x1 <= x2 + w2) &&\n" + 
	"	(y1 + h1 >= y2) && (y1 <= y2 + h2)) {\n" +
	"	return true;\n" +
	"} else {\n" +
	"	return false;\n" +
	"}\n" +
			"}")
.set("hitleftright", "function(x1, y1, w1, h1, x2, y2, w2, h2) {\n" +
	"if((x1 + w1 >= x2) && (x1 <= x2 + w2) &&\n" + 
	"	(y1 + h1 >= y2) && (y1 <= y2 + h2)) {\n" +
		"	var cx1 = x1+w1/2, cy1 = y1+h1/2;\n" +
		"	var cx2 = x2+w2/2, cy2 = y2+h2/2;\n" +
		"	return abs(cx1-cx2)/(w1+w2) > abs(cy1-cy2)/(h1+h2);\n" +
		"} else {\n" +
		"	return false;\n" +
		"}\n"+
	"}")
.set("hittopbottom", "function(x1, y1, w1, h1, x2, y2, w2, h2) {\n" +
		"if((x1 + w1 >= x2) && (x1 <= x2 + w2) &&\n" + 
		"	(y1 + h1 >= y2) && (y1 <= y2 + h2)) {\n" +
				"	var cx1 = x1+w1/2, cy1 = y1+h1/2;\n" +
				"	var cx2 = x2+w2/2, cy2 = y2+h2/2;\n" +
				"	return abs(cx1-cx2)/(w1+w2) <= abs(cy1-cy2)/(h1+h2);\n" +
			"} else {\n" +
			"	return false;\n" +
			"}\n"+
	"}")
.set("level_track", "<stateful>")
.cd("level_track")
	.add_transition("INIT", "INIT", "find(root.child_nodes.blocks).in_state('alive').is_empty()")
	.on_state("INIT->INIT", "function() { red.emit('level_up', root); }")
	.set("level", "<stateful_prop>")
	.set("level", "(start) -> INIT", "1")
	.set("level", "INIT -> INIT", "level+1")
	.up()
.set("min", "function(a, b) { return a<b ? a : b }")
.set("max", "function(a, b) { return a>b ? a : b }")

	red.on_sample_app_ready(env.get_root());
}(red));
