# 1. Node.js LTS version use karein
FROM node:18-slim

# 2. Python aur build essential tools install karein (pdf-parse aur sharp libraries ke liye zaroori hota hai)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 3. Working directory set karein
WORKDIR /app

# 4. Package files copy karein
COPY package*.json ./

# 5. Production dependencies install karein
RUN npm install --production

# 6. Poora code copy karein
COPY . .

# 7. Hugging Face Spaces port 7860 expect karta hai
ENV PORT=7860
EXPOSE 7860

# 8. App start karne ki command
CMD ["node", "index.js"]