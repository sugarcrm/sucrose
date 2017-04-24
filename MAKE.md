
--------------------------------------
  Usage:
    make <target>

  Targets: for installing and developing Sucrose
    all                 - compile sucrose javascript and css files
    clean               - remove sucrose javascript and css files
    clean-css           - remove the library CSS files
    clean-dependencies  - remove dependency js files
    clean-js            - remove the main library js files
    css                 - [*] compile and compress sucrose library LESS source files into CSS
    dependencies        - copy dependency js files (D3, D3FC)
    examples-dev        - install development package dependencies for sucrose library and generate development examples application
    examples-prod       - install production package dependencies for sucrose library and generate production examples application
    examples-sucrose    - copy the sucrose library files to the example application
    grade               - [*] run tape tests
    help                - show some help [default]
    install-dev         - install development environment [main dev]
    install-post        - copy sucrose and dependency files and generate index
    install-prod        - install sucrose dependent npm packages and copy build files [main]
    list                - just list the make targets
    nodes               - compile a Node compliant entry file for sucrose
    npm-dev             - install development npm packages
    npm-prod            - install production npm packages
    packs               - create a js version of json package
    scr                 - build full sucrose library and D3 custom bundle
 
--------------------------------------
 
