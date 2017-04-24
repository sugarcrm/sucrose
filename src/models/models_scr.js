/*-------------------
       MODELS
-------------------*/

import axis from './axis.js';
import funnel from './funnel.js';
import gauge from './gauge.js';
import menu from './menu.js';
import line from './line.js';
import multibar from './multibar.js';
import pie from './pie.js';
import scatter from './scatter.js';
import scroller from './scroller.js';
import stackedarea from './stackedarea.js';
import table from './table.js';
import treemap from './treemap.js';

const models = {
    axis: axis,
    funnel: funnel,
    gauge: gauge,
    legend: menu,
    line: line,
    multibar: multibar,
    pie: pie,
    scatter: scatter,
    scroll: scroller,
    stackedarea: stackedarea,
    table: table,
    treemap: treemap,
};

export default models;
