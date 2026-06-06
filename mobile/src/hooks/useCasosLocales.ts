import { useCallback, useEffect, useState } from 'react';
import { obtenerCasosLocales, type CasoLocal } from '../services/casosLocales';
import type { Denuncia, EstadoCaso, NivelRiesgo, PreferenciaContacto, TipoViolencia, RelacionAgresor } from '../types';

export function casoLocalADenuncia(c: CasoLocal): Denuncia {
  const tipos = c.tipos_violencia?.length
    ? c.tipos_violencia as TipoViolencia[]
    : [c.tipo_violencia as TipoViolencia];
  return {
    id:                   c.denuncia_id ?? c.local_id,
    token_anonimo:        c.token_anonimo,
    tipos_violencia:      tipos,
    tipo_violencia:       tipos[0],
    relacion_agresor:     c.relacion_agresor as RelacionAgresor,
    factores_riesgo:      (c.factores_riesgo ?? []) as any,
    nivel_riesgo:         c.nivel_riesgo as NivelRiesgo,
    hay_heridos:          c.hay_heridos,
    foto_url:             c.foto_url ?? undefined,
    preferencia_contacto: 'ninguno' as PreferenciaContacto,
    descripcion:          c.descripcion ?? undefined,
    es_anonima:           c.es_anonima,
    estado:               c.estado as EstadoCaso,
    fecha_denuncia:       c.fecha_denuncia,
    fecha_actualizacion:  c.fecha_actualizacion,
  };
}

export function useCasosLocales() {
  const [casos, setCasos]       = useState<CasoLocal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    const data = await obtenerCasosLocales();
    setCasos(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { casos, casosComoDenuncia: casos.map(casoLocalADenuncia), isLoading, refetch: cargar };
}
