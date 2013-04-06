all: _build

_build:
	mkdir -p build
	./Makefile.dryice.js build
	cp -R src/view/style build

dist: _build
	mkdir -p dist
	./Makefile.dryice.js dist
	cp -R src/view/style build

clean:
	rm -f build/cjs.js
	@@echo ""
	@@echo ""
	@@echo "Clean!"
	@@echo ""
