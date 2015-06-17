var chai   = require('chai'),
    expect = chai.expect,
    Acqua  = require(__dirname + "/../index"),
    path   = require('path');

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

    it('should import modules in any order', function () {

        var acqua = new Acqua();
        acqua.loadDir(path.join(__dirname, 'mocks'));

        var one = acqua.get('one'),
            two = acqua.get('two');

        expect(one).to.exist;
        expect(two).to.exist;
        expect(one).to.have.property('two').be.equal(two);

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

});