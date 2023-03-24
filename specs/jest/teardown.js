module.exports = async () => {
    process.exit(parseInt(process.env.TEST_RESULT || '1', 10));
};
