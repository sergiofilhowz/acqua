acqua
=====

Acqua is a NodeJS Module for Dependency Injection.

available functions
=====

`get ( name ) : retrieve a module by it's name from the context`

`add ( name , $module ) : adds a module to the context`

`importModule ( $module ) : this function will execute the function call and then add to the context`

`loadDir ( dir ) : loads an entire directory recursively, searching for .js files to import`

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
    
Modules without name will be executed, but not added to the context;
    
usage
=====
To use Acqua on your project, just add the commands bellow to your main file.

    var acqua = new Acqua({
    	log : console.log // used to log module imports, optional
    });

    acqua.loadDir(__dirname + '/models');
    acqua.loadDir(__dirname + '/services');
    acqua.loadDir(__dirname + '/routers');
    
author
=====
Sérgio Marcelino (sergiofilhow@gmail.com)

license
=====
This project is licensed under MIT
