const fs          = require('fs');
const _           = require('lodash');
const path        = require('path');
const Events      = require('events');
const AcquaModule = require('./AcquaModule');

require('colors');

class DependencyError extends Error {
  constructor(message, modules) {
    super(message);
    this.modules = modules;
  }
}

function noop() {
}

class Acqua {

  constructor(config = {}) {
    this.log = config.log || noop;
    this.err = config.err || noop;
    this.emitter = config.emitter || new Events.EventEmitter();

    this.name = config.name;
    this.parent = config.parent;
    this.namespaces = [];

    this.dependencies = config.dependencies || [];
    this.context = {acqua: this};
    this.hotswap = config.hotswap;
  }

  getFromNamespace(namespace, name) {
    let dependency = this.get(name);
    for (let i = 0; i < this.dependencies.length && dependency === undefined; i += 1) {
      dependency = this.dependencies[i];
      if (dependency.namespace(namespace) !== undefined) {
        dependency = dependency.namespace(namespace).get(name);
      } else {
        dependency = dependency.get(name);
      }
    }
    return dependency;
  }

  get(name) {
    let dependency = this.context[name];
    if (dependency === undefined) {
      if (this.name !== undefined && this.parent !== undefined) {
        dependency = this.parent.getFromNamespace(this.name, name);
      }
      for (let i = 0; i < this.dependencies.length && dependency === undefined; i += 1) {
        dependency = this.dependencies[i].get(name);
      }
    }
    return dependency;
  }

  add(name, theModule) {
    if (this.context[name] !== undefined) {
      this.log(`Module with name: '${name}' already exists, overriding`.red);
    }
    this.context[name] = theModule;
  }

  exec(fn) {
    const dependencies = this.getDependencies(fn);
    return fn.apply({}, dependencies);
  }

  getDependencies(fn) {
    const params = this.getParamNames(fn),
        dependencies = [];

    _.forEach(params, param => {
      const dependency = this.get(param);
      if (dependency === undefined) {
        throw new DependencyError('Dependency module does not exist: ' + param);
      }
      dependencies.push(dependency);
    });

    return dependencies;
  }

  execModule($module, modulePath, silent) {
    const dependencies = this.getDependencies($module);
    if (_.isString(modulePath) && !silent) {
      this.log('Importing module: '.green + modulePath);
    }
    return $module.apply({}, dependencies);
  }

  importModule(modulePath, reload) {
    let result,
        $module = modulePath,
        name;

    if (_.isString($module)) {
      if (reload) {
        this.log('CHANGED: '.yellow + modulePath);
        delete require.cache[require.resolve($module)];
      }
      $module = require($module).default;
    }

    if (_.isFunction($module)) {
      name = this.getFunctionName($module);
      result = this.execModule($module, modulePath, reload);

      if (result && result.$init) {
        result.$init();
      }

      if (name === null) {
        this.log('└─ Not a named function, just executing the function, this module will not be added to the context'.yellow);
      } else if (!reload) {
        this.add(name, result);
      }
    } else {
      this.err('Module is not a function, ignoring');
    }

    return result;
  }

  loadDir(dir, importFunction) {
    let pendentModules = [],
        newPendentModules;

    this.internalLoadDir(dir, importFunction, pendentModules);

    do {
      newPendentModules = [];
      _.forEach(pendentModules, pendentModule => {
        this.internalLoadFile(pendentModule.directory, pendentModule.file, undefined, newPendentModules);
      });

      if (newPendentModules.length === pendentModules.length && newPendentModules.length > 0) {
        throw new DependencyError('Dependency Error on the Following Modules: (Might be a circular dependency) '
            + JSON.stringify(newPendentModules, null, 4), newPendentModules);
      }
      pendentModules = newPendentModules;
    } while (pendentModules.length > 0);
  }

  internalLoadDir(dir, importFunction, pendentModules) {
    fs.readdirSync(dir).filter(file => {
      return (file.indexOf('.') !== 0) && (file !== 'index.js');
    }).forEach(file => {
      this.internalLoadFile(dir, file, importFunction, pendentModules);
    });
  }

  loadFile(dir, file, importFunction) {
    this.internalLoadFile(dir, file, importFunction);
  }

  internalLoadFile(dir, file, importFunction, pendentModules) {
    const location = path.join(dir, file);
    if (file.indexOf('.js') < 0) {
      this.internalLoadDir(location, importFunction, pendentModules);
    } else {
      if (importFunction !== undefined && _.isFunction(importFunction)) {
        importFunction(location, this);
      } else {
        try {
          const fileModule = this.importModule(location);
          if (this.hotswap) {
            fs.watchFile(location, {persistent: true, interval: 100}, () => {
              this.fileChanged(location, fileModule);
            });
          }
        } catch (err) {
          if (err instanceof DependencyError && pendentModules !== undefined) {
            pendentModules.push({directory: dir, file: file, error: err.message});
          } else {
            throw err;
          }
        }
      }
    }
  }

  fileChanged(filepath, fileModule) {
    try {
      const newFileModule = this.importModule(filepath, true);

      // Will execute the function passing the old instance
      if (fileModule.$refresh) {
        newFileModule.$refresh(fileModule);
      }

      _.assign(fileModule, newFileModule);
      this.emitter.emit('change', {
        filepath: filepath,
        module: fileModule
      });
    } catch (err) {
      this.err(err);
      this.emitter.emit('changeerror', err);
    }
  }

  namespace(name) {
    return this.namespaces[name];
  }

  on(event, handler) {
    this.emitter.on(event, handler);
  }

  createNamespace(name) {
    const newNamespace = new Acqua({
      name: name,
      parent: this,
      log: this.log,
      err: this.err,
      hotswap: this.hotswap,
      emitter: this.emitter
    });

    this.namespaces[name] = newNamespace;

    return newNamespace;
  }

  getParamNames(func) {
    if (func.$inject) {
      return func.$inject;
    }

    const fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g);

    // single argument arrow function support
    if (/^[A-Za-z][A-Za-z0-9]* ?=> ?/.test(fnStr)) {
      result = [/^([A-Za-z][A-Za-z0-9]*) ?=> ?/.exec(fnStr)[1]];
    } else if (result === null) {
      result = [];
    }
    return result;
  }

  getFunctionName(func) {
    const array = /^function\s+([\w\$]+)\(/.exec(func.toString());
    return array === null ? null : array[1];
  }

}

module.exports = Acqua;