export {
  version
} from "./build/package";

// const dev = false; //set false when in production
// export {dev as development};

// export {default as utility} from './src/utility.js';
// export {default as tooltip} from './src/tooltip.js';
// export {default as models} from './src/models/models.js';
// export {default as charts} from './src/charts/charts.js';
// var src = require('./build/sucrose.js');
// import * as sucrose from './build/sucrose.js';
export {
  development,
  utility,
  tooltip,
  models,
  charts,
} from 'sucrose'; //TODO: why doesn't from './build/sucrose.js' work?
