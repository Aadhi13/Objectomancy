/**
 * True-Form asset definitions.
 *
 * Each key matches a COCO-SSD class name. The TrueForm component looks up
 * the objectClass here to decide what SVG to render and what colors to use.
 *
 * To add a new true form, add a key with:
 *   - svgViewBox: the SVG viewBox string
 *   - paths: array of { d, className } for <path> elements
 *   - rects: (optional) array of { x, y, width, height, rx, className }
 *   - rune: character to display on the artwork
 *   - runeY: vertical position of the rune in SVG coords
 *   - color: primary CSS color for glow/energy theming
 *   - runeColor: fill color for the rune text
 */

export const TRUE_FORMS = {
  bottle: {
    svgViewBox: '0 0 80 130',
    paths: [
      {
        d: 'M32 8 L48 8 L48 32 L66 62 L66 108 C66 120 56 122 40 122 C24 122 14 120 14 108 L14 62 L32 32 Z',
        className: 'tf-path-outline'
      },
      {
        d: 'M20 72 Q40 68 60 72 L60 105 C60 112 52 114 40 114 C28 114 20 112 20 105 Z',
        className: 'tf-path-fill'
      }
    ],
    rects: [
      { x: 34, y: 2, width: 12, height: 8, rx: 1, className: 'tf-path-accent' }
    ],
    rune: 'ᛗ',
    runeY: 100,
    color: '#0ea5e9',
    runeColor: '#e0f2fe'
  },

  'cell phone': {
    svgViewBox: '0 0 60 100',
    paths: [
      {
        d: 'M8 6 C8 3 10 1 13 1 L47 1 C50 1 52 3 52 6 L52 94 C52 97 50 99 47 99 L13 99 C10 99 8 97 8 94 Z',
        className: 'tf-path-outline'
      },
      {
        d: 'M12 12 L48 12 L48 82 L12 82 Z',
        className: 'tf-path-fill'
      }
    ],
    rects: [
      { x: 24, y: 5, width: 12, height: 3, rx: 1.5, className: 'tf-path-accent' },
      { x: 25, y: 88, width: 10, height: 6, rx: 3, className: 'tf-path-accent' }
    ],
    rune: 'ᛟ',
    runeY: 55,
    color: '#ec4899',
    runeColor: '#fce7f3'
  },

  book: {
    svgViewBox: '0 0 80 100',
    paths: [
      {
        d: 'M10 5 L65 5 C68 5 70 7 70 10 L70 90 C70 93 68 95 65 95 L10 95 L10 5 Z',
        className: 'tf-path-outline'
      },
      {
        d: 'M10 5 L15 5 L15 95 L10 95 Z',
        className: 'tf-path-fill'
      },
      {
        d: 'M20 20 L60 20 M20 30 L60 30 M20 40 L55 40 M20 60 L60 60 M20 70 L50 70',
        className: 'tf-path-detail'
      }
    ],
    rune: 'ᛈ',
    runeY: 55,
    color: '#a855f7',
    runeColor: '#f3e8ff'
  },

  laptop: {
    svgViewBox: '0 0 100 70',
    paths: [
      {
        d: 'M10 5 L90 5 C92 5 93 6 93 8 L93 48 C93 50 92 51 90 51 L10 51 C8 51 7 50 7 48 L7 8 C7 6 8 5 10 5 Z',
        className: 'tf-path-outline'
      },
      {
        d: 'M12 9 L88 9 L88 47 L12 47 Z',
        className: 'tf-path-fill'
      },
      {
        d: 'M2 55 L98 55 C99 55 100 56 99 58 L93 65 L7 65 L1 58 C0 56 1 55 2 55 Z',
        className: 'tf-path-accent'
      }
    ],
    rune: 'ᛋ',
    runeY: 35,
    color: '#eab308',
    runeColor: '#fef9c3'
  }
};

/**
 * Fallback configuration used when an object has no specific true-form asset.
 * Renders a generic arcane circle with the object's rune.
 */
export const FALLBACK_TRUE_FORM = {
  svgViewBox: '0 0 80 80',
  paths: [
    {
      d: 'M40 4 A36 36 0 1 1 39.99 4 Z',
      className: 'tf-path-outline'
    },
    {
      d: 'M40 14 A26 26 0 1 1 39.99 14 Z',
      className: 'tf-path-fill'
    }
  ],
  runeY: 48,
  // color and rune are inherited from the spell data at render time
};
