# Acqua

[![Build Status](https://travis-ci.org/sergiofilhowz/acqua.svg?branch=master)](https://travis-ci.org/sergiofilhowz/acqua) [![npm version](https://badge.fury.io/js/acqua.svg)](https://badge.fury.io/js/acqua)

Acqua is a NodeJS Module Loader + Dependency Injection now with code hotswap (test your code without restart).

available functions
=====

`get ( name )` : retrieve a module by it's name from the context

`add ( name , $module )` : adds a module to the context

`importModule ( $module )` : this function will execute the function call and then add to the context

`loadDir ( dir )` : loads an entire directory recursively, searching for .js files to import

`exec ( func )` : this function will execute the "func" function injecting all dependencies based on function args


namespaces
=====

`createNamespace ( name )` : will create an acqua instance namespace and return the instance

`namespace ( name )` : will return a previously namespace instance

acqua dependencies
=====

Acqua may have dependency to other acqua instances, so when a _module_ is not found while loading modules, acqua will lookup on dependencies.

    var acqua = new Acqua({
        dependencies : [ anotherAcqua ]
    });

    
usage
=====
To use Acqua on your project, just add the commands bellow to your main file.

    var acqua = new Acqua({
    	log : console.log, // used to log module imports, optional
    	err : console.err  // used to log errors on module imports, optional
    });

    acqua.loadDir(__dirname + '/models');
    acqua.loadDir(__dirname + '/services');
    acqua.loadDir(__dirname + '/routers');
    
info
=====
Modules must be functions, and all dependencies must be the function arguments, all modules have to return an object reference;

    moduleName.$inject = ['acqua']; // <- optional, to allow minification or to use aliases
    module.exports = function moduleName (acqua) {
    	this.acqua = acqua;
    };
    
the other module can inject the dependency for the first module

    module.exports = function anotherModule (moduleName) {
    	this.moduleName = moduleName;
    };
    
**Note**: Modules without name will be executed, but not added to the context;

It's also possible to pass a custom import function to loadDir, for example

    acqua.loadDir(__dirname + '/models', function(path, thiz) {
        // thiz === acqua === true
        var model = sequelize.import(path);
        thiz.add(model.name, model);
    });
    
**Note**: All load functions are sync and are meant to be called on startup.
    
It's possible to exec a function loading all dependencies

    acqua.exec(function (dependencyOne, dependencyTwo) {
        // function call
    });
    
## Now introducing hotswap to watch file changes and test it instantly

    var acqua = new Acqua({
        hotswap : true
    });
    
    // only if you want to watch over file changes
    acqua.on('change', changes => console.log(changes));

author
=====
Sérgio Marcelino (sergiofilhow@gmail.com)

license
=====
This project is licensed under MIT
