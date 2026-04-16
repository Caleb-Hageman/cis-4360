FROM node:22-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

COPY . .

# Expose the Vite port
EXPOSE 5173

# Vite needs --host to allow the Docker port mapping to work
CMD ["npm", "run", "dev", "--", "--host"]