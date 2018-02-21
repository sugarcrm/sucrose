import d3 from 'd3';
import utility from '../utility.js';
import language from '../language.js';

export default function treeChart() {
  // issues: 1. zoom slider doesn't zoom on chart center

  // all hail, stepheneb
  // https://gist.github.com/1182434
  // http://mbostock.github.com/d3/talk/20111018/tree.html
  // https://groups.google.com/forum/#!topic/d3-js/-qUd_jcyGTw/discussion
  // http://ajaxian.com/archives/foreignobject-hey-youve-got-html-in-my-svg
  // [possible improvements @ http://bl.ocks.org/robschmuecker/7880033]

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  // specific to org chart
  var margin = {'top': 10, 'right': 10, 'bottom': 10, 'left': 10}, // this is the distance from the edges of the svg to the chart,
      width = null,
      height = null,
      r = 6,
      duration = 0,
      zoomExtents = {'min': 0.25, 'max': 2},
      nodeSize = {'width': 100, 'height': 50},
      nodeImgPath = '../img/',
      nodeRenderer = function(d) { return '<div class="sc-tree-node"></div>'; },
      zoomCallback = function(d) { return; },
      nodeCallback = function(d) { return; },
      nodeClick = function(d) { return; },
      horizontal = false;

  var id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one,
      color = function(d, i) { return utility.defaultColor()(d, i); },
      fill = function(d, i) { return color(d, i); },

      // setX = function(d, v) { d.x = v; },
      setY = function(d, v) { d.y = v; },
      setX0 = function(d, v) { d.data.x0 = v; },
      setY0 = function(d, v) { d.data.y0 = v; },

      getX = function(d) { return horizontal ? d.y : d.x; },
      getY = function(d) { return horizontal ? d.x : d.y; },
      getX0 = function(d) { return horizontal ? d.data.y0 : d.data.x0; },
      getY0 = function(d) { return horizontal ? d.data.x0 : d.data.y0; },

      getId = function(d) { return d.id || d.data.id; },
      getCardId = function(d) { return 'card-' + getId(d); },

      useClass = false,
      clipEdge = true,
      showLabels = true,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');

  //============================================================

  function chart(selection) {
    selection.each(function(data) {

      var container = d3.select(this);

      // trunk is either the entire tree (data)
      // or a pruning created by chart.filter()
      var trunk = data;

      var tran = d3.transition('tree')
            .duration(duration)
            .ease(d3.easeLinear);

      var root = null;
      var nodeData = null;
      var linkData = null;
      var zoom = null;

      var dendrogram = d3.tree()
            .size([null, null])
            .nodeSize([(horizontal ? nodeSize.height : nodeSize.width), 1])
            .separation(function separation(a, b) {
              return a.parent == b.parent ? 1 : 1;
            });

      var availableSize = { // the size of the svg container minus margin
            'width': parseInt(container.style('width'), 10) - margin.left - margin.right,
            'height': parseInt(container.style('height'), 10) - margin.top - margin.bottom
          };

      //------------------------------------------------------------
      // Setup svgs and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([1]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-tree');
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs').merge(defs_entr);
      var nodeShadow = utility.dropShadow('node_back_' + id, defs, {blur: 2});

      defs_entr.append('clipPath').attr('id', 'sc-edge-clip-' + id).append('rect');
      var clipPath = defs.select('#sc-edge-clip-' + id + ' rect');
      clipPath
        .attr('width', availableSize.width)
        .attr('height', availableSize.height)
        .attr('x', margin.left)
        .attr('y', margin.top);
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      wrap_entr.append('rect')
        .attr('class', 'sc-chart-background')
        .attr('width', availableSize.width)
        .attr('height', availableSize.height)
        .attr('transform', utility.translation(margin.left, margin.top))
        .style('fill', 'transparent');
      var backg = wrap.select('.sc-chart-background');

      var g_entr = wrap_entr.append('g').attr('class', 'sc-tree-wrap');
      var g_wrap = wrap.select('.sc-tree-wrap');

      g_entr.append('g').attr('class', 'sc-wrap sc-tree');
      var tree_wrap = wrap.select('.sc-wrap.sc-tree');

      function grow(seed) {
        root = d3.hierarchy(seed, function(d) {
          return d.children;
        });

        dendrogram(root); // apply tree structure to data

        nodeData = root.descendants();

        nodeData.forEach(function(d) {
          setY(d, d.depth * 2 * (horizontal ? nodeSize.width : nodeSize.height));
        });

        linkData = nodeData.slice(1);
      }

      function foliate(limb) {
        setX0(limb, getX(limb));
        setY0(limb, getY(limb));
        if (limb.children && limb.children.length) {
          limb.children.forEach(foliate);
        }
      }

      function diagonal(d, p) {
        var dy = getY(d) - (horizontal ? 0 : nodeSize.height - r * 3),
            dx = getX(d) - (horizontal ? nodeSize.width - r * 2 : 0),
            py = getY(p),
            px = getX(p),
            cdx = horizontal ? (dx + px) / 2 : dx,
            cdy = horizontal ? dy : (dy + py) / 2,
            cpx = horizontal ? (dx + px) / 2 : px,
            cpy = horizontal ? py : (dy + py) / 2;
        return 'M' + dx + ',' + dy
             + 'C' + cdx + ',' + cdy
             + ' ' + cpx + ',' + cpy
             + ' ' + px + ',' + py;
      }

      // Toggle children.
      function toggle(branch) {
        if (branch.children) {
          branch._children = branch.children;
          branch.children = null;
        } else {
          branch.children = branch._children;
          branch._children = null;
        }
      }

      // Click tree node.
      function leafClick(leaf) {
        toggle(leaf.data);
        chart.update(leaf);
      }

      // Get the card id
      function getNodeId(d) {
        var id = 'node-' + getId(d);
        return id;
      }

      // Get the link id
      function getLinkId(d) {
        var id = 'link-' + (d.parent ? getId(d.parent) : 0) + '-' + getId(d);
        return id;
      }


      chart.setZoom = function() {
        zoom = d3.zoom()
          .scaleExtent([zoomExtents.min, zoomExtents.max])
          .on('zoom', function() {
            g_wrap.attr('transform', 'translate(' + d3.event.transform.x + ',' + d3.event.transform.y + ')scale(' + d3.event.transform.k + ')');
            zoomCallback(d3.event.transform.k);
          });
      };
      chart.unsetZoom = function(argument) {
        zoom.on('zoom', null);
      };
      chart.resetZoom = function() {
        wrap.call(zoom.transform, d3.zoomIdentity);
      };

      chart.orientation = function(orientation) {
        horizontal = (orientation === 'horizontal' || !horizontal ? true : false);
        dendrogram.nodeSize([(horizontal ? nodeSize.height : nodeSize.width), 1]);
        chart.update(root);
      };

      chart.showall = function() {
        function expandAll(d) {
          if (d._children && d._children.length) {
              d.children = d._children;
              d._children = null;
          }
          if (d.children && d.children.length) {
            d.children.forEach(expandAll);
          }
        }
        trunk = data;
        expandAll(trunk);
        chart.update(root);
      };

      chart.zoomStep = function(step) {
        var transform = d3.zoomTransform(wrap.node());
        var level = transform.k + step;
        return this.zoomLevel(level);
      };

      chart.zoomLevel = function(level) {
        var transform = d3.zoomTransform(wrap.node());
        var scale = Math.min(Math.max(level, zoomExtents.min), zoomExtents.max);
        var prevScale = transform.k;
        var prevTrans = [transform.x, transform.y];

        var treeBBox = backg.node().getBoundingClientRect();
        var size = [
              treeBBox.width,
              treeBBox.height
            ];

        var offset = [
              (size[0] - size[0] * scale) / 2,
              (size[1] - size[1] * scale) / 2
            ];

        var shift = [
              scale * (prevTrans[0] - (size[0] - size[0] * prevScale) / 2) / prevScale,
              scale * (prevTrans[1] - (size[1] - size[1] * prevScale) / 2) / prevScale
            ];

        var translate = [
              offset[0] + shift[0],
              offset[1] + shift[1]
            ];

        var t = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);

        wrap.call(zoom.transform, t);

        return scale;
      };

      chart.zoomScale = function() {
        var transform = d3.zoomTransform(wrap.node());
        return transform.k;
      };

      chart.filter = function(node) {
        var found = false;

        function prune(d) {
          if (getId(d) === node) {
            trunk = d;
            found = true;
          } else if (!found && d.children) {
            d.children.forEach(prune);
          }
        }

        // Initialize the display to show a few nodes.
        // Start with the original data and set a new trunk.
        prune(data);

        chart.update(root);
      };

      // source is either root or a selected node
      chart.update = function(source) {
        var target = {x: 0, y: 0};

        function initial(d) {
          // if the source is root
          if (getId(source) === getId(root)) {
            return diagonal(root, root);
          } else {
            var node = {x: getX0(source), y: getY0(source)};
            return diagonal(node, node);
          }
        }
        function extend(branch) {
          return diagonal(branch, branch.parent);
        }
        function retract() {
          return diagonal(target, target);
        }

        grow(trunk);

        var nodeOffsetX = (horizontal ? r - nodeSize.width : nodeSize.width / -2) + 'px';
        var nodeOffsetY = (horizontal ? (r - nodeSize.height) / 2 : r * 2 - nodeSize.height) + 'px';

        // Update the nodes…
        var nodes_bind = tree_wrap.selectAll('g.sc-card').data(nodeData, getId);

        // Enter any new nodes at the parent's previous position.
        var nodes_entr;
        nodes_entr = nodes_bind.enter().insert('g')
          .attr('class', 'sc-card')
          .attr('id', getNodeId)
          .attr('opacity', function(d) {
            return getId(source) === getId(d) ? 1 : 0;
          })
          .attr('transform', function(d) {
            // if the source is root
            if (getId(source) === getId(root)) {
              return 'translate(' + getX(root) + ',' + getY(root) + ')';
            } else {
              return 'translate(' + (horizontal ? getY0(source) : getX0(source)) + ',' + (horizontal ? getX0(source) : getY0(source)) + ')';
            }
          });

        // For each node create a shape for node content display
        // Create <use> nodes in defs
        nodes_entr.each(function(d) {
          var nodeObject;
          var nodeContent;
          if (!defs.select('#' + getCardId(d)).empty()) {
            return;
          }
          nodeObject = defs.append('svg')
            .attr('class', 'sc-foreign-object')
            .attr('id', getCardId(d))
            .attr('version', '1.1')
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
            .attr('x', nodeOffsetX)
            .attr('y', nodeOffsetY)
            .attr('width', nodeSize.width + 'px')
            .attr('height', nodeSize.height + 'px')
            .attr('viewBox', '0 0 ' + nodeSize.width + ' ' + nodeSize.height)
            .attr('xml:space', 'preserve');

          nodeContent = nodeObject.append('g')
            .attr('class', 'sc-tree-node-content')
            .attr('transform', 'translate(' + r + ',' + r + ')');

          nodeRenderer(nodeContent, d, nodeSize.width - r * 2, nodeSize.height - r * 3);
        });

        // Apply node content from <use>
        nodes_entr.append('use')
          .attr('xlink:href', function(d) {
            return '#' + getCardId(d);
          })
          .attr('filter', nodeShadow)
          .on('click', nodeClick);

        // Transition nodes to their new position.
        var nodes;
        nodes = tree_wrap.selectAll('g.sc-card').merge(nodes_entr);
        nodes.transition(tran).duration(duration)
          .attr('opacity', 1)
          .attr('transform', function(d) {
            if (getId(source) === getId(d)) {
              target = {x: horizontal ? getY(d) : getX(d), y: horizontal ? getX(d) : getY(d)};
            }
            return 'translate(' + getX(d) + ',' + getY(d) + ')';
          })
          .on('end', nodeCallback);

        // Transition exiting nodes to the parent's new position.
        var nodes_exit;
        nodes_exit = nodes_bind.exit().transition(tran).duration(duration)
          .attr('opacity', 0)
          .attr('transform', function(d) {
            return 'translate(' + getX0(source) + ',' + getY0(source) + ')';
          })
          .remove();
        nodes_exit.selectAll('.sc-expcoll')
          .style('stroke-opacity', 1e-6);

        defs.selectAll('.sc-foreign-object')
            .attr('x', nodeOffsetX)
            .attr('y', nodeOffsetY);

        // Update the node expand/collapse circle
        var xc_enter;
        xc_enter = nodes_entr.append('g').attr('class', 'sc-expcoll')
          .style('opacity', 1e-6)
          .on('click', leafClick);
        xc_enter.append('circle').attr('class', 'sc-circ-back')
          .attr('r', r);
        xc_enter.append('line').attr('class', 'sc-line-vert')
          .attr('x1', 0).attr('y1', 0.5 - r).attr('x2', 0).attr('y2', r - 0.5)
          .style('stroke', '#bbb');
        xc_enter.append('line').attr('class', 'sc-line-hrzn')
          .attr('x1', 0.5 - r).attr('y1', 0).attr('x2', r - 0.5).attr('y2', 0)
          .style('stroke', '#fff');

        var xc;
        xc = tree_wrap.selectAll('g.sc-expcoll').merge(xc_enter);
        xc.style('opacity', function(d) {
            return ((d.data.children && d.data.children.length) || (d.data._children && d.data._children.length)) ? 1 : 0;
          });
        xc.select('.sc-circ-back')
          .style('fill', function(d) {
            return (d.data._children && d.data._children.length) ? '#777' : (d.data.children ? '#bbb' : 'none');
          });
        xc.select('.sc-line-vert')
          .style('stroke', function(d) {
            return (d.data._children && d.data._children.length) ? '#fff' : '#bbb';
          });


        // Update the links
        var links_bind = tree_wrap.selectAll('path.link').data(linkData, getLinkId);
            // Enter any new links at the parent's previous position.
        var links_entr = links_bind.enter().insert('path', 'g')
              .attr('d', initial)
              .attr('class', 'link')
              .attr('id', getLinkId)
              .attr('opacity', 0);

        var links;
        links = tree_wrap.selectAll('path.link').merge(links_entr);
        // Transition links to their new position.
        links.transition(tran).duration(duration)
          .attr('d', extend)
          .attr('opacity', 1);
        // Transition exiting nodes to the parent's new position.
        links_bind.exit().transition(tran).duration(duration)
          .attr('d', retract)
          .attr('opacity', 0)
          .remove();


        // Stash the old positions for transition.
        foliate(root);

        chart.resize(getId(source) === getId(root));
      };

      chart.render = function() {
        chart.resize(true);
      };

      // This resizes and repositions the .sc-tree group to fit in the container
      // with a zoom and translate set to identity
      chart.resize = function(initial) {
        initial = typeof initial === 'undefined' ? true : initial;

        chart.resetZoom();

        // the size of the svg container minus margin
        availableSize = {
          'width': parseInt(container.style('width'), 10) - margin.left - margin.right,
          'height': parseInt(container.style('height'), 10) - margin.top - margin.bottom
        };

        // the size of the chart itself
        var size = [
              Math.abs(d3.min(nodeData, getX)) + Math.abs(d3.max(nodeData, getX)) + nodeSize.width,
              Math.abs(d3.min(nodeData, getY)) + Math.abs(d3.max(nodeData, getY)) + nodeSize.height
            ];

        // initial chart scale to fit chart in container
        var xScale = availableSize.width / size[0],
            yScale = availableSize.height / size[1],
            scale = d3.min([xScale, yScale]);

        // initial chart translation to position chart in the center of container
        var center = [
              Math.abs(d3.min(nodeData, getX)) +
                (xScale < yScale ? 0 : (availableSize.width / scale - size[0]) / 2),
              Math.abs(d3.min(nodeData, getY)) +
                (xScale < yScale ? (availableSize.height / scale - size[1]) / 2 : 0)
            ];

        var offset = [
              nodeSize.width / (horizontal ? 1 : 2),
              nodeSize.height / (horizontal ? 2 : 1)
            ];

        var translate = [
              (center[0] + offset[0]) * scale + margin.left / (horizontal ? 2 : 1),
              (center[1] + offset[1]) * scale + margin.top / (horizontal ? 1 : 2)
            ];

        clipPath
          .attr('width', availableSize.width)
          .attr('height', availableSize.height);

        backg
          .attr('width', availableSize.width)
          .attr('height', availableSize.height);

        // TODO: do we need to interrupt transitions on resize to prevent Too late... error?
        // tree_wrap.interrupt().selectAll('*').interrupt();

        tree_wrap
          .transition(tran).duration(initial ? 0 : duration)
          .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');
      };


      chart.setZoom();
      wrap.call(zoom);

      // Compute the new tree layout root
      grow(trunk);
      // Then preset X0/Y0 values for transformations
      // Note: these cannot be combined because of chart.update
      // which doesn't repopulate X0/Y0 until after render
      foliate(root);

      chart.update(root);

    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.options = utility.optionsFunc.bind(chart);

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin = _;
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

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return chart;
  };

  chart.showLabels = function(_) {
    if (!arguments.length) { return showLabels; }
    showLabels = _;
    return chart;
  };

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
  chart.useClass = function(_) {
    if (!arguments.length) { return useClass; }
    useClass = _;
    return chart;
  };

  // ORG

  chart.radius = function(_) {
    if (!arguments.length) { return r; }
    r = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.zoomExtents = function(_) {
    if (!arguments.length) { return zoomExtents; }
    zoomExtents = _;
    return chart;
  };

  chart.zoomCallback = function(_) {
    if (!arguments.length) { return zoomCallback; }
    zoomCallback = _;
    return chart;
  };

  chart.nodeSize = function(_) {
    if (!arguments.length) { return nodeSize; }
    nodeSize = _;
    return chart;
  };

  chart.nodeImgPath = function(_) {
    if (!arguments.length) { return nodeImgPath; }
    nodeImgPath = _;
    return chart;
  };

  chart.nodeRenderer = function(_) {
    if (!arguments.length) { return nodeRenderer; }
    nodeRenderer = _;
    return chart;
  };

  chart.nodeCallback = function(_) {
    if (!arguments.length) { return nodeCallback; }
    nodeCallback = _;
    return chart;
  };

  chart.nodeClick = function(_) {
    if (!arguments.length) { return nodeClick; }
    nodeClick = _;
    return chart;
  };

  chart.horizontal = function(_) {
    if (!arguments.length) { return horizontal; }
    horizontal = _;
    return chart;
  };

  chart.getId = function(_) {
    if (!arguments.length) { return getId; }
    getId = _;
    return chart;
  };

  chart.getCardId = function(_) {
    if (!arguments.length) { return getCardId; }
    getCardId = _;
    return chart;
  };

  //============================================================

  return chart;
}
