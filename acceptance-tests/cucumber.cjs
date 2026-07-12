module.exports = {
    default: {
        paths: ['specs/**/*.feature'],
        require: [
            'support/*.ts',
            'step_definitions/**/*.steps.ts',
        ],
        requireModule: ['ts-node/register'],
        format: ['progress-bar', 'html:reports/bdd.html'],
    },
};