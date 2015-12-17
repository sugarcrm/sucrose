/*!
 *  uQuery - A minimal URL parameter parsing library.
 *  v0.1.2 (modified hhr-20150928)
 *  (c) 2015 Aaron Harvey - aaron.harvey@fairchildsemi.com
 *  MIT License
 */

/* exported uQuery */
(function() {
    'use strict';
    var regex = /([^&=]+)=?([^&]*)/g;
    var match, store = {};

    var haystack = window.location.search || window.location.hash;
    haystack = haystack.substring(haystack.indexOf('?') + 1, haystack.length);

    while ((match = regex.exec(haystack))) {
        store[decodeURIComponent(match[1])] = decodeURIComponent(match[2]).split(',');
    }

    window.uQuery = function(needle, thread) {
        return store[needle] ? store[needle].filter(function(v) {
            var m = v.match(thread);
            return m != null && v === m[0];
        }) : null;
    };
})();
