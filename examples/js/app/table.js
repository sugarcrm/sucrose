function sucroseTable(chart) {
  var table = sucrose.models.table()
        .x(function (d, i) {
            return d.hasOwnProperty('x') ?
                d.x :
                Array.isArray(d) ?
                    d[0] :
                    d.hasOwnProperty('0') ?
                        d[0] :
                        i;
        })
        .y(function (d, i) {
            return d.hasOwnProperty('y') ?
                d.y :
                Array.isArray(d) ?
                    d[1] :
                    d.hasOwnProperty('1') ?
                        d[1] :
                        d;
        });

  return table;
}
