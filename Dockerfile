# Use an official Node.js runtime as the base image
# FROM node:18-bullseye
FROM node:18.13-alpine


# Set the working directory inside the container
WORKDIR /app

# Install system dependencies for building native modules
RUN apk add --no-cache  build-base python3

# Copy package.json and yarn.lock first to leverage Docker's cache
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn add ffi-napi && yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the app's HTTP port (matches the one in your app spec)
EXPOSE 3000

# Specify environment variables
ENV NODE_ENV production
ENV PORT 3000

# Run database migrations as part of the startup process
# and start the application
CMD ["sh", "-c", "yarn migrate && yarn start"]
