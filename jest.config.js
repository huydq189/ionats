module.exports = {
    transform: {
        '^.+\\.ts?$': [
            'ts-jest',
            {
                diagnostics: false,
            },
        ],
    },
    // ts-jest sẽ xác định các file có dạng này
    // Sau đó sẽ biến đổi về dạng nó có thể hiểu được
    // Để chạy jest
    verbose: true,
    // Báo cáo các bài test lúc đang chạy
    clearMocks: true,
    testTimeout: 30000,
    globalSetup: './specs/jest/setup.js',
    globalTeardown: './specs/jest/teardown.js',
    reporters: ['default', './specs/jest/reporter.js'],
};
