(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
    typeof define === 'function' && define.amd ? define(['exports', 'd3'], factory) :
    (factory((global.sucrose = global.sucrose || {}),global.d3));
}(this, (function (exports,d3) { 'use strict';

var regexify = (function (strsOrRegexes) {
    return strsOrRegexes.map(function (strOrRegex) {
        return typeof strOrRegex === 'string' ? new RegExp('^' + strOrRegex + '$') : strOrRegex;
    });
});

var include = (function () {
    for (var _len = arguments.length, inclusions = Array(_len), _key = 0; _key < _len; _key++) {
        inclusions[_key] = arguments[_key];
    }

    inclusions = regexify(inclusions);
    return function (name) {
        return inclusions.some(function (inclusion) {
            return inclusion.test(name);
        }) && name;
    };
});

var createTransform = function createTransform(transforms) {
    return function (name) {
        return transforms.reduce(function (name, fn) {
            return name && fn(name);
        }, name);
    };
};

var createReboundMethod = function createReboundMethod(target, source, name) {
    var method = source[name];
    if (typeof method !== 'function') {
        throw new Error('Attempt to rebind ' + name + ' which isn\'t a function on the source object');
    }
    return function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        var value = method.apply(source, args);
        return value === source ? target : value;
    };
};

var rebindAll = (function (target, source) {
    for (var _len2 = arguments.length, transforms = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        transforms[_key2 - 2] = arguments[_key2];
    }

    var transform = createTransform(transforms);
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = Object.keys(source)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var name = _step.value;

            var result = transform(name);
            if (result) {
                target[result] = createReboundMethod(target, source, name);
            }
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    return target;
});

var rebind = (function (target, source) {
    for (var _len = arguments.length, names = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        names[_key - 2] = arguments[_key];
    }

    return rebindAll(target, source, include.apply(undefined, names));
});

// import * as fc from '../node_modules/d3fc-rebind/build/d3fc-rebind.js';
// import * as fc from '../node_modules/d3fc-rebind/index.js';
// import * as fc from 'd3fc-rebind';
// import * as fc from '../node_modules/d3fc-rebind/src/rebind.js';

var ver = '0.0.2'; //change to 0.0.3 when ready
var dev = false; //set false when in production

// export {* as fc} from 'd3fc-rebind';
// export {default as utils} from './utils.js';
// export {default as legend} from './models/legend.js';
// export {default as funnel} from './models/funnel.js';
// export {default as funnelChart} from './models/funnelChart.js';
// var asdf = d3.select('div');

exports.version = ver;
exports.development = dev;
exports.fc = rebind;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9kM2ZjLXJlYmluZC9zcmMvdHJhbnNmb3JtL3JlZ2V4aWZ5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2QzZmMtcmViaW5kL3NyYy90cmFuc2Zvcm0vaW5jbHVkZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9kM2ZjLXJlYmluZC9zcmMvcmViaW5kQWxsLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2QzZmMtcmViaW5kL3NyYy9yZWJpbmQuanMiLCIuLi9zcmMvbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCAoc3Ryc09yUmVnZXhlcykgPT5cbiAgICBzdHJzT3JSZWdleGVzLm1hcCgoc3RyT3JSZWdleCkgPT5cbiAgICAgICAgdHlwZW9mIHN0ck9yUmVnZXggPT09ICdzdHJpbmcnID8gbmV3IFJlZ0V4cChgXiR7c3RyT3JSZWdleH0kYCkgOiBzdHJPclJlZ2V4XG4gICAgKTtcbiIsImltcG9ydCByZWdleGlmeSBmcm9tICcuL3JlZ2V4aWZ5JztcblxuZXhwb3J0IGRlZmF1bHQgKC4uLmluY2x1c2lvbnMpID0+IHtcbiAgICBpbmNsdXNpb25zID0gcmVnZXhpZnkoaW5jbHVzaW9ucyk7XG4gICAgcmV0dXJuIChuYW1lKSA9PlxuICAgICAgaW5jbHVzaW9ucy5zb21lKChpbmNsdXNpb24pID0+IGluY2x1c2lvbi50ZXN0KG5hbWUpKSAmJiBuYW1lO1xufTtcbiIsImNvbnN0IGNyZWF0ZVRyYW5zZm9ybSA9ICh0cmFuc2Zvcm1zKSA9PlxuICAgIChuYW1lKSA9PiB0cmFuc2Zvcm1zLnJlZHVjZShcbiAgICAgICAgKG5hbWUsIGZuKSA9PiBuYW1lICYmIGZuKG5hbWUpLFxuICAgICAgICBuYW1lXG4gICAgKTtcblxuY29uc3QgY3JlYXRlUmVib3VuZE1ldGhvZCA9ICh0YXJnZXQsIHNvdXJjZSwgbmFtZSkgPT4ge1xuICAgIGNvbnN0IG1ldGhvZCA9IHNvdXJjZVtuYW1lXTtcbiAgICBpZiAodHlwZW9mIG1ldGhvZCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHQgdG8gcmViaW5kICR7bmFtZX0gd2hpY2ggaXNuJ3QgYSBmdW5jdGlvbiBvbiB0aGUgc291cmNlIG9iamVjdGApO1xuICAgIH1cbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdmFyIHZhbHVlID0gbWV0aG9kLmFwcGx5KHNvdXJjZSwgYXJncyk7XG4gICAgICAgIHJldHVybiB2YWx1ZSA9PT0gc291cmNlID8gdGFyZ2V0IDogdmFsdWU7XG4gICAgfTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0ICh0YXJnZXQsIHNvdXJjZSwgLi4udHJhbnNmb3JtcykgPT4ge1xuICAgIGNvbnN0IHRyYW5zZm9ybSA9IGNyZWF0ZVRyYW5zZm9ybSh0cmFuc2Zvcm1zKTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoc291cmNlKSkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm0obmFtZSk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHRhcmdldFtyZXN1bHRdID0gY3JlYXRlUmVib3VuZE1ldGhvZCh0YXJnZXQsIHNvdXJjZSwgbmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG4iLCJpbXBvcnQgaW5jbHVkZSBmcm9tICcuL3RyYW5zZm9ybS9pbmNsdWRlJztcbmltcG9ydCByZWJpbmRBbGwgZnJvbSAnLi9yZWJpbmRBbGwnO1xuXG5leHBvcnQgZGVmYXVsdCAodGFyZ2V0LCBzb3VyY2UsIC4uLm5hbWVzKSA9PlxuICAgIHJlYmluZEFsbCh0YXJnZXQsIHNvdXJjZSwgaW5jbHVkZSguLi5uYW1lcykpO1xuIiwiaW1wb3J0ICogYXMgZDMgZnJvbSAnZDMnOyAvL3dpdGhvdXQgdGhpcyByb2xsdXAgZG9lcyBzb21ldGhpbmcgZnVua3kgdG8gZDMgZ2xvYmFsXG4vLyBpbXBvcnQgKiBhcyBmYyBmcm9tICcuLi9ub2RlX21vZHVsZXMvZDNmYy1yZWJpbmQvYnVpbGQvZDNmYy1yZWJpbmQuanMnO1xuLy8gaW1wb3J0ICogYXMgZmMgZnJvbSAnLi4vbm9kZV9tb2R1bGVzL2QzZmMtcmViaW5kL2luZGV4LmpzJztcbi8vIGltcG9ydCAqIGFzIGZjIGZyb20gJ2QzZmMtcmViaW5kJztcbi8vIGltcG9ydCAqIGFzIGZjIGZyb20gJy4uL25vZGVfbW9kdWxlcy9kM2ZjLXJlYmluZC9zcmMvcmViaW5kLmpzJztcblxudmFyIHZlciA9ICcwLjAuMic7IC8vY2hhbmdlIHRvIDAuMC4zIHdoZW4gcmVhZHlcbmV4cG9ydCB7dmVyIGFzIHZlcnNpb259O1xudmFyIGRldiA9IGZhbHNlOyAvL3NldCBmYWxzZSB3aGVuIGluIHByb2R1Y3Rpb25cbmV4cG9ydCB7ZGV2IGFzIGRldmVsb3BtZW50fTtcblxuZXhwb3J0IHtkZWZhdWx0IGFzIGZjfSBmcm9tICcuLi9ub2RlX21vZHVsZXMvZDNmYy1yZWJpbmQvc3JjL3JlYmluZC5qcyc7XG4vLyBleHBvcnQgeyogYXMgZmN9IGZyb20gJ2QzZmMtcmViaW5kJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyB1dGlsc30gZnJvbSAnLi91dGlscy5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgbGVnZW5kfSBmcm9tICcuL21vZGVscy9sZWdlbmQuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIGZ1bm5lbH0gZnJvbSAnLi9tb2RlbHMvZnVubmVsLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBmdW5uZWxDaGFydH0gZnJvbSAnLi9tb2RlbHMvZnVubmVsQ2hhcnQuanMnO1xuLy8gdmFyIGFzZGYgPSBkMy5zZWxlY3QoJ2RpdicpO1xuIl0sIm5hbWVzIjpbInN0cnNPclJlZ2V4ZXMiLCJtYXAiLCJzdHJPclJlZ2V4IiwiUmVnRXhwIiwiaW5jbHVzaW9ucyIsInJlZ2V4aWZ5IiwibmFtZSIsInNvbWUiLCJpbmNsdXNpb24iLCJ0ZXN0IiwiY3JlYXRlVHJhbnNmb3JtIiwidHJhbnNmb3JtcyIsInJlZHVjZSIsImZuIiwiY3JlYXRlUmVib3VuZE1ldGhvZCIsInRhcmdldCIsInNvdXJjZSIsIm1ldGhvZCIsIkVycm9yIiwiYXJncyIsInZhbHVlIiwiYXBwbHkiLCJ0cmFuc2Zvcm0iLCJPYmplY3QiLCJrZXlzIiwicmVzdWx0IiwibmFtZXMiLCJyZWJpbmRBbGwiLCJpbmNsdWRlIiwidmVyIiwiZGV2Il0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnQkFBZSxVQUFDQSxhQUFEO1dBQ1hBLGNBQWNDLEdBQWQsQ0FBa0IsVUFBQ0MsVUFBRDtlQUNkLE9BQU9BLFVBQVAsS0FBc0IsUUFBdEIsR0FBaUMsSUFBSUMsTUFBSixPQUFlRCxVQUFmLE9BQWpDLEdBQWlFQSxVQURuRDtLQUFsQixDQURXO0NBQWY7O0FDRUEsZUFBZSxZQUFtQjtzQ0FBZkUsVUFBZTtrQkFBQTs7O2lCQUNqQkMsU0FBU0QsVUFBVCxDQUFiO1dBQ08sVUFBQ0UsSUFBRDtlQUNMRixXQUFXRyxJQUFYLENBQWdCLFVBQUNDLFNBQUQ7bUJBQWVBLFVBQVVDLElBQVYsQ0FBZUgsSUFBZixDQUFmO1NBQWhCLEtBQXdEQSxJQURuRDtLQUFQO0NBRko7O0FDRkEsSUFBTUksa0JBQWtCLFNBQWxCQSxlQUFrQixDQUFDQyxVQUFEO1dBQ3BCLFVBQUNMLElBQUQ7ZUFBVUssV0FBV0MsTUFBWCxDQUNOLFVBQUNOLElBQUQsRUFBT08sRUFBUDttQkFBY1AsUUFBUU8sR0FBR1AsSUFBSCxDQUF0QjtTQURNLEVBRU5BLElBRk0sQ0FBVjtLQURvQjtDQUF4Qjs7QUFNQSxJQUFNUSxzQkFBc0IsU0FBdEJBLG1CQUFzQixDQUFDQyxNQUFELEVBQVNDLE1BQVQsRUFBaUJWLElBQWpCLEVBQTBCO1FBQzVDVyxTQUFTRCxPQUFPVixJQUFQLENBQWY7UUFDSSxPQUFPVyxNQUFQLEtBQWtCLFVBQXRCLEVBQWtDO2NBQ3hCLElBQUlDLEtBQUosd0JBQStCWixJQUEvQixtREFBTjs7V0FFRyxZQUFhOzBDQUFUYSxJQUFTO2dCQUFBOzs7WUFDWkMsUUFBUUgsT0FBT0ksS0FBUCxDQUFhTCxNQUFiLEVBQXFCRyxJQUFyQixDQUFaO2VBQ09DLFVBQVVKLE1BQVYsR0FBbUJELE1BQW5CLEdBQTRCSyxLQUFuQztLQUZKO0NBTEo7O0FBV0EsaUJBQWUsVUFBQ0wsTUFBRCxFQUFTQyxNQUFULEVBQW1DO3VDQUFmTCxVQUFlO2tCQUFBOzs7UUFDeENXLFlBQVlaLGdCQUFnQkMsVUFBaEIsQ0FBbEI7Ozs7Ozs2QkFDbUJZLE9BQU9DLElBQVAsQ0FBWVIsTUFBWixDQUFuQiw4SEFBd0M7Z0JBQTdCVixJQUE2Qjs7Z0JBQzlCbUIsU0FBU0gsVUFBVWhCLElBQVYsQ0FBZjtnQkFDSW1CLE1BQUosRUFBWTt1QkFDREEsTUFBUCxJQUFpQlgsb0JBQW9CQyxNQUFwQixFQUE0QkMsTUFBNUIsRUFBb0NWLElBQXBDLENBQWpCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7V0FHRFMsTUFBUDtDQVJKOztBQ2RBLGNBQWUsVUFBQ0EsTUFBRCxFQUFTQyxNQUFUO3NDQUFvQlUsS0FBcEI7YUFBQTs7O1dBQ1hDLFVBQVVaLE1BQVYsRUFBa0JDLE1BQWxCLEVBQTBCWSx5QkFBV0YsS0FBWCxDQUExQixDQURXO0NBQWY7O0FDRkE7Ozs7O0FBS0EsSUFBSUcsTUFBTSxPQUFWO0FBQ0EsQUFDQSxJQUFJQyxNQUFNLEtBQVY7QUFDQSxBQUVBOzs7Ozs7Ozs7Ozs7OzsifQ==
