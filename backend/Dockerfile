FROM maven:3.9.6-eclipse-temurin-21-jammy AS builder
WORKDIR /home/app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source and build
COPY src src
RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /home/app

# Run as non-root user for security
RUN groupadd -r keeper && useradd -r -g keeper keeper
USER keeper

COPY --from=builder /home/app/target/backend-*.jar app.jar
EXPOSE 8080

CMD ["java", "-jar", "app.jar"]
