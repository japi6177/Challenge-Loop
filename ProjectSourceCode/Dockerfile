FROM node:18-alpine

# Set the working directory directly in the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install exactly what is conditionally required for production
RUN npm ci --only=production

# Copy over the entire source code
COPY . .

# Expose port 3000
EXPOSE 3000

# Start up using standard Node rather than the interactive Nodemon module
CMD ["node", "src/index.js"]
