acqua
=====

Acqua is a NodeJS Module for Dependency Injection.

available functions
=====

`get ( name ) : retrieve a module by it's name from the context`

`add ( name , $module ) : adds a module to the context`

`importModule ( $module ) : this function will execute the function call and then add to the context`

`loadDir ( dir ) : loads an entire directory recursively, searching for .js files to import`

`exec ( func ) : this function will execute the "func" function injecting all dependencies based on function args`
    
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

author
=====
Sérgio Marcelino (sergiofilhow@gmail.com)

license
=====
This project is licensed under MIT
