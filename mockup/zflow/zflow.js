/*
    Copyright (C) 2008, 2009 Charles Ying. All Rights Reserved.
    
    This distribution is released under the BSD license.

    http://css-vfx.googlecode.com/
    
    See the README for documentation and license.
*/

(function () {  // Module pattern

var global = this;

//    Utilities (avoid jQuery dependencies)

function utils_extend(obj, dict) {
    for (var key in dict) {
        obj[key] = dict[key];
    }
}

function utils_setsize(elem, w, h) {
    elem.style.width = w.toString() + "px";
    elem.style.height = h.toString() + "px";
}

function utils_setxy(elem, x, y) {
    elem.style.left = Math.round(x).toString() + "px";
    elem.style.top = Math.round(y).toString() + "px";
}

//    TrayController is a horizontal touch event controller that tracks cumulative offsets and passes events to a delegate. 

TrayController = function () {
    return this;
};

TrayController.prototype.init = function (elem) {
    this.currentX = 0;
    this.elem = elem;
};


TrayController.prototype.handleEvent = function (event) {
    this[event.type](event);
    event.preventDefault();
};

//These variables define how the zflow presentation is made.

const CSIZE = 150;
const CGAP = CSIZE / 2;

const FLOW_ANGLE = 70;
const FLOW_THRESHOLD = CGAP / 2;
const FLOW_ZFOCUS = CSIZE;
const FLOW_XGAP = CSIZE / 3;

const T_NEG_ANGLE = "rotateY(" + (- FLOW_ANGLE) + "deg)";
const T_ANGLE = "rotateY(" + FLOW_ANGLE + "deg)";
const T_ZFOCUS = "translate3d(0, 0, " + FLOW_ZFOCUS + "px)";

FlowDelegate = function () {
    this.cells = new Array();
    this.transforms = new Array();
};

FlowDelegate.prototype.init = function (elem) {
    this.elem = elem;
};

FlowDelegate.prototype.updateTouchEnd = function (controller) {
    this.lastFocus = undefined;

    // Snap to nearest position
    var i = this.getFocusedCell(controller.currentX);

    controller.currentX = - i * CGAP;
    this.update(controller.currentX);
};

FlowDelegate.prototype.getFocusedCell = function (currentX) {
    // Snap to nearest position
    var i = - Math.round(currentX / CGAP);

    // Clamp to cells array boundary
    return Math.min(Math.max(i, 0), this.cells.length - 1);
};

FlowDelegate.prototype.transformForCell = function (cell, i, offset) {
    //    This function needs to be fast, so we avoid function calls, divides, Math.round,
    //    and precalculate any invariants we can.
    var x = (i * CGAP);
    var ix = x + offset;

    if ((ix < FLOW_THRESHOLD) && (ix >= -FLOW_THRESHOLD)) {
        // yangle = 0, zpos = FLOW_ZFOCUS
        return T_ZFOCUS + " translate3d(" + x + "px, 0, 0)";
    } else if (ix > 0) {
        // yangle = -FLOW_ANGLE, x + FLOW_XGAP
        return "translate3d(" + (x + FLOW_XGAP) + "px, 0, 0) " + T_NEG_ANGLE;
    } else {
        // yangle = FLOW_ANGLE, x - FLOW_XGAP
        return "translate3d(" + (x - FLOW_XGAP) + "px, 0, 0) " + T_ANGLE;
    }
};

FlowDelegate.prototype.setTransformForCell = function (cell, i, transform) {
    if (this.transforms[i] !== transform) {
        cell.style.webkitTransform = transform;
        this.transforms[i] = transform;
    }
};

FlowDelegate.prototype.visibilityForCell = function(cell, i) {
};
FlowDelegate.prototype.setVisibilityForCell = function(cell, i) {
};

FlowDelegate.prototype.alphaForCell = function(cell, i, offset) {
    //    This function needs to be fast, so we avoid function calls, divides, Math.round,
    //    and precalculate any invariants we can.
    var x = (i * CGAP);
    var ix = x + offset;

	return Math.min(1, Math.abs(ix)/300);
};
FlowDelegate.prototype.setAlphaForCell = function(cell, i, alpha) {
	var overlay = cell.querySelector(".overlay");
	overlay.style.opacity = alpha+"";
};

FlowDelegate.prototype.update = function (currentX) {
    this.elem.style.webkitTransform = "translate3d(" + (currentX) + "px, 0, 0)";

    //    It would be nice if we only updated dirty cells... for now, we use a cache
    for (var i in this.cells) {
        var cell = this.cells[i];

        this.setTransformForCell(cell, i, this.transformForCell(cell, i, currentX));
        this.setAlphaForCell(cell, i, this.alphaForCell(cell, i, currentX));
        i += 1;
    }
};

global.zflow = function (images, selector, on_click) {
    var controller = new TrayController();
    var delegate = new FlowDelegate();
    var tray = document.querySelector(selector);

    controller.init(tray);
    delegate.init(tray);

    controller.delegate = delegate;

    
    var cellCSS = {
        top: Math.round(-CSIZE * 0.65) + "px",
        left: Math.round(-CSIZE / 2) + "px",
        width: CSIZE + "px",
        height: Math.round(CSIZE * 1.5) + "px",
        opacity: 0,
    };

    var imagesLeft = images.length;
	var x = 0;
	var img_locations = [];
	var image_tags = [];
	var cells = [];
	var canvases = [];
	var overlays = [];
    images.forEach(function (url, i) {
        var cell = document.createElement("div");
        var image = document.createElement("img");
        var canvas = document.createElement("canvas");
		var overlay = document.createElement("div");
		cells.push(cell);
		image_tags.push(image);
		canvases.push(canvas);
		overlays.push(overlay);


        cell.className = "cell";
        cell.appendChild(image);
        cell.appendChild(canvas);
		cell.appendChild(overlay);

        image.src = url;

		overlay.className = "overlay";
		overlay.style.backgroundColor = "black";
		overlay.style.width = "100%";
		overlay.style.height = "100%";
		overlay.style.position = "absolute";
		overlay.style.opacity = "0.0";

		// Start at 0 opacity
		tray.appendChild(cell);

        image.addEventListener("load", function () {
            imagesLeft -= 1;


			var y = x++;

			img_locations[y] = y*CGAP;

            if (imagesLeft == 0) {
				for(var i = 0; i<image_tags.length; i++) {
					var image = image_tags[i];
					var cell = cells[i];
					var overlay = overlays[i];
					var canvas = canvases[i];

					var iwidth = image.width;
					var iheight = image.height;
					
					var ratio = Math.min(CSIZE / iheight, CSIZE / iwidth);
					
					iwidth *= ratio;
					iheight *= ratio;

					utils_setsize(image, iwidth, iheight);

					utils_extend(cell.style, cellCSS);

					utils_setxy(image, (CSIZE - iwidth) / 2, CSIZE - iheight);
					utils_setxy(canvas, (CSIZE - iwidth) / 2, CSIZE);

					reflect(image, iwidth, iheight, canvas);

					delegate.setTransformForCell(cell, delegate.cells.length, delegate.transformForCell(cell, delegate.cells.length, controller.currentX));
					delegate.cells.push(cell);


					// Set to 1 to fade element in.
					cell.style.opacity = 1.0;

					overlay.addEventListener("mousedown", (function(i, image) { return function(e) {
						controller.currentX = -i*CGAP;
						delegate.updateTouchEnd(controller);
						e.preventDefault();
						if(on_click) {
							on_click(image);
						}
					}})(i, image));
				}
                window.setTimeout( function() { window.scrollTo(0, 0); delegate.updateTouchEnd(controller); }, 100 );
            }
        });
    });


	// Limited keyboard support for now
	window.addEventListener('keydown', function (e) {
		if (e.keyCode == 37) {
			// Left Arrow 
			controller.currentX += CGAP;
			delegate.updateTouchEnd(controller);
		} else if (e.keyCode == 39) {
			// Right Arrow
			controller.currentX -= CGAP;
			delegate.updateTouchEnd(controller);
		}
	});

	var select_img_index = function(index) {
		controller.currentX = -img_locations[index];
		delegate.updateTouchEnd(controller);
	};
	return select_img_index;
};

function reflect(image, iwidth, iheight, canvas) {
    canvas.width = iwidth;
    canvas.height = iheight / 2;

    var ctx = canvas.getContext("2d");

    ctx.save();

    ctx.translate(0, iheight - 1);
    ctx.scale(1, -1);
    ctx.drawImage(image, 0, 0, iwidth, iheight);

    ctx.restore();

    ctx.globalCompositeOperation = "destination-out";

    var gradient = ctx.createLinearGradient(0, 0, 0, iheight / 2);
    gradient.addColorStop(1, "rgba(255, 255, 255, 1.0)");
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, iwidth, iheight / 2);
}

})();
