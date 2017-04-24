import d3 from 'd3v4';
import utility from '../utility.js';

export default function scroller() {

  //============================================================
  // Public Variables
  //------------------------------------------------------------

  var id,
      margin = {},
      vertical,
      width,
      height,
      minDimension,
      panHandler,
      overflowHandler,
      enable;

  //============================================================

  function scroll(g, g_entr, scrollWrap, xAxis) {

      var defs = g.select('defs'),
          defs_entr = g_entr.select('defs'),
          scrollMask,
          scrollTarget,
          xAxisWrap = scrollWrap.select('.sc-axis-wrap.sc-axis-x'),
          barsWrap = scrollWrap.select('.sc-bars-wrap'),
          backShadows,
          foreShadows;

      var scrollOffset = 0;

      scroll.init = function(offset, overflow) {

        scrollOffset = offset;
        overflowHandler = overflow;

        this.gradients(enable);
        this.mask(enable);
        this.scrollTarget(enable);
        this.backShadows(enable);
        this.foreShadows(enable);

        this.assignEvents(enable);

        this.resize(enable);
      };

      scroll.pan = function(diff) {
        var distance = 0,
            overflowDistance = 0,
            translate = '',
            x = 0,
            y = 0;

        // don't fire on events other than zoom and drag
        // we need click for handling legend toggle
        if (d3.event) {
          if (d3.event.type === 'zoom' && d3.event.sourceEvent) {
            x = d3.event.sourceEvent.deltaX || 0;
            y = d3.event.sourceEvent.deltaY || 0;
            distance = (Math.abs(x) > Math.abs(y) ? x : y) * -1;
          } else if (d3.event.type === 'drag') {
            x = d3.event.dx || 0;
            y = d3.event.dy || 0;
            distance = vertical ? x : y;
          } else if (d3.event.type !== 'click') {
            return 0;
          }
          overflowDistance = (Math.abs(y) > Math.abs(x) ? y : 0);
        }

        // reset value defined in panMultibar();
        scrollOffset = Math.min(Math.max(scrollOffset + distance, diff), -1);
        translate = 'translate(' + (vertical ? scrollOffset + ',0' : '0,' + scrollOffset) + ')';

        if (scrollOffset + distance > 0 || scrollOffset + distance < diff) {
          overflowHandler(overflowDistance);
        }

        foreShadows
          .attr('transform', translate);
        barsWrap
          .attr('transform', translate);
        xAxisWrap.select('.sc-wrap.sc-axis')
          .attr('transform', translate);

        return scrollOffset;
      };

      scroll.assignEvents = function(enable) {
        if (enable) {

          var zoom = d3.zoom()
                .on('zoom', panHandler);
          var drag = d3.drag()
                .subject(function(d) { return d; })
                .on('drag', panHandler);

          scrollWrap
            .call(zoom);
          scrollTarget
            .call(zoom);

          scrollWrap
            .call(drag);
          scrollTarget
            .call(drag);

        } else {

          scrollWrap
              .on('mousedown.zoom', null)
              .on('mousewheel.zoom', null)
              .on('mousemove.zoom', null)
              .on('DOMMouseScroll.zoom', null)
              .on('dblclick.zoom', null)
              .on('touchstart.zoom', null)
              .on('touchmove.zoom', null)
              .on('touchend.zoom', null)
              .on('wheel.zoom', null);
          scrollTarget
              .on('mousedown.zoom', null)
              .on('mousewheel.zoom', null)
              .on('mousemove.zoom', null)
              .on('DOMMouseScroll.zoom', null)
              .on('dblclick.zoom', null)
              .on('touchstart.zoom', null)
              .on('touchmove.zoom', null)
              .on('touchend.zoom', null)
              .on('wheel.zoom', null);

          scrollWrap
              .on('mousedown.drag', null)
              .on('mousewheel.drag', null)
              .on('mousemove.drag', null)
              .on('DOMMouseScroll.drag', null)
              .on('dblclick.drag', null)
              .on('touchstart.drag', null)
              .on('touchmove.drag', null)
              .on('touchend.drag', null)
              .on('wheel.drag', null);
          scrollTarget
              .on('mousedown.drag', null)
              .on('mousewheel.drag', null)
              .on('mousemove.drag', null)
              .on('DOMMouseScroll.drag', null)
              .on('dblclick.drag', null)
              .on('touchstart.drag', null)
              .on('touchmove.drag', null)
              .on('touchend.drag', null)
              .on('wheel.drag', null);
        }
      };

      scroll.resize = function(enable) {

        if (!enable) {
          return;
        }
        var labelOffset = xAxis.labelThickness() + xAxis.tickPadding() / 2,
            v = vertical,
            x = v ? margin.left : labelOffset,
            y = margin.top,
            scrollWidth = width + (v ? 0 : margin[xAxis.orient()] - labelOffset),
            scrollHeight = height + (v ? margin[xAxis.orient()] - labelOffset : 0),
            dim = v ? 'height' : 'width',
            val = v ? scrollHeight : scrollWidth;

        scrollMask
          .attr('x', v ? 2 : -margin.left)
          .attr('y', v ? 0 : 2)
          .attr('width', width + (v ? -2 : margin.left))
          .attr('height', height + (v ? margin.bottom : -2));

        scrollTarget
          .attr('x', x)
          .attr('y', y)
          .attr('width', scrollWidth)
          .attr('height', scrollHeight);

        backShadows.select('.sc-back-shadow-prev')
          .attr('x', x)
          .attr('y', y)
          .attr(dim, val);

        backShadows.select('.sc-back-shadow-more')
          .attr('x', x + (v ? width - 5 : 1))
          .attr('y', y + (v ? 0 : height - 6))
          .attr(dim, val);

        foreShadows.select('.sc-fore-shadow-prev')
          .attr('x', x + (v ? 1 : 0))
          .attr('y', y + (v ? 0 : 1))
          .attr(dim, val);

        foreShadows.select('.sc-fore-shadow-more')
          .attr('x', x + (v ? minDimension - 17 : 0))
          .attr('y', y + (v ? 0 : minDimension - 19))
          .attr(dim, val);
      };

      /* Background gradients */
      scroll.gradients = function(enable) {
        defs_entr
          .append('linearGradient')
          .attr('class', 'sc-scroll-gradient')
          .attr('id', 'sc-back-gradient-prev-' + id);
        var bgpEnter = defs_entr.select('#sc-back-gradient-prev-' + id);

        defs_entr
          .append('linearGradient')
          .attr('class', 'sc-scroll-gradient')
          .attr('id', 'sc-back-gradient-more-' + id);
        var bgmEnter = defs_entr.select('#sc-back-gradient-more-' + id);

        /* Foreground gradients */
        defs_entr
          .append('linearGradient')
          .attr('class', 'sc-scroll-gradient')
          .attr('id', 'sc-fore-gradient-prev-' + id);
        var fgpEnter = defs_entr.select('#sc-fore-gradient-prev-' + id);

        defs_entr
          .append('linearGradient')
          .attr('class', 'sc-scroll-gradient')
          .attr('id', 'sc-fore-gradient-more-' + id);
        var fgmEnter = defs_entr.select('#sc-fore-gradient-more-' + id);

        defs.selectAll('.sc-scroll-gradient')
          .attr('gradientUnits', 'objectBoundingBox')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', vertical ? 1 : 0)
          .attr('y2', vertical ? 0 : 1);

        bgpEnter
          .append('stop')
          .attr('stop-color', '#000')
          .attr('stop-opacity', '0.3')
          .attr('offset', 0);
        bgpEnter
          .append('stop')
          .attr('stop-color', '#FFF')
          .attr('stop-opacity', '0')
          .attr('offset', 1);
        bgmEnter
          .append('stop')
          .attr('stop-color', '#FFF')
          .attr('stop-opacity', '0')
          .attr('offset', 0);
        bgmEnter
          .append('stop')
          .attr('stop-color', '#000')
          .attr('stop-opacity', '0.3')
          .attr('offset', 1);

        fgpEnter
          .append('stop')
          .attr('stop-color', '#FFF')
          .attr('stop-opacity', '1')
          .attr('offset', 0);
        fgpEnter
          .append('stop')
          .attr('stop-color', '#FFF')
          .attr('stop-opacity', '0')
          .attr('offset', 1);
        fgmEnter
          .append('stop')
          .attr('stop-color', '#FFF')
          .attr('stop-opacity', '0')
          .attr('offset', 0);
        fgmEnter
          .append('stop')
          .attr('stop-color', '#FFF')
          .attr('stop-opacity', '1')
          .attr('offset', 1);
      };

      scroll.mask = function(enable) {
        defs_entr.append('clipPath')
          .attr('class', 'sc-scroll-mask')
          .attr('id', 'sc-edge-clip-' + id)
          .append('rect');

        scrollMask = defs.select('.sc-scroll-mask rect');

        scrollWrap.attr('clip-path', enable ? 'url(#sc-edge-clip-' + id + ')' : '');
      };

      scroll.scrollTarget = function(enable) {
        g_entr.select('.sc-scroll-background')
          .append('rect')
          .attr('class', 'sc-scroll-target')
          //.attr('fill', '#FFF');
          .attr('fill', 'transparent');

        scrollTarget = g.select('.sc-scroll-target');
      };

      /* Background shadow rectangles */
      scroll.backShadows = function(enable) {
        var shadowWrap = g_entr.select('.sc-scroll-background')
              .append('g')
              .attr('class', 'sc-back-shadow-wrap');

        shadowWrap
          .append('rect')
          .attr('class', 'sc-back-shadow-prev');
        shadowWrap
          .append('rect')
          .attr('class', 'sc-back-shadow-more');

        backShadows = g.select('.sc-back-shadow-wrap');

        if (enable) {
          var dimension = vertical ? 'width' : 'height';

          backShadows.select('rect.sc-back-shadow-prev')
            .attr('fill', 'url(#sc-back-gradient-prev-' + id + ')')
            .attr(dimension, 7);

          backShadows.select('rect.sc-back-shadow-more')
            .attr('fill', 'url(#sc-back-gradient-more-' + id + ')')
            .attr(dimension, 7);
        } else {
          backShadows.selectAll('rect').attr('fill', 'transparent');
        }
      };

      /* Foreground shadow rectangles */
      scroll.foreShadows = function(enable) {
        var shadowWrap = g_entr.select('.sc-scroll-background')
              .insert('g')
              .attr('class', 'sc-fore-shadow-wrap');

        shadowWrap
          .append('rect')
          .attr('class', 'sc-fore-shadow-prev');
        shadowWrap
          .append('rect')
          .attr('class', 'sc-fore-shadow-more');

        foreShadows = g.select('.sc-fore-shadow-wrap');

        if (enable) {
          var dimension = vertical ? 'width' : 'height';

          foreShadows.select('rect.sc-fore-shadow-prev')
            .attr('fill', 'url(#sc-fore-gradient-prev-' + id + ')')
            .attr(dimension, 20);

          foreShadows.select('rect.sc-fore-shadow-more')
            .attr('fill', 'url(#sc-fore-gradient-more-' + id + ')')
            .attr(dimension, 20);
        } else {
          foreShadows.selectAll('rect').attr('fill', 'transparent');
        }
      };

    return scroll;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  scroll.id = function(_) {
    if (!arguments.length) {
      return id;
    }
    id = _;
    return scroll;
  };

  scroll.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return scroll;
  };

  scroll.width = function(_) {
    if (!arguments.length) {
      return width;
    }
    width = _;
    return scroll;
  };

  scroll.height = function(_) {
    if (!arguments.length) {
      return height;
    }
    height = _;
    return scroll;
  };

  scroll.vertical = function(_) {
    if (!arguments.length) {
      return vertical;
    }
    vertical = _;
    return scroll;
  };

  scroll.minDimension = function(_) {
    if (!arguments.length) {
      return minDimension;
    }
    minDimension = _;
    return scroll;
  };

  scroll.panHandler = function(_) {
    if (!arguments.length) {
      return panHandler;
    }
    panHandler = utility.functor(_);
    return scroll;
  };

  scroll.enable = function(_) {
    if (!arguments.length) {
      return enable;
    }
    enable = _;
    return scroll;
  };

  //============================================================

  return scroll;
}
