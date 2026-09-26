/*jslint nomen: true */
/*global Raphael, window */

(function () {
"use strict";

  var paper = new Raphael(0, 0, 500, 500),
      rect = paper.rect(0, 0, 150, 100);

  rect.attr("fill", "black");

  var isDragLocked = false,
      mm_listener = function(mm_event) {
         rect.attr({
           x: mm_event.x - rect.attr("width")/2,
           y: mm_event.y - rect.attr("height")/2
         });
      },
      mu_listener = function(mu_event) {
        window.removeEventListener("mousemove", mm_listener);
        window.removeEventListener("mouseup", mu_listener);
        rect.attr("fill", "black");
      };

  rect.mousedown(function(md_event) {
          rect.attr({
            x: md_event.x - rect.attr("width")/2,
            y: md_event.y - rect.attr("height")/2
          });
          window.addEventListener("mousemove", mm_listener);
          window.addEventListener("mouseup", mu_listener);
          rect.attr("fill", "blue");
      }).dblclick(function(dc_event) {
          if(isDragLocked) {
            removeEventListener("mousemove", mm_listener);
          } else {
            addEventListener ("mousemove", mm_listener);
            rect.attr("fill", "navy");
          }

          isDragLocked = !isDragLocked;
      }).click(function() {
          if(isDragLocked) {
            isDragLocked = false;
            removeEventListener("mousemove", mm_listener);
          }
      });

}());
