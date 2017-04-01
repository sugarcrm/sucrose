const dev = false; //set false when in production

export {dev as development};
export {version} from "../build/package";
export {default as utility} from './utility.js';
export {default as tooltip} from './tooltip.js';
export {default as models} from './models/models.js';
export {default as charts} from './charts/charts.js';
