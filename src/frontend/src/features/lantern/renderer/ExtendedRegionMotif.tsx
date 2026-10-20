import type { GrowthZone } from '../growth/outerGrowth'

type Props = {
  zone: GrowthZone
  primary: string
  ivory: string
  rose: string
  teal: string
  color: string
}

/** Distinct stained-glass and geometric motifs for growth layers 51–150. */
export default function ExtendedRegionMotif({ zone, primary, ivory, rose, teal, color }: Props) {
  switch (zone) {
    case 'lattice':
      return <g>
        <path d="M 0 -29 L 24 0 L 0 29 L -24 0 Z" fill={teal} fillOpacity=".7" stroke={ivory} strokeWidth="2"/>
        <path d="M -23 0 L 23 0 M 0 -28 L 0 28 M -12 -14 L 12 14 M 12 -14 L -12 14"
          fill="none" stroke={primary} strokeWidth="2.3"/>
        <rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" fill={rose} stroke={ivory}/>
      </g>
    case 'rosette':
      return <g>
        {Array.from({ length: 8 }, (_, i) =>
          <ellipse key={i} cx="0" cy="-15" rx="7" ry="16" transform={'rotate(' + (i * 45) + ')'}
            fill={i % 2 ? rose : color} fillOpacity=".82" stroke={ivory} strokeWidth="1.2"/>)}
        <circle r="9" fill={primary} stroke={ivory} strokeWidth="2"/>
        <circle r="3.5" fill="#fff5c3"/>
      </g>
    case 'pinwheel':
      return <g>
        {Array.from({ length: 6 }, (_, i) =>
          <path key={i} d="M 0 -4 Q 12 -30 29 -20 L 13 -5 L 0 0 Z"
            transform={'rotate(' + (i * 60) + ')'}
            fill={i % 2 ? teal : rose} fillOpacity=".85" stroke={ivory} strokeWidth="1.5"/>)}
        <circle r="6" fill={color} stroke={ivory} strokeWidth="1.5"/>
      </g>
    case 'prism':
      return <g>
        <path d="M 0 -31 L 20 -9 L 18 20 L 0 31 L -18 20 L -20 -9 Z"
          fill={primary} fillOpacity=".75" stroke={ivory} strokeWidth="2"/>
        <path d="M 0 -31 L 0 31 M -20 -9 L 20 -9 M -18 20 L 0 -9 L 18 20"
          fill="none" stroke={rose} strokeWidth="2"/>
        <path d="M 0 -9 L 10 5 L 0 19 L -10 5 Z" fill={teal} stroke={ivory} strokeWidth="1.2"/>
      </g>
    case 'peacock':
      return <g>
        {Array.from({ length: 5 }, (_, i) =>
          <g key={i} transform={'rotate(' + ((i - 2) * 27) + ')'}>
            <path d="M 0 6 Q -13 -13 0 -32 Q 13 -13 0 6 Z"
              fill={i % 2 ? rose : teal} fillOpacity=".75" stroke={ivory} strokeWidth="1.4"/>
            <ellipse cy="-16" rx="5" ry="8" fill={color} stroke={ivory} strokeWidth="1"/>
          </g>)}
        <path d="M 0 6 L 0 24" stroke={ivory} strokeWidth="2"/>
      </g>
    case 'sunwheel':
      return <g>
        {Array.from({ length: 12 }, (_, i) =>
          <path key={i} d="M -3 -13 L 0 -34 L 3 -13 Z" transform={'rotate(' + (i * 30) + ')'}
            fill={i % 2 ? rose : primary} stroke={ivory} strokeWidth="1.2"/>)}
        <circle r="13" fill={color} stroke={ivory} strokeWidth="2"/>
        <circle r="7" fill={primary} stroke={ivory}/>
      </g>
    case 'sampaguita':
      return <g>
        {Array.from({ length: 5 }, (_, i) =>
          <ellipse key={i} cy="-14" rx="9" ry="17" transform={'rotate(' + (i * 72) + ')'}
            fill={ivory} fillOpacity=".92" stroke={teal} strokeWidth="1.4"/>)}
        <circle r="8" fill={color} stroke={primary} strokeWidth="2"/>
        <circle r="3" fill={rose}/>
      </g>
    case 'zigzag':
      return <g>
        <path d="M 0 -30 L 15 -14 L 3 -2 L 18 14 L 0 30 L -18 14 L -3 -2 L -15 -14 Z"
          fill={rose} fillOpacity=".8" stroke={ivory} strokeWidth="2"/>
        <path d="M -12 -14 L 0 -23 L 12 -14 M -13 14 L 0 23 L 13 14 M -15 0 L 15 0"
          fill="none" stroke={teal} strokeWidth="2"/>
        <circle r="5" fill={ivory}/>
      </g>
    case 'kaleidoscope':
      return <g>
        {Array.from({ length: 8 }, (_, i) =>
          <path key={i} d="M 0 0 L -6 -12 L 0 -31 L 6 -12 Z"
            transform={'rotate(' + (i * 45) + ')'}
            fill={i % 2 ? color : teal} fillOpacity=".88" stroke={ivory} strokeWidth="1.3"/>)}
        <path d="M -8 0 L 0 -8 L 8 0 L 0 8 Z" fill={rose} stroke={ivory} strokeWidth="1.3"/>
      </g>
    case 'corona':
      return <g>
        {Array.from({ length: 10 }, (_, i) =>
          <path key={i} d="M -5 -9 L 0 -35 L 5 -9 L 0 -14 Z"
            transform={'rotate(' + (i * 36) + ')'}
            fill={i % 2 ? primary : color} stroke={ivory} strokeWidth="1.2"/>)}
        <circle r="12" fill={rose} stroke={ivory} strokeWidth="2"/>
        <path d="M 0 -8 L 3 0 L 8 0 L 3 3 L 0 9 L -3 3 L -8 0 L -3 -3 Z"
          fill={ivory} stroke={primary} strokeWidth="1"/>
      </g>
    default:
      return null
  }
}
