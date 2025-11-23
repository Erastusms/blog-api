# API Usage Examples

Dokumentasi lengkap dengan contoh request dan response untuk semua endpoints.

## Base URL

```
http://localhost:3000/api/v1
```

---

## 🔐 Authentication

### Register User

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "username": "johndoe",
  "password": "password123"
}
```

**Response (201 Created)**

```json
{
  "user": {
    "id": "clx1234567890",
    "email": "john@example.com",
    "username": "johndoe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK)**

```json
{
  "user": {
    "id": "clx1234567890",
    "email": "john@example.com",
    "username": "johndoe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Refresh Token

```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK)**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Current User

```bash
GET /auth/me
Authorization: Bearer {accessToken}
```

**Response (200 OK)**

```json
{
  "id": "clx1234567890",
  "email": "john@example.com",
  "username": "johndoe",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 📝 Posts

### Create Post

```bash
POST /posts
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Introduction to NestJS",
  "content": "NestJS is a progressive Node.js framework...",
  "tags": ["nestjs", "typescript", "backend"],
  "published": true
}
```

**Response (201 Created)**

```json
{
  "id": "clx9876543210",
  "title": "Introduction to NestJS",
  "content": "NestJS is a progressive Node.js framework...",
  "slug": "introduction-to-nestjs-abc123",
  "tags": ["nestjs", "typescript", "backend"],
  "published": true,
  "authorId": "clx1234567890",
  "likesCount": 0,
  "dislikesCount": 0,
  "commentsCount": 0,
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z",
  "deletedAt": null,
  "author": {
    "id": "clx1234567890",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### Get All Posts (with Filters)

```bash
GET /posts?page=1&limit=10&search=nestjs&tag=typescript&published=true
```

**Response (200 OK)**

```json
{
  "data": [
    {
      "id": "clx9876543210",
      "title": "Introduction to NestJS",
      "content": "NestJS is a progressive Node.js framework...",
      "slug": "introduction-to-nestjs-abc123",
      "tags": ["nestjs", "typescript", "backend"],
      "published": true,
      "authorId": "clx1234567890",
      "likesCount": 5,
      "dislikesCount": 1,
      "commentsCount": 12,
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z",
      "deletedAt": null,
      "author": {
        "id": "clx1234567890",
        "username": "johndoe"
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Get Single Post

```bash
GET /posts/introduction-to-nestjs-abc123
Authorization: Bearer {accessToken} (optional)
```

**Response (200 OK)**

```json
{
  "id": "clx9876543210",
  "title": "Introduction to NestJS",
  "content": "NestJS is a progressive Node.js framework...",
  "slug": "introduction-to-nestjs-abc123",
  "tags": ["nestjs", "typescript", "backend"],
  "published": true,
  "authorId": "clx1234567890",
  "likesCount": 5,
  "dislikesCount": 1,
  "commentsCount": 12,
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z",
  "deletedAt": null,
  "author": {
    "id": "clx1234567890",
    "username": "johndoe",
    "email": "john@example.com"
  },
  "_count": {
    "comments": 12
  },
  "userLike": 1
}
```

### Update Post

```bash
PATCH /posts/introduction-to-nestjs-abc123
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Advanced NestJS Patterns",
  "published": true
}
```

### Delete Post (Soft Delete)

```bash
DELETE /posts/introduction-to-nestjs-abc123
Authorization: Bearer {accessToken}
```

**Response (204 No Content)**

### Like/Dislike Post

```bash
POST /posts/introduction-to-nestjs-abc123/like
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "value": 1
}
```

**Values:**

- `1` = Like
- `-1` = Dislike

**Response (200 OK)** - Returns updated post

---

## 💬 Comments

### Create Comment (Root Level)

```bash
POST /posts/introduction-to-nestjs-abc123/comments
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "Great article! Very informative."
}
```

**Response (201 Created)**

```json
{
  "id": "clx5555555555",
  "content": "Great article! Very informative.",
  "postId": "clx9876543210",
  "authorId": "clx1234567890",
  "parentId": null,
  "depth": 0,
  "likesCount": 0,
  "dislikesCount": 0,
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z",
  "deletedAt": null,
  "author": {
    "id": "clx1234567890",
    "username": "johndoe"
  }
}
```

### Create Reply (Nested Comment)

```bash
POST /posts/introduction-to-nestjs-abc123/comments
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "Thank you! Glad you found it helpful.",
  "parentId": "clx5555555555"
}
```

**Response (201 Created)**

```json
{
  "id": "clx6666666666",
  "content": "Thank you! Glad you found it helpful.",
  "postId": "clx9876543210",
  "authorId": "clx9999999999",
  "parentId": "clx5555555555",
  "depth": 1,
  "likesCount": 0,
  "dislikesCount": 0,
  "createdAt": "2024-01-15T12:05:00.000Z",
  "updatedAt": "2024-01-15T12:05:00.000Z",
  "deletedAt": null,
  "author": {
    "id": "clx9999999999",
    "username": "janedoe"
  }
}
```

### Get All Comments (Tree Structure)

```bash
GET /posts/introduction-to-nestjs-abc123/comments?page=1&limit=20
Authorization: Bearer {accessToken} (optional)
```

**Response (200 OK)**

```json
{
  "data": [
    {
      "id": "clx5555555555",
      "content": "Great article! Very informative.",
      "postId": "clx9876543210",
      "authorId": "clx1234567890",
      "parentId": null,
      "depth": 0,
      "likesCount": 3,
      "dislikesCount": 0,
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z",
      "deletedAt": null,
      "author": {
        "id": "clx1234567890",
        "username": "johndoe"
      },
      "userLike": 1,
      "children": [
        {
          "id": "clx6666666666",
          "content": "Thank you! Glad you found it helpful.",
          "postId": "clx9876543210",
          "authorId": "clx9999999999",
          "parentId": "clx5555555555",
          "depth": 1,
          "likesCount": 1,
          "dislikesCount": 0,
          "createdAt": "2024-01-15T12:05:00.000Z",
          "updatedAt": "2024-01-15T12:05:00.000Z",
          "deletedAt": null,
          "author": {
            "id": "clx9999999999",
            "username": "janedoe"
          },
          "userLike": null,
          "children": []
        }
      ]
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Update Comment

```bash
PATCH /posts/introduction-to-nestjs-abc123/comments/clx5555555555
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "content": "Updated: Great article! Very informative and well-written."
}
```

### Delete Comment

```bash
DELETE /posts/introduction-to-nestjs-abc123/comments/clx5555555555
Authorization: Bearer {accessToken}
```

**Response (204 No Content)**

### Like/Dislike Comment

```bash
POST /posts/introduction-to-nestjs-abc123/comments/clx5555555555/like
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "value": 1
}
```

---

## 🔔 Notifications

### Get All Notifications

```bash
GET /notifications?unreadOnly=true
Authorization: Bearer {accessToken}
```

**Response (200 OK)**

```json
[
  {
    "id": "clx7777777777",
    "userId": "clx1234567890",
    "type": "REPLY",
    "title": "New Reply",
    "message": "janedoe replied to your comment",
    "commentId": "clx6666666666",
    "read": false,
    "createdAt": "2024-01-15T12:05:00.000Z",
    "comment": {
      "id": "clx6666666666",
      "content": "Thank you! Glad you found it helpful.",
      "post": {
        "slug": "introduction-to-nestjs-abc123",
        "title": "Introduction to NestJS"
      }
    }
  }
]
```

### Get Unread Count

```bash
GET /notifications/unread-count
Authorization: Bearer {accessToken}
```

**Response (200 OK)**

```json
{
  "count": 3
}
```

### Mark as Read

```bash
PATCH /notifications/clx7777777777/read
Authorization: Bearer {accessToken}
```

**Response (204 No Content)**

### Mark All as Read

```bash
PATCH /notifications/read-all
Authorization: Bearer {accessToken}
```

**Response (204 No Content)**

---

## 👤 Users

### Get User by ID

```bash
GET /users/clx1234567890
```

**Response (200 OK)**

```json
{
  "id": "clx1234567890",
  "email": "john@example.com",
  "username": "johndoe",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "_count": {
    "posts": 5,
    "comments": 23
  }
}
```

### Get User Profile by Username

```bash
GET /users/username/johndoe
```

**Response (200 OK)**

```json
{
  "id": "clx1234567890",
  "username": "johndoe",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "posts": [
    {
      "id": "clx9876543210",
      "title": "Introduction to NestJS",
      "slug": "introduction-to-nestjs-abc123",
      "tags": ["nestjs", "typescript"],
      "likesCount": 5,
      "commentsCount": 12,
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "_count": {
    "posts": 5,
    "comments": 23
  }
}
```

---

## ⚠️ Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "You can only update your own posts",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Post not found",
  "error": "Not Found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "Email or username already exists",
  "error": "Conflict"
}
```

### 429 Too Many Requests (Rate Limit)

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Maximum 5 comments per 60 seconds.",
  "error": "Too Many Requests"
}
```

---

## 🔄 Rate Limiting Rules

### Comment Rate Limit

- **Limit**: 5 comments per 60 seconds per user
- **Scope**: Per user, across all posts
- **Storage**: Redis with automatic expiration

### Global Rate Limit

- **Limit**: 100 requests per minute
- **Scope**: Per IP address
- **Applied to**: All endpoints

---

## 🎯 Testing with cURL

### Complete Flow Example

```bash
# 1. Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# 2. Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.accessToken')

# 3. Create Post
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is my first blog post!",
    "tags": ["blog", "first-post"],
    "published": true
  }'

# 4. Get All Posts
curl http://localhost:3000/api/v1/posts?page=1&limit=10

# 5. Create Comment
curl -X POST http://localhost:3000/api/v1/posts/my-first-post-abc123/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great post!"
  }'

# 6. Like Post
curl -X POST http://localhost:3000/api/v1/posts/my-first-post-abc123/like \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": 1
  }'
```
