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

describe('.info', function() {
  var package = require('../package.json'),
    info = sass.info;

  it('should return a correct version info', function(done) {
    assert(info.indexOf(package.version) > 0);
    assert(info.indexOf('(Wrapper)') > 0);
    assert(info.indexOf('[JavaScript]') > 0);
    assert(info.indexOf('[NA]') < 0);
    assert(info.indexOf('(Sass Compiler)') > 0);
    assert(info.indexOf('[C/C++]') > 0);

    done();
  });
});
