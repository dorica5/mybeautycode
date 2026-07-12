/**
 * Hermes stack traces reference "InternalBytecode.js"; Metro tries to read this path for
 * symbolication and logs ENOENT if missing. Stub satisfies readFileSync without affecting bundles.
 */
module.exports = {};
