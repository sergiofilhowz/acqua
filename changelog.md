# Version 0.0.1-dev2

First Release of Acqua

# Version 0.0.1

**[BUG]** Fixed problem with the module loading order

# Version 0.0.2

**[BUG]** Fixed a problem that was sharing every function in the same object instance, causing conflicts in 2 modules with the same function name.

# Version 0.0.3

**[FEATURE]** Adding the function exec to run a function injecting dependencies, example:

    acqua.exec(function (dependencyOne, dependencyTwo) {
        // function call
    });
