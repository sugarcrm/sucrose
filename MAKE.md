
--------------------------------------
  Usage:
    make <target>

  Targets: for installing and developing Sucrose
    all               - compile sucrose javascript and css files
    clean             - remove sucrose javascript and css files
    clean-css         - remove the library CSS files
    clean-js          - remove the main library js files
    css               - [*] compile and compress sucrose library LESS source files into CSS
    d3-all            - copy full D3 from node_modules to build directory
    d3-bundle         - [*] build the D3 library js file with components for target
    d3-minify         - [*] build the D3 library js file with components for target
    d3-scr            - build custom D3 bundle with just required components for Sucrose
    d3-sgr            - build custom D3 bundle with just required components for Sugar
    dev               - install development environment [main dev]
    es                examples-scr - build and copy the sucrose library to the example application
    examples-dev      - install development package dependencies for sucrose library and generate development examples application
    examples-prod     - install production package dependencies for sucrose library and generate production examples application
    examples-sucrose  - build and copy the sucrose js and css files to the example application
    grade             - [*] run tape tests
    help              - show some help [default]
    list              - just list the make targets
    md                - generate a MAKE.md from help
    nodes             - compile a Node compliant entry file for sucrose
    npm-dev           - install development npm packages
    packs             - create a js version of json package
    prod              - install sucrose & production npm packages [main]
    scr               - build full sucrose library and D3 custom bundle
    sgr               - build selected sucrose modules and D3 custom bundle for Sugar
 
--------------------------------------
 