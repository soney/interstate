/*jslint nomen: true */
/*global Raphael, window */
(function () {
	"use strict";

	var paper = new Raphael(0, 0, 500, 500),
		url_prefix = "../../site/img_carousel/",
		url_suffix = ".jpg",
		images = ["fish", "leaf", "tulips", "winter", "wonderland"];

	var large_image_width = 500,
		selected_index = 0,
		large_image = paper.image(url_prefix + images[selected_index] + url_suffix,
									0,
									0,
									large_image_width,
									2 * large_image_width / 3),
		thumbnails,
		selected_thumbnail,
        redIndicator = paper.rect(0,0,0,0),
		start_time;

  redIndicator.attr("fill",'red');
  redIndicator.attr("stroke-width",0);
 /* function shrink_red_rect() {
	var redIndicator = paper.rect();
  }*/

	function set_selected_index(index) {
		selected_index = index;
		large_image.attr("src", url_prefix + images[selected_index] + url_suffix);
        selected_thumbnail.attr("opacity", 0.4);
		selected_thumbnail = thumbnails[selected_index];
        selected_thumbnail.attr("opacity", 1.0);
	}

	thumbnails = images.map(function (src, i) {
        var thumbnail_width = 95;
		var thumbnail =  paper.image(url_prefix + src + url_suffix,
										2 + (thumbnail_width + 5) * i,
										large_image.attr("height") + 5,
										thumbnail_width, thumbnail_width * 2 / 3);
        if(i === 0) {
          thumbnail.attr("opacity", 1.0);
        } else {
          thumbnail.attr("opacity", 0.4);
        }
		thumbnail.click(function () {
			set_selected_index(i);
            reset_timer();
		});
		return thumbnail;
	});
	selected_thumbnail = thumbnails[selected_index];



	function get_time_ms() {
		return (new Date()).getTime();
	}

	start_time = get_time_ms();

	function reset_timer() {
		start_time = get_time_ms();
	}
    var diff;
	window.setInterval(function () {
        diff = 5000 - get_time_ms() + start_time;

		if (diff <= 0) {
			set_selected_index((selected_index + 1) % 5);
			reset_timer();
		}

      redIndicator.attr("x", selected_thumbnail.attr("x"));
    redIndicator.attr("y", selected_thumbnail.attr("y") + selected_thumbnail.attr("height"));
    redIndicator.attr("width", diff*95/5000);
    redIndicator.attr("height", 10);
	}, 50);


}());
