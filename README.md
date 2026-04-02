# Community Platform

A modern, unified social community platform built with Next.js 16, React, TypeScript, and Supabase.

## Features

- User authentication with Supabase Auth
- Social feed with posts, comments, and likes
- Advanced search functionality
- User profiles with follow system
- Real-time notifications
- Direct messaging
- Admin moderation tools
- Payment integration with Stripe

## Tech Stack

- **Frontend:** Next.js 16, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **Form Validation:** React Hook Form, Zod
- **UI Components:** shadcn/ui compatible
- **Icons:** Lucide React
- **HTTP Client:** Axios

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account
- Stripe account (optional, for payments)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd community-platform
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
```

4. Set up the database

First, run the database setup script in your Supabase dashboard:
```
scripts/setup-database.sql
```

5. Start the development server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── (public)/              # Public pages (landing, auth)
│   ├── page.tsx          # Home page
│   ├── auth/
│   │   ├── login/
│   │   └── signup/
│   └── layout.tsx
├── community/            # Community pages
│   ├── page.tsx         # Feed
│   ├── search/          # Search page
│   ├── [postId]/        # Post detail
│   └── layout.tsx
├── profile/             # Profile pages
│   ├── [userId]/        # User profile
│   ├── settings/        # Profile settings
│   └── layout.tsx
├── api/                 # API routes
│   ├── posts/
│   ├── users/
│   ├── search/
│   └── ...
├── notifications/       # Notifications page
├── messages/            # Messaging page
├── admin/              # Admin dashboard
└── layout.tsx          # Root layout

components/
├── common/             # Shared components
├── auth/               # Auth components
├── community/          # Community components
├── user/              # User components
└── admin/             # Admin components

lib/
├── supabase.ts        # Supabase client
├── api-client.ts      # API helpers
├── validators.ts      # Zod schemas
└── constants.ts       # App constants

hooks/                 # Custom React hooks
types/                 # TypeScript types
styles/                # Global styles
public/               # Static assets
scripts/              # Setup scripts
```

## Database Schema

### Users
- id, email, display_name, avatar_url
- bio, location, website
- followers_count, following_count
- role (user, moderator, admin)

### Posts
- id, author_id, content, image_urls
- likes_count, comments_count, shares_count
- visibility (public, friends, private)

### Comments
- id, post_id, author_id, content
- likes_count

### Likes
- id, user_id, post_id/comment_id

### Follows
- id, follower_id, following_id

### Notifications
- id, user_id, type, related_post_id, is_read

### Messages
- id, sender_id, recipient_id, content, is_read

### Payments
- id, user_id, amount, status, stripe_session_id

### Reports
- id, reporter_user_id, report_type, reason, status

## API Routes

### Posts
- `GET /api/posts` - Get feed
- `POST /api/posts` - Create post
- `PUT /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post

### Users
- `GET /api/users/[id]` - Get user profile
- `PUT /api/users/[id]` - Update profile
- `POST /api/users/[id]/follow` - Follow user
- `DELETE /api/users/[id]/follow` - Unfollow user

### Search
- `GET /api/search?q=query&type=posts|users|all`

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/[id]/read` - Mark as read

### Messages
- `GET /api/messages` - Get conversations
- `GET /api/messages/[conversationId]` - Get messages
- `POST /api/messages/[conversationId]` - Send message

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

```bash
vercel deploy
```

### Docker

```bash
docker build -t community-platform .
docker run -p 3000:3000 community-platform
```

## Security

- Row Level Security (RLS) enabled on all tables
- JWT authentication with HTTP-only cookies
- Rate limiting on API endpoints
- Input validation with Zod
- CORS configured for safety

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT

## Support

For support, open an issue or contact the maintainers.

## Roadmap

- [ ] Real-time chat with WebSockets
- [ ] Video upload and streaming
- [ ] Advanced analytics
- [ ] AI-powered recommendations
- [ ] Mobile app (React Native)
- [ ] Blockchain integration for content ownership
- [ ] Community moderation tools enhancements
- [ ] Advanced search with filters
- [ ] User onboarding flow
- [ ] Email digests and notifications
