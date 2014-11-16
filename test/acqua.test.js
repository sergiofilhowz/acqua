var chai   = require('chai'),
    expect = chai.expect,
    Acqua  = require(__dirname + "/../index");

describe('Tests on function Acqua', function () {

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

});