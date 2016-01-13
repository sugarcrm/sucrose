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

LIB_FILES = \
	./node_modules/canvg/rgbcolor.js \
	./node_modules/canvg/StackBlur.js \
	./node_modules/canvg/canvg.js \
	./examples/js/lib/micro-query.js \
	./examples/js/lib/jquery-ui.min.js \
	./examples/js/lib/fastclick.js \
	./examples/js/lib/store2.min.js

APP_FILES = \
	./examples/js/app/intro.js \
	./examples/js/app/main.js \
	./examples/js/app/charts.js \
	./examples/js/app/translate.js \
	./examples/js/app/loader.js \
	./examples/js/app/saveimage.js \
	./examples/js/app/outro.js

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
	cat header $(filter %.js,$^) >> $@

sucrose.min.js: Makefile
	rm -f ./$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./$@
	cat header ./$@ | tee ./$@ > /dev/null

d3.min.js: Makefile
	rm -f ./lib/$@
	cat $(filter %.js,$^) | $(JS_COMPILER) >> ./lib/$@

sucrose.css: Makefile
	rm -f ./$@
	node $(CSS_COMPILER) $(CSS_FILES) ./$@
	cat header ./$@ | tee ./$@ > /dev/null

sucrose.min.css: Makefile
	rm -f ./$@
	node $(CSS_MINIFIER) -o ./$@ sucrose.css
	cat header ./$@ | tee ./$@ > /dev/null

clean:
	rm -rf sucrose.js sucrose.min.js sucrose.css sucrose.min.css

examples:
	rm -f ./examples/css/*.css
	rm -f ./examples/js/app.js
	rm -f ./examples/js/app.min.js
	cp ./sucrose.js examples/js/sucrose.js
	cp ./sucrose.min.js examples/js/sucrose.min.js
	cp ./sucrose.css examples/css/sucrose.css
	cp ./sucrose.min.css examples/css/sucrose.min.css
	node $(CSS_COMPILER) examples/less/examples.less ./examples/css/examples.css
	node $(CSS_MINIFIER) -o ./examples/css/examples.min.css ./examples/css/examples.css
	#node node_modules/less/bin/lessc --clean-css examples/less/examples.less ./examples/css/examples.min.css
	rm -f ./examples/js/lib.min.js
	cat $(LIB_FILES) | $(JS_COMPILER) >> ./examples/js/lib.min.js
	rm -f ./examples/js/app.min.js
	cat header $(APP_FILES) >> ./examples/js/app.js
	cat $(APP_FILES) | $(JS_COMPILER) >> ./examples/js/app.min.js
	cat header ./examples/js/app.min.js | tee ./examples/js/app.min.js > /dev/null
