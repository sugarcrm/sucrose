
//https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
//http://techslides.com/save-svg-as-an-image/
//http://tutorials.jenkov.com/svg/svg-and-css.html
//https://developer.mozilla.org/en-US/docs/Web/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
//http://spin.atomicobject.com/2014/01/21/convert-svg-to-png/
//https://github.com/exupero/saveSvgAsPng

function generateImage(e) {
  e.preventDefault();
  e.stopPropagation();

  function reEncode(data) {
    data = encodeURIComponent(data);
    data = data.replace(/%([0-9A-F]{2})/g, function (match, p1) {
      var c = String.fromCharCode('0x' + p1);
      return c === '%' ? '%25' : c;
    });
    return decodeURIComponent(data);
  }
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
    // fall back to open image in new tab
    a.download = 'download.png';
    document.body.appendChild(a);
    a.addEventListener('click', function (e) {
      a.parentNode.removeChild(a);
    });
    a.dispatchEvent(evt);
  }

  $.ajax({
      url: 'css/sucrose.css',
      dataType: 'text'
    })
    .success(function (css) {
      var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
      var chart = $('#chart_');
      var width = chart.width();
      var height = chart.height();
      var dom = chart.find('svg').html();
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="' +
                 width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" class="sucrose sc-chart sc-print">' +
                '<defs><style rel="stylesheet/less" type="text/css"><![CDATA[' + css + ']]></style></defs>' + dom + '</svg>';
      var url = 'data:image/svg+xml;charset=utf-8;base64,' + window.btoa(reEncode(svg));
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      var img = new Image();

      document.body.appendChild(canvas);

      canvas.width = width;
      canvas.height = height;
      canvas.className = 'sc-image-canvas';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      img.onload = function () {
          var uri;
          ctx.drawImage(img, 0, 0);
          uri = canvas.toDataURL('image/png');
          openTab(uri);
          ctx.clearRect(0, 0, width, height);
          canvas.remove();
      };

      img.src = url;
    });
}
