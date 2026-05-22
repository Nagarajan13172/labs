import { api } from "./client";
import type { TokenPair, User } from "./types";

export interface SignupInput {
  email: string;
  password: string;
  phone: string;
}

export const authApi = {
  signup: (input: SignupInput) =>
    api.post<null>("/auth/signup", input, { auth: false }),

  verifyEmail: (token: string) =>
    api.get<null>("/auth/verify-email", { auth: false, query: { token } }),

  signin: (email: string, password: string) =>
    api.post<TokenPair>("/auth/signin", { email, password }, { auth: false }),

  logout: (refresh_token: string) =>
    api.post<null>("/auth/logout", { refresh_token }),

  forgotPassword: (email: string) =>
    api.post<null>("/auth/forgot-password", { email }, { auth: false }),

  me: () => api.get<User>("/users/me"),

  updateProfile: (phone: string) => api.patch<User>("/users/me", { phone }),
};
