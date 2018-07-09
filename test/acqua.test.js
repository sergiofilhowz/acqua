const { expect } = require('chai');
const path       = require('path');
const fs         = require('fs');
const { Acqua }  = require('../index');

describe('Acqua', function () {

    it('should have self reference', function () {
        var acqua = new Acqua();
        expect(acqua.get('acqua')).to.be.equal(acqua);
    });

    it('should import and inject modules correctly', function () {
        function a() {
            return this;
        }

        function b(a) {
            this.a = a;
            return this;
        }

        var acqua = new Acqua();
        acqua.importModule(a);
        acqua.importModule(b);

        expect(acqua.get('b').a).to.be.equal(acqua.get('a'));
    });

    it('should import and inject modules correctly with $inject', function () {
        function oneModule() {
            return this;
        }

        anotherModule.$inject = ['oneModule'];
        function anotherModule(a) {
            this.oneModule = a;
            return this;
        }

        var acqua = new Acqua();
        acqua.importModule(oneModule);
        acqua.importModule(anotherModule);

        expect(acqua.get('anotherModule').oneModule).to.be.equal(acqua.get('oneModule'));
    });

    it('should add an already imported module', function () {
        var acqua = new Acqua(),
            test  = { name : 'test' };

        acqua.add('test', test);
        expect(acqua.get('test').name).to.be.equal('test');
    });

    it('should get param names from functions correctly', function () {
        var acqua = new Acqua(),
            result;

        result = acqua.getParamNames(function(a,b,c){});
        expect(result).to.have.length(3);
        expect(result[0]).to.be.equal('a');
        expect(result[1]).to.be.equal('b');
        expect(result[2]).to.be.equal('c');
    });

    it('should retrieve function names', function () {
        function a() {}
        function b () {}
        var c = function () {};
        var d = function e() {};
        var f = function () { function g() {}};

        var acqua = new Acqua();

        expect(acqua.getFunctionName(a)).to.be.equal('a');
        expect(acqua.getFunctionName(b)).to.be.equal('b');
        expect(acqua.getFunctionName(c)).to.be.equal(null);
        expect(acqua.getFunctionName(d)).to.be.equal('e');
        expect(acqua.getFunctionName(f)).to.be.equal(null);
    });

    it('should inject dependencies correctly', function () {
        var acqua = new Acqua();

        acqua.add('one', 1);
        acqua.add('two', 2);
        acqua.add('three', 3);

        acqua.exec(function (one, two, three) {
            expect(one).to.be.equal(1);
            expect(two).to.be.equal(2);
            expect(three).to.be.equal(3);
        });
    });

    it('should inject dependencies correctly with arrow function', function () {
        var acqua = new Acqua();

        acqua.add('one', 1);
        acqua.add('two', 2);
        acqua.add('three', 3);

        acqua.exec((one, two, three) => {
            expect(one).to.be.equal(1);
            expect(two).to.be.equal(2);
            expect(three).to.be.equal(3);
        });

        acqua.exec(one => {
            expect(one + 1).to.be.equal(2);
        });

        acqua.exec(function (three) {
            expect(three).to.be.equal(3);
            var a = another => console.log(another);
        });

        acqua.exec(two => expect(two + 1).to.be.equal(3));
    });

    it('should inject dependencies correctly with arrow function', function () {
        var acqua = new Acqua();

        acqua.add('one', 1);
        acqua.add('two', 2);
        acqua.add('three', 3);

        acqua.exec((one, two, three) => {
            expect(one).to.be.equal(1);
            expect(two).to.be.equal(2);
            expect(three).to.be.equal(3);
        });

        acqua.exec(one => {
            expect(one).to.be.equal(1);
        });
    });

    it('should import modules in any order', function () {
        var acqua = new Acqua();
        acqua.loadDir(path.join(__dirname, 'mocks/test1'));

        var one = acqua.get('one'),
            two = acqua.get('two');

        expect(one).to.exist;
        expect(two).to.exist;
        expect(one).to.have.property('two').be.equal(two);
    });

    it('should import modules in any order, and show correct error', function () {
        var acqua = new Acqua(),
            error = false;

        try {
            acqua.loadDir(path.join(__dirname, 'mocks/test2'));
        } catch (err) {
            error = true;
            expect(err.modules).with.length(1);
            expect(err.modules[0]).to.have.property('error').be.equal('Dependency module does not exist: three');
        }

        expect(error).to.be.true;
    });

    it('should handle context dependencies', function () {
        var acqua = new Acqua();

        acqua.add('one', 1);
        acqua.add('two', 2);
        acqua.add('three', 3);

        var anotherAcqua = new Acqua({
            dependencies : [ acqua ]
        });

        anotherAcqua.exec(function (one, two, three) {
            expect(one).to.be.equal(1);
            expect(two).to.be.equal(2);
            expect(three).to.be.equal(3);
        });

        anotherAcqua.add('one', 'one');

        anotherAcqua.exec(function (one, two, three) {
            expect(one).to.be.equal('one');
            expect(two).to.be.equal(2);
            expect(three).to.be.equal(3);
        });

        acqua.exec(function (one, two, three) {
            expect(one).to.be.equal(1);
            expect(two).to.be.equal(2);
            expect(three).to.be.equal(3);
        });
    });

    it('should create a namespace', function () {
        var acqua = new Acqua(),
            namespace = acqua.createNamespace('aname');

        expect(namespace).to.have.property('name').equal('aname');
        expect(namespace).to.have.property('parent').equal(acqua);
        expect(acqua.namespace('aname')).to.exist.be.equal(namespace);
    });

    it('should work with namespaces', function () {
        var acqua = new Acqua(),
            core = acqua.createNamespace('core'),
            app = core.createNamespace('app'),
            one,
            two,
            three;

        acqua.add('one', 1);

        one = acqua.get('one');
        expect(one).to.be.equal(1);

        one = core.get('one');
        expect(one).to.be.equal(1);

        one = app.get('one');
        expect(one).to.be.equal(1);

        app.add('two', 2);

        two = acqua.get('two');
        expect(two).to.not.exist;

        two = core.get('two');
        expect(two).to.not.exist;

        two = app.get('two');
        expect(two).to.be.equal(2);

        core.add('three', 3);

        three = acqua.get('three');
        expect(three).to.not.exist;

        three = core.get('three');
        expect(three).to.be.equal(3);

        three = app.get('three');
        expect(three).to.be.equal(3);
    });

    it('should handle parent namespaces on subcontexts', function () {
        var acqua = new Acqua(),
            anotherAcqua = new Acqua({
                dependencies : [ acqua ]
            }),
            core = acqua.createNamespace('core'),
            anotherCore = anotherAcqua.createNamespace('core'),
            one,
            two;

        acqua.add('one', 1);

        one = acqua.get('one');
        expect(one).to.be.equal(1);

        one = anotherAcqua.get('one');
        expect(one).to.be.equal(1);

        one = anotherCore.get('one');
        expect(one).to.be.equal(1);

        core.add('two', 2);

        two = anotherCore.get('two');
        expect(two).to.be.equal(2);
    });

    it('should hot swap code', function(done) {
        this.timeout(10000);

        var acqua = new Acqua({
            hotswap : true
        });

        if (!fs.existsSync('tmp')) {
            fs.mkdirSync('tmp');
        }

        fs.writeFileSync('tmp/hotswap-test.js', `
            module.exports = function myModule() {
                this.amethod = amethod;
                this.avariable = 'a variable';

                function amethod() {
                    return 'something';
                }

                return this;
            }
        `);

        acqua.loadDir(path.join(__dirname, '..', 'tmp'));
        var myModule = acqua.get('myModule');

        expect(myModule.avariable).to.equal('a variable');
        expect(myModule.amethod()).to.equal('something');

        acqua.emitter.once('change', moduleData => {
            expect(myModule.avariable).to.equal('another variable');
            expect(myModule.amethod()).to.equal('something else');
            expect(myModule.anothermethod).to.be.defined;

            expect(moduleData).to.have.property('filepath').equal(path.join(__dirname, '..', 'tmp', 'hotswap-test.js'));
            expect(moduleData).to.have.property('module').equal(myModule);

            acqua.emitter.once('change', () => {
                expect(myModule.avariable).to.equal('a variable');
                expect(myModule.amethod()).to.equal('something');
                expect(myModule.anothermethod).to.be.defined;
                done();
            });

            fs.writeFileSync('tmp/hotswap-test.js', `
                module.exports = function myModule() {
                    this.amethod = amethod;
                    this.avariable = 'a variable';

                    function amethod() {
                        return 'something';
                    }

                    return this;
                }
            `);
        });

        fs.writeFileSync('tmp/hotswap-test.js', `
            module.exports = function myModule() {
                this.amethod = amethod;
                this.anothermethod = anothermethod;
                this.avariable = 'another variable';

                function amethod() {
                    return 'something else';
                }

                function anothermethod() {
                    return 'another method returned value';
                }

                return this;
            }
        `);
    });

    it('should hot swap code with error', function(done) {
        this.timeout(5000);

        var acqua = new Acqua({
            hotswap : true
        });

        if (!fs.existsSync('tmp')) {
            fs.mkdirSync('tmp');
        }

        fs.writeFileSync('tmp/hotswap-test.js', `
            module.exports = function myModule() {
                this.amethod = amethod;
                this.avariable = 'a variable';

                function amethod() {
                    return 'something';
                }

                return this;
            }
        `);

        acqua.loadDir(path.join(__dirname, '..', 'tmp'));
        var myModule = acqua.get('myModule');

        expect(myModule.avariable).to.equal('a variable');
        expect(myModule.amethod()).to.equal('something');

        acqua.emitter.once('changeerror', () => {
            done();
        });

        fs.writeFileSync('tmp/hotswap-test.js', `
            module.exports = function myModule() {
                [ // should throw syntax error
            }
        `);
    });

});