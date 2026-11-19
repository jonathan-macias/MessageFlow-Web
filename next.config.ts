import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone (server.js + solo las dependencias necesarias)
  // para una imagen Docker pequeña. Ver Dockerfile.
  output: "standalone",

  // Solo afecta a `next dev`: permite abrir el dev server desde otros equipos
  // de la red local (p. ej. http://192.168.0.102:3001) sin que Next bloquee
  // los recursos de desarrollo (HMR, chunks). No tiene efecto en producción.
  allowedDevOrigins: ["192.168.0.102"],
};

export default nextConfig;
