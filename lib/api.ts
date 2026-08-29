import type { AuthResponse, LoginRequest, RegisterRequest, GoogleLoginRequest, Rfc7807Error } from "./types/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7110";

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error: Rfc7807Error = body ?? {
      type: "about:blank",
      title: "Error",
      status: res.status,
      detail: res.statusText,
    };
    throw error;
  }

  return res.json() as Promise<T>;
}

export function login(data: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function register(data: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginWithGoogle(data: GoogleLoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
