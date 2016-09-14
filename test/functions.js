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

describe('functions', function() {
  beforeEach(function() {
    delete require.cache[sassPath];
  });

  afterEach(function() {
    delete require.cache[sassPath];
  });

  describe('.render(functions)', function() {
    it('should call custom defined nullary function', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            return new sass.types.Number(42, 'px');
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: 42px; }');
        done();
      });
    });

    it('should call custom function with multiple args', function(done) {
      sass.render({
        data: 'div { color: foo(3, 42px); }',
        functions: {
          'foo($a, $b)': function(factor, size) {
            return new sass.types.Number(factor.getValue() * size.getValue(), size.getUnit());
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: 126px; }');
        done();
      });
    });

    it('should work with custom functions that return data asynchronously', function(done) {
      sass.render({
        data: 'div { color: foo(42px); }',
        functions: {
          'foo($a)': function(size, done) {
            setTimeout(function() {
              done(new sass.types.Number(66, 'em'));
            }, 50);
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: 66em; }');
        done();
      });
    });

    it('should let custom functions call setter methods on wrapped sass values (number)', function(done) {
      sass.render({
        data: 'div { width: foo(42px); height: bar(42px); }',
        functions: {
          'foo($a)': function(size) {
            size.setUnit('rem');
            return size;
          },
          'bar($a)': function(size) {
            size.setValue(size.getValue() * 2);
            return size;
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  width: 42rem;\n  height: 84px; }');
        done();
      });
    });

    it('should properly convert strings when calling custom functions', function(done) {
      sass.render({
        data: 'div { color: foo("bar"); }',
        functions: {
          'foo($a)': function(str) {
            str = str.getValue().replace(/['"]/g, '');
            return new sass.types.String('"' + str + str + '"');
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: "barbar"; }');
        done();
      });
    });

    it('should let custom functions call setter methods on wrapped sass values (string)', function(done) {
      sass.render({
        data: 'div { width: foo("bar"); }',
        functions: {
          'foo($a)': function(str) {
            var unquoted = str.getValue().replace(/['"]/g, '');
            str.setValue('"' + unquoted + unquoted + '"');
            return str;
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  width: "barbar"; }');
        done();
      });
    });

    it('should properly convert colors when calling custom functions', function(done) {
      sass.render({
        data: 'div { color: foo(#f00); background-color: bar(); border-color: baz(); }',
        functions: {
          'foo($a)': function(color) {
            assert.equal(color.getR(), 255);
            assert.equal(color.getG(), 0);
            assert.equal(color.getB(), 0);
            assert.equal(color.getA(), 1.0);

            return new sass.types.Color(255, 255, 0, 0.5);
          },
          'bar()': function() {
            return new sass.types.Color(0x33ff00ff);
          },
          'baz()': function() {
            return new sass.types.Color(0xffff0000);
          }
        }
      }, function(error, result) {
        assert.equal(
          result.css.toString().trim(),
          'div {\n  color: rgba(255, 255, 0, 0.5);' +
          '\n  background-color: rgba(255, 0, 255, 0.2);' +
          '\n  border-color: red; }'
        );
        done();
      });
    });

    it('should properly convert boolean when calling custom functions', function(done) {
      sass.render({
        data: 'div { color: if(foo(true, false), #fff, #000);' +
          '\n  background-color: if(foo(true, true), #fff, #000); }',
        functions: {
          'foo($a, $b)': function(a, b) {
            return sass.types.Boolean(a.getValue() && b.getValue());
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: #000;\n  background-color: #fff; }');
        done();
      });
    });

    it('should let custom functions call setter methods on wrapped sass values (boolean)', function(done) {
      sass.render({
        data: 'div { color: if(foo(false), #fff, #000); background-color: if(foo(true), #fff, #000); }',
        functions: {
          'foo($a)': function(a) {
            return a.getValue() ? sass.types.Boolean.FALSE : sass.types.Boolean.TRUE;
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: #fff;\n  background-color: #000; }');
        done();
      });
    });

    it('should properly convert lists when calling custom functions', function(done) {
      sass.render({
        data: '$test-list: (bar, #f00, 123em); @each $item in foo($test-list) { .#{$item} { color: #fff; } }',
        functions: {
          'foo($l)': function(list) {
            assert.equal(list.getLength(), 3);
            assert.ok(list.getValue(0) instanceof sass.types.String);
            assert.equal(list.getValue(0).getValue(), 'bar');
            assert.ok(list.getValue(1) instanceof sass.types.Color);
            assert.equal(list.getValue(1).getR(), 0xff);
            assert.equal(list.getValue(1).getG(), 0);
            assert.equal(list.getValue(1).getB(), 0);
            assert.ok(list.getValue(2) instanceof sass.types.Number);
            assert.equal(list.getValue(2).getValue(), 123);
            assert.equal(list.getValue(2).getUnit(), 'em');

            var out = new sass.types.List(3);
            out.setValue(0, new sass.types.String('foo'));
            out.setValue(1, new sass.types.String('bar'));
            out.setValue(2, new sass.types.String('baz'));
            return out;
          }
        }
      }, function(error, result) {
        assert.equal(
          result.css.toString().trim(),
          '.foo {\n  color: #fff; }\n\n.bar {\n  color: #fff; }\n\n.baz {\n  color: #fff; }'
        );
        done();
      });
    });

    it('should properly convert maps when calling custom functions', function(done) {
      sass.render({
        data: '$test-map: foo((abc: 123, #def: true)); div { color: if(map-has-key($test-map, hello), #fff, #000); }' +
          'span { color: map-get($test-map, baz); }',
        functions: {
          'foo($m)': function(map) {
            assert.equal(map.getLength(), 2);
            assert.ok(map.getKey(0) instanceof sass.types.String);
            assert.ok(map.getKey(1) instanceof sass.types.Color);
            assert.ok(map.getValue(0) instanceof sass.types.Number);
            assert.ok(map.getValue(1) instanceof sass.types.Boolean);
            assert.equal(map.getKey(0).getValue(), 'abc');
            assert.equal(map.getValue(0).getValue(), 123);
            assert.equal(map.getKey(1).getR(), 0xdd);
            assert.equal(map.getValue(1).getValue(), true);

            var out = new sass.types.Map(3);
            out.setKey(0, new sass.types.String('hello'));
            out.setValue(0, new sass.types.String('world'));
            out.setKey(1, new sass.types.String('foo'));
            out.setValue(1, new sass.types.String('bar'));
            out.setKey(2, new sass.types.String('baz'));
            out.setValue(2, new sass.types.String('qux'));
            return out;
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: #fff; }\n\nspan {\n  color: qux; }');
        done();
      });
    });

    it('should properly convert null when calling custom functions', function(done) {
      sass.render({
        data: 'div { color: if(foo("bar"), #fff, #000); } ' +
          'span { color: if(foo(null), #fff, #000); }' +
          'table { color: if(bar() == null, #fff, #000); }',
        functions: {
          'foo($a)': function(a) {
            return sass.types.Boolean(a instanceof sass.types.Null);
          },
          'bar()': function() {
            return sass.NULL;
          }
        }
      }, function(error, result) {
        assert.equal(
          result.css.toString().trim(),
          'div {\n  color: #000; }\n\nspan {\n  color: #fff; }\n\ntable {\n  color: #fff; }'
        );
        done();
      });
    });

    it('should be possible to carry sass values across different renders', function(done) {
      var persistentMap;

      sass.render({
        data: 'div { color: foo((abc: #112233, #ddeeff: true)); }',
        functions: {
          foo: function(m) {
            persistentMap = m;
            return sass.types.Color(0, 0, 0);
          }
        }
      }, function() {
        sass.render({
          data: 'div { color: map-get(bar(), abc); background-color: baz(); }',
          functions: {
            bar: function() {
              return persistentMap;
            },
            baz: function() {
              return persistentMap.getKey(1);
            }
          }
        }, function(errror, result) {
          assert.equal(result.css.toString().trim(), 'div {\n  color: #112233;\n  background-color: #ddeeff; }');
          done();
        });
      });
    });

    it('should let us register custom functions without signatures', function(done) {
      sass.render({
        data: 'div { color: foo(20, 22); }',
        functions: {
          foo: function(a, b) {
            return new sass.types.Number(a.getValue() + b.getValue(), 'em');
          }
        }
      }, function(error, result) {
        assert.equal(result.css.toString().trim(), 'div {\n  color: 42em; }');
        done();
      });
    });

    it('should fail when returning anything other than a sass value from a custom function', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            return {};
          }
        }
      }, function(error) {
        assert.ok(/A SassValue object was expected/.test(error.message));
        done();
      });
    });

    it('should properly bubble up standard JS errors thrown by custom functions', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            throw new RangeError('This is a test error');
          }
        }
      }, function(error) {
        assert.ok(/This is a test error/.test(error.message));
        done();
      });
    });

    it('should properly bubble up unknown errors thrown by custom functions', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            throw {};
          }
        }
      }, function(error) {
        assert.ok(/unexpected error/.test(error.message));
        done();
      });
    });

    it('should call custom functions with correct context', function(done) {
      function assertExpected(result) {
        assert.equal(result.css.toString().trim(), 'div {\n  foo1: 1;\n  foo2: 2; }');
      }
      var options = {
        data: 'div { foo1: foo(); foo2: foo(); }',
        functions: {
          // foo() is stateful and will persist an incrementing counter
          'foo()': function() {
            assert(this);
            this.fooCounter = (this.fooCounter || 0) + 1;
            return new sass.types.Number(this.fooCounter);
          }
        }
      };

      sass.render(options, function(error, result) {
        assertExpected(result);
        done();
      });
    });

    describe('should properly bubble up errors from sass color constructor', function() {
      it('four booleans', function(done) {
        sass.render({
          data: 'div { color: foo(); }',
          functions: {
            'foo()': function() {
              return new sass.types.Color(false, false, false, false);
            }
          }
        }, function(error) {
          assert.ok(/Constructor arguments should be numbers exclusively/.test(error.message));
          done();
        });
      });

      it('two arguments', function(done) {
        sass.render({
          data: 'div { color: foo(); }',
          functions: {
            'foo()': function() {
              return sass.types.Color(2,3);
            }
          }
        }, function(error) {
          assert.ok(/Constructor should be invoked with either 0, 1, 3 or 4 arguments/.test(error.message));
          done();
        });
      });

      it('single string argument', function(done) {
        sass.render({
          data: 'div { color: foo(); }',
          functions: {
            'foo()': function() {
              return sass.types.Color('foo');
            }
          }
        }, function(error) {
          assert.ok(/Only argument should be an integer/.test(error.message));
          done();
        });
      });
    });

    it('should properly bubble up errors from sass value constructors', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            return sass.types.Boolean('foo');
          }
        }
      }, function(error) {
        assert.ok(/Expected one boolean argument/.test(error.message));
        done();
      });
    });

    it('should properly bubble up errors from sass value setters', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            var ret = new sass.types.Number(42);
            ret.setUnit(123);
            return ret;
          }
        }
      }, function(error) {
        assert.ok(/Supplied value should be a string/.test(error.message));
        done();
      });
    });

    it('should fail when trying to set a bare number as the List item', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            var out = new sass.types.List(1);
            out.setValue(0, 2);
            return out;
          }
        }
      }, function(error) {
        assert.ok(/Supplied value should be a SassValue object/.test(error.message));
        done();
      });
    });

    it('should fail when trying to set a bare Object as the List item', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            var out = new sass.types.List(1);
            out.setValue(0, {});
            return out;
          }
        }
      }, function(error) {
        assert.ok(/A SassValue is expected as the list item/.test(error.message));
        done();
      });
    });

    it('should fail when trying to set a bare Object as the Map key', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            var out = new sass.types.Map(1);
            out.setKey(0, {});
            out.setValue(0, new sass.types.String('aaa'));
            return out;
          }
        }
      }, function(error) {
        assert.ok(/A SassValue is expected as a map key/.test(error.message));
        done();
      });
    });

    it('should fail when trying to set a bare Object as the Map value', function(done) {
      sass.render({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            var out = new sass.types.Map(1);
            out.setKey(0, new sass.types.String('aaa'));
            out.setValue(0, {});
            return out;
          }
        }
      }, function(error) {
        assert.ok(/A SassValue is expected as a map value/.test(error.message));
        done();
      });
    });

    it('should always map null, true and false to the same (immutable) object', function(done) {
      var counter = 0;

      sass.render({
        data: 'div { color: foo(bar(null)); background-color: baz("foo" == "bar"); }',
        functions: {
          foo: function(a) {
            assert.strictEqual(a, sass.TRUE,
              'Supplied value should be the same instance as sass.TRUE'
            );

            assert.strictEqual(
              sass.types.Boolean(true), sass.types.Boolean(true),
              'sass.types.Boolean(true) should return a singleton');

            assert.strictEqual(
              sass.types.Boolean(true), sass.TRUE,
              'sass.types.Boolean(true) should be the same instance as sass.TRUE');

            counter++;

            return sass.types.String('foo');
          },
          bar: function(a) {
            assert.strictEqual(a, sass.NULL,
                'Supplied value should be the same instance as sass.NULL');

            assert.throws(function() {
              return new sass.types.Null();
            }, /Cannot instantiate SassNull/);

            counter++;

            return sass.TRUE;
          },
          baz: function(a) {
            assert.strictEqual(a, sass.FALSE,
              'Supplied value should be the same instance as sass.FALSE');

            assert.throws(function() {
              return new sass.types.Boolean(false);
            }, /Cannot instantiate SassBoolean/);

            assert.strictEqual(
              sass.types.Boolean(false), sass.types.Boolean(false),
              'sass.types.Boolean(false) should return a singleton');

            assert.strictEqual(
              sass.types.Boolean(false), sass.FALSE,
              'sass.types.Boolean(false) should return singleton identical to sass.FALSE');

            counter++;

            return sass.types.String('baz');
          }
        }
      }, function() {
        assert.strictEqual(counter, 3);
        done();
      });
    });
  });

  describe('.renderSync(functions)', function() {
    it('should call custom function in sync mode', function(done) {
      var result = sass.renderSync({
        data: 'div { width: cos(0) * 50px; }',
        functions: {
          'cos($a)': function(angle) {
            if (!(angle instanceof sass.types.Number)) {
              throw new TypeError('Unexpected type for "angle"');
            }
            return new sass.types.Number(Math.cos(angle.getValue()));
          }
        }
      });

      assert.equal(result.css.toString().trim(), 'div {\n  width: 50px; }');
      done();
    });

    it('should return a list of selectors after calling the headings custom function', function(done) {
      var result = sass.renderSync({
        data: '#{headings(2,5)} { color: #08c; }',
        functions: {
          'headings($from: 0, $to: 6)': function(from, to) {
            var i, f = from.getValue(), t = to.getValue(),
              list = new sass.types.List(t - f + 1);

            for (i = f; i <= t; i++) {
              list.setValue(i - f, new sass.types.String('h' + i));
            }

            return list;
          }
        }
      });

      assert.equal(result.css.toString().trim(), 'h2, h3, h4, h5 {\n  color: #08c; }');
      done();
    });

    it('should let custom function invoke sass types constructors without the `new` keyword', function(done) {
      var result = sass.renderSync({
        data: 'div { color: foo(); }',
        functions: {
          'foo()': function() {
            return sass.types.Number(42, 'em');
          }
        }
      });

      assert.equal(result.css.toString().trim(), 'div {\n  color: 42em; }');
      done();
    });

    it('should let us register custom functions without signatures', function(done) {
      var result = sass.renderSync({
        data: 'div { color: foo(20, 22); }',
        functions: {
          foo: function(a, b) {
            return new sass.types.Number(a.getValue() + b.getValue(), 'em');
          }
        }
      });

      assert.equal(result.css.toString().trim(), 'div {\n  color: 42em; }');
      done();
    });

    it('should fail when returning anything other than a sass value from a custom function', function(done) {
      assert.throws(function() {
        sass.renderSync({
          data: 'div { color: foo(); }',
          functions: {
            'foo()': function() {
              return {};
            }
          }
        });
      }, /A SassValue object was expected/);

      done();
    });

    it('should properly bubble up standard JS errors thrown by custom functions', function(done) {
      assert.throws(function() {
        sass.renderSync({
          data: 'div { color: foo(); }',
          functions: {
            'foo()': function() {
              throw new RangeError('This is a test error');
            }
          }
        });
      }, /This is a test error/);

      done();
    });

    it('should properly bubble up unknown errors thrown by custom functions', function(done) {
      assert.throws(function() {
        sass.renderSync({
          data: 'div { color: foo(); }',
          functions: {
            'foo()': function() {
              throw {};
            }
          }
        });
      }, /unexpected error/);

      done();
    });

    it('should properly bubble up errors from sass value getters/setters/constructors', function(done) {
      assert.throws(function() {
        sass.renderSync({
          data: 'div { color: foo(); }',
          functions: {
            'foo()': function() {
              return sass.types.Boolean('foo');
            }
          }
        });
      }, /Expected one boolean argument/);

      assert.throws(function() {
        sass.renderSync({
          data: 'div { color: foo(); }',
          functions: {
            'foo()': function() {
              var ret = new sass.types.Number(42);
              ret.setUnit(123);
              return ret;
            }
          }
        });
      }, /Supplied value should be a string/);

      done();
    });

    it('should call custom functions with correct context', function(done) {
      function assertExpected(result) {
        assert.equal(result.css.toString().trim(), 'div {\n  foo1: 1;\n  foo2: 2; }');
      }
      var options = {
        data: 'div { foo1: foo(); foo2: foo(); }',
        functions: {
          // foo() is stateful and will persist an incrementing counter
          'foo()': function() {
            assert(this);
            this.fooCounter = (this.fooCounter || 0) + 1;
            return new sass.types.Number(this.fooCounter);
          }
        }
      };
      assertExpected(sass.renderSync(options));
      done();
    });
  });
});