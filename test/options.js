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

describe('.render(options, callback)', function() {

  beforeEach(function() {
    delete process.env.SASS_PATH;
  });

  it('should compile sass to css with outFile set to absolute url', function(done) {
    sass.render({
      file: fixture('simple/index.scss'),
      sourceMap: true,
      outFile: fixture('simple/index-test.css')
    }, function(error, result) {
      assert.equal(JSON.parse(result.map).file, 'index-test.css');
      done();
    });
  });

  it('should compile sass to css with outFile set to relative url', function(done) {
    sass.render({
      file: fixture('simple/index.scss'),
      sourceMap: true,
      outFile: './index-test.css'
    }, function(error, result) {
      assert.equal(JSON.parse(result.map).file, 'index-test.css');
      done();
    });
  });

  it('should compile sass to css with outFile and sourceMap set to relative url', function(done) {
    sass.render({
      file: fixture('simple/index.scss'),
      sourceMap: './deep/nested/index.map',
      outFile: './index-test.css'
    }, function(error, result) {
      assert.equal(JSON.parse(result.map).file, '../../index-test.css');
      done();
    });
  });

  it('should compile generate map with sourceMapRoot pass-through option', function(done) {
    sass.render({
      file: fixture('simple/index.scss'),
      sourceMap: './deep/nested/index.map',
      sourceMapRoot: 'http://test.com/',
      outFile: './index-test.css'
    }, function(error, result) {
      assert.equal(JSON.parse(result.map).sourceRoot, 'http://test.com/');
      done();
    });
  });

  it('should compile sass to css with data', function(done) {
    var src = read(fixture('simple/index.scss'), 'utf8');
    var expected = read(fixture('simple/expected.css'), 'utf8').trim();

    sass.render({
      data: src
    }, function(error, result) {
      assert.equal(result.css.toString().trim(), expected.replace(/\r\n/g, '\n'));
      done();
    });
  });

  it('should NOT compile empty data string', function(done) {
    sass.render({
      data: ''
    }, function(error) {
      assert.equal(error.message, 'No input specified: provide a file name or a source string to process');
      done();
    });
  });

  it('should NOT compile without parameters', function(done) {
    sass.render({ }, function(error) {
      assert.equal(error.message, 'No input specified: provide a file name or a source string to process');
      done();
    });
  });

  it('should throw error status 1 for bad input', function(done) {
    sass.render({
      data: '#navbar width 80%;'
    }, function(error) {
      assert(error.message);
      assert.equal(error.status, 1);
      done();
    });
  });

  it('should compile with include paths', function(done) {
    var src = read(fixture('include-path/index.scss'), 'utf8');
    var expected = read(fixture('include-path/expected.css'), 'utf8').trim();

    sass.render({
      data: src,
      includePaths: [
        fixture('include-path/functions'),
        fixture('include-path/lib')
      ]
    }, function(error, result) {
      assert.equal(result.css.toString().trim(), expected.replace(/\r\n/g, '\n'));
      done();
    });
  });

  it('should check SASS_PATH in the specified order', function(done) {
    var src = read(fixture('sass-path/index.scss'), 'utf8');
    var expectedRed = read(fixture('sass-path/expected-red.css'), 'utf8').trim();
    var expectedOrange = read(fixture('sass-path/expected-orange.css'), 'utf8').trim();

    var envIncludes = [
      fixture('sass-path/red'),
      fixture('sass-path/orange')
    ];

    process.env.SASS_PATH = envIncludes.join(path.delimiter);
    sass.render({
      data: src,
      includePaths: []
    }, function(error, result) {
      assert.equal(result.css.toString().trim(), expectedRed.replace(/\r\n/g, '\n'));
    });

    process.env.SASS_PATH = envIncludes.reverse().join(path.delimiter);
    sass.render({
      data: src,
      includePaths: []
    }, function(error, result) {
      assert.equal(result.css.toString().trim(), expectedOrange.replace(/\r\n/g, '\n'));
      done();
    });
  });

  it('should prefer include path over SASS_PATH', function(done) {
    var src = read(fixture('sass-path/index.scss'), 'utf8');
    var expectedRed = read(fixture('sass-path/expected-red.css'), 'utf8').trim();
    var expectedOrange = read(fixture('sass-path/expected-orange.css'), 'utf8').trim();

    var envIncludes = [
      fixture('sass-path/red')
    ];
    process.env.SASS_PATH = envIncludes.join(path.delimiter);

    sass.render({
      data: src,
      includePaths: []
    }, function(error, result) {
      assert.equal(result.css.toString().trim(), expectedRed.replace(/\r\n/g, '\n'));
    });
    sass.render({
      data: src,
      includePaths: [fixture('sass-path/orange')]
    }, function(error, result) {
      assert.equal(result.css.toString().trim(), expectedOrange.replace(/\r\n/g, '\n'));
      done();
    });
  });

  it('should contain all included files in stats when data is passed', function(done) {
    var src = read(fixture('include-files/index.scss'), 'utf8');
    var expected = [
      fixture('include-files/bar.scss').replace(/\\/g, '/'),
      fixture('include-files/foo.scss').replace(/\\/g, '/')
    ];

    sass.render({
      data: src,
      includePaths: [fixture('include-files')]
    }, function(error, result) {
      assert.deepEqual(result.stats.includedFiles, expected);
      done();
    });
  });

  it('should render with indentWidth and indentType options', function(done) {
    sass.render({
      data: 'div { color: transparent; }',
      indentWidth: 7,
      indentType: 'tab'
    }, function(error, result) {
      assert.equal(result.css.toString().trim(), 'div {\n\t\t\t\t\t\t\tcolor: transparent; }');
      done();
    });
  });

  it('should render with linefeed option', function(done) {
    sass.render({
      data: 'div { color: transparent; }',
      linefeed: 'lfcr'
    }, function(error, result) {
      assert.equal(result.css.toString().trim(), 'div {\n\r  color: transparent; }');
      done();
    });
  });
});

describe('.renderSync(options)', function() {
  it('should compile sass to css with outFile set to absolute url', function(done) {
    var result = sass.renderSync({
      file: fixture('simple/index.scss'),
      sourceMap: true,
      outFile: fixture('simple/index-test.css')
    });

    assert.equal(JSON.parse(result.map).file, 'index-test.css');
    done();
  });

  it('should compile sass to css with outFile set to relative url', function(done) {
    var result = sass.renderSync({
      file: fixture('simple/index.scss'),
      sourceMap: true,
      outFile: './index-test.css'
    });

    assert.equal(JSON.parse(result.map).file, 'index-test.css');
    done();
  });

  it('should compile sass to css with outFile and sourceMap set to relative url', function(done) {
    var result = sass.renderSync({
      file: fixture('simple/index.scss'),
      sourceMap: './deep/nested/index.map',
      outFile: './index-test.css'
    });

    assert.equal(JSON.parse(result.map).file, '../../index-test.css');
    done();
  });

  it('should compile generate map with sourceMapRoot pass-through option', function(done) {
    var result = sass.renderSync({
      file: fixture('simple/index.scss'),
      sourceMap: './deep/nested/index.map',
      sourceMapRoot: 'http://test.com/',
      outFile: './index-test.css'
    });

    assert.equal(JSON.parse(result.map).sourceRoot, 'http://test.com/');
    done();
  });

  it('should compile sass to css with data', function(done) {
    var src = read(fixture('simple/index.scss'), 'utf8');
    var expected = read(fixture('simple/expected.css'), 'utf8').trim();
    var result = sass.renderSync({ data: src });

    assert.equal(result.css.toString().trim(), expected.replace(/\r\n/g, '\n'));
    done();
  });

  it('should NOT compile empty data string', function(done) {
    assert.throws(function() {
      sass.renderSync({ data: '' });
    }, /No input specified: provide a file name or a source string to process/ );
    done();
  });

  it('should NOT compile without any input', function(done) {
    assert.throws(function() {
      sass.renderSync({});
    }, /No input specified: provide a file name or a source string to process/);
    done();
  });

  it('should throw error for bad input', function(done) {
    assert.throws(function() {
      sass.renderSync('somestring');
    });
    assert.throws(function() {
      sass.renderSync({ data: '#navbar width 80%;' });
    });

    done();
  });
});