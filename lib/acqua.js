var fs   = require('fs'),
    _    = require('lodash');
    path = require('path');

function DependencyError(message) {
    this.name = 'DependencyError';
    this.message = message;
    this.stack = new Error().stack;
}

DependencyError.prototype = new Error();

function Acqua(config) {

    config = config || {};

    this.log = config.log || function() {};
    this.err = config.err || function() {};

    this.context = {
        'acqua' : this
    };

}

Acqua.prototype.STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
Acqua.prototype.ARGUMENT_NAMES = /([^\s,]+)/g;

Acqua.prototype.get = function (name) {
    return this.context[name];
};

Acqua.prototype.add = function (name, $module) {
    if (this.context[name] !== undefined) {
        this.log('Module with name: "' + name + '" already exists, overriding');
    }
    this.context[name] = $module;
};

Acqua.prototype.getParamNames = function (func) {
    var fnStr = func.toString().replace(this.STRIP_COMMENTS, ''),
        result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(this.ARGUMENT_NAMES);

    if(result === null) {
        result = [];
    }
    return result
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
        var dependency = self.context[param];
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
        $module = modulePath;

    if (_.isString($module)) {
        $module = require($module);
    }

    if (_.isFunction($module)) {
        var name = this.getFunctionName($module);
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
        } else {
            pendentModules = newPendentModules;
        }

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
                } else if (err instanceof DependencyError) {
                    throw new Error(err.message);
                } else {
                    throw err;
                }
            }
        }
    }
};

module.exports = Acqua;