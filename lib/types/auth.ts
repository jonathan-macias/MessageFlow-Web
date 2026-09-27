export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  userId: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface Rfc7807Error {
  type: string;
  title: string;
  status: number;
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
  httpStatus?: number;
}
