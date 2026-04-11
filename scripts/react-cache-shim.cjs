/**
 * Webpack bundles `react` for server chunks; mutating `require("react")` only in
 * next.config does not patch the bundled module. This shim is aliased as `react`
 * (exact match) so `import ... from "react"` gets React.cache on React 18.
 *
 * Load the real package by static relative path (no dynamic join) so webpack resolves cleanly.
 */
const React = require("../node_modules/react/index.js");

if (typeof React.cache !== "function") {
  React.cache = function cache(fn) {
    const store = new Map();
    return function cached(...args) {
      const key = args.length === 1 ? String(args[0]) : JSON.stringify(args);
      if (store.has(key)) return store.get(key);
      const v = fn.apply(this, args);
      store.set(key, v);
      return v;
    };
  };
}

module.exports = React;
