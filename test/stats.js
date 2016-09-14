var assert = require('assert'),
  fs = require('fs'),
  path = require('path'),
  read = fs.readFileSync,
  sassPath = process.env.NODESASS_COV
      ? require.resolve('../lib-cov')
      : require.resolve('../lib'),
  sass = require(sassPath),
  fixture = path.join.bind(null, __dirname, 'fixtures'),
  resolveFixture = path.resolve.bind(null, __dirname, 'fixtures');

describe('stats', function() {
  describe('.render({stats: {}})', function() {
    var start = Date.now();

    it('should provide a start timestamp', function(done) {
      sass.render({
        file: fixture('include-files/index.scss')
      }, function(error, result) {
        assert(!error);
        assert.strictEqual(typeof result.stats.start, 'number');
        assert(result.stats.start >= start);
        done();
      });
    });

    it('should provide an end timestamp', function(done) {
      sass.render({
        file: fixture('include-files/index.scss')
      }, function(error, result) {
        assert(!error);
        assert.strictEqual(typeof result.stats.end, 'number');
        assert(result.stats.end >= result.stats.start);
        done();
      });
    });

    it('should provide a duration', function(done) {
      sass.render({
        file: fixture('include-files/index.scss')
      }, function(error, result) {
        assert(!error);
        assert.strictEqual(typeof result.stats.duration, 'number');
        assert.equal(result.stats.end - result.stats.start, result.stats.duration);
        done();
      });
    });

    it('should contain the given entry file', function(done) {
      sass.render({
        file: fixture('include-files/index.scss')
      }, function(error, result) {
        assert(!error);
        assert.equal(result.stats.entry, fixture('include-files/index.scss'));
        done();
      });
    });

    it('should contain an array of all included files', function(done) {
      var expected = [
        fixture('include-files/bar.scss').replace(/\\/g, '/'),
        fixture('include-files/foo.scss').replace(/\\/g, '/'),
        fixture('include-files/index.scss').replace(/\\/g, '/')
      ];

      sass.render({
        file: fixture('include-files/index.scss')
      }, function(error, result) {
        assert(!error);
        assert.deepEqual(result.stats.includedFiles.sort(), expected.sort());
        done();
      });
    });

    it('should contain array with the entry if there are no import statements', function(done) {
      var expected = fixture('simple/index.scss').replace(/\\/g, '/');

      sass.render({
        file: fixture('simple/index.scss')
      }, function(error, result) {
        assert.deepEqual(result.stats.includedFiles, [expected]);
        done();
      });
    });

    it('should state `data` as entry file', function(done) {
      sass.render({
        data: read(fixture('simple/index.scss'), 'utf8')
      }, function(error, result) {
        assert.equal(result.stats.entry, 'data');
        done();
      });
    });

    it('should contain an empty array as includedFiles', function(done) {
      sass.render({
        data: read(fixture('simple/index.scss'), 'utf8')
      }, function(error, result) {
        assert.deepEqual(result.stats.includedFiles, []);
        done();
      });
    });
  });
  
  describe('.renderSync({stats: {}})', function() {
    var start = Date.now();
    var result = sass.renderSync({
      file: fixture('include-files/index.scss')
    });

    it('should provide a start timestamp', function(done) {
      assert.strictEqual(typeof result.stats.start, 'number');
      assert(result.stats.start >= start);
      done();
    });

    it('should provide an end timestamp', function(done) {
      assert.strictEqual(typeof result.stats.end, 'number');
      assert(result.stats.end >= result.stats.start);
      done();
    });

    it('should provide a duration', function(done) {
      assert.strictEqual(typeof result.stats.duration, 'number');
      assert.equal(result.stats.end - result.stats.start, result.stats.duration);
      done();
    });

    it('should contain the given entry file', function(done) {
      assert.equal(result.stats.entry, resolveFixture('include-files/index.scss'));
      done();
    });

    it('should contain an array of all included files', function(done) {
      var expected = [
        fixture('include-files/bar.scss').replace(/\\/g, '/'),
        fixture('include-files/foo.scss').replace(/\\/g, '/'),
        fixture('include-files/index.scss').replace(/\\/g, '/')
      ].sort();
      var actual = result.stats.includedFiles.sort();

      assert.equal(actual[0], expected[0]);
      assert.equal(actual[1], expected[1]);
      assert.equal(actual[2], expected[2]);
      done();
    });

    it('should contain array with the entry if there are no import statements', function(done) {
      var expected = fixture('simple/index.scss').replace(/\\/g, '/');

      var result = sass.renderSync({
        file: fixture('simple/index.scss')
      });

      assert.deepEqual(result.stats.includedFiles, [expected]);
      done();
    });

    it('should state `data` as entry file', function(done) {
      var result = sass.renderSync({
        data: read(fixture('simple/index.scss'), 'utf8')
      });

      assert.equal(result.stats.entry, 'data');
      done();
    });

    it('should contain an empty array as includedFiles', function(done) {
      var result = sass.renderSync({
        data: read(fixture('simple/index.scss'), 'utf8')
      });

      assert.deepEqual(result.stats.includedFiles, []);
      done();
    });
  });
});