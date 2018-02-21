/*-------------------
       TOOLTIP
-------------------*/

var tooltip = (function() {

  function replacer(content, point, strings) {
      return content
        .replace(/>\s+</gm, '><')
        .replace(/{{(\w+)}}/gm, function(m, p) {
          return point[p] || p;
        })
        .replace(/{{str\s([\w.]+)}}/gm, function(m, p) {
          return strings.translate(p);
        });
  }

  return {
    show: function(evt, content, gravity, dist, container, classes) {
      var wrapper = document.createElement('div'),
          inner = document.createElement('div'),
          arrow = document.createElement('div');

      gravity = gravity || 's';
      dist = dist || 5;

      inner.className = 'tooltip-inner';
      arrow.className = 'tooltip-arrow';
      inner.innerHTML = content;
      wrapper.style.left = 0;
      wrapper.style.top = -1000;
      wrapper.style.opacity = 0;
      wrapper.className = (classes || 'sc-tooltip') + ' tooltip xy-tooltip in';

      wrapper.appendChild(inner);
      wrapper.appendChild(arrow);
      container.appendChild(wrapper);

      tooltip.position(container, wrapper, evt, gravity, dist);
      wrapper.style.opacity = 1;

      return wrapper;
    },

    cleanup: function() {
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
    },

    position: function(container, wrapper, evt, gravity, dist) {
      gravity = gravity || 's';
      dist = dist || 5;

      var rect = container.getBoundingClientRect();

      var pos = [
            evt.clientX - rect.left,
            evt.clientY - rect.top
          ];

      var wrapperWidth = parseInt(wrapper.offsetWidth, 10),
          wrapperHeight = parseInt(wrapper.offsetHeight, 10),
          containerWidth = container.clientWidth,
          containerHeight = container.clientHeight,
          containerLeft = container.scrollLeft,
          containerTop = container.scrollTop,
          class_name = wrapper.className.replace(/ top| right| bottom| left/g, ''),
          left, top;

      function alignCenter() {
        var left = pos[0] - (wrapperWidth / 2);
        if (left < containerLeft) left = containerLeft;
        if (left + wrapperWidth > containerWidth) left = containerWidth - wrapperWidth;
        return left;
      }
      function alignMiddle() {
        var top = pos[1] - (wrapperHeight / 2);
        if (top < containerTop) top = containerTop;
        if (top + wrapperHeight > containerTop + containerHeight) top = containerTop - wrapperHeight;
        return top;
      }
      function arrowLeft(left) {
        var marginLeft = pos[0] - (wrapperWidth / 2) - left - 5,
            arrow = wrapper.getElementsByClassName('tooltip-arrow')[0];
        arrow.style.marginLeft = marginLeft + 'px';
      }
      function arrowTop(top) {
        var marginTop = pos[1] - (wrapperHeight / 2) - top - 5,
            arrow = wrapper.getElementsByClassName('tooltip-arrow')[0];
        arrow.style.marginTop = marginTop + 'px';
      }

      switch (gravity) {
        case 'e':
          top = alignMiddle();
          left = pos[0] - wrapperWidth - dist;
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
          if (left + wrapperWidth > containerWidth) {
            left = pos[0] - wrapperWidth - dist;
            class_name += ' left';
          } else {
            class_name += ' right';
          }
          break;
        case 'n':
          left = alignCenter();
          top = pos[1] + dist;
          arrowLeft(left);
          if (top + wrapperHeight > containerTop + containerHeight) {
            top = pos[1] - wrapperHeight - dist;
            class_name += ' top';
          } else {
            class_name += ' bottom';
          }
          break;
        case 's':
          left = alignCenter();
          top = pos[1] - wrapperHeight - dist;
          arrowLeft(left);
          if (containerTop > top) {
            top = pos[1] + dist;
            class_name += ' bottom';
          } else {
            class_name += ' top';
          }
          break;
      }

      wrapper.style.left = left + 'px';
      wrapper.style.top = top + 'px';
      wrapper.className = class_name;
    },

    single: function(point, strings) {
      var content =
        '<div class="tooltip-header"> \
            <b>{{key}}</b> \
        </div> \
        <div class="tooltip-grid"> \
            <p><span>{{label}}</span> <span>{{value}}</span></p>' +
            (typeof point.percent !== 'undefined' && String(point.percent).length
              ? '<p><span>{{str tooltip.percent}}</span> <span>{{percent}}%</span></p>'
              : ''
            ) +
        '</div>' +
        (typeof point.msg !== 'undefined' && point.msg.length
          ? '<div class="tooltip-status"><i>{{msg}}</i></div>'
          : ''
        );

        return replacer(content, point, strings);
    },

    multi: function(point, strings) {
      var content =
        '<div class="tooltip-grid"> \
            <p><span>{{groupName}}</span> <span>{{groupLabel}}</span></p>' +
            (typeof point.seriesName !== 'undefined' && String(point.seriesName).length
              ? '<p><span>{{seriesName}}</span> <span>{{seriesLabel}}</span></p>'
              : ''
            ) +
            '<p><span>{{valueName}}</span> <span>{{valueLabel}}</span></p>' +
            (typeof point.percent !== 'undefined' && String(point.percent).length
              ? '<p><span>{{str tooltip.percent}}</span> <span>{{percent}}%</span></p>'
              : ''
            ) +
        '</div>' +
        (typeof point.msg !== 'undefined' && point.msg.length
          ? '<div class="tooltip-status"><i>{{msg}}</i></div>'
          : ''
        );

        return replacer(content, point, strings);
    }
  };
})();

export default tooltip;
