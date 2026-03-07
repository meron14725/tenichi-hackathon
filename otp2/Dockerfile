FROM eclipse-temurin:21-jre

WORKDIR /otp

# Download OTP2 JAR from GitHub Releases
ARG OTP_VERSION=2.7.0
ADD https://github.com/opentripplanner/OpenTripPlanner/releases/download/v${OTP_VERSION}/otp-shaded-${OTP_VERSION}.jar otp.jar

# Copy pre-built graph data
# graph.obj must be placed in otp2/data/ before building
COPY data/ /otp/data/

EXPOSE 8080

# Start OTP2 server with the pre-built graph
# --load: load pre-built graph from data directory
# --serve: start the HTTP server
CMD ["java", "-Xmx3G", "-jar", "otp.jar", "--load", "--serve", "data/"]
