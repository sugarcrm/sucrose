#-------
#SOURCES

CSS_FILES = \
	src/less/sucrose.less

JS_MINIFIER = \
	node_modules/uglify-js/bin/uglifyjs

CSS_COMPILER = \
	node_modules/less/bin/lessc

CSS_MINIFIER = \
	node_modules/clean-css/bin/cleancss

.PHONY: examples clean-js clean-css

#----------
#PRODUCTION

install: npm-prod dependencies

npm-prod:
	npm i --production

dependencies: clean-dependencies
	cp ./node_modules/d3/build/d3.js ./build/d3.js
	cp ./node_modules/d3/build/d3.min.js ./build/d3.min.js
	cp ./node_modules/topojson/build/topojson.js ./build/topojson.js
	cp ./node_modules/topojson/build/topojson.min.js ./build/topojson.min.js
	cp ./node_modules/d3fc-rebind/build/d3fc-rebind.js ./build/d3fc-rebind.js
	cp ./node_modules/d3fc-rebind/build/d3fc-rebind.min.js ./build/d3fc-rebind.min.js

clean-dependencies:
	rm -rf d3.min.js topojson.min.js d3fc-rebind.min.js


#-----------
#DEVELOPMENT

install-dev: npm-dev dependencies all

npm-dev:
	npm i

all: sucrose.min.js sucrose.min.css

clean: clean-js clean-css

# Javascript
js: clean-js sucrose.js sucrose.min.js
sucrose.js:
	rm -f ./build/$@
	rollup -c
	cat src/header ./build/$@ > temp
	mv temp ./build/$@
sucrose.min.js: sucrose.js
	rm -f ./build/$@
	cat ./build/$^ | $(JS_MINIFIER) >> ./build/$@
	cat src/header ./build/$@ > temp
	mv temp ./build/$@
clean-js:
	rm -rf ./build/sucrose.js ./build/sucrose.min.js

# Stylesheets
css: clean-css sucrose.css sucrose.min.css
sucrose.css: $(CSS_FILES)
	rm -f ./build/$@
	node $(CSS_COMPILER) $(CSS_FILES) ./build/$@
	cat src/header ./build/$@ > temp
	mv temp ./build/$@
sucrose.min.css: sucrose.css
	rm -f ./$@
	node $(CSS_MINIFIER) -o ./$@ ./build/$^
	rm -f ./build/$@
	cat src/header ./$@ > ./build/$@
	rm -f ./$@
clean-css:
	rm -rf ./build/sucrose.css ./build/sucrose.min.css


#---------
# EXAMPLES

examples: npm-prod
	cd examples && make install-prod

examples-dev: npm-dev
	cd examples && make install-dev

examples-sucrose: js css
	cd examples && make sucrose

reset:
	git clean -dfx


#----
# RUN

rolls:
	rollup -c
nodes: packs
	node rollup.node
grade:
	npm test
packs:
	npm run-script package
