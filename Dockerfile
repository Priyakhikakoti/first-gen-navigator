# Multi-stage Dockerfile for First Gen Navigator
# Build Stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy sources
COPY src ./src

# Compile all Java sources
RUN mkdir -p bin && \
    find src -name "*.java" > sources.txt && \
    javac -d bin @sources.txt

# Production Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy compiled classes from builder stage
COPY --from=builder /app/bin ./bin

# Copy static web directory
COPY web ./web

# Set environment defaults
ENV PORT=8080
EXPOSE 8080

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/api/health || exit 1

# Start server
CMD ["java", "-cp", "bin", "com.firstgen.navigator.server.FirstGenNavigatorServer"]
