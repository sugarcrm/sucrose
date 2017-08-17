# --------------------------------------------------
# Sucrose.io - Example application build scripts
#
# Copyright (c) 2017 SugarCRM Inc.
# Licensed by SugarCRM under the Apache 2.0 license.
# --------------------------------------------------

LIB_FILES = \
	js/lib/fastclick.js \
	js/lib/jquery-ui.min.js \
	js/lib/micro-query.js \
	js/lib/mindmup-editabletable.js \
	js/lib/sugar.js \
	node_modules/jsonlint/lib/jsonlint.js \
	node_modules/codemirror/lib/codemirror.js \
	node_modules/codemirror/mode/javascript/javascript.js \
	node_modules/codemirror/addon/lint/lint.js \
	node_modules/codemirror/addon/lint/javascript-lint.js \
	node_modules/codemirror/addon/lint/json-lint.js \
	node_modules/codemirror/addon/fold/foldcode.js \
	node_modules/codemirror/addon/fold/brace-fold.js \
	node_modules/codemirror/addon/fold/foldgutter.js \
	node_modules/jszip/dist/jszip.js \
	node_modules/jszip/vendor/FileSaver.js \
	node_modules/canvg/rgbcolor.js \
	node_modules/store2/dist/store2.min.js

DEP_FILES = \
	js/d3.min.js \
	js/topojson.min.js \
	js/jquery.min.js \
	js/jquerymy.min.js

APP_FILES = \
	js/app/intro.js \
	js/app/variables.js \
	js/app/charts.js \
	js/app/table.js \
	js/app/transform.js \
	js/app/generatepackage.js \
	js/app/generateimage.js \
	js/app/generatedata.js \
	js/app/generateconfig.js \
	js/app/loader.js \
	js/app/manifest.js \
	js/app/main.js \
	js/app/outro.js

JS_MINIFIER = \
	../node_modules/uglify-js/bin/uglifyjs

CSS_COMPILER = \
	../node_modules/less/bin/lessc

CSS_MINIFIER = \
	../node_modules/clean-css/bin/cleancss

HELP_MAKER = \
	./node_modules/make-help/bin/make-help

HEADER = $(shell cat js/app/header)

.DEFAULT_GOAL := help

.PHONY: prod dev npm-prod npm-dev index-prod index-dev \
	clean-sucrose clean-lib clean-dependencies clean-app clean-css list help md


#-----------
# PRODUCTION

# - install sucrose example application [main]
prod: npm-prod

# - install production npm packages
npm-prod:
	npm install --production

# - copy sucrose and dependency files and generate index
install-post: all index-prod

# - copy sucrose and dependency files
all: sucrose dependencies

# - remove sucrose and dependency files
clean: clean-sucrose clean-dependencies clean-dev clean-examples

# - [*] copy sucrose js and css files
sucrose: clean-sucrose
	cp ../build/sucrose.js js/sucrose.js
	cp ../build/sucrose.min.js js/sucrose.min.js
	cp ../build/sucrose.css css/sucrose.css
	cp ../build/sucrose.min.css css/sucrose.min.css

# - remove sucrose js and css files
clean-sucrose:
	rm -f js/sucrose.js js/sucrose.min.js \
		css/sucrose.css css/sucrose.min.css

# - copy dependency js files (D3, jQuery, jQueryMy)
dependencies: clean-dependencies
	# copy node module files
	cp ../build/d3.min.js js/d3.min.js
	cp ../node_modules/topojson/build/topojson.min.js js/topojson.min.js
	cp node_modules/jquery/dist/jquery.min.js js/jquery.min.js
	cp node_modules/jquerymy/jquerymy.min.js js/jquerymy.min.js

# - remove dependency js files
clean-dependencies:
	rm -f $(DEP_FILES)

# - generate production version of index page
index-prod:
	rm -f index2.html
	sed 's/<!-- PROD::/<!-- PROD: -->/g' index.html \
		| sed 's/::PROD -->/<!-- :PROD -->/g' \
		| sed 's/<!-- DEV: -->/<!-- DEV::/g' \
		| sed 's/<!-- :DEV -->/::DEV -->/g' \
		>> index2.html
	rm -f index.html
	mv index2.html index.html


# -----------
# DEVELOPMENT

# - install development environment [main dev]
dev: npm-dev examples index-dev

# - install development npm packages and copy files
npm-dev:
	npm install
	cp ../node_modules/less/dist/less.min.js js/less.min.js

# - remove development environment
clean-dev: index-prod
	rm -f js/less.min.js

# - build all js, css and library files
examples: js css lib

# - remove all built js, css and library files
clean-examples: clean-js clean-css clean-lib

# - [*] build all javascript files
js: app lib

# - concatenate, compress and copy all development library files
lib: $(LIB_FILES) clean-lib
	# build lib js files
	cat $(LIB_FILES) >> js/lib.js
	cat $(LIB_FILES) | $(JS_MINIFIER) >> js/lib.min.js

# - remove all development library files
clean-lib:
	rm -f js/lib.js js/lib.min.js

# - [*] build the examples app js file
app: $(APP_FILES) clean-app
	cat js/app/header $(APP_FILES) >> js/app.js
	cat $(APP_FILES) | $(JS_MINIFIER) --preamble "$(HEADER)" >> js/app.min.js

# - remove the examples app js file
clean-app:
	rm -f js/app.js js/app.min.js

# - [*] compile and compress LESS source into css files
css: less/examples.less clean-css
	node $(CSS_COMPILER) less/examples.less css/examples.css
	node $(CSS_MINIFIER) -o css/examples.min.css css/examples.css
	# node node_modules/less/bin/lessc --clean-css less/examples.less css/examples.min.css

# - remove the examples css file
clean-css:
	rm -f css/examples.css css/examples.min.css

# - generate development version of index page
index-dev:
	rm -f index2.html
	sed 's/<!-- DEV::/<!-- DEV: -->/g' index.html \
		| sed 's/::DEV -->/<!-- :DEV -->/g' \
		| sed 's/<!-- PROD: -->/<!-- PROD::/g' \
		| sed 's/<!-- :PROD -->/::PROD -->/g' \
		>> index2.html
	rm -f index.html
	mv index2.html index.html


#-----
# HELP

define prod_content

--------------------------------------
  Usage:
    make <target>

  Targets: for installing and developing the example application
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
