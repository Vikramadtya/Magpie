export interface UserSettings {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  theme: string;
  currency: string;
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
