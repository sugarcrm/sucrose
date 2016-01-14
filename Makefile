JS_FILES = \
	src/intro.js \
	src/core.js \
	src/tooltip.js \
	src/utils.js \
	src/models/axis.js \
	src/models/legend.js \
	src/models/scroll.js \
	src/models/scatter.js \
	src/models/bubbleChart.js \
	src/models/funnel.js \
	src/models/funnelChart.js \
	src/models/gauge.js \
	src/models/gaugeChart.js \
	src/models/globe.js \
	src/models/line.js \
	src/models/lineChart.js \
	src/models/lineWithFocusChart.js \
	src/models/multiBar.js \
	src/models/multiBarChart.js \
	src/models/paretoChart.js \
	src/models/pie.js \
	src/models/pieChart.js \
	src/models/sankey.js \
	src/models/stackedArea.js \
	src/models/stackedAreaChart.js \
	src/models/tree.js \
	src/models/treemap.js \
	src/models/treemapChart.js \
	src/outro.js
	# src/models/sparkline.js \
	# src/models/sparklinePlus.js \

CSS_FILES = \
	src/less/sucrose.less

D3_FILES = \
	lib/d3.js

JS_COMPILER = \
	node_modules/uglify-js/bin/uglifyjs

CSS_COMPILER = \
	node_modules/less/bin/lessc

CSS_MINIFIER = \
	node_modules/clean-css/bin/cleancss

.PHONY: examples clean-js clean-css


#PRODUCTION

install: npm-prod dependencies

npm-prod:
	npm i --production

dependencies: clean-dependencies
	cp node_modules/d3/d3.min.js d3.min.js
	cp node_modules/topojson/topojson.min.js topojson.min.js
	cp node_modules/queue-async/queue.min.js queue.min.js

clean-dependencies:
	rm -rf d3.min.js topojson.min.js queue.min.js


#DEVELOPMENT

install-dev: npm-dev dependencies all

npm-dev:
	npm i

all: sucrose.js sucrose.min.js sucrose.css sucrose.min.css

# Javascript
js: clean-js sucrose.js sucrose.min.js
sucrose.js: $(JS_FILES)
	rm -f ./$@
	cat header $(filter %.js,$^) >> ./$@
sucrose.min.js: sucrose.js
	rm -f ./$@
	cat $^ | $(JS_COMPILER) >> ./$@
	cat header ./$@ > temp
	mv temp ./$@
clean-js:
	rm -rf sucrose.js sucrose.min.js

# Stylesheets
css: clean-css sucrose.css sucrose.min.css
sucrose.css: $(CSS_FILES)
	rm -f ./$@
	node $(CSS_COMPILER) $(CSS_FILES) ./$@
	cat header ./$@ > temp
	mv temp ./$@
sucrose.min.css: sucrose.css
	rm -f ./$@
	node $(CSS_MINIFIER) -o ./$@ $^
	cat header ./$@ > temp
	mv temp ./$@
clean-css:
	rm -rf sucrose.css sucrose.min.css

# Dependencies

d3.min.js: $(D3_FILES)

d3.min.js:
	rm -f ./lib/$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./lib/$@


# EXAMPLES

examples: npm-prod
	cd examples && make install-prod

examples-dev: npm-dev
	cd examples && make install-dev

reset:
	git clean -dfx
