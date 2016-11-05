import d3 from 'd3';
// import * as d3 from 'd3';

var utils = {};

utils.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
};

utils.identity = function(d) {
  return d;
};

utils.functor = function functor(v) {
  return typeof v === "function" ? v : function() {
    return v;
  };
};

export default utils;
// export {utils as default};
