import d3 from 'd3'; //without this rollup does something funky to d3 global
import * as fc from 'd3fc-rebind';

var ver = "0.0.2"; //change to 0.0.3 when ready
export {ver as version};
var dev = false; //set false when in production
export {dev as development};

export * from 'd3fc-rebind';
export {default as utils} from './utils.js';
export {default as legend} from './models/legend.js';
export {default as funnel} from './models/funnel.js';
export {default as funnelChart} from './models/funnelChart.js';
var asdf = d3.select('div');
