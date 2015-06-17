var fs   = require('fs'),
    _    = require('lodash'),
    path = require('path');

function DependencyError(message) {
    this.name = 'DependencyError';
    this.message = message;
    this.stack = new Error(message).stack;
}
DependencyError.prototype = Error.prototype;

function Acqua(config) {

    config = config || {};

    this.log = config.log || function() {};
    this.err = config.err || function() {};

    // namespaces {
    this.name = config.name || undefined;
    this.parent = config.parent || undefined;
    this.namespaces = [];
    // }

    this.dependencies = config.dependencies || [];

    this.context = {
        'acqua' : this
    };

}

Acqua.prototype.STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
Acqua.prototype.ARGUMENT_NAMES = /([^\s,]+)/g;

Acqua.prototype.getFromNamespace = function (namespace, name) {
    var dependency = this.get(name),
        acquaDependency,
        i;

    for (i = 0; i < this.dependencies.length && dependency === undefined; i += 1) {
        acquaDependency = this.dependencies[i];
        if (acquaDependency.namespace(namespace) !== undefined) {
            dependency = acquaDependency.namespace(namespace).get(name);
        } else {
            dependency = acquaDependency.get(name);
        }
    }

    return dependency;
};

Acqua.prototype.get = function (name) {
    var dependency = this.context[name],
        i;

    if (dependency === undefined) {
        if (this.name !== undefined && this.parent !== undefined) {
            dependency = this.parent.getFromNamespace(this.name, name);
        }

        for (i = 0; i < this.dependencies.length && dependency === undefined; i += 1) {
            dependency = this.dependencies[i].get(name);
        }
    }

    return dependency;
};

Acqua.prototype.add = function (name, $module) {
    if (this.context[name] !== undefined) {
        this.log('Module with name: "' + name + '" already exists, overriding');
    }
    this.context[name] = $module;
};

Acqua.prototype.getParamNames = function (func) {
    var fnStr = func.toString().replace(this.STRIP_COMMENTS, ''),
        result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(this.ARGUMENT_NAMES);

    if (result === null) {
        result = [];
    }
    return result;
};

Acqua.prototype.getFunctionName = function (func) {
    var array = /^function\s+([\w\$]+)\(/.exec(func.toString());
    return array === null ? null : array[1];
};

Acqua.prototype.getDependencies = function (fn) {

    var params = this.getParamNames(fn),
        dependencies = [],
        self = this;

    _.forEach(params, function (param) {
        var dependency = self.get(param);
        if (dependency === undefined) {
            throw new DependencyError('Dependency module does not exist: ' + param);
        }
        dependencies.push(dependency);
    });

    return dependencies;

};

Acqua.prototype.exec = function (fn) {

    var dependencies = this.getDependencies(fn);
    return fn.apply({}, dependencies);

};

Acqua.prototype.execModule = function ($module, modulePath) {

    var dependencies = this.getDependencies($module);
    if (_.isString(modulePath)) {
        this.log('Importing module: ' + modulePath);
    }
    return $module.apply({}, dependencies);
};

Acqua.prototype.importModule = function (modulePath) {
    var result,
        $module = modulePath,
        name;

    if (_.isString($module)) {
        $module = require($module);
    }

    if (_.isFunction($module)) {
        name = this.getFunctionName($module);
        result = this.execModule($module, modulePath);

        if (name === null) {
            this.log('└─ Not a named function, just executing the function, this module will not be added to the context');
        } else {
            this.add(name, result);
        }
    } else {
        this.err('Module is not a function, ignoring');
    }

    return result;
};

Acqua.prototype.loadDir = function (dir, importFunction) {
    var self = this,
        pendentModules = [],
        newPendentModules;

    this.internalLoadDir(dir, importFunction, pendentModules);

    do {

        newPendentModules = [];
        _.forEach(pendentModules, function (pendentModule) {
            self.internalLoadFile(pendentModule.directory, pendentModule.file, undefined, newPendentModules);
        });

        if (newPendentModules.length === pendentModules.length && newPendentModules.length > 0) {
            throw new Error('Dependency Error on the Following Modules: (Might be a circular dependency) '
                    + JSON.stringify(pendentModules, null, 4));
        }
        pendentModules = newPendentModules;

    } while (pendentModules.length > 0);
};

Acqua.prototype.internalLoadDir = function (dir, importFunction, pendentModules) {
    var self = this;

    fs.readdirSync(dir).filter(function (file) {
        return (file.indexOf('.') !== 0) && (file !== 'index.js');
    }).forEach(function (file) {
        self.internalLoadFile(dir, file, importFunction, pendentModules);
    });
};

Acqua.prototype.loadFile = function (dir, file, importFunction) {
    this.internalLoadFile(dir, file, importFunction);
};

Acqua.prototype.internalLoadFile = function (dir, file, importFunction, pendentModules) {
    var location = path.join(dir, file);
    if (file.indexOf('.js') < 0) {
        this.internalLoadDir(location, importFunction, pendentModules);
    } else {
        if (importFunction !== undefined && _.isFunction(importFunction)) {
            importFunction(location, this);
        } else {
            try {
                this.importModule(location);
            } catch (err) {
                if (err instanceof DependencyError && pendentModules !== undefined) {
                    pendentModules.push({directory: dir, file: file, error: err.message});
                } else {
                    throw err;
                }
            }
        }
    }
};

/*
 * Acqua Namespace
 */
Acqua.prototype.createNamespace = function (name) {

    var newNamespace;

    newNamespace = new Acqua({
        name : name,
        parent : this,
        log : this.log,
        err : this.err
    });

    this.namespaces[name] = newNamespace;

    return newNamespace;
};

Acqua.prototype.namespace = function (name) {
    return this.namespaces[name];
};

module.exports = Acqua;