#!/bin/bash
set -e

echo "🍽️  Restaurant Management System — Setup"
echo "========================================"

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "❌ Docker not found. Please install Docker Desktop."
  exit 1
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  echo "❌ docker-compose not found."
  exit 1
fi

echo "✅ Docker found"

# Create logs directory
mkdir -p backend/logs frontend/dist

echo "🚀 Starting services..."

# Use docker compose (v2) or docker-compose (v1)
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

$COMPOSE down --remove-orphans 2>/dev/null || true
$COMPOSE up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ Restaurant Management System is running!"
echo ""
echo "  🌐 Frontend:  http://localhost:3000"
echo "  🔧 Backend:   http://localhost:5000"
echo "  ❤️  Health:   http://localhost:5000/health"
echo ""
echo "  👤 Admin:    admin@restaurant.com / password123"
echo "  👨‍🍳 Kitchen:  kitchen@restaurant.com / password123"
echo "  🍷 Waiter:   waiter@restaurant.com / password123"
echo ""
echo "  To stop: docker-compose down"
echo "  Logs:    docker-compose logs -f backend"
