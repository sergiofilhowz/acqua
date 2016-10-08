# Version 0.1.1

**[HOTFIX]** Added support to arrow functions

# Version 0.1.0

**[FEATURE]** Hotswap: Now possible to configure acqua for hotswap code changes

    var acqua = new Acqua({
        hotswap : true
    });

    acqua.on('change', changes => console.log(changes));

**[FEATURE]** $inject to allow minification or create aliases

    anotherModule.$inject = ['oneModule'];
    function anotherModule(a) {
        this.oneModule = a;
        return this;
    }

**[FEATURE]** Log colors

# Version 0.0.5

**[HOTFIX]** Fixed an error that was causing the acqua to print 'dependency not found' on a existant module dependency

# Version 0.0.4

**[HOTFIX]** Fixed an error that message wasn't shown on Error stacktrace

**[FEATURE]** Namespaces: two new functions on acqua instance

`createNamespace ( name )` : will create an acqua instance namespace and return the instance
`namespace ( name )` : will return a previously namespace instance

**[FEATURE]** Acqua Dependencies: new option added on construtor to define acqua dependency

    var acqua = new Acqua({
        dependencies : [ anotherAcqua ]
    });

# Version 0.0.3

**[FEATURE]** Adding the function exec to run a function injecting dependencies, example:

    acqua.exec(function (dependencyOne, dependencyTwo) {
        // function call
    });

# Version 0.0.2

**[BUG]** Fixed a problem that was sharing every function in the same object instance, causing conflicts in 2 modules with the same function name.

# Version 0.0.1

**[BUG]** Fixed problem with the module loading order

# Version 0.0.1-dev2

First Release of Acqua