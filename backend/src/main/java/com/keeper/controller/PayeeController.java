package com.keeper.controller;

import com.keeper.domain.Payee;
import com.keeper.repository.PayeeRepository;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;

import java.util.List;
import java.util.UUID;
import java.util.Comparator;
import java.util.stream.Collectors;

@Controller("/api/v1/payees")
public class PayeeController {

    private final PayeeRepository payeeRepository;

    @Inject
    public PayeeController(PayeeRepository payeeRepository) {
        this.payeeRepository = payeeRepository;
    }

    @Get("/{workspaceId}")
    public List<Payee> list(@PathVariable UUID workspaceId) {
        return payeeRepository.findByWorkspaceId(workspaceId).stream()
            .sorted(Comparator.comparing(Payee::getName))
            .collect(Collectors.toList());
    }

    @Post("/{workspaceId}")
    public Payee create(@PathVariable UUID workspaceId, @Body Payee payee) {
        payee.setWorkspaceId(workspaceId);
        if (payee.getId() == null) {
            payee.setId(UUID.randomUUID());
        }
        return payeeRepository.save(payee);
    }

    @Put("/{workspaceId}/{id}")
    public Payee update(@PathVariable UUID workspaceId, @PathVariable UUID id, @Body Payee payeeUpdates) {
        return payeeRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, id)).map(existing -> {
            if (payeeUpdates.getName() != null) existing.setName(payeeUpdates.getName());
            if (payeeUpdates.getType() != null) existing.setType(payeeUpdates.getType());
            return payeeRepository.update(existing);
        }).orElseThrow(() -> new io.micronaut.http.exceptions.HttpStatusException(io.micronaut.http.HttpStatus.NOT_FOUND, "Payee not found"));
    }

    @Delete("/{workspaceId}/{id}")
    public io.micronaut.http.HttpResponse<?> delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
        return payeeRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, id)).map(payee -> {
            payeeRepository.delete(payee);
            return io.micronaut.http.HttpResponse.noContent();
        }).orElse(io.micronaut.http.HttpResponse.notFound());
    }
}
