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

describe('bindings', function() {
  beforeEach(function() {
    delete require.cache[sassPath];
  });

  afterEach(function() {
    delete require.cache[sassPath];
  });

  describe('missing error', function() {
    beforeEach(function() {
      process.env.SASS_BINARY_NAME = [
        (process.platform === 'win32' ? 'Linux' : 'Windows'), '-',
        process.arch, '-',
        process.versions.modules
      ].join('');
    });

    afterEach(function() {
      delete process.env.SASS_BINARY_NAME;
    });

    it('should be useful', function() {
      assert.throws(
        function() { require(sassPath); },
        new RegExp('Missing binding.*?\\' + path.sep + 'vendor\\' + path.sep)
      );
    });

    it('should list currently installed bindings', function() {
      assert.throws(
        function() { require(sassPath); },
        function(err) {
          var etx = require('../lib/extensions');

          delete process.env.SASS_BINARY_NAME;

          if ((err instanceof Error)) {
            return err.message.indexOf(
              etx.getHumanEnvironment(etx.getBinaryName())
            ) !== -1;
          }
        }
      );
    });
  });

  describe('on unsupported environment', function() {
    describe('with an unsupported architecture', function() {
      var prevValue;

      beforeEach(function() {
        prevValue = process.arch;

        Object.defineProperty(process, 'arch', {
          get: function () { return 'foo'; }
        });
      });

      afterEach(function() {
        process.arch = prevValue;
      });

      it('should error', function() {
        assert.throws(
          function() { require(sassPath); },
          'Node Sass does not yet support your current environment'
        );
      });

      it('should inform the user the architecture is unsupported', function() {
        assert.throws(
          function() { require(sassPath); },
          'Unsupported architecture (foo)'
        );
      });
    });

    describe('with an unsupported platform', function() {
      var prevValue;

      beforeEach(function() {
        prevValue = process.platform;

        Object.defineProperty(process, 'platform', {
          get: function () { return 'bar'; }
        });
      });

      afterEach(function() {
        process.platform = prevValue;
      });

      it('should error', function() {
        assert.throws(
          function() { require(sassPath); },
          'Node Sass does not yet support your current environment'
        );
      });

      it('should inform the user the platform is unsupported', function() {
        assert.throws(
          function() { require(sassPath); },
          'Unsupported platform (bar)'
        );
      });
    });

    describe('with an unsupported platform', function() {
      var prevValue;

      beforeEach(function() {
        prevValue = process.versions.modules;

        Object.defineProperty(process.versions, 'modules', {
          get: function () { return 'baz'; }
        });
      });

      afterEach(function() {
        process.versions.modules = prevValue;
      });

      it('should error', function() {
        assert.throws(
          function() { require(sassPath); },
          'Node Sass does not yet support your current environment'
        );
      });

      it('should inform the user the runtime is unsupported', function() {
        assert.throws(
          function() { require(sassPath); },
          'Unsupported runtime (baz)'
        );
      });
    });
  });
});