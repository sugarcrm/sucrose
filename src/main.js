import * as d3 from 'd3'; //without this rollup does something funky to d3 global
import * as fc from 'd3fc-rebind';
// import * as models from './models/models.js';
// import * as charts from './models/charts.js';

var ver = '0.0.2'; //change to 0.0.3 when ready
var dev = false; //set false when in production
export {ver as version};
export {dev as development};

export {default as utils} from './utils.js';
export {* as models} from './models/models.js';
// export {* as charts} from './models/charts.js';
// export {models as models};
// export {charts as charts};


// export {default as axis} from './models/axis.js';
// export {default as funnel} from './models/funnel.js';
// export {default as gauge} from './models/gauge.js';
// export {default as line} from './models/line.js';
// export {default as multiBar} from './models/multiBar.js';
// export {default as pie} from './models/pie.js';
// export {default as stackedArea} from './models/stackedArea.js';
// export {default as scatter} from './models/scatter.js';
// export {default as scroll} from './models/scroll.js';
// export {default as table} from './models/table.js';
// export {default as tree} from './models/tree.js';
// export {default as treemap} from './models/treemap.js';

// export {default as bubbleChart} from './models/bubbleChart.js';
// export {default as funnelChart} from './models/funnelChart.js';
// export {default as gaugeChart} from './models/gaugeChart.js';
// export {default as globeChart} from './models/globe.js';
// export {default as lineChart} from './models/lineChart.js';
// export {default as multiBarChart} from './models/multiBarChart.js';
// export {default as paretoChart} from './models/paretoChart.js';
// export {default as pieChart} from './models/pieChart.js';
// export {default as stackedAreaChart} from './models/stackedAreaChart.js';
// export {default as treemapChart} from './models/treemapChart.js';
