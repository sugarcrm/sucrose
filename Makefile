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

D3_FILES = \
	lib/d3.js

JS_COMPILER = \
	uglifyjs

all: sucrose.js sucrose.min.js
sucrose.js: $(JS_FILES)
sucrose.min.js: $(JS_FILES)
d3.min.js: $(D3_FILES)

sucrose.js: Makefile
	rm -f $@
	cat $(filter %.js,$^) >> $@

sucrose.min.js: Makefile
	rm -f ./$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./$@

d3.min.js: Makefile
	rm -f ./lib/$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./lib/$@

clean:
	rm -rf sucrose.js sucrose.min.js


