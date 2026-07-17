package com.keeper.service;

import com.keeper.domain.User;
import com.keeper.domain.Workspace;
import com.keeper.repository.UserRepository;
import com.keeper.repository.WorkspaceRepository;
import jakarta.inject.Singleton;
import org.mindrot.jbcrypt.BCrypt;

import java.util.Optional;
import java.util.UUID;

@Singleton
public class AuthService {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;

    public AuthService(UserRepository userRepository, WorkspaceRepository workspaceRepository) {
        this.userRepository = userRepository;
        this.workspaceRepository = workspaceRepository;
    }

    public User registerUser(String email, String rawPassword, String name) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Email already in use");
        }

        User user = new User();
        user.setEmail(email);
        user.setName(name);
        
        // Hash the password before saving
        String hash = BCrypt.hashpw(rawPassword, BCrypt.gensalt());
        user.setPasswordHash(hash);

        User savedUser = userRepository.save(user);

        // Auto-create a default workspace for the new user
        Workspace workspace = new Workspace();
        workspace.setId(UUID.randomUUID());
        workspace.setName("Personal Workspace");
        workspace.setUserId(savedUser.getId());
        workspace.setFunctionalCurrency("USD");
        workspaceRepository.save(workspace);

        return savedUser;
    }

    public User getOrCreateOauthUser(String email, String name) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User user = new User();
            user.setEmail(email);
            user.setName(name);
            // Generate a random password hash for OAuth users so they can't login via normal flow
            user.setPasswordHash(BCrypt.hashpw(UUID.randomUUID().toString(), BCrypt.gensalt()));
            
            User savedUser = userRepository.save(user);

            Workspace workspace = new Workspace();
            workspace.setId(UUID.randomUUID());
            workspace.setName(name != null ? name + "'s Workspace" : "Personal Workspace");
            workspace.setUserId(savedUser.getId());
            workspace.setFunctionalCurrency("USD");
            workspaceRepository.save(workspace);

            return savedUser;
        });
    }
}
