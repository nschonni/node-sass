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

describe('importer', function() {
  beforeEach(function() {
    delete require.cache[sassPath];
  });

  afterEach(function() {
    delete require.cache[sassPath];
  });

  describe('.render(importer)', function() {
    var src = read(fixture('include-files/index.scss'), 'utf8');

    it('should respect the order of chained imports when using custom importers and one file is custom imported and the other is not.', function(done) {
      sass.render({
        file: fixture('include-files/chained-imports-with-custom-importer.scss'),
        importer: function(url, prev, done) {
          // NOTE: to see that this test failure is only due to the stated
          // issue do each of the following and see that the tests pass.
          //
          //   a) add `return sass.NULL;` as the first line in this function to
          //      cause non-custom importers to always be used.
          //   b) comment out the conditional below to force our custom
          //      importer to always be used.
          //
          //  You will notice that the tests pass when either all native, or
          //  all custom importers are used, but not when a native + custom
          //  import chain is used.
          if (url !== 'file-processed-by-loader') {
            return sass.NULL;
          }
          done({
            file: fixture('include-files/' + url + '.scss')
          });
        }
      }, function(err, data) {
        assert.equal(err, null);

        assert.equal(
          data.css.toString().trim(),
          'body {\n  color: "red"; }'
        );

        done();
      });
    });

    it('should still call the next importer with the resolved prev path when the previous importer returned both a file and contents property - issue #1219', function(done) {
      sass.render({
        data: '@import "a";',
        importer: function(url, prev, done) {
          if (url === 'a') {
            done({
              file: '/Users/me/sass/lib/a.scss',
              contents: '@import "b"'
            });
          } else {
            console.log(prev);
            assert.equal(prev, '/Users/me/sass/lib/a.scss');
            done({
              file: '/Users/me/sass/lib/b.scss',
              contents: 'div {color: yellow;}'
            });
          }
        }
      }, function() {
        done();
      });
    });

    it('should override imports with "data" as input and fires callback with file and contents', function(done) {
      sass.render({
        data: src,
        importer: function(url, prev, done) {
          done({
            file: '/some/other/path.scss',
            contents: 'div {color: yellow;}'
          });
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should should resolve imports depth first', function (done) {
      var actualImportOrder = [];
      var expectedImportOrder = [
        'a', '_common', 'vars', 'struct', 'a1', 'common', 'vars', 'struct', 'b', 'b1'
      ];
      var expected = read(fixture('depth-first/expected.css'));

      sass.render({
        file: fixture('depth-first/index.scss'),
        importer: function (url, prev, done) {
          actualImportOrder.push(url);
          done();
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), expected);
        assert.deepEqual(actualImportOrder, expectedImportOrder);
        done();
      });
    });

    it('should override imports with "file" as input and fires callback with file and contents', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev, done) {
          done({
            file: '/some/other/path.scss',
            contents: 'div {color: yellow;}'
          });
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should override imports with "data" as input and returns file and contents', function(done) {
      sass.render({
        data: src,
        importer: function(url, prev) {
          return {
            file: prev + url,
            contents: 'div {color: yellow;}'
          };
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should override imports with "file" as input and returns file and contents', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev) {
          return {
            file: prev + url,
            contents: 'div {color: yellow;}'
          };
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should override imports with "data" as input and fires callback with file', function(done) {
      sass.render({
        data: src,
        importer: function(url, /* jshint unused:false */ prev, done) {
          done({
            file: path.resolve(path.dirname(fixture('include-files/index.scss')), url + (path.extname(url) ? '' : '.scss'))
          });
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
        done();
      });
    });

    it('should override imports with "file" as input and fires callback with file', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev, done) {
          done({
            file: path.resolve(path.dirname(prev), url + (path.extname(url) ? '' : '.scss'))
          });
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
        done();
      });
    });

    it('should override imports with "data" as input and returns file', function(done) {
      sass.render({
        data: src,
        importer: function(url) {
          return {
            file: path.resolve(path.dirname(fixture('include-files/index.scss')), url + (path.extname(url) ? '' : '.scss'))
          };
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
        done();
      });
    });

    it('should override imports with "file" as input and returns file', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev) {
          return {
            file: path.resolve(path.dirname(prev), url + (path.extname(url) ? '' : '.scss'))
          };
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
        done();
      });
    });

    it('should fallback to default import behaviour if importer returns sass.NULL', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev, done) {
          done(sass.NULL);
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
        done();
      });
    });

    it('should fallback to default import behaviour if importer returns null for backwards compatibility', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev, done) {
          done(null);
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
        done();
      });
    });

    it('should fallback to default import behaviour if importer returns undefined for backwards compatibility', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev, done) {
          done(undefined);
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
        done();
      });
    });

    it('should fallback to default import behaviour if importer returns false for backwards compatibility', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev, done) {
          done(false);
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
        done();
      });
    });

    it('should override imports with "data" as input and fires callback with contents', function(done) {
      sass.render({
        data: src,
        importer: function(url, prev, done) {
          done({
            contents: 'div {color: yellow;}'
          });
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should override imports with "file" as input and fires callback with contents', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev, done) {
          done({
            contents: 'div {color: yellow;}'
          });
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should override imports with "data" as input and returns contents', function(done) {
      sass.render({
        data: src,
        importer: function() {
          return {
            contents: 'div {color: yellow;}'
          };
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should override imports with "file" as input and returns contents', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: function() {
          return {
            contents: 'div {color: yellow;}'
          };
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should accept arrays of importers and return respect the order', function(done) {
      sass.render({
        file: fixture('include-files/index.scss'),
        importer: [
          function() {
            return sass.NULL;
          },
          function() {
            return {
              contents: 'div {color: yellow;}'
            };
          }
        ]
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
        done();
      });
    });

    it('should be able to see its options in this.options', function(done) {
      var fxt = fixture('include-files/index.scss');
      sass.render({
        file: fxt,
        importer: function() {
          assert.equal(fxt, this.options.file);
          return {};
        }
      }, function() {
        assert.equal(fxt, this.options.file);
        done();
      });
    });

    it('should be able to access a persistent options object', function(done) {
      sass.render({
        data: src,
        importer: function() {
          this.state = this.state || 0;
          this.state++;
          return {
            contents: 'div {color: yellow;}'
          };
        }
      }, function() {
        assert.equal(this.state, 2);
        done();
      });
    });

    it('should wrap importer options', function(done) {
      var options;
      options = {
        data: src,
        importer: function() {
          assert.notStrictEqual(this.options.importer, options.importer);
          return {
            contents: 'div {color: yellow;}'
          };
        }
      };
      sass.render(options, function() {
        done();
      });
    });

    it('should reflect user-defined error when returned as callback', function(done) {
      sass.render({
        data: src,
        importer: function(url, prev, done) {
          done(new Error('doesn\'t exist!'));
        }
      }, function(error) {
        assert(/doesn\'t exist!/.test(error.message));
        done();
      });
    });

    it('should reflect user-defined error with return', function(done) {
      sass.render({
        data: src,
        importer: function() {
          return new Error('doesn\'t exist!');
        }
      }, function(error) {
        assert(/doesn\'t exist!/.test(error.message));
        done();
      });
    });

    it('should throw exception when importer returns an invalid value', function(done) {
      sass.render({
        data: src,
        importer: function() {
          return { contents: new Buffer('i am not a string!') };
        }
      }, function(error) {
        assert(/returned value of `contents` must be a string/.test(error.message));
        done();
      });
    });
  });
  
  describe('.renderSync(importer)', function() {
    var src = read(fixture('include-files/index.scss'), 'utf8');

    it('should override imports with "data" as input and returns file and contents', function(done) {
      var result = sass.renderSync({
        data: src,
        importer: function(url, prev) {
          return {
            file: prev + url,
            contents: 'div {color: yellow;}'
          };
        }
      });

      assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
      done();
    });

    it('should override imports with "file" as input and returns file and contents', function(done) {
      var result = sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev) {
          return {
            file: prev + url,
            contents: 'div {color: yellow;}'
          };
        }
      });

      assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
      done();
    });

    it('should override imports with "data" as input and returns file', function(done) {
      var result = sass.renderSync({
        data: src,
        importer: function(url) {
          return {
            file: path.resolve(path.dirname(fixture('include-files/index.scss')), url + (path.extname(url) ? '' : '.scss'))
          };
        }
      });

      assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
      done();
    });

    it('should override imports with "file" as input and returns file', function(done) {
      var result = sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: function(url, prev) {
          return {
            file: path.resolve(path.dirname(prev), url + (path.extname(url) ? '' : '.scss'))
          };
        }
      });

      assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
      done();
    });

    it('should override imports with "data" as input and returns contents', function(done) {
      var result = sass.renderSync({
        data: src,
        importer: function() {
          return {
            contents: 'div {color: yellow;}'
          };
        }
      });

      assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
      done();
    });

    it('should override imports with "file" as input and returns contents', function(done) {
      var result = sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: function() {
          return {
            contents: 'div {color: yellow;}'
          };
        }
      });

      assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
      done();
    });



    it('should fallback to default import behaviour if importer returns sass.NULL', function(done) {
      var result = sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: function() {
          return sass.NULL;
        }
      });

      assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
      done();
    });

    it('should fallback to default import behaviour if importer returns null for backwards compatibility', function(done) {
      var result = sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: function() {
          return null;
        }
      });

      assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
      done();
    });

    it('should fallback to default import behaviour if importer returns undefined for backwards compatibility', function(done) {
      var result = sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: function() {
          return undefined;
        }
      });

      assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
      done();
    });

    it('should fallback to default import behaviour if importer returns false for backwards compatibility', function(done) {
      var result = sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: function() {
          return false;
        }
      });

      assert.equal(result.css.toString().trim(), '/* foo.scss */\n/* bar.scss */');
      done();
    });

    it('should accept arrays of importers and return respect the order', function(done) {
      var result = sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: [
          function() {
            return sass.NULL;
          },
          function() {
            return {
              contents: 'div {color: yellow;}'
            };
          }
        ]
      });

      assert.equal(result.css.toString().trim(), 'div {\n  color: yellow; }\n\ndiv {\n  color: yellow; }');
      done();
    });

    it('should be able to see its options in this.options', function(done) {
      var fxt = fixture('include-files/index.scss');
      var sync = false;
      sass.renderSync({
        file: fixture('include-files/index.scss'),
        importer: function() {
          assert.equal(fxt, this.options.file);
          sync = true;
          return {};
        }
      });
      assert.equal(sync, true);
      done();
    });

    it('should throw user-defined error', function(done) {
      assert.throws(function() {
        sass.renderSync({
          data: src,
          importer: function() {
            return new Error('doesn\'t exist!');
          }
        });
      }, /doesn\'t exist!/);

      done();
    });

    it('should throw exception when importer returns an invalid value', function(done) {
      assert.throws(function() {
        sass.renderSync({
          data: src,
          importer: function() {
            return { contents: new Buffer('i am not a string!') };
          }
        });
      }, /returned value of `contents` must be a string/);

      done();
    });
  });
});