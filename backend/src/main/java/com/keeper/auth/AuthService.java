package com.keeper.auth;

public interface AuthService {
  User registerUser(String email, String rawPassword, String name);

  User getOrCreateOauthUser(String email, String name);
}
