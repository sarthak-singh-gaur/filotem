FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose port
EXPOSE 5000

ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]

