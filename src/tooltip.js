
/*****
 * A no frills tooltip implementation.
 *****/
// REFERENCES:
// http://www.jacklmoore.com/notes/mouse-position/


(function() {

  var sctooltip = window.sucrose.tooltip = {};

  sctooltip.show = function(evt, content, gravity, dist, container, classes) {

    var tooltip = document.createElement('div'),
        inner = document.createElement('div'),
        arrow = document.createElement('div');

    gravity = gravity || 's';
    dist = dist || 5;

    inner.className = 'tooltip-inner';
    arrow.className = 'tooltip-arrow';
    inner.innerHTML = content;
    tooltip.style.left = 0;
    tooltip.style.top = -1000;
    tooltip.style.opacity = 0;
    tooltip.className = 'tooltip xy-tooltip in';

    tooltip.appendChild(inner);
    tooltip.appendChild(arrow);
    container.appendChild(tooltip);

    sctooltip.position(container, tooltip, evt, gravity, dist);
    tooltip.style.opacity = 1;

    return tooltip;
  };

  sctooltip.cleanup = function() {
      // Find the tooltips, mark them for removal by this class
      // (so others cleanups won't find it)
      var tooltips = document.getElementsByClassName('tooltip'),
          purging = [],
          i = tooltips.length;

      while (i > 0) {
          i -= 1;

          if (tooltips[i].className.indexOf('xy-tooltip') !== -1) {
              purging.push(tooltips[i]);
              tooltips[i].style.transitionDelay = '0 !important';
              tooltips[i].style.opacity = 0;
              tooltips[i].className = 'sctooltip-pending-removal out';
          }
      }

      setTimeout(function() {
          var removeMe;
          while (purging.length) {
              removeMe = purging.pop();
              removeMe.parentNode.removeChild(removeMe);
          }
      }, 500);
  };

  sctooltip.position = function(container, tooltip, evt, gravity, dist) {
    gravity = gravity || 's';
    dist = dist || 5;

    var rect = container.getBoundingClientRect();

    var pos = [
          evt.clientX - rect.left,
          evt.clientY - rect.top
        ];

    var tooltipWidth = parseInt(tooltip.offsetWidth, 10),
        tooltipHeight = parseInt(tooltip.offsetHeight, 10),
        containerWidth = container.clientWidth,
        containerHeight = container.clientHeight,
        containerLeft = container.scrollLeft,
        containerTop = container.scrollTop,
        class_name = tooltip.className.replace(/ top| right| bottom| left/g, ''),
        left, top;

    function alignCenter() {
      var left = pos[0] - (tooltipWidth / 2);
      if (left < containerLeft) left = containerLeft;
      if (left + tooltipWidth > containerWidth) left = containerWidth - tooltipWidth;
      return left;
    }
    function alignMiddle() {
      var top = pos[1] - (tooltipHeight / 2);
      if (top < containerTop) top = containerTop;
      if (top + tooltipHeight > containerTop + containerHeight) top = containerTop - tooltipHeight;
      return top;
    }
    function arrowLeft(left) {
      var marginLeft = pos[0] - (tooltipWidth / 2) - left - 5,
          arrow = tooltip.getElementsByClassName('tooltip-arrow')[0];
      arrow.style.marginLeft = marginLeft + 'px';
    }
    function arrowTop(top) {
      var marginTop = pos[1] - (tooltipHeight / 2) - top - 5,
          arrow = tooltip.getElementsByClassName('tooltip-arrow')[0];
      arrow.style.marginTop = marginTop + 'px';
    }

    switch (gravity) {
      case 'e':
        top = alignMiddle();
        left = pos[0] - tooltipWidth - dist;
        arrowTop(top);
        if (left < containerLeft) {
          left = pos[0] + dist;
          class_name += ' right';
        } else {
          class_name += ' left';
        }
        break;
      case 'w':
        top = alignMiddle();
        left = pos[0] + dist;
        arrowTop(top);
        if (left + tooltipWidth > containerWidth) {
          left = pos[0] - tooltipWidth - dist;
          class_name += ' left';
        } else {
          class_name += ' right';
        }
        break;
      case 'n':
        left = alignCenter();
        top = pos[1] + dist;
        arrowLeft(left);
        if (top + tooltipHeight > containerTop + containerHeight) {
          top = pos[1] - tooltipHeight - dist;
          class_name += ' top';
        } else {
          class_name += ' bottom';
        }
        break;
      case 's':
        left = alignCenter();
        top = pos[1] - tooltipHeight - dist;
        arrowLeft(left);
        if (containerTop > top) {
          top = pos[1] + dist;
          class_name += ' bottom';
        } else {
          class_name += ' top';
        }
        break;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';

    tooltip.className = class_name;
  };

})();
