package com.keeper.auth;

import java.util.UUID;

public record User(UUID id, String email, String name, String passwordHash) {}
