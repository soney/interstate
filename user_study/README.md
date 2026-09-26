# User study: JavaScript equivalents

JavaScript versions of the user study tasks, for comparison with their InterState versions:

- [Drag Lock](drag_lock/drag_lock.js) (InterState version: [`dist/examples/drag_lock.ist`](../dist/examples/drag_lock.ist))
- [Image Carousel](image_carousel/image_carousel.js) (InterState version: [`dist/examples/img_carousel.ist`](../dist/examples/img_carousel.ist))

To run one, open its `index.html` in a browser from a copy of this repository.

These used to be hosted on JS Bin. The code is the same, except that it doesn't depend on
other sites: `index.html` loads Raphaël from `src/_vendor/raphael` (rather than from cdnjs)
and then the task's script, and the image carousel loads its photos from `site/img_carousel`
(rather than from `http://interstate.from.so/carousel_images/`).
