module.exports = {
    default: {
        paths: ['specs/**/*.feature'],
        require: [
            'support/**/*.ts',
            'step-definitions/**/*.steps.ts',
        ],
        requireModule: ['ts-node/register'],
        format: ['@serenity-js/cucumber'],
    },
};
