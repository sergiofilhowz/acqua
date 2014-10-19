var fs = require('fs'),
    _  = require('lodash');

function Acqua(config) {

    config = config || {};

    this.log = config.log || function() {};

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
}

Acqua.prototype.execModule = function ($module) {

    var params = this.getParamNames($module),
        dependencies = [],
        self = this;

    _.forEach(params, function (param) {
        var dependency = self.context[param];
        if (dependency === undefined) {
            // TODO check the load order, this might be considered
            throw new Error('Dependency module does not exist: ' + param);
        }
        dependencies.push(dependency);
    });

    return $module.apply(undefined, dependencies);
};

Acqua.prototype.importModule = function ($module) {
    var result;

    if (_.isString($module)) {
        this.log('Importing module: ' + path);
        $module = require(path);
    }

    if (_.isFunction($module)) {
        var name = this.getFunctionName($module);
        result = this.execModule($module);

        if (name === null) {
            this.log('Not a named function, just executing the function, this module will not be added to the context');
        } else {
            this.add(name, result);
        }
    } else {
        this.err('Module is not a function, ignoring');
    }

    return result;
};

Acqua.prototype.loadDir = function (dir) {
    var self = this;

    fs.readdirSync(dir).filter(function (file) {
        return (file.indexOf('.') !== 0) && (file !== 'index.js');
    }).forEach(function (file) {
        self.loadFile(dir, file);
    });
};

Acqua.prototype.loadFile = function (dir, file, callback) {
    var path = dir + '/' + file;
    if (file.indexOf('.js') < 0) {
        this.loadDir(path, callback);
    } else {
        this.importModule(path);
    }
};

module.exports = Acqua;