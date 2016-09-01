LIB_FILES = \
	js/lib/fastclick.js \
	js/lib/jquery-ui.min.js \
	js/lib/micro-query.js \
	js/lib/mindmup-editabletable.js \
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
	node_modules/canvg/canvg.js \
	node_modules/canvg/rgbcolor.js \
	node_modules/canvg/StackBlur.js \
	node_modules/sugar/release/sugar-full.development.js \
	node_modules/store2/dist/store2.min.js

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

JS_COMPILER = \
	../node_modules/uglify-js/bin/uglifyjs

CSS_COMPILER = \
	../node_modules/less/bin/lessc

CSS_MINIFIER = \
	../node_modules/clean-css/bin/cleancss


#PRODUCTION

install-prod: npm-prod all index-prod

npm-prod:
	npm i --production

all: sucrose lib

sucrose: clean-sucrose
	cp ../sucrose.js js/sucrose.js
	cp ../sucrose.min.js js/sucrose.min.js
	cp ../sucrose.css css/sucrose.css
	cp ../sucrose.min.css css/sucrose.min.css

clean-sucrose:
	rm -rf js/sucrose.js js/sucrose.min.js \
		css/sucrose.css css/sucrose.min.css

lib: $(LIB_FILES) clean-lib
	# copy node module files
	cp ../node_modules/d3/build/d3.min.js js/d3.min.js
	cp ../node_modules/topojson/build/topojson.min.js js/topojson.min.js
	cp ../node_modules/d3fc-rebind/build/d3fc-rebind.min.js js/d3fc-rebind.min.js
	cp node_modules/jquery/dist/jquery.min.js js/jquery.min.js
	cp node_modules/jquerymy/jquerymy.min.js js/jquerymy.min.js
	# build lib js files
	cat $(LIB_FILES) >> js/lib.js
	cat $(LIB_FILES) | $(JS_COMPILER) >> js/lib.min.js

clean-lib:
	rm -rf js/d3.min.js js/topojson.min.js js/queue.min.js
	rm -rf js/jquery.min.js js/jquerymy.min.js
	rm -rf js/lib.js js/lib.min.js

index-prod:
	rm -rf index2.html
	sed 's/<!-- PROD::/<!-- PROD: -->/g' index.html \
		| sed 's/::PROD -->/<!-- :PROD -->/g' \
		| sed 's/<!-- DEV: -->/<!-- DEV::/g' \
		| sed 's/<!-- :DEV -->/::DEV -->/g' \
		>> index2.html
	rm -rf index.html
	mv index2.html index.html

clean: clean-sucrose clean-libraries


#DEVELOPMENT

install-dev: npm-dev sucrose lib lib-dev index-dev examples

npm-dev:
	npm i

examples: js css

clean-examples: clean-js clean-css

js: $(APP_FILES) clean-js
	# build app js files
	cat ../header $(APP_FILES) >> js/app.js
	cat $(APP_FILES) | $(JS_COMPILER) >> js/app.min.js
	cat ../header js/app.min.js > temp
	rm -f js/app.min.js
	mv temp js/app.min.js

clean-js:
	rm -rf js/app.js js/app.min.js

css: less/examples.less clean-css
	node $(CSS_COMPILER) less/examples.less css/examples.css
	node $(CSS_MINIFIER) -o css/examples.min.css css/examples.css
	# node node_modules/less/bin/lessc --clean-css less/examples.less css/examples.min.css

clean-css:
	rm -rf css/examples.css css/examples.min.css

lib-dev: clean-lib-dev
	# copy node module files
	cp ../node_modules/less/dist/less.min.js js/less.min.js

clean-lib-dev:
	rm -rf js/less.min.js

index-dev:
	rm -rf index2.html
	sed 's/<!-- DEV::/<!-- DEV: -->/g' index.html \
		| sed 's/::DEV -->/<!-- :DEV -->/g' \
		| sed 's/<!-- PROD: -->/<!-- PROD::/g' \
		| sed 's/<!-- :PROD -->/::PROD -->/g' \
		>> index2.html
	rm -rf index.html
	mv index2.html index.html

clean-dev: clean-js clean-css
