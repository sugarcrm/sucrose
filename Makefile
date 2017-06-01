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

.PHONY: prod dev npm-dev all scr sgr sucrose css \
	clean clean-js clean-css \
	d3-scr d3-sgr d3-bundle d3-minify d3-all \
	examples-prod examples-dev examples-sucrose es \
	pack nodes grade help list md

#-----------
# PRODUCTION

# - install sucrose & production npm packages [main]
prod:
	npm install --production

#------------
# DEVELOPMENT

# - install development environment [main dev]
dev: npm-dev all

# - install development npm packages
npm-dev:
	npm install

# - compile sucrose javascript and css files
all: scr css

# - remove sucrose javascript and css files
clean: clean-js clean-css


# SUCROSE BUILD TARGETS

TAR = scr

# - build full sucrose library and D3 custom bundle
scr: TAR = scr

# - build selected sucrose modules and D3 custom bundle for Sugar
sgr: TAR = sgr

scr sgr: sucrose
	make d3-$(TAR)

sucrose: sucrose.min.js


# - [*] build the main sucrose library js file with components for target
sucrose.js:
	rm -f ./build/$@
	rollup -c rollup.$(TAR).js --environment BUILD:$(TAR),DEV:false --banner "$(HEADER)"

# - [*] minify the main library js file
sucrose.min.js: sucrose.js
	rm -f ./build/$@
	uglifyjs --preamble "$(HEADER)" build/$^ -c negate_iife=false -m -o build/$@

# - remove the main library js files
clean-js:
	rm -f ./build/sucrose.js ./build/sucrose.min.js
	rm -f ./build/d3.js ./build/d3.min.js
	rm -f ./build/d3-sugar.js ./build/d3-sugar.min.js


# D3 BUILD TARGETS

D3 = d3

# - build custom D3 bundle with just required components for Sucrose
d3-scr: D3 = d3

# - build custom D3 bundle with just required components for Sugar
d3-sgr: D3 = d3-sugar

d3-scr d3-sgr:
	@if [ $(D3) = d3 ]; then make d3-sucrose; else make d3-sugar; fi
	npm install
	make d3-minify

d3-sucrose:
	sed -i '' -e 's/"@sugarcrm\/sucrose"/"sucrose"/g' ./package.json
	sed -i '' -e 's/"@sugarcrm\/d3-sugar"/"d3"/g' ./package.json

d3-sugar:
	sed -i '' -e 's/"sucrose"/"@sugarcrm\/sucrose"/g' ./package.json
	sed -i '' -e 's/"d3"/"@sugarcrm\/d3-sugar"/g' ./package.json

# - [*] build the D3 library js file with components for target
d3-bundle:
	rm -f ./build/$(D3).js
	rollup -c ./node_modules/d3/rollup.config.js -f umd -n $(D3) \
		-i ./src/d3-rebundle/index_$(D3).js -o ./build/$(D3).js \
		--banner ";$(shell cd ./node_modules/d3 && preamble)"

# - [*] build the D3 library js file with components for target
d3-minify: d3-bundle
	rm -f ./build/$(D3).min.js
	uglifyjs --preamble ";$(shell cd ./node_modules/d3 && preamble)" \
		build/$(D3).js -c negate_iife=false -m -o build/$(D3).min.js

# - copy full D3 from node_modules to build directory
d3-all:
	rm -f ./build/d3.js
	echo ";" | cat - ./node_modules/d3/build/d3.js >> ./build/d3.js
	rm -f ./build/d3.min.js
	echo ";" | cat - ./node_modules/d3/build/d3.min.js >> ./build/d3.min.js


# STYLESHEETS

# - [*] compile and compress sucrose library LESS source files into CSS
css: sucrose.min.css

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

# - build and copy the sucrose js and css files to the example application
examples: scr css
	cd examples && make sucrose && make dependencies

# - install production package dependencies for sucrose library and generate production examples application
examples-prod: prod
	cd examples && make prod

# - install development package dependencies for sucrose library and generate development examples application
examples-dev: npm-dev
	cd examples && make dev


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
