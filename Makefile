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
	uglifyjs

CSS_COMPILER = \
	node_modules/less/bin/lessc

CSS_MINIFIER = \
	node_modules/clean-css/bin/cleancss

.PHONY: examples

all: sucrose.js sucrose.min.js sucrose.css sucrose.min.css
sucrose.js: $(JS_FILES)
sucrose.min.js: $(JS_FILES)
d3.min.js: $(D3_FILES)
sucrose.css: $(CSS_FILES)
sucrose.min.css: sucrose.css

examples:
	npm i --production
	cd examples && npm i --production
	cd examples && make all

sucrose.js: Makefile
	rm -f $@
	cat header $(filter %.js,$^) >> $@

sucrose.min.js: Makefile
	rm -f ./$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./$@
	cat header ./$@ > temp
	mv temp ./$@

d3.min.js: Makefile
	rm -f ./lib/$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./lib/$@

sucrose.css: Makefile
	rm -f ./$@
	node $(CSS_COMPILER) $(CSS_FILES) ./$@
	cat header ./$@ > temp
	mv temp ./$@

sucrose.min.css: Makefile
	rm -f ./$@
	node $(CSS_MINIFIER) -o ./$@ sucrose.css
	cat header ./$@ > temp
	mv temp ./$@

clean:
	rm -rf sucrose.js sucrose.min.js sucrose.css sucrose.min.css
