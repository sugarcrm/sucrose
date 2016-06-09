
function generateConfig(e) {
  var options = {},
      json,
      uri;

  e.preventDefault();
  e.stopPropagation();

  function openTab(url) {
    var a = window.document.createElement('a');
    var evt = new MouseEvent('click', {
          bubbles: false,
          cancelable: true,
          view: window,
        });
    a.target = '_blank';
    a.href = url;
    // Not supported consistently across browsers
    // fall back to open data in new tab
    a.download = 'sucrose-options.json';
    document.body.appendChild(a);
    a.addEventListener('click', function (e) {
      a.parentNode.removeChild(a);
    });
    a.dispatchEvent(evt);
  }

  options = Manifest.getConfig();

  json = JSON.stringify(options, null, '  ');
  uri = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);

  openTab(uri);
}
