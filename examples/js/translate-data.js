
function translateDataToD3(json, chartType, barType) {
    var data = [],
        value = 0,
        strUndefined = 'undefined';

    function sumValues(values) {
        return values.reduce(function(a, b) { return parseFloat(a) + parseFloat(b); }, 0); // 0 is default value if reducing an empty list
    }

    function pickLabel(label) {
        var l = [].concat(label)[0];
        //d.label && d.label !== '' ? Array.isArray(d.label) ? d.label[0] : d.label : strUndefined
        return l ? l : strUndefined;
    }

    if (json.values.filter(function(d) { return d.values && d.values.length; }).length) {

        switch (chartType) {

            case 'barChart':
                data = barType === 'stacked' || barType === 'grouped' ?
                    json.label.map(function(d, i) {
                        return {
                            'key': pickLabel(d),
                            'type': 'bar',
                            'values': json.values.map(function(e, j) {
                                    return {
                                      'series': i,
                                      'x': j + 1,
                                      'y': parseFloat(e.values[i]) || 0,
                                      'y0': 0
                                    };
                                })
                        };
                    }) :
                    json.values.map(function(d, i) {
                        return {
                            'key': d.values.length > 1 ? d.label : pickLabel(d.label),
                            'type': 'bar',
                            'values': json.values.map(function(e, j) {
                                    return {
                                      'series': i,
                                      'x': j + 1,
                                      'y': i === j ? sumValues(e.values) : 0,
                                      'y0': 0
                                    };
                                })
                        };
                    });
                break;

            case 'pieChart':
                data = json.values.map(function(d, i) {
                    var data = {
                        'key': pickLabel(d.label),
                        'value': sumValues(d.values)
                    };
                    if (d.color !== undefined) {
                        data.color = d.color;
                    }
                    if (d.classes !== undefined) {
                        data.classes = d.classes;
                    }
                    return data;
                });
                break;

            case 'funnelChart':
                data = json.values.reverse().map(function(d, i) {
                    return {
                        'key': pickLabel(d.label),
                        'values': [{
                          'series': i,
                          'label': d.valuelabels[0] ? d.valuelabels[0] : d.values[0],
                          'x': 0,
                          'y': sumValues(d.values),
                          'y0': 0
                        }]
                    };
                });
                break;

            case 'lineChart':
                var discreteValues = d3.max(json.values, function(d) {
                          return d.values.length;
                        }) === 1;
                data = json.values.map(function(d, i) {
                    return {
                        'key': pickLabel(d.label),
                        'values': discreteValues ?
                            d.values.map(function(e, j) {
                                return [i, parseFloat(e)];
                            }) :
                            d.values.map(function(e, j) {
                                return [j, parseFloat(e)];
                            })
                    };
                });
                break;

            case 'gaugeChart':
                value = json.values.shift().gvalue;
                var y0 = 0;

                data = json.values.map(function(d, i) {
                    var values = {
                        'key': pickLabel(d.label),
                        'y': parseFloat(d.values[0]) + y0
                    };
                    y0 += parseFloat(d.values[0]);
                    return values;
                });
                break;
        }
    }

    return {
        'properties': {
            'title': json.properties[0].title,
            // bar group data (x-axis)
            'labels': chartType === 'lineChart' && json.label ?
                json.label.map(function(d, i) {
                    return {
                        'group': i + 1,
                        'l': pickLabel(d)
                    };
                }) :
                json.values.filter(function(d) { return d.values.length; }).length ?
                    json.values.map(function(d, i) {
                        return {
                            'group': i + 1,
                            'l': pickLabel(d.label)
                        };
                    }) :
                    [],
            'values': chartType === 'gaugeChart' ?
                [{'group' : 1, 't': value}] :
                json.values.filter(function(d) { return d.values.length; }).length ?
                    json.values.map(function(d, i) {
                        return {
                            'group': i + 1,
                            't': sumValues(d.values)
                        };
                    }) :
                    []
        },
        // series data
        'data': data
    };
}
