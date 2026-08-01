module.exports = {
    default: {
        paths: ['specs/**/*.feature'],
        require: [
            'support/**/*.ts',
            'step-definitions/**/*.steps.ts',
        ],
        requireModule: ['ts-node/register'],
        format: ['@serenity-js/cucumber'],
        // Tolerate steps that deliberately `return 'pending'` — scenarios the business has
        // agreed but nobody has automated yet. They still run, and still reach the living
        // documentation as Pending. Nothing else is loosened: an undefined, ambiguous or
        // failing step fails the run whatever this is set to, so a forgotten or renamed
        // step definition still breaks the build.
        strict: false,
    },
};
