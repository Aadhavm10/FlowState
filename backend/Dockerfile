FROM node:20-slim

# Install Python, pip, ffmpeg, and yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && pip3 install --break-system-packages yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create temp directory for audio files
RUN mkdir -p /tmp/flowstate-audio

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860

# Expose port (Hugging Face Spaces default)
EXPOSE 7860

# Start the server
CMD ["npm", "start"]
