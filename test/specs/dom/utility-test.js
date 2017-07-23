"use strict";

const tape = require("tape");
const tapes = require("tapes");
const tests = tapes(tape);

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const d3 = require("d3"); // load ../build/d3-sugar.js because it is a custom bundle?
const sucrose = require("../../fixtures/build/sucrose.js");
const data = require("../../files/pie_data.json");
const json = JSON.stringify(data);

// DOM tests
tests("DOM: utility -", function(t) {
    let color;
    let defs;
    let dom;
    let c_;

    function getElement(selector) {
        return c_.querySelector(selector) || null;
    }
    function getInnerHtml(selector) {
        let element = document.querySelector("#c_ .sucrose").querySelector(selector);
        return (element) ? element.innerHTML : "";
    }

    // FINALLY!
    t.beforeEach(function (t) {
        // do some set up for each test
        dom = new JSDOM('<!DOCTYPE html><div id="c_"><svg class="sucrose sc-chart"></svg></div>');
        c_ = dom.window.document.querySelector("#c_ .sucrose");
        defs = d3.select(c_).append("def");
        color = "#369";
        t.end();
    });

    t.afterEach(function (t) {
        // do some tear down for each test
        c_ = null;
        dom = null;
        defs = null;
        color = null;
        t.end();
    });

    t.test("createLinearGradient: create a linear gradient def", function(assert) {
        let params = {orientation: "horizontal"};
        let stops = [
          { "offset": "0%",  "stop-color": d3.rgb(color).darker().toString(),  "stop-opacity": 1 },
          { "offset": "50%", "stop-color": d3.rgb(color).toString(), "stop-opacity": 1 },
          { "offset": "100%","stop-color": d3.rgb(color).brighter().toString(), "stop-opacity": 1 }
        ];
        sucrose.utility.createLinearGradient("chart_123", params, defs, stops);
        assert.equal(defs.html(), '<lineargradient id="chart_123" x1="0%" y1="0%" x2="0%" y2="100%" spreadMethod="pad"><stop offset="0%" stop-color="rgb(36, 71, 107)" stop-opacity="1"></stop><stop offset="50%" stop-color="rgb(51, 102, 153)" stop-opacity="1"></stop><stop offset="100%" stop-color="rgb(73, 146, 219)" stop-opacity="1"></stop></lineargradient>');
        assert.end();
    });
    t.test("colorLinearGradient: create a linear gradient def with a specified color with position middle", function(assert) {
        let params = {position: "middle"};
        sucrose.utility.colorLinearGradient({}, 123, params, color, defs);
        assert.equal(defs.html(), '<lineargradient id="lg_gradient_123" x1="0%" y1="0%" x2="100%" y2="0%" spreadMethod="pad"><stop offset="0%" stop-color="rgb(36, 71, 107)" stop-opacity="1"></stop><stop offset="20%" stop-color="rgb(51, 102, 153)" stop-opacity="1"></stop><stop offset="50%" stop-color="rgb(73, 146, 219)" stop-opacity="1"></stop><stop offset="80%" stop-color="rgb(51, 102, 153)" stop-opacity="1"></stop><stop offset="100%" stop-color="rgb(36, 71, 107)" stop-opacity="1"></stop></lineargradient>');
        assert.end();
    });
    t.test("colorLinearGradient: create a linear gradient def with a specified color and position left", function(assert) {
        let params = {position: "left"};
        sucrose.utility.colorLinearGradient({}, 123, params, color, defs);
        assert.equal(defs.html(), '<lineargradient id="lg_gradient_123" x1="0%" y1="0%" x2="100%" y2="0%" spreadMethod="pad"><stop offset="0%" stop-color="rgb(36, 71, 107)" stop-opacity="1"></stop><stop offset="50%" stop-color="rgb(51, 102, 153)" stop-opacity="1"></stop><stop offset="100%" stop-color="rgb(73, 146, 219)" stop-opacity="1"></stop></lineargradient>');
        assert.end();
    });
    t.test("colorLinearGradient: create a linear gradient def with a specified color, position left and horizontal", function(assert) {
        let params = {position: "left", orientation: "horizontal"};
        sucrose.utility.colorLinearGradient({}, 123, params, color, defs);
        assert.equal(defs.html(), '<lineargradient id="lg_gradient_123" x1="0%" y1="0%" x2="0%" y2="100%" spreadMethod="pad"><stop offset="0%" stop-color="rgb(36, 71, 107)" stop-opacity="1"></stop><stop offset="50%" stop-color="rgb(51, 102, 153)" stop-opacity="1"></stop><stop offset="100%" stop-color="rgb(73, 146, 219)" stop-opacity="1"></stop></lineargradient>');
        assert.end();
    });
    t.test("createRadialGradient: create a linear gradient def", function(assert) {
        let params = {r: 100, x: 0, y: 0, s: "0%", u: "userSpaceOnUse"};
        let stops = [
          { "offset": "0%", "stop-color": d3.rgb(color).brighter().toString(), "stop-opacity": 1 },
          { "offset": "100%","stop-color": d3.rgb(color).darker().toString(), "stop-opacity": 1 }
        ];
        sucrose.utility.createRadialGradient("chart_123", params, defs, stops);
        assert.equal(defs.html(), '<radialgradient id="chart_123" r="100" cx="0" cy="0" gradientUnits="userSpaceOnUse" spreadMethod="pad"><stop offset="0%" stop-color="rgb(73, 146, 219)" stop-opacity="1"></stop><stop offset="100%" stop-color="rgb(36, 71, 107)" stop-opacity="1"></stop></radialgradient>');
        assert.end();
    });
    t.test("colorRadialGradient: create a radial gradient def with a specified color", function(assert) {
        let params = {r: 100, x: 0, y: 0, s: "0%", u: "userSpaceOnUse"};
        sucrose.utility.colorRadialGradient({}, 123, params, color, defs);
        assert.equal(defs.html(), '<radialgradient id="rg_gradient_123" r="100" cx="0" cy="0" gradientUnits="userSpaceOnUse" spreadMethod="pad"><stop offset="0%" stop-color="rgb(73, 146, 219)" stop-opacity="1"></stop><stop offset="100%" stop-color="rgb(36, 71, 107)" stop-opacity="1"></stop></radialgradient>');
        assert.end();
    });
    t.test("colorRadialGradient: create a radial gradient def with a specified color and offset", function(assert) {
        let params = {r: 100, x: 0, y: 0, s: "25%", u: "userSpaceOnUse"};
        sucrose.utility.colorRadialGradient({}, 123, params, color, defs);
        assert.equal(defs.html(), '<radialgradient id="rg_gradient_123" r="100" cx="0" cy="0" gradientUnits="userSpaceOnUse" spreadMethod="pad"><stop offset="25%" stop-color="rgb(73, 146, 219)" stop-opacity="1"></stop><stop offset="100%" stop-color="rgb(36, 71, 107)" stop-opacity="1"></stop></radialgradient>');
        assert.end();
    });
    t.test("dropShadow: create a drop shadow def with default options", function(assert) {
        let ret = sucrose.utility.dropShadow("shadow_123", defs, {});
        assert.equal(ret, "url(#shadow_123)");
        assert.equal(defs.html(), '<filter id="shadow_123" height="130%"><feoffset in="SourceGraphic" result="offsetBlur" dx="2" dy="2"></feoffset><fecolormatrix in="offsetBlur" result="matrixOut" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></fecolormatrix><fegaussianblur in="matrixOut" result="blurOut" stdDeviation="1"></fegaussianblur><femerge><femergenode></femergenode><femergenode in="SourceGraphic"></femergenode></femerge></filter>');
        assert.end();
    });
    t.test("dropShadow: create a drop shadow def with a specified height, offset and blur", function(assert) {
        let params = {height: 150, offset: 4, blur: 2};
        sucrose.utility.dropShadow("chart_123", defs, params);
        assert.equal(defs.html(), '<filter id="chart_123" height="150"><feoffset in="SourceGraphic" result="offsetBlur" dx="4" dy="4"></feoffset><fecolormatrix in="offsetBlur" result="matrixOut" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></fecolormatrix><fegaussianblur in="matrixOut" result="blurOut" stdDeviation="2"></fegaussianblur><femerge><femergenode></femergenode><femergenode in="SourceGraphic"></femergenode></femerge></filter>');
        assert.end();
    });
    t.test("createTexture: create a drop shadow def with default options", function(assert) {
        let ret = sucrose.utility.createTexture(defs, 123, 10, 10);
        assert.equal(ret, "#sc-textureMask-123");
        assert.equal(defs.html(), '<pattern id="sc-diagonalHatch-123" patternUnits="userSpaceOnUse" width="8" height="8"><path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l1,-1" class="texture-line" stroke="#fff" stroke-linecap="square"></path></pattern><mask id="sc-textureMask-123" x="0" y="0" width="100%" height="100%"><rect x="10" y="10" width="100%" height="100%" fill="url(#sc-diagonalHatch-123)"></rect></mask>');
        assert.end();
    });

    t.end();
});
