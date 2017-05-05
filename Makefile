# --------------------------------------------------
# Sucrose.io - Example application build scripts
#
# Copyright (c) 2017 SugarCRM Inc.
# Licensed by SugarCRM under the Apache 2.0 license.
# --------------------------------------------------

CSS_FILES = src/less/sucrose.less

JS_MINIFIER = node_modules/uglify-js/bin/uglifyjs

CSS_COMPILER = node_modules/less/bin/lessc

CSS_MINIFIER = node_modules/clean-css/bin/cleancss

HELP_MAKER = \
	./node_modules/make-help/bin/make-help

HEADER = $(shell cat src/header)

.DEFAULT_GOAL := help

.PHONY: install-prod install-post npm-prod dependencies clean-dependencies \
	install-dev npm-dev all clean scr sgr clean-js clean-css css \
	examples-prod examples-dev examples-sucrose es \
	pack nodes grade help list md


#-----------
# PRODUCTION

# - install sucrose dependent npm packages and copy build files [main]
install-prod: npm-prod

# - copy sucrose and dependency files and generate index
install-post: dependencies

# - install production npm packages
npm-prod:
	npm i --production

# - copy dependency js files (D3, D3FC)
dependencies: clean-dependencies
	cp ./node_modules/topojson/build/topojson.js ./build/topojson.js
	cp ./node_modules/topojson/build/topojson.min.js ./build/topojson.min.js
	cp ./node_modules/d3fc-rebind/build/d3fc-rebind.js ./build/d3fc-rebind.js
	cp ./node_modules/d3fc-rebind/build/d3fc-rebind.min.js ./build/d3fc-rebind.min.js

# - remove dependency js files
clean-dependencies:
	rm -f ./build/topojson.js ./build/d3fc-rebind.js
	rm -f ./build/topojson.min.js ./build/d3fc-rebind.min.js


#------------
# DEVELOPMENT

# - install development environment [main dev]
install-dev: npm-dev dependencies all

# - install development npm packages
npm-dev:
	npm i

# - compile sucrose javascript and css files
all: scr sucrose.min.css

# - remove sucrose javascript and css files
clean: clean-js clean-css

# BUILD TARGETS

# - build full sucrose library and D3 custom bundle
TAR = scr
scr: TAR = scr
# - build selected sucrose modules and D3 custom bundle for Sugar
sgr: TAR = sgr
scr sgr: sucrose.min.js d3v4.min.js

# JAVASCRIPT

# - [*] build the main sucrose library js file with components for target
sucrose.js:
	rm -f ./build/$@
	rollup -c rollup.config.js --environment BUILD:$(TAR),DEV:false --banner "$(HEADER)"

# - [*] minify the main library js file
sucrose.min.js: sucrose.js
	rm -f ./build/$@
	cat ./build/$^ | $(JS_MINIFIER) --preamble "$(HEADER)" >> ./build/$@

# - create a custom D3 bundle with just required components for target
d3v4.js:
	rollup -c ./node_modules/d3/rollup.config.js --banner ";$(shell cd ./node_modules/d3 && preamble)" -f umd -n d3v4 \
		-o ./build/$@ -i ./src/d3-rebundle/index_$(TAR).js

# - minify the custom D3 bundle
d3v4.min.js: d3v4.js
	rm -f ./build/$@
	cat ./build/$^ | $(JS_MINIFIER) --preamble ";$(shell cd ./node_modules/d3 && preamble)" >> ./build/$@

# - remove the main library js files
clean-js:
	rm -f ./build/sucrose.js ./build/sucrose.min.js
	rm -f ./build/d3v4.js ./build/d3v4.min.js

# STYLESHEETS

# - [*] compile and compress sucrose library LESS source files into CSS
css: clean-css sucrose.css sucrose.min.css

# - compile LESS files with lessc
sucrose.css: $(CSS_FILES)
	rm -f ./build/$@
	@node $(CSS_COMPILER) $(CSS_FILES) --autoprefix | cat ./src/header - > ./build/$@

# - minify CSS file with clean-css
sucrose.min.css: sucrose.css
	rm -f ./build/$@
	node $(CSS_MINIFIER) ./build/$^ | cat ./src/header - > ./build/$@

# - remove the library CSS files
clean-css:
	rm -f ./build/sucrose.css ./build/sucrose.min.css


#---------
# EXAMPLES

# - install production package dependencies for sucrose library and generate production examples application
examples-prod: npm-prod
	cd examples && make install-prod

# - install development package dependencies for sucrose library and generate development examples application
examples-dev: npm-dev
	cd examples && make install-dev

# - build and copy the sucrose library to the example application
es examples-scr: sucrose.min.js
	cd examples && make sucrose

# - build and copy the sucrose js and css files to the example application
examples-sucrose: scr css
	cd examples && make sucrose && make dependencies

#----
# RUN

# - create a js version of json package
packs:
	npm run-script package

# - compile a Node compliant entry file for sucrose
nodes: packs
	node rollup.node

# - [*] run tape tests
grade:
	npm test


#-----
# HELP

define prod_content

--------------------------------------
  Usage:
    make <target>

  Targets: for installing and developing Sucrose
endef
export prod_content

# - show some help [default]
help:
	@echo "$$prod_content"
	@$(HELP_MAKER) -p 4 "$(lastword $(MAKEFILE_LIST))"
	@echo " "
	@echo "--------------------------------------"
	@echo " "

# - generate a MAKE.md from help
md:
	make help > MAKE.md

# - just list the make targets
list:
	@$(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' | xargs
