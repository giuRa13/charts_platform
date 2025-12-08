
FROM node:18-slim

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /app

COPY requirement.txt .
RUN pip install -r requirement.txt 

# Copy Node.js dependencies and install them
COPY package*.json ./
RUN npm install

# Copy the rest of the backend code
COPY . .

# Create the database directory (if it doesn't exist)
RUN mkdir -p data

EXPOSE 3001

# Start the server
CMD ["node", "server.js"]