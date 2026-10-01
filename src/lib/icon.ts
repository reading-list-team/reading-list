import { createElement } from 'lucide';

type Icon = Parameters<typeof createElement>[0];

// Each caller imports only the Lucide icon nodes it uses; decorative SVGs stay out of the tab order.
export function icon(node: Icon, size = 18): SVGElement {
  return createElement(node, {
    width: size,
    height: size,
    'aria-hidden': 'true',
    focusable: 'false',
    'stroke-width': 1.9,
  });
}
