# --------------------------------------------------
# Sucrose.io - Library and dependency build scripts
#
# Copyright (c) 2018 SugarCRM Inc.
# Licensed by SugarCRM under the Apache 2.0 license.
# --------------------------------------------------

SHELL=/bin/bash -o pipefail

CSS_FILES := src/less/sucrose.less

JS_MINIFIER := ./node_modules/.bin/uglifyjs

JS_BUNDLER := ./node_modules/.bin/rollup

CSS_COMPILER := ./node_modules/.bin/lessc

CSS_MINIFIER := ./node_modules/.bin/cleancss

HELP_MAKER := ./node_modules/.bin/make-help

HEADER = $(shell cat src/header)

.DEFAULT_GOAL := help

WARN_COLOR := \x1b[33;01m
ERR_COLOR := \x1b[31;01m
OK_COLOR := \x1b[32;01m
NO_COLOR := \x1b[0m
define printgo
	@printf "\n$(WARN_COLOR)%s$(NO_COLOR)\n" $(1)
endef
define printok
	@printf "%s...$(OK_COLOR)[OK]$(NO_COLOR)\n" $(1)
endef

.PHONY: prod dev all scr sgr sucrose css locales \
	clean clean-js clean-css clean-locales \
	d3-scr d3-sgr d3-bundle d3-minify d3-all clean-d3 \
	examples examples-prod examples-dev \
	pack npm-sugar cover help list md

#-----------
# PRODUCTION

# - install production npm packages [main]
prod:
	@printf "\n$(WARN_COLOR)Install production NPM dependencies for Sucrose.$(NO_COLOR)\n"
	@npm install --production
	@printf "NPM dependencies installed...$(OK_STRING)\n"

#------------
# DEVELOPMENT

# - install development npm packages and build all [main dev]
dev:
	@printf "\n$(OK_COLOR)Install development NPM dependencies for Sucrose.$(NO_COLOR)\n"
	@npm install
	@printf "NPM dependencies installed...$(OK_STRING)\n"
	@make all

# - compile sucrose Js and Css files
all: scr css locales

# - remove sucrose Js and Css files
clean: clean-d3 clean-js clean-css clean-locales


# SUCROSE BUILD TARGETS

TAR = scr
DEV = false

# - [*] build full sucrose library and D3 custom bundle
scr: TAR = scr

# - [*] build selected sucrose modules and D3 custom bundle for Sugar
sgr: TAR = sgr

scr sgr: pack d3 sucrose

# - compile a Node compliant entry file and create a Js version of package.json for Sucrose
pack:
	$(call printgo,"Compile a Node compliant entry file and create a Js version of package.json for Sucrose:")
	@node ./scripts/pack.$(TAR).js
	npm run package
	@node ./scripts/rollup.node.js
	$(call printok,"Node entry and Js package file compiled to build")

# - [*] build default Sucrose Js library
sucrose: sucrose.min.js
	@printf "\n$(OK_COLOR)Sucrose '$(TAR)' build complete.$(NO_COLOR)\n"

# - build the Sucrose Js library with components for target
# $(JS_BUNDLER) -c scripts/rollup.$(TAR).js --environment BUILD:$(TAR),DEV:$(DEV) --banner '$(HEADER)' -o ./build/$@
# $(JS_BUNDLER) -c scripts/rollup.$(TAR).js --environment BUILD:$(TAR),DEV:$(DEV) | cat ./src/header - > ./build/$@
sucrose.js:
	$(call printgo,"Compile the Sucrose '$(TAR)' library bundle:")
	@rm -f ./build/$@
	$(JS_BUNDLER) -c scripts/rollup.$(TAR).js --environment BUILD:$(TAR),DEV:$(DEV) -o ./build/tmp
	@cat ./src/header ./build/tmp > ./build/$@
	@rm ./build/tmp
	$(call printok,"Sucrose bundle compiled to build")

# - build then minify the Sucrose Js library
# uglifyjs --preamble "$(HEADER)" build/$^ -c negate_iife=false -m -o build/$@
sucrose.min.js: sucrose.js
	$(call printgo,"Minify Sucrose library file:")
	@rm -f ./build/$@
	$(JS_MINIFIER) build/$^ -c negate_iife=false,unused=false -m | cat ./src/header - > ./build/$@
	$(call printok,"Sucrose file minified in build")

# - remove all Sucrose and D3 Js files
clean-js:
	@rm -f ./build/sucrose*.js
	$(call printok,"Sucrose files removed from build")


# D3 BUILD TARGETS

D3 = d3

# - [*] build default D3 bundle
d3:
	@make d3-$(TAR)
	@printf "\n$(OK_COLOR)Custom 'D3-$(TAR)' build complete.$(NO_COLOR)\n"

# - build custom D3 bundle with just required components for Sucrose
d3-scr: D3 = d3

# - build custom D3 bundle with just required components for Sugar
d3-sgr: D3 = d3-sugar

d3-scr d3-sgr: d3-minify d3-topo

# - build the D3 library Js file with components for target
d3-bundle:
	$(call printgo,"Compile the custom 'D3-$(TAR)' library bundle:")
	@rm -f ./build/$(D3).js
	$(JS_BUNDLER) -c ./node_modules/d3/rollup.config.js -f umd -n $(subst -,,$(D3)) \
		-i ./scripts/d3-rebundle/index_$(D3).js -o ./build/$(D3).js \
		--banner ";$(shell cd ./node_modules/d3 && ../.bin/preamble)"
	$(call printok,"D3 bundle compiled to build")

# - build then minify the D3 custom bundle
d3-minify: d3-bundle
	$(call printgo,"Minify custom library file:")
	@rm -f ./build/$(D3).min.js
	$(JS_MINIFIER) build/$(D3).js \
		-b beautify=false,preamble='";$(shell cd ./node_modules/d3 && ../.bin/preamble)"' \
		-c negate_iife=false,unused=false -m -o build/$(D3).min.js
	$(call printok,"D3 file minified in build")

# - copy full D3 from node_modules to build directory
d3-all: d3-topo
	@rm -f ./build/d3*.js
	@echo ";" | cat - ./node_modules/d3/build/d3.js >> ./build/d3.js
	@echo ";" | cat - ./node_modules/d3/build/d3.min.js >> ./build/d3.min.js
	$(call printok,"Full D3 library files copied to build")

d3-topo:
	$(call printgo,"Copy TopoJson library files from node_modules:")
	@rm -f ./build/topojson*.js
	@cp ./node_modules/topojson/dist/topojson.js build/topojson.js
	@cp ./node_modules/topojson/dist/topojson.min.js build/topojson.min.js
	$(call printok,"TopoJson files copied to build")

clean-d3:
	@rm -f ./build/$(D3)*.js
	@rm -f ./build/topojson*.js
	$(call printok,"D3 & TopoJson files removed from build")


# STYLESHEETS

# - [*] compile and compress sucrose library LESS source files into Css
css: sucrose.min.css

# - compile LESS files with lessc
sucrose.css: $(CSS_FILES)
	@rm -f ./build/$@
	@node $(CSS_COMPILER) $(CSS_FILES) --autoprefix | cat ./src/header - > ./build/$@
	$(call printok,"LESS files compiled to build")

# - compile and then minify Css file
sucrose.min.css: sucrose.css
	$(call printgo,"Compile and compress sucrose library LESS source files into CSS:")
	@rm -f ./build/$@
	@node $(CSS_MINIFIER) --skip-rebase ./build/$^ | cat ./src/header - > ./build/$@
	$(call printok,"CSS file minified in build")

# - remove Sucrose Css files
clean-css:
	@rm -f ./build/sucrose*.css
	$(call printok,"CSS file removed from build")


#--------
# Locales

locales: clean-locales
	$(call printgo,"Build Sucrose locale resource files:")
	@node ./scripts/lang/build_locales.js
	@cp src/data/translation.json build/translation.json
	$(call printok,"Locale resource files copied to build")

clean-locales:
	@rm -f build/locales.json
	@rm -f build/translation.json
	$(call printok,"Locale resource files removed from build")


#---------
# EXAMPLES

# - [*] build and copy the Sucrose Js and Css to the example application
examples:
	cd examples && make sucrose

# - [*] build and copy the Sucrose Js and Css and dependency files to the example application
examples-all: all
	cd examples && make sucrose && make dependencies && make examples

# - install production package dependencies for Sucrose library and generate examples application
examples-prod: prod d3-topo
	cd examples && make prod

# - install development package dependencies for Sucrose library and generate examples application
examples-dev: dev
	cd examples && make dev


#-----
# MISC

# - publish the custom sugar build of Sucrose
npm-sugar:
	git branch -D sugar
	git checkout -b sugar
	make sgr
	git add --all
	git commit -m "compile @sugarcrm/sucrose to $(VER)"
	git push origin sugar -f
	npm publish ./ --tag sugar

# - create the instrumented build file for code coverage analysis
cover: sucrose.js
	npm run instrument

# - build and instrument sucrose.js for testing
instrument:
	make sucrose.js DEV=true
	npm run instrument
# - full test run
test: instrument
	npm test
# - data only test run
test-data: instrument
	npm run test-data
# - chart specific test run
test-chart:
	node ./node_modules/.bin/tape test/specs/**/$(CHART)-chart-test.js


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
	make help | sed -e 's/[\*]/\\*/g' | sed -e 's/$$/  /' > MAKE.md

# - just list the make targets
list:
	@$(MAKE) -pRrq -f $(lastword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$' | xargs
