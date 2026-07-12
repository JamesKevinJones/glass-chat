export interface PublicUser {
  id: string;
  username: string;
  createdAt: number;
}

export interface AuthResult {
  ok: boolean;
  user?: PublicUser;
  error?: string;
}
