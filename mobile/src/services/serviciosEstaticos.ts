/**
 * Dataset estático Lima Metropolitana (misma fuente que el backend).
 * Se usa como fallback cuando el servidor no está disponible o no hay conexión.
 */

export interface ServicioInfo {
  nombre: string;
  lat: number;
  lon: number;
  telefono: string;
  distancia_km: number;
  distrito?: string;
  horario?: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

type ServicioRaw = Omit<ServicioInfo, 'distancia_km'>;

const COMISARIAS: ServicioRaw[] = [
  { nombre: 'Comisaría de Miraflores',            lat: -12.1211, lon: -77.0294, telefono: '014452095', distrito: 'Miraflores' },
  { nombre: 'Comisaría de San Isidro',             lat: -12.0982, lon: -77.0410, telefono: '012213860', distrito: 'San Isidro' },
  { nombre: 'Comisaría de Santiago de Surco',      lat: -12.1400, lon: -76.9920, telefono: '012720305', distrito: 'Santiago de Surco' },
  { nombre: 'Comisaría de Lince',                  lat: -12.0838, lon: -77.0330, telefono: '014711077', distrito: 'Lince' },
  { nombre: 'Comisaría de Barranco',               lat: -12.1467, lon: -77.0235, telefono: '014775757', distrito: 'Barranco' },
  { nombre: 'Comisaría de San Borja',              lat: -12.0948, lon: -76.9980, telefono: '014754000', distrito: 'San Borja' },
  { nombre: 'Comisaría de Ate',                    lat: -12.0246, lon: -76.9220, telefono: '013540011', distrito: 'Ate' },
  { nombre: 'Comisaría de La Molina',              lat: -12.0761, lon: -76.9416, telefono: '013499090', distrito: 'La Molina' },
  { nombre: 'Comisaría de Pueblo Libre',           lat: -12.0772, lon: -77.0654, telefono: '014614140', distrito: 'Pueblo Libre' },
  { nombre: 'Comisaría de Jesús María',            lat: -12.0765, lon: -77.0480, telefono: '014233082', distrito: 'Jesús María' },
  { nombre: 'Comisaría de Breña',                  lat: -12.0600, lon: -77.0520, telefono: '014236070', distrito: 'Breña' },
  { nombre: 'Comisaría de San Miguel',             lat: -12.0776, lon: -77.0890, telefono: '014533880', distrito: 'San Miguel' },
  { nombre: 'Comisaría de Chorrillos',             lat: -12.1632, lon: -77.0261, telefono: '014672014', distrito: 'Chorrillos' },
  { nombre: 'Comisaría de San Juan de Miraflores', lat: -12.1561, lon: -76.9753, telefono: '012765353', distrito: 'San Juan de Miraflores' },
  { nombre: 'Comisaría de Villa El Salvador',      lat: -12.2132, lon: -76.9423, telefono: '012871300', distrito: 'Villa El Salvador' },
  { nombre: 'Comisaría de Los Olivos',             lat: -11.9954, lon: -77.0792, telefono: '015333030', distrito: 'Los Olivos' },
  { nombre: 'Comisaría de Comas',                  lat: -11.9333, lon: -77.0500, telefono: '015280011', distrito: 'Comas' },
  { nombre: 'Comisaría de San Juan de Lurigancho', lat: -11.9800, lon: -77.0100, telefono: '013880330', distrito: 'San Juan de Lurigancho' },
  { nombre: 'Comisaría de La Victoria',            lat: -12.0600, lon: -77.0150, telefono: '014250022', distrito: 'La Victoria' },
  { nombre: 'Comisaría de Rímac',                  lat: -12.0280, lon: -77.0230, telefono: '014815340', distrito: 'Rímac' },
  { nombre: 'Comisaría de Independencia',          lat: -11.9964, lon: -77.0576, telefono: '015330078', distrito: 'Independencia' },
  { nombre: 'Comisaría de Magdalena del Mar',      lat: -12.0940, lon: -77.0730, telefono: '014612420', distrito: 'Magdalena del Mar' },
  { nombre: 'Comisaría de Carabayllo',             lat: -11.8900, lon: -77.0350, telefono: '015210055', distrito: 'Carabayllo' },
];

const CEMS: ServicioRaw[] = [
  { nombre: 'CEM Lima Centro',             lat: -12.0459, lon: -77.0355, telefono: '014268696', horario: 'Lun-Vie 8am-8pm',  distrito: 'Cercado de Lima' },
  { nombre: 'CEM Callao',                  lat: -12.0500, lon: -77.1200, telefono: '014532350', horario: 'Lun-Vie 8am-8pm',  distrito: 'Callao' },
  { nombre: 'CEM Ate',                     lat: -12.0200, lon: -76.9200, telefono: '013540011', horario: 'Lun-Vie 8am-6pm',  distrito: 'Ate' },
  { nombre: 'CEM Villa El Salvador',       lat: -12.2139, lon: -76.9428, telefono: '012871300', horario: 'Lun-Vie 8am-6pm',  distrito: 'Villa El Salvador' },
  { nombre: 'CEM Lince (24 horas)',        lat: -12.0837, lon: -77.0330, telefono: '014711077', horario: '24 horas',          distrito: 'Lince' },
  { nombre: 'CEM San Juan de Lurigancho',  lat: -11.9800, lon: -77.0100, telefono: '013880330', horario: 'Lun-Vie 8am-6pm',  distrito: 'San Juan de Lurigancho' },
  { nombre: 'CEM Comas',                   lat: -11.9333, lon: -77.0500, telefono: '015280011', horario: 'Lun-Vie 8am-6pm',  distrito: 'Comas' },
  { nombre: 'CEM Los Olivos',              lat: -11.9954, lon: -77.0792, telefono: '015333030', horario: 'Lun-Vie 8am-6pm',  distrito: 'Los Olivos' },
  { nombre: 'CEM Villa María del Triunfo', lat: -12.1688, lon: -76.9559, telefono: '012765700', horario: 'Lun-Vie 8am-6pm',  distrito: 'Villa María del Triunfo' },
  { nombre: 'CEM Chorrillos',              lat: -12.1632, lon: -77.0261, telefono: '014672014', horario: 'Lun-Vie 8am-6pm',  distrito: 'Chorrillos' },
];

function topN(items: ServicioRaw[], lat: number, lon: number, n: number): ServicioInfo[] {
  return items
    .map((s) => ({
      ...s,
      distancia_km: Math.round(haversineKm(lat, lon, s.lat, s.lon) * 10) / 10,
    }))
    .sort((a, b) => a.distancia_km - b.distancia_km)
    .slice(0, n);
}

export function buscarServiciosLocales(lat: number, lon: number): {
  comisarias: ServicioInfo[];
  cems: ServicioInfo[];
} {
  return {
    comisarias: topN(COMISARIAS, lat, lon, 4),
    cems:       topN(CEMS, lat, lon, 2),
  };
}
