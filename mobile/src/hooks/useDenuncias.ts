import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { denunciasService } from '../services/denuncias';
import type { CrearDenunciaPayload } from '../types';

export const denunciasKeys = {
  all:    ['denuncias'] as const,
  mis:    () => [...denunciasKeys.all, 'mis-denuncias'] as const,
  detalle: (id: string)    => [...denunciasKeys.all, 'detalle', id] as const,
  token:   (token: string) => [...denunciasKeys.all, 'token',   token] as const,
  mensajes:(id: string)    => [...denunciasKeys.all, 'mensajes', id] as const,
};

export function useMisDenuncias(pagina = 1, enabled = true) {
  return useQuery({
    queryKey: denunciasKeys.mis(),
    queryFn:  () => denunciasService.listarMisDenuncias(pagina),
    enabled,
  });
}

export function useDenuncia(id: string) {
  return useQuery({
    queryKey: denunciasKeys.detalle(id),
    queryFn:  () => denunciasService.obtenerPorId(id),
    enabled:  !!id,
    refetchInterval: 30_000,
  });
}

export function useDenunciaPorToken(token: string) {
  return useQuery({
    queryKey: denunciasKeys.token(token),
    queryFn:  () => denunciasService.obtenerPorToken(token),
    enabled:  !!token,
  });
}

export function useMensajesCaso(denunciaId: string) {
  return useQuery({
    queryKey: denunciasKeys.mensajes(denunciaId),
    queryFn:  () => denunciasService.obtenerMensajes(denunciaId),
    enabled:  !!denunciaId,
    refetchInterval: 10_000,
  });
}

export function useCrearDenuncia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CrearDenunciaPayload) => denunciasService.crear(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: denunciasKeys.mis() });
    },
  });
}

export function useResponderMensaje(denunciaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contenido, tokenAnonimo }: { contenido: string; tokenAnonimo?: string }) =>
      denunciasService.responderMensaje(denunciaId, contenido, tokenAnonimo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: denunciasKeys.mensajes(denunciaId) });
    },
  });
}
