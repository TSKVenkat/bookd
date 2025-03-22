export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'organizer' | 'venue_staff';
  
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface RegisterData extends LoginCredentials {
    name: string;
  }
  
  export interface AuthResponse {
    user: User;
    token: string;
  }
  
  export interface ResetPasswordRequest {
    email: string;
  }
  
  export interface PasswordResetData {
    token: string;
    newPassword: string;
  }

