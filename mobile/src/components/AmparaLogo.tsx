import React from 'react';
import Svg, { G, Path, Rect, Circle } from 'react-native-svg';

interface Props {
  size?: number;
  withBackground?: boolean;
}

// Escudo con mano abierta — protección y refugio (significado de "ampara").
export default function AmparaLogo({ size = 200, withBackground = false }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {withBackground && (
        <Rect x="0" y="0" width="100" height="100" rx="22" fill="#7C3AED" />
      )}

      {/* Escudo */}
      <Path
        d="M50 12 L84 24 L84 52 C84 72 68 88 50 94 C32 88 16 72 16 52 L16 24 Z"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Mano abierta — símbolo de protección y parada */}
      <G fill="white" opacity={0.95}>
        {/* Palma */}
        <Path d="M38 72 Q36 58 37 52 Q38 48 41 48 Q44 48 44 52 L44 44 Q44 40 47 40 Q50 40 50 44 L50 42 Q50 38 53 38 Q56 38 56 42 L56 44 Q56 40 59 40 Q62 40 62 44 L62 64 Q62 70 58 72 Z" />
        {/* Pulgar */}
        <Path d="M38 56 Q34 54 33 50 Q32 46 35 45 Q38 44 39 48 L39 56 Z" />
      </G>
    </Svg>
  );
}
