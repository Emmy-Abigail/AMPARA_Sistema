import React from 'react';
import Svg, { G, Path, Circle, Ellipse, Rect } from 'react-native-svg';

interface Props {
  size?: number;
  /** true para incluir el fondo verde (útil fuera de pantalla verde) */
  withBackground?: boolean;
}

/**
 * Ícono vectorial de SIVAPRE: escudo + mosquito Aedes + ondas de radar.
 * Diseño original en viewBox 0 0 1024 1024.
 */
export default function SivapreLogo({ size = 200, withBackground = false }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      {withBackground && (
        <Rect x="0" y="0" width="1024" height="1024" fill="#0F6E56" />
      )}

      {/* Shield + mosquito + radar — centrado y escalado al viewBox 1024×1024 */}
      <G transform="translate(512,512) scale(7.168) translate(-60,-60)">

        {/* Escudo */}
        <Path
          d="M60 16 L94 26 L94 60 C94 80 80 96 60 104 C40 96 26 80 26 60 L26 26 Z"
          stroke="white"
          strokeWidth={3.5}
          strokeLinejoin="round"
          fill="none"
        />

        {/* Ondas radar — izquierda */}
        <G stroke="white" strokeWidth={2.5} strokeLinecap="round" fill="none">
          <Path d="M20 50 Q14 60 20 70" />
          <Path d="M14 44 Q4 60 14 76" opacity={0.85} />
          <Path d="M8 38 Q-4 60 8 82" opacity={0.55} />
        </G>

        {/* Ondas radar — derecha */}
        <G stroke="white" strokeWidth={2.5} strokeLinecap="round" fill="none">
          <Path d="M100 50 Q106 60 100 70" />
          <Path d="M106 44 Q116 60 106 76" opacity={0.85} />
          <Path d="M112 38 Q124 60 112 82" opacity={0.55} />
        </G>

        {/* Mosquito Aedes */}
        <G transform="translate(60,62) scale(0.62) translate(-50,-50)" fill="white">
          {/* Cabeza */}
          <Circle cx={50} cy={32} r={3.2} />
          {/* Tórax */}
          <Ellipse cx={50} cy={40} rx={3.6} ry={5} />
          {/* Abdomen */}
          <Path d="M46.5 45 L48.5 80 Q50 84 51.5 80 L53.5 45 Z" />
          {/* Probóscide */}
          <Rect x={49.5} y={22} width={1} height={8} rx={0.5} />
          {/* Antenas */}
          <Path
            d="M48.5 30 Q44 24 42 18"
            stroke="white"
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M51.5 30 Q56 24 58 18"
            stroke="white"
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={42} cy={18} r={1.1} />
          <Circle cx={58} cy={18} r={1.1} />
          {/* Alas */}
          <Path d="M47 38 Q34 33 22 38 Q14 41 18 44 Q30 46 42 44 Q47 43 47 41 Z" />
          <Path d="M53 38 Q66 33 78 38 Q86 41 82 44 Q70 46 58 44 Q53 43 53 41 Z" />
          {/* Patas */}
          <G
            stroke="white"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <Path d="M47 43 L38 50 L32 60" />
            <Path d="M47 47 L40 62 L36 78" />
            <Path d="M53 43 L62 50 L68 60" />
            <Path d="M53 47 L60 62 L64 78" />
          </G>
        </G>
      </G>
    </Svg>
  );
}
