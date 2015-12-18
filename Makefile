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
	src/models/line.js \
	src/models/lineChart.js \
	src/models/lineWithFocusChart.js \
	src/models/multiBar.js \
	src/models/multiBarChart.js \
	src/models/paretoChart.js \
	src/models/pie.js \
	src/models/pieChart.js \
	src/models/sparkline.js \
	src/models/sparklinePlus.js \
	src/models/stackedArea.js \
	src/models/stackedAreaChart.js \
	src/models/treemap.js \
	src/models/treemapChart.js \
	src/models/tree.js \
	src/outro.js

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

all: sucrose.js sucrose.min.js sucrose.css sucrose.min.css
examples: all
sucrose.js: $(JS_FILES)
sucrose.min.js: $(JS_FILES)
d3.min.js: $(D3_FILES)
sucrose.min.css: sucrose.css

sucrose.js: Makefile
	rm -f $@
	cat $(filter %.js,$^) >> $@

sucrose.min.js: Makefile
	rm -f ./$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./$@

d3.min.js: Makefile
	rm -f ./lib/$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./lib/$@

sucrose.css:
	rm -f ./$@
	node $(CSS_COMPILER) $(CSS_FILES) ./$@

sucrose.min.css:
	rm -f ./$@
	node $(CSS_MINIFIER) -o ./$@ sucrose.css

clean:
	rm -rf sucrose.js sucrose.min.js

examples:
	cp ./sucrose.js examples/js/sucrose.js
	cp ./sucrose.min.js examples/js/sucrose.min.js
	cp ./sucrose.css examples/css/sucrose.css
	cp ./sucrose.min.css examples/css/sucrose.min.css
	rm -f ./examples/css/styles.css
	node $(CSS_COMPILER) examples/less/styles.less ./examples/css/styles.css
	cp ./node_modules/canvg/canvg.js examples/js/canvg.js
	cp ./node_modules/canvg/rgbcolor.js examples/js/rgbcolor.js
	cp ./node_modules/canvg/StackBlur.js examples/js/StackBlur.js

