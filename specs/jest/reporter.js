class UnitTestReporter {
    constructor(config, options) {
        this._globalConfig = config;
        this._options = options;
    }

    onRunComplete(contexts, results) {
        if (results) {
            const { numFailedTests, numFailedTestSuites } = results;
            numFailedTests > 0 || numFailedTestSuites > 0
                ? (process.env.TEST_RESULT = '1')
                : (process.env.TEST_RESULT = '0');
        }
    }
}

module.exports = UnitTestReporter;
