LIB_FILES = \
	js/lib/fastclick.js \
	js/lib/jquery-ui.min.js \
	js/lib/micro-query.js \
	../node_modules/queue-async/queue.min.js \
	node_modules/canvg/canvg.js \
	node_modules/canvg/rgbcolor.js \
	node_modules/canvg/StackBlur.js \
	node_modules/sugar/release/sugar-full.development.js \
	node_modules/store2/dist/store2.min.js

APP_FILES = \
	js/app/intro.js \
	js/app/main.js \
	js/app/charts.js \
	js/app/translate.js \
	js/app/loader.js \
	js/app/saveimage.js \
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

all: sucrose examples

sucrose: clean-sucrose
	cp ../sucrose.js js/sucrose.js
	cp ../sucrose.min.js js/sucrose.min.js
	cp ../sucrose.css css/sucrose.css
	cp ../sucrose.min.css css/sucrose.min.css

	# copy node module files
	cp ../node_modules/d3/d3.min.js js/d3.min.js
	cp ../node_modules/topojson/topojson.min.js js/topojson.min.js

clean-sucrose:
	rm -rf js/sucrose.js js/sucrose.min.js \
		css/sucrose.css css/sucrose.min.css \
		 js/d3.min.js js/topojson.min.js

examples: clean-examples
	# copy node module files
	cp node_modules/jquery/dist/jquery.min.js js/jquery.min.js
	cp node_modules/jquerymy/jquerymy.min.js js/jquerymy.min.js

clean-examples:
	rm -rf js/jquery.min.js
	rm -rf js/jquerymy.min.js

index-prod:
	rm -rf index2.html
	sed 's/<!-- PROD::/<!-- PROD: -->/g' index.html \
		| sed 's/::PROD -->/<!-- :PROD -->/g' \
		| sed 's/<!-- DEV: -->/<!-- DEV::/g' \
		| sed 's/<!-- :DEV -->/::DEV -->/g' \
		>> index2.html
	rm -rf index.html
	mv index2.html index.html

clean: clean-sucrose clean-examples


#DEVELOPMENT

install-dev: npm-dev all js css index-dev

npm-dev:
	npm i

js: $(APP_FILES) $(LIB_FILES) clean-js
	# build lib js files
	cat $(LIB_FILES) >> js/lib.js
	cat $(LIB_FILES) | $(JS_COMPILER) >> js/lib.min.js

	# build app js files
	cat ../header $(APP_FILES) >> js/app.js
	cat $(APP_FILES) | $(JS_COMPILER) >> js/app.min.js
	cat ../header js/app.min.js > temp
	rm -f js/app.min.js
	mv temp js/app.min.js

	# copy node module files
	cp ../node_modules/less/dist/less.min.js js/less.min.js

clean-js:
	rm -rf js/app.js js/app.min.js js/lib.js js/lib.min.js js/less.min.js

css: less/examples.less clean-css
	node $(CSS_COMPILER) less/examples.less css/examples.css
	node $(CSS_MINIFIER) -o css/examples.min.css css/examples.css
	# node node_modules/less/bin/lessc --clean-css less/examples.less css/examples.min.css

clean-css:
	rm -rf css/examples.css css/examples.min.css

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
