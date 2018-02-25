/*-------------------
       TRANSLATE
-------------------*/

var language = (function() {

  function decompose(obj, store) {
    var keys = obj ? Object.getOwnPropertyNames(obj) : [];
    if (keys.length) {
      keys.forEach(function(key) {
        var prop = obj[key];
        if (typeof prop === 'string' || prop instanceof String) {
          store[key] = prop.toString();
        } else {
          var ref = store[key] || (store[key] = {});
          if (ref instanceof Object && !(ref instanceof Date) && !(ref instanceof Function)) {
            decompose(prop, ref);
          }
        }
      });
    }
  }

  return function(lang) {
    var strings = {
      legend: {
        close: 'Hide legend',
        open: 'Show legend',
        noLabel: 'undefined'
      },
      controls: {
        close: 'Hide controls',
        open: 'Show controls'
      },
      tooltip: {
        amount: 'Amount',
        count: 'Count',
        date: 'Date',
        group: 'Group',
        key: 'Key',
        percent: 'Percent'
      },
      noData: 'No Data Available.',
      noLabel: 'undefined',
      displayError: 'The chart cannot be displayed due to its configuration.'
    };

    strings.translate = function(label) {
      var keys = label.split('.');
      var string = strings[keys[0]];
      return typeof string === 'string'
        ? string
        : keys.length === 2
          ? string[keys[1]]
          : label;
    };

    decompose(lang, strings);
    return strings;
  };
})();

export default language;
