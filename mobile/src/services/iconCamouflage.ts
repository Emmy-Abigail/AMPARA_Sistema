/**
 * Gestiona el ícono de camuflaje de la app (iOS alternate app icons).
 * Requiere expo-alternate-app-icon instalado y los assets configurados en app.json.
 * Si el paquete no está disponible, solo persiste la preferencia en storage.
 */

export type IconoId = 'default' | 'calculator' | 'notes' | 'weather';

export interface IconoOpcion {
  id: IconoId;
  label: string;
  descripcion: string;
  emoji: string;
  // Nombre del alternate icon tal como está registrado en app.json (null = ícono principal)
  alternateKey: string | null;
}

export const ICONOS: IconoOpcion[] = [
  {
    id:           'default',
    label:        'Ampara',
    descripcion:  'Ícono original de la app',
    emoji:        '🛡️',
    alternateKey: null,
  },
  {
    id:           'calculator',
    label:        'Calculadora',
    descripcion:  'Aparece como una app de calculadora',
    emoji:        '🔢',
    alternateKey: 'Calculator',
  },
  {
    id:           'notes',
    label:        'Notas',
    descripcion:  'Aparece como una app de notas',
    emoji:        '📝',
    alternateKey: 'Notes',
  },
  {
    id:           'weather',
    label:        'Clima',
    descripcion:  'Aparece como una app del tiempo',
    emoji:        '🌤️',
    alternateKey: 'Weather',
  },
];

export async function aplicarIcono(_icono: IconoOpcion): Promise<boolean> {
  // Requiere build nativa con assets configurados en app.json
  // Se habilitará en una versión futura
  return false;
}
