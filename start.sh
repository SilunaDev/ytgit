#!/bin/bash

# Install Python if not available
if ! command -v python3 &> /dev/null; then
  echo "Installing Python..."
  apt update && apt install -y python3 python3-pip
fi

# Start your Node app
node index.js
