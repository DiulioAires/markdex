import '@testing-library/jest-dom/vitest'

// jsdom does not implement Range measurement APIs that CodeMirror relies on
// for layout. Polyfill them so editor interaction tests don't throw during
// requestAnimationFrame-driven measurement passes.
if (typeof Range !== 'undefined') {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = function () {
      return {
        item: () => null,
        length: 0,
        [Symbol.iterator]: function* () {},
      } as unknown as DOMRectList
    }
  }

  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = function () {
      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON() {
          return this
        },
      } as DOMRect
    }
  }
}
