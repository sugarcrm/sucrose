import d3 from 'd3';
import utility from '../utility.js';

export default function sparkline() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 2, right: 0, bottom: 2, left: 0}
    , width = 400
    , height = 32
    , animate = true
    , x = d3.scaleLinear()
    , y = d3.scaleLinear()
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , color = utility.getColor(['#000'])
    , xDomain
    , yDomain
    ;

  //============================================================


  function model(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);


      //------------------------------------------------------------
      // Setup Scales

      x   .domain(xDomain || d3.extent(data, getX ))
          .range([0, availableWidth]);

      y   .domain(yDomain || d3.extent(data, getY ))
          .range([availableHeight, 0]);

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap.sc-sparkline').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sucrose sc-wrap sc-sparkline');
      var wrap = container.select('.sucrose.sc-wrap').merge(wrap_entr);
      var g_entr =wrap_entr.append('g').attr('class', 'sc-chart-wrap');
      var g = container.select('g.sc-chart-wrap').merge(g_entr);

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      //------------------------------------------------------------


      var paths = wrap.selectAll('path')
          .data(function(d) { return [d] });
      paths.enter().append('path');
      paths.exit().remove();
      paths
          .style('stroke', function(d,i) { return d.color || color(d, i) })
          .attr('d', d3.line()
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
          );


      // TODO: Add CURRENT data point (Need Min, Mac, Current / Most recent)
      var points = wrap.selectAll('circle.sc-point')
          .data(function(data) {
              var yValues = data.map(function(d, i) { return getY(d,i); });
              function pointIndex(index) {
                  if (index != -1) {
                  var result = data[index];
                      result.pointIndex = index;
                      return result;
                  } else {
                      return null;
                  }
              }
              var maxPoint = pointIndex(yValues.lastIndexOf(y.domain()[1])),
                  minPoint = pointIndex(yValues.indexOf(y.domain()[0])),
                  currentPoint = pointIndex(yValues.length - 1);
              return [minPoint, maxPoint, currentPoint].filter(function (d) {return d != null;});
          });
      points.enter().append('circle');
      points.exit().remove();
      points
          .attr('cx', function(d,i) { return x(getX(d,d.pointIndex)) })
          .attr('cy', function(d,i) { return y(getY(d,d.pointIndex)) })
          .attr('r', 2)
          .attr('class', function(d,i) {
            return getX(d, d.pointIndex) == x.domain()[1] ? 'sc-point sc-currentValue' :
                   getY(d, d.pointIndex) == y.domain()[0] ? 'sc-point sc-minValue' : 'sc-point sc-maxValue'
          });
    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return model;
  };

  model.x = function(_) {
    if (!arguments.length) return getX;
    getX = utility.functor(_);
    return model;
  };

  model.y = function(_) {
    if (!arguments.length) return getY;
    getY = utility.functor(_);
    return model;
  };

  model.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return model;
  };

  model.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return model;
  };

  model.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return model;
  };

  model.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return model;
  };

  model.animate = function(_) {
    if (!arguments.length) return animate;
    animate = _;
    return model;
  };

  model.color = function(_) {
    if (!arguments.length) return color;
    color = utility.getColor(_);
    return model;
  };

  //============================================================


  return model;
}
