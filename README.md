# Blog API with Nested Comments System

Proyek Blog API lengkap dengan sistem komentar berjenjang (nested comments), like/dislike, rate limiting, dan caching menggunakan NestJS, Prisma, PostgreSQL, dan Redis.

## 🚀 Fitur Utama

### Authentication & Authorization

- ✅ JWT-based authentication dengan refresh token mechanism
- ✅ Secure password hashing menggunakan bcrypt
- ✅ Protected routes dengan JWT guards

### Post Management

- ✅ Full CRUD operations untuk postingan
- ✅ Auto-generated SEO-friendly slugs
- ✅ Tagging system
- ✅ Draft/Published status
- ✅ Global search (title, content, tags)
- ✅ Pagination support
- ✅ Soft delete dengan audit trail

### Comment System

- ✅ Nested comments hingga 7 level depth
- ✅ Tree structure untuk hierarki komentar
- ✅ Reply to comment functionality
- ✅ Soft delete
- ✅ Rate limiting: 5 comments per 60 seconds per user

### Like/Dislike System

- ✅ Like/Dislike untuk posts dan comments
- ✅ Toggle mechanism (un-like/un-dislike)
- ✅ Switch between like and dislike
- ✅ Composite primary key mencegah double voting
- ✅ Real-time counter update

### Performance Optimization

- ✅ Redis caching untuk posts dan comments (5 minutes TTL)
- ✅ Automatic cache invalidation
- ✅ Database indexing untuk query optimization
- ✅ Pagination untuk semua list endpoints

### Notification System

- ✅ Notifikasi saat ada reply pada comment
- ✅ Read/Unread status
- ✅ Unread count endpoint
- ✅ Mark as read functionality

## 🛠 Tech Stack

- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT (Passport)
- **Validation**: class-validator
- **Testing**: Jest + Supertest
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## 📦 Installation

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm atau yarn

### Setup

1. **Clone repository**

```bash
git clone <repository-url>
cd blog-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup environment variables**

```bash
cp .env.example .env
```

Edit `.env` file:

```env
NODE_ENV=development
DATABASE_URL=postgresql://bloguser:blogpass@localhost:5432/blogdb?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_COMMENT_MAX=5
RATE_LIMIT_COMMENT_WINDOW=60
```

4. **Start services dengan Docker**

```bash
docker-compose up -d
```

5. **Run migrations**

```bash
npx prisma migrate dev
```

6. **Generate Prisma Client**

```bash
npx prisma generate
```

7. **Start development server**

```bash
npm run start:dev
```

API akan berjalan di `http://localhost:3000`

## 📚 API Documentation

Swagger documentation tersedia di: `http://localhost:3000/api/docs`

### Main Endpoints

#### Authentication

- `POST /api/v1/auth/register` - Register user baru
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user info

#### Posts

- `GET /api/v1/posts` - Get all posts (with pagination, search, filters)
- `GET /api/v1/posts/:slug` - Get post by slug
- `POST /api/v1/posts` - Create new post (protected)
- `PATCH /api/v1/posts/:slug` - Update post (protected, own posts only)
- `DELETE /api/v1/posts/:slug` - Delete post (protected, own posts only)
- `POST /api/v1/posts/:slug/like` - Like/Dislike post (protected)

#### Comments

- `GET /api/v1/posts/:postSlug/comments` - Get all comments for a post
- `POST /api/v1/posts/:postSlug/comments` - Create comment (protected)
- `PATCH /api/v1/posts/:postSlug/comments/:id` - Update comment (protected)
- `DELETE /api/v1/posts/:postSlug/comments/:id` - Delete comment (protected)
- `POST /api/v1/posts/:postSlug/comments/:id/like` - Like/Dislike comment (protected)

#### Notifications

- `GET /api/v1/notifications` - Get user notifications (protected)
- `GET /api/v1/notifications/unread-count` - Get unread count (protected)
- `PATCH /api/v1/notifications/:id/read` - Mark as read (protected)
- `PATCH /api/v1/notifications/read-all` - Mark all as read (protected)

#### Users

- `GET /api/v1/users/:id` - Get user by ID
- `GET /api/v1/users/username/:username` - Get user profile

## 🧪 Testing

### Run all tests

```bash
npm test
```

### Run tests with coverage

```bash
npm run test:cov
```

### Run e2e tests

```bash
npm run test:e2e
```

Target coverage: **70%** (branches, functions, lines, statements)

## 🏗 Architecture & Design Patterns

### Database Schema

- **Users**: User accounts dengan authentication
- **Posts**: Blog posts dengan tagging dan status publikasi
- **Comments**: Nested comments dengan parent-child relationship
- **PostLikes & CommentLikes**: Composite key untuk prevent double voting
- **RefreshTokens**: Secure token storage
- **Notifications**: User notification system

### Key Design Decisions

#### 1. Nested Comments Implementation

```typescript
// Setiap comment menyimpan depth dan parentId
{
  id: "comment-1",
  parentId: null,  // root comment
  depth: 0,
  content: "Root comment"
}

{
  id: "comment-2",
  parentId: "comment-1",  // reply to comment-1
  depth: 1,
  content: "Reply to root"
}
```

Comments di-query semua untuk satu post, lalu dibangun tree structure di backend.

#### 2. Like/Dislike System

```typescript
// Composite primary key
@@id([userId, postId])

// Values
value: 1  // Like
value: -1 // Dislike

// Toggle logic:
- Same value = delete (un-like/un-dislike)
- Different value = update (like to dislike or vice versa)
```

#### 3. Rate Limiting

```typescript
// Redis key pattern
rate_limit: comment: user: {
  userId;
}

// Increment counter, expire after 60 seconds
// Max 5 comments per 60 seconds
```

#### 4. Caching Strategy

```typescript
// Cache keys
post:{slug}                    // Single post (5 min TTL)
posts:list:{query}             // Post list (5 min TTL)
comments:post:{postId}         // Comments tree (5 min TTL)

// Invalidation triggers:
- Post created/updated/deleted → invalidate post & lists
- Comment created/deleted → invalidate comments & post
- Like/dislike → invalidate related post/comment
```

## 🔒 Security Features

- ✅ Password hashing dengan bcrypt (salt rounds: 10)
- ✅ JWT token dengan expiration
- ✅ Refresh token rotation
- ✅ Input validation menggunakan class-validator
- ✅ SQL injection protection (Prisma ORM)
- ✅ Rate limiting untuk prevent spam
- ✅ CORS enabled
- ✅ Helmet middleware untuk security headers (recommended to add)

## 📊 Performance Optimizations

1. **Database Indexing**
   - Compound indexes pada foreign keys
   - Index pada frequently queried fields (slug, published, createdAt)

2. **Caching**
   - Redis caching untuk read-heavy operations
   - Automatic cache invalidation

3. **Query Optimization**
   - Selective field loading dengan Prisma `select`
   - Pagination untuk large datasets
   - Efficient tree building algorithm

4. **Rate Limiting**
   - Prevent spam dan abuse
   - Redis-based counter dengan automatic expiration

## 🚢 Deployment

### Production Build

```bash
npm run build
npm run start:prod
```

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables (Production)

- Ganti semua secret keys
- Set `NODE_ENV=production`
- Use strong database passwords
- Configure proper CORS origins
- Set up SSL/TLS

## 📝 Development Notes

### Prisma Commands

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# View database
npx prisma studio

# Generate client
npx prisma generate
```

### Useful Commands

```bash
# Format code
npm run format

# Lint code
npm run lint

# Run in watch mode
npm run start:dev

# Debug mode
npm run start:debug
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

Your Name - [your@email.com](mailto:your@email.com)

## 🙏 Acknowledgments

- NestJS team untuk framework yang luar biasa
- Prisma team untuk ORM yang powerful
- Community untuk inspirasi dan best practices
