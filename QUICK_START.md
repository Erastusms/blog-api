# 🚀 Quick Start Guide

Panduan setup cepat untuk menjalankan proyek dalam 5 menit!

## Prerequisites

Pastikan Anda sudah menginstall:

- ✅ Node.js 18+ ([Download](https://nodejs.org/))
- ✅ Docker & Docker Compose ([Download](https://www.docker.com/))
- ✅ Git ([Download](https://git-scm.com/))

## Setup Langkah demi Langkah

### 1️⃣ Clone & Install

```bash
# Clone repository (ganti dengan URL repo Anda)
git clone <repository-url>
cd blog-api

# Install dependencies
npm install
```

### 2️⃣ Setup Environment

```bash
# Copy environment file
cp .env.example .env

# File .env sudah ter-konfigurasi dengan default values
# Tidak perlu edit kecuali ingin mengubah konfigurasi
```

### 3️⃣ Start Docker Services

```bash
# Start PostgreSQL & Redis
docker-compose up -d

# Tunggu beberapa detik sampai services ready
# Check status
docker-compose ps
```

Expected output:

```
NAME              COMMAND                  SERVICE    STATUS
blog_api          "docker-entrypoint.s…"   api        Up
blog_postgres     "docker-entrypoint.s…"   postgres   Up (healthy)
blog_redis        "docker-entrypoint.s…"   redis      Up (healthy)
```

### 4️⃣ Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database dengan sample data
npm run prisma:seed
```

### 5️⃣ Start Development Server

```bash
# Start NestJS server
npm run start:dev
```

Server akan berjalan di: `http://localhost:3000`

### 6️⃣ Test API

Buka browser dan akses:

- **Swagger Docs**: http://localhost:3000/api/docs
- **Test Endpoint**: http://localhost:3000/api/v1/posts

Atau test dengan curl:

```bash
curl http://localhost:3000/api/v1/posts
```

---

## 🎯 Quick Test Flow

### 1. Register User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### 2. Get Access Token

```bash
# Login dan simpan token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.accessToken')

echo $TOKEN
```

### 3. Create Post

```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "Hello World! This is my first blog post.",
    "tags": ["hello", "first-post"],
    "published": true
  }'
```

### 4. Get Posts

```bash
curl http://localhost:3000/api/v1/posts
```

---

## 🔧 Useful Commands

### Development

```bash
# Start dengan watch mode (auto-reload)
npm run start:dev

# Start dengan debug mode
npm run start:debug

# Format code
npm run format

# Lint code
npm run lint
```

### Database

```bash
# Open Prisma Studio (Database GUI)
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed database
npm run prisma:seed
```

### Docker

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis

# Restart services
docker-compose restart

# Remove all data (including volumes)
docker-compose down -v
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

---

## 📊 Check Services Status

### PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it blog_postgres psql -U bloguser -d blogdb

# Inside psql, run:
\dt  # List tables
\q   # Quit
```

### Redis

```bash
# Connect to Redis
docker exec -it blog_redis redis-cli

# Inside redis-cli, run:
PING          # Should return PONG
KEYS *        # List all keys
GET post:*    # Get cached posts
EXIT
```

### API Health

```bash
# Check if API is running
curl http://localhost:3000/api/v1/posts

# Check Swagger docs
curl http://localhost:3000/api/docs
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Problem**: Port 5432 or 6379 or 3000 already in use

**Solution**:

```bash
# Option 1: Stop conflicting services
# For PostgreSQL
sudo systemctl stop postgresql

# For Redis
sudo systemctl stop redis

# Option 2: Change ports in docker-compose.yml
# Edit ports section, e.g., "5433:5432" instead of "5432:5432"
```

### Database Connection Error

**Problem**: `Can't reach database server`

**Solution**:

```bash
# Check if PostgreSQL container is running
docker-compose ps

# If not running, start it
docker-compose up -d postgres

# Wait for health check to pass
docker-compose logs postgres

# Check connection
docker exec -it blog_postgres psql -U bloguser -d blogdb -c "SELECT 1"
```

### Redis Connection Error

**Problem**: `Error connecting to Redis`

**Solution**:

```bash
# Check if Redis container is running
docker-compose ps

# Start Redis
docker-compose up -d redis

# Test connection
docker exec -it blog_redis redis-cli PING
```

### Migration Errors

**Problem**: `Migration failed`

**Solution**:

```bash
# Reset database and run migrations again
npx prisma migrate reset

# Or manually reset
docker-compose down -v
docker-compose up -d
npx prisma migrate dev
```

### Node Modules Issues

**Problem**: `Module not found` or dependency errors

**Solution**:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
npm install
```

---

## 🎨 Development with Prisma Studio

Prisma Studio adalah GUI untuk melihat dan mengedit data database.

```bash
# Start Prisma Studio
npx prisma studio
```

Buka browser: `http://localhost:5555`

Anda bisa:

- ✅ View all tables
- ✅ Browse records
- ✅ Edit data directly
- ✅ Create new records
- ✅ Delete records

---

## 🔐 Default Credentials (Seeded Data)

Jika Anda menjalankan `npm run prisma:seed`, data berikut tersedia:

### User 1

- Email: `john@example.com`
- Username: `john_doe`
- Password: `password123`

### User 2

- Email: `jane@example.com`
- Username: `jane_smith`
- Password: `password123`

---

## 📱 Test with Swagger

1. Buka: http://localhost:3000/api/docs
2. Klik **Authorize** button (🔒)
3. Login untuk mendapatkan token:
   - Gunakan endpoint `/auth/login`
   - Copy `accessToken` dari response
4. Paste token di Authorization dialog: `Bearer {your_token}`
5. Sekarang Anda bisa test semua protected endpoints!

---

## 🚀 Production Deployment

### Build untuk Production

```bash
# Build aplikasi
npm run build

# Test production build locally
npm run start:prod
```

### Environment Variables untuk Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@production-db:5432/blogdb
REDIS_HOST=production-redis
JWT_SECRET=your-very-secure-secret-key
JWT_REFRESH_SECRET=your-very-secure-refresh-key
```

### Docker Production

```bash
# Build production image
docker build -t blog-api:latest .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 Next Steps

1. ✅ Explore Swagger Documentation: http://localhost:3000/api/docs
2. ✅ Read full API examples: `API_EXAMPLES.md`
3. ✅ Check test files untuk best practices
4. ✅ Customize sesuai kebutuhan Anda
5. ✅ Add more features (email notifications, file uploads, etc.)

---

## 💡 Pro Tips

1. **Use Prisma Studio** untuk quick data inspection
2. **Enable hot reload** dengan `npm run start:dev`
3. **Use Swagger** untuk test API tanpa Postman
4. **Check Redis cache** dengan `redis-cli` untuk debug caching
5. **Monitor logs** dengan `docker-compose logs -f` untuk troubleshooting

---

## 🆘 Need Help?

- 📖 Read full README.md
- 📝 Check API_EXAMPLES.md
- 🐛 Check GitHub Issues
- 💬 Join community discussions

---

**Happy Coding! 🎉**
