package com.keeper;

import io.micronaut.context.ApplicationContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assertions;
import org.testcontainers.DockerClientFactory;
import org.junit.jupiter.api.Assumptions;

class SchemaValidationTest {

    @Test
    void testHibernateSchemaMatchesFlywayMigrations() {
        // Check Docker BEFORE booting Micronaut, so we don't crash if Docker is missing
        Assumptions.assumeTrue(
            DockerClientFactory.instance().isDockerAvailable(), 
            "Docker is required for strict Postgres schema validation via Testcontainers"
        );

        // Manually boot Micronaut with the schema-validation environment
        // If the context boots successfully, Hibernate hbm2ddl.auto=validate passed!
        try (ApplicationContext context = ApplicationContext.run("test", "schema-validation")) {
            Assertions.assertTrue(context.isRunning(), "Schema validation passed!");
        }
    }
}
