// Módulo de señal: permite al interceptor de axios notificar al AuthContext
// de un 401 sin crear dependencias circulares.

let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void): void {
  _onUnauthorized = fn;
}

export function triggerUnauthorized(): void {
  _onUnauthorized?.();
}
