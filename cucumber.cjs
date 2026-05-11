module.exports = {
    default: {
        paths: ['features/specs/**/*.feature'],
        require: [
            'features/support/*.ts',
            'features/step_definitions/**/*.steps.ts',
        ],
        requireModule: ['ts-node/register'],
        format: ['progress-bar', 'html:reports/bdd.html'],
    },
};