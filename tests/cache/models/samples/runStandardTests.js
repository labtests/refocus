/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/runStandardTests.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const requireDir = require('require-dir');

/*
 * This test runs the standard sample api tests with the cache enabled.
 * Note that this must be run in a separate command from the api tests,
 * otherwise these tests will not run because files can't be required
 * twice in the same process.
 */

describe('tests/cache/models/samples/runStandardTests.js, ', () => {
  before(() => tu.toggleOverride('enableRedisSampleStore', true));
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  describe('run standard tests with cache enabled', () => {
    requireDir('../../../api/v1/samples');
  });
});
