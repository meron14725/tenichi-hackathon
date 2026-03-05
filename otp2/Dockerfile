FROM eclipse-temurin:21-jre

WORKDIR /otp

# Download OTP2 JAR
ARG OTP_VERSION=2.7.0
ADD https://repo1.maven.org/maven2/org/opentripplanner/otp/${OTP_VERSION}/otp-${OTP_VERSION}-shaded.jar otp.jar

# Copy pre-built graph data
# graph.obj must be placed in otp2/data/ before building
COPY data/ /otp/data/

EXPOSE 8080

# Start OTP2 server with the pre-built graph
# --load: load pre-built graph from data directory
# --serve: start the HTTP server
CMD ["java", "-Xmx3G", "-jar", "otp.jar", "--load", "--serve", "data/"]
