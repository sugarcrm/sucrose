  
--------------------------------------  
  Usage:  
    make <target>  
  
  Targets: for installing and developing Sucrose  
    all            - compile sucrose Js and Css files  
    clean          - remove sucrose Js and Css files  
    clean-css      - remove Sucrose Css files  
    clean-js       - remove all Sucrose and D3 Js files  
    cover          - create the instrumented build file for code coverage analysis  
    css            - [\*] compile and compress sucrose library LESS source files into Css  
    d3             - [\*] build default D3 bundle  
    d3-all         - copy full D3 from node_modules to build directory  
    d3-bundle      - build the D3 library Js file with components for target  
    d3-minify      - build then minify the D3 custom bundle  
    d3-scr         - build custom D3 bundle with just required components for Sucrose  
    d3-sgr         - build custom D3 bundle with just required components for Sugar  
    dev            - install development npm packages and build all [main dev]  
    examples       - [\*] build and copy the Sucrose Js and Css to the example application  
    examples-all   - [\*] build and copy the Sucrose Js and Css and dependency files to the example application  
    examples-dev   - install development package dependencies for Sucrose library and generate examples application  
    examples-prod  - install production package dependencies for Sucrose library and generate examples application  
    help           - show some help [default]  
    instrument     - build and instrument sucrose.js for testing  
    list           - just list the make targets  
    md             - generate a MAKE.md from help  
    npm-sugar      - publish the custom sugar build of Sucrose  
    pack           - compile a Node compliant entry file and create a Js version of package.json for Sucrose  
    prod           - install production npm packages [main]  
    scr            - [\*] build full sucrose library and D3 custom bundle  
    sgr            - [\*] build selected sucrose modules and D3 custom bundle for Sugar  
    sucrose        - [\*] build default Sucrose Js library  
   
--------------------------------------  
   
