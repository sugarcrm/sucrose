// import * as d3 from 'd3'; //without this rollup does something funky to d3 global
// import * as path from 'path';
// import * as fc from path.resolve( '../d3fc-rebind.js' );
// import * as fc from './fc';
// import rebind as fc from './d3fc-rebind';
// import rebind from './d3fc-rebind.js';
// import * as fc from 'd3fc-rebind';
// import {* as fc} from './d3fc-rebind.js';
const ver = '0.0.2'; //change to 0.0.3 when ready
const dev = false; //set false when in production

// export {fc as fc};
// export {rebind as rebind} from './d3fc-rebind';
// export {rebind as rebind};
export {ver as version};
export {dev as development};
export {default as utils} from './utils.js';
export {default as tooltip} from './tooltip.js';
export {default as models} from './models/models.js';
export {default as charts} from './models/charts.js';
