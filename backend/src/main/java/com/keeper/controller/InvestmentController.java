package com.keeper.controller;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Header;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/investments")
public class InvestmentController {
    
    @Get("/{workspaceId}")
    public List<Object> list(@PathVariable UUID workspaceId) {
        return Collections.emptyList(); 
    }
}
