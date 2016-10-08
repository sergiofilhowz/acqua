var fs   = require('fs'),
    _    = require('lodash'),
    path = require('path'),
    Events = require('events');

require('colors');

function DependencyError(message, modules) {
    this.name = 'DependencyError';
    this.message = message;
    this.modules = modules;
    this.stack = new Error(message).stack;
}
DependencyError.prototype = Error.prototype;

function Acqua(config) {
    config = config || {};

    this.log = config.log || function() {};
    this.err = config.err || function() {};
    this.emitter = config.emitter || new Events.EventEmitter();

    // namespaces {
    this.name = config.name || undefined;
    this.parent = config.parent || undefined;
    this.namespaces = [];
    // }

    this.dependencies = config.dependencies || [];

    this.context = {
        'acqua' : this
    };

    this.hotswap = config.hotswap;
}

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
        this.log(`Module with name: '${name}' already exists, overriding`.red);
    }
    this.context[name] = $module;
};

Acqua.prototype.getParamNames = function (func) {
    if (func.$inject) {
        return func.$inject;
    }

    var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, ''),
        result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g);

    // single argument arrow function support
    if (/^[A-Za-z][A-Za-z0-9]* ?=> ?/.test(fnStr)) {
        result = [/^([A-Za-z][A-Za-z0-9]*) ?=> ?/.exec(fnStr)[1]];
    } else if (result === null) {
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

    _.forEach(params, param => {
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

Acqua.prototype.execModule = function ($module, modulePath, silent) {
    var dependencies = this.getDependencies($module, modulePath);
    if (_.isString(modulePath) && !silent) {
        this.log('Importing module: '.green + modulePath);
    }
    return $module.apply({}, dependencies);
};

Acqua.prototype.importModule = function (modulePath, reload) {
    var result,
        $module = modulePath,
        name;

    if (_.isString($module)) {
        if (reload) {
            this.log('CHANGED: '.yellow + modulePath);
            delete require.cache[require.resolve($module)];
        }
        $module = require($module);
    }

    if (_.isFunction($module)) {
        name = this.getFunctionName($module);
        result = this.execModule($module, modulePath, reload);

        if (name === null) {
            this.log('└─ Not a named function, just executing the function, this module will not be added to the context'.yellow);
        } else if (!reload) {
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
        _.forEach(pendentModules, pendentModule => {
            self.internalLoadFile(pendentModule.directory, pendentModule.file, undefined, newPendentModules);
        });

        if (newPendentModules.length === pendentModules.length && newPendentModules.length > 0) {
            throw new DependencyError('Dependency Error on the Following Modules: (Might be a circular dependency) '
                    + JSON.stringify(newPendentModules, null, 4), newPendentModules);
        }
        pendentModules = newPendentModules;
    } while (pendentModules.length > 0);
};

Acqua.prototype.internalLoadDir = function (dir, importFunction, pendentModules) {
    var self = this;

    fs.readdirSync(dir).filter(file => {
        return (file.indexOf('.') !== 0) && (file !== 'index.js');
    }).forEach(file => {
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
                var fileModule = this.importModule(location);
                if (this.hotswap) {
                    fs.watchFile(location, { persistent : true, interval : 100 }, () => {
                        this.fileChanged(location, fileModule);
                    });
                }
            } catch (err) {
                if (err instanceof DependencyError && pendentModules !== undefined) {
                    pendentModules.push({ directory: dir, file: file, error: err.message });
                } else {
                    throw err;
                }
            }
        }
    }
};

Acqua.prototype.fileChanged = function (filepath, fileModule) {
    try {
        var newFileModule = this.importModule(filepath, true);
        _.assign(fileModule, newFileModule);
        this.emitter.emit('change', {
            filepath : filepath,
            module : fileModule
        });
    } catch (err) {
        this.err(err);
        this.emitter.emit('changeerror', err);
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
        err : this.err,
        hotswap : this.hotswap,
        emitter : this.emitter
    });

    this.namespaces[name] = newNamespace;

    return newNamespace;
};

Acqua.prototype.namespace = function (name) {
    return this.namespaces[name];
};

Acqua.prototype.on = function (event, handler) {
   this.emitter.on(event, handler);
};

module.exports = Acqua;
