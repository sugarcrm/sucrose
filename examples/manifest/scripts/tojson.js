/* This is a nodejs implementation of the toJson utililty function in
   jquerymy.com: https://github.com/ermouth/jQuery.my/blob/master/jquerymy.js
   Author: ermouth <ermouth@gmail.com>, MIT License
   Usage:
      const toJson = require('./tojson.js');
      let json = toJson('./pie.js');
*/
var toJson = (function() {
  function f(n) {
    return n < 10 ? '0' + n : n;
  }

  Date.prototype.toJSON = function () {
    var t = this;
    return t.getUTCFullYear() + '-' + f(t.getUTCMonth() + 1) + '-' + f(t.getUTCDate()) +
      'T' + f(t.getUTCHours()) + ':' + f(t.getUTCMinutes()) + ':' + f(t.getUTCSeconds()) + 'Z';
  };

  RegExp.prototype.toJSON = function () {
    return 'new RegExp(' + this.toString() + ')';
  };

  var tabs = '\t'.repeat(10);
  var fj = JSON.stringify;

  return s4;

  // - - - - - - - - - - - - - - - - - - - - - - -

  function s4 (w, ctab0, tab){
    var a, i, k, v;
    var tl = 0;
    var ctab = ctab0 || 0;
    var xt = tabs;

    if (tab && Object.isString(tab)) {
      tl = String(tab).length;
      xt = String(tab).repeat(10);
    }

    switch((typeof w).substr(0, 3)) {
      case 'str':
        return fj(w).replace(/<\/scri/ig, '<\\u002fscri');
      case 'num':
        return isFinite(w) ? '' + String(w) + '' : 'null';
      case 'boo':
      case'nul':
        return String(w);
      case 'fun':
        return fj(_cleanFn(w.toString()).replace(/<\/scri/ig, '<\\u002fscri'));
      case 'obj':
        if (!w) {
          return 'null';
        }

        if (typeof w.toJSON === 'function') {
          return s4(w.toJSON(), ctab+(tab ? 1 : 0), tab);
        }

        a = [];

        if (Array.isArray(w)) {
          for (i = 0; i < w.length; i += 1) {
            a.push(s4(w[i], ctab + (tab ? 1 : 0), tab) || 'null');
          }
          return '[' + a.join(',' + (tab ? '\n' + xt.to(ctab * tl + tl) : '')) + ']';
        }

        if (w + '' == '[object Object]') {
          for (k in w) {
            if (w.hasOwnProperty(k)) {
              v = s4(w[k], ctab + (tab ? 1 : 0), tab);
              if (v) {
                a.push((tab ? '\n' + xt.to(ctab * tl + tl) : '') + s4(k, ctab + (tab ? 1 : 0), tab) + ': ' + v);
              }
            }
          };
        }

        return '{' + a.join(',') + (tab ? '\n' + xt.to(ctab * tl) : '') + '}';
    }
  }

  // - - - - - - - - - - - - - - - - - - - - - - -

  function _cleanFn(s) {
    var splitter = /\)([\s\n\r\t]+?|\/{1,10}.*?\*\/|\/\/[^\n\r]{0,200}[\n\r]){0,20}?\{/;
    var a = s.split(splitter, 1);
    var head = a[0].substr(8).replace(/[\s\n\r\t]+?|\/{1,10}.*?\*\/|\/\/[^\n\r]{0,200}[\n\r]/g, '') + ')';
    var tail = '{' + s.substr(a[0].length).replace(splitter, '').replace(/}[^}]+$/, '}');

    return ('function ' + head).replace(/^function\sanonymous/, 'function ') + ' ' + tail;
  }
})();

module.exports = toJson;
