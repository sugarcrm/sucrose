import d3 from 'd3v4';
import fc from 'd3fc-rebind';
import utility from '../utility.js';

export default function treemap() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 20, right: 0, bottom: 0, left: 0},
      width = 0,
      height = 0,
      x = d3.scaleLinear(), //can be accessed via chart.xScale()
      y = d3.scaleLinear(), //can be accessed via chart.yScale()
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      getValue = function(d) { return d.size; }, // accessor to get the size value from a data point
      getKey = function(d) { return d.name; }, // accessor to get the name value from a data point
      groupBy = function(d) { return getKey(d); }, // accessor to get the name value from a data point
      clipEdge = true, // if true, masks lines within x and y scale
      duration = 500,
      leafClick = function() { return false; },
      // color = function(d, i) { return utility.defaultColor()(d, i); },
      color = d3.scaleOrdinal().range(
                d3.schemeCategory20.map(function(c) {
                  c = d3.rgb(c);
                  c.opacity = 0.6;
                  return c;
                })
              ),
      gradient = null,
      fill = color,
      classes = function(d, i) { return 'sc-child'; },
      direction = 'ltr',
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var ROOT,
      TREE,
      NODES = [];

  // This is for data sets that don't include a colorIndex
  // Excludes leaves
  function reduceGroups(d) {
    var data = d.data ? d.data : d;
    var name = groupBy(data);
    var i, l;
    if (name && NODES.indexOf(name) === -1) {
      NODES.push(name);
      if (data.children) {
        l = data.children.length;
        for (i = 0; i < l; i += 1) {
          reduceGroups(data.children[i]);
        }
      }
    }
    return NODES;
  }

  //============================================================
  // TODO:
  // 1. title,
  // 2. colors,
  // 3. legend data change remove,
  // 4. change groupby,
  // 5. contrasting text

  function chart(selection) {
    selection.each(function(chartData) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this),
          transitioning;

      // Set up the gradient constructor function
      gradient = function(d, i, p) {
        var iColor = (d.parent.data.colorIndex || NODES.indexOf(groupBy(d.parent.data)) || i);
        return utility.colorLinearGradient(
          d,
          id + '-' + i,
          p,
          color(d, iColor, NODES.length),
          wrap.select('defs')
        );
      };

      // We only need to define TREE and NODES once on initial load
      // TREE is always available in its initial state and NODES is immutable
      TREE = TREE ||
        d3.hierarchy(chartData[0])
          .sum(function(d) { return getValue(d); })
          .sort(function(a, b) { return b.height - a.height || b.value - a.value; });

      NODES = NODES.length ? NODES : reduceGroups(TREE);

      // Recalcuate the treemap layout dimensions
      d3.treemap()
        .size([availableWidth, availableHeight])
        .round(false)
          (TREE);

      // We store the root on first render
      // which gets reused on resize
      // Transition will reset root when called
      ROOT = ROOT || TREE;

      x.domain([ROOT.x0, ROOT.x1])
       .range([0, availableWidth]);
      y.domain([ROOT.y0, ROOT.y1])
       .range([0, availableHeight]);

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-treemap').data([TREE]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-treemap');
      var wrap = container.select('.sc-wrap.sc-treemap').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      // wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Clip Path

      defs_entr.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
        .append('rect');
      wrap.select('#sc-edge-clip-' + id + ' rect')
        .attr('width', width)
        .attr('height', height);
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      //------------------------------------------------------------
      // Family Tree Path

      var treepath_bind = wrap_entr.selectAll('.sc-treepath').data([TREE]);
      var treepath_enter = treepath_bind.enter().append('g').attr('class', 'sc-treepath');
      var treepath = wrap.selectAll('.sc-treepath').merge(treepath_enter);

      treepath_enter.append('rect')
        .attr('class', 'sc-target')
        .on('click', transition);

      treepath_enter.append('text')
        .attr('x', direction === 'rtl' ? width - 6 : 6)
        .attr('y', 6)
        .attr('dy', '.75em');

      treepath.select('.sc-target')
        .attr('width', width)
        .attr('height', margin.top);

      //------------------------------------------------------------
      // Main Chart

      var gold = render();

      function render() {

        var grandparent_bind = wrap.selectAll('.sc-grandparent.sc-trans').data([ROOT]);
        var grandparent_entr = grandparent_bind.enter().append('g').attr('class', 'sc-grandparent sc-trans');
        var grandparent = wrap.selectAll('.sc-grandparent.sc-trans').merge(grandparent_entr);
        // We need to keep the old granparent around until transition ends
        // grandparent.exit().remove();

        grandparent
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
          .lower();

        // Parent group
        var parents_bind = grandparent.selectAll('g.sc-parent').data(ROOT.children);
        var parents_entr = parents_bind.enter().append('g').classed('sc-parent', true);
        var parents = grandparent.selectAll('.sc-parent').merge(parents_entr);
        parents_bind.exit().remove();

        // Child rectangles
        var children_bind = parents.selectAll('rect.sc-child').data(function(d) { return d.children || [d]; });
        var children_entr = children_bind.enter().append('rect').attr('class', 'sc-child');
        var children = parents.selectAll('.sc-child').merge(children_entr);
        children_bind.exit().remove();

        children
          .attr('class', classes)
          .attr('fill', function(d, i) {
            // while (d.depth > 1) {
            //   d = d.parent;
            // }
            // return color(groupBy(d));
            var iColor = (d.parent.data.colorIndex || NODES.indexOf(getKey(d.parent.data)) || i);
            return this.getAttribute('fill') || fill(d, iColor, NODES.length);
          })
            .call(rect);

        // Parent labels
        var label_bind = parents.selectAll('text.sc-label').data(function(d) { return [d]; });
        var label_entr = label_bind.enter().append('text').attr('class', 'sc-label')
              .attr('dy', '.75em');
        var label = parents.selectAll('.sc-label').merge(label_entr);
        label_bind.exit().remove();

        label
          .text(function(d) {
              return getKey(d.data);  //groupBy(d);
           })
            .call(text);

        // Parent event target
        var target_bind = parents.selectAll('rect.sc-target').data(function(d) { return [d]; });
        var target_entr = target_bind.enter().append('rect').attr('class', 'sc-target');
        var target = parents.selectAll('.sc-target').merge(target_entr);
        target_bind.exit().remove();

        target
            .call(rect);

        // Family tree path
        treepath.selectAll('text')
          .datum(ROOT)
            .text(crumbs);

        treepath.selectAll('rect')
            .data([ROOT.parent]);

        // -------------
        // Assign Events

        // Assign transition event for parents with children.
        target
          .filter(function(d) { return d.children; })
          .on('click', transition);

        // Assign navigate event for parents without children (leaves).
        target
          .filter(function(d) { return !(d.children); })
          .on('click', leafClick);

        // Tooltips
        target
          .on('mouseover', function(d, i) {
            d3.select(this).classed('hover', true);
            var eo = {
              point: d,
              pointIndex: i,
              id: id,
              e: d3.event
            };
            dispatch.call('elementMouseover', this, eo);
          })
          .on('mousemove', function(d, i) {
            var e = d3.event;
            dispatch.call('elementMousemove', this, e);
          })
          .on('mouseout', function(d, i) {
            d3.select(this).classed('hover', false);
            dispatch.call('elementMouseout', this);
          });

        children
          .on('mouseover', function(d, i) {
            d3.select(this).classed('hover', true);
            var eo = {
                label: getKey(d),
                value: getValue(d),
                point: d,
                pointIndex: i,
                e: d3.event,
                id: id
            };
            dispatch.call('elementMouseover', this, eo);
          })
          .on('mouseout', function(d, i) {
            d3.select(this).classed('hover', false);
            dispatch.call('elementMouseout', this);
          });

        return grandparent;
      }

      function transition(d) {
        var direction;
        var tup;
        var tdn;
        var gnew;

        // cleanup tooltips
        dispatch.call('elementMouseout', this);

        // If we are already transitioning, wait
        if (transitioning || !d) { return; }

        // Reset the root which will be used by render
        ROOT = d;

        transitioning = true;

        gold.classed('sc-trans', false);

        direction = d3.select(this).classed('sc-target') ? 'out' : 'in';

        // Create transitions for in and out
        tup = d3.transition('treemap-out')
                    .duration(duration)
                    .ease(d3.easeCubicIn);
        tdn = d3.transition('treemap-in')
                    .duration(duration)
                    .ease(d3.easeCubicIn);

        // render the new treemap
        gnew = render();

        // Update the domain only after entering new elements
        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);

        // Enable anti-aliasing during the transition
        container.style('shape-rendering', null);

        // Fade-in entering text so start at zero
        gnew.selectAll('text').style('fill-opacity', 0);

        // Select existing text and rectangles with transition
        // anything called by this selection will be run
        // continously until transtion completes
        gnew.selectAll('text').transition(tdn).style('fill-opacity', 1).call(text);
        gnew.selectAll('rect').transition(tdn).style('fill-opacity', 1).call(rect);
        gold.selectAll('text').transition(tup).style('fill-opacity', 0).call(text).remove();
        gold.selectAll('rect').transition(tup).style('fill-opacity', 0).call(rect)
          .on('end', function(d, i) {
            transitioning = false;
            container.style('shape-rendering', 'crispEdges');
            gold.selectAll('*').interrupt('treemap-out');
            gold.remove();
            gold = gnew;
          });
      }

      function text(text) {
        text
          .attr('x', function(d) {
            var xpos = direction === 'rtl' ? -1 : 1;
            return x(d.x0) + 6 * xpos;
          })
          .attr('y', function(d) {
            return y(d.y0) + 6;
          });
      }

      function rect(rect) {
        rect
          .attr('x', function(d) {
            return x(d.x0);
          })
          .attr('y', function(d) { return y(d.y0); })
          .attr('width', function(d) {
            return x(d.x1) - x(d.x0);
          })
          .attr('height', function(d) { return y(d.y1) - y(d.y0); });
      }

      function crumbs(d) {
        if (d.parent) {
          return crumbs(d.parent) + ' / ' + getKey(d.data);
        }
        return getKey(d.data);
      }
    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return chart;
  };
  chart.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return chart;
  };
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    !== 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  !== 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   !== 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return chart;
  };

  chart.leafClick = function(_) {
    if (!arguments.length) { return leafClick; }
    leafClick = _;
    return chart;
  };

  chart.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return chart;
  };

  chart.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return chart;
  };

  chart.groupBy = function(_) {
    if (!arguments.length) { return groupBy; }
    groupBy = _;
    return chart;
  };

  chart.groups = function(_) {
    if (!arguments.length) { return NODES; }
    NODES = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return chart;
  };

  //============================================================


  return chart;
}
