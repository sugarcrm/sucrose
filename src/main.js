// import * as d3 from 'd3'; //without this rollup does something funky to d3 global
// import * as path from 'path';
// import * as fc from path.resolve( '../d3fc-rebind.js' );
// import * as fc from './fc';
// import rebind as fc from '../d3fc-rebind';
// export {rebind as rebind} from '../d3fc-rebind';

import * as models from './models/models.js';
import * as charts from './models/charts.js';

var ver = '0.0.2'; //change to 0.0.3 when ready
var dev = false; //set false when in production
export {ver as version};
export {dev as development};

export {default as utils} from './utils.js';
export {models as models};
export {charts as charts};
