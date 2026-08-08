export type Role = 'user' | 'moderator' | 'admin';

export type AccountType = 'individual' | 'business' | 'admin_officer';

export interface User {
  id: number;
  email: string;
  username: string | null;
  accountType: AccountType;
  emailVerified: boolean;
  roles: Role[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: User;
}
