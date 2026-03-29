# 📚 Chat V3 Architecture & Implementation Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Web Browser)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  chat.html → chat.js → supabase.js                           │
│       ↓                      ↓                               │
│  [Chat UI]  ←→ [Realtime Logic] ←→ [Supabase Client]      │
│       ↓                                                      │
│  admin.html → admin.js                                      │
│       ↓                      ↓                               │
│  [Admin UI] ←→ [Moderation Logic] ←→ [Supabase Client]     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                  SUPABASE (Backend)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  PostgreSQL DB   │  │  Storage Bucket  │                │
│  │                  │  │                  │                │
│  │ • chat_rooms     │  │ • chat-images/   │                │
│  │ • chat_messages  │  │   (user avatars) │                │
│  │ • chat_users     │  │   (message imgs) │                │
│  │ • chat_reports   │  │                  │                │
│  │ • chat_bans      │  └──────────────────┘                │
│  │                  │                                       │
│  │ ┌──────────────┐ │  ┌──────────────────┐                │
│  │ │ Realtime     │ │  │ Auth System      │                │
│  │ │ Subscriptions│ │  │ (Email/Password) │                │
│  │ └──────────────┘ │  └──────────────────┘                │
│  └──────────────────┘                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Message Flow

### Sending a Message with Image

```
User Types in Composer
       ↓
User Clicks Send
       ↓
chat.js: sendMessage()
       ├─ Check auth
       ├─ Rate limit check (1 msg/sec)
       ├─ Validate message/image
       ├─ uploadChatImage() → Supabase Storage
       │       ├─ compress image
       │       ├─ upload to chat-images/
       │       └─ get public URL
       ├─ Extract mentions from text
       ├─ Insert into chat_messages table
       └─ Clear input & preview
           ↓
       supabase.js: supabase.from('chat_messages').insert()
           ↓
       PostgreSQL: INSERT INTO chat_messages
           ↓
       Realtime Broadcast
           ↓
       All clients subscribe to room
           ↓
       chat.js: renderMessage() displays new message
           ↓
       User sees message with image!
```

### Search Flow

```
User Types Search Term
       ↓
User Presses Enter
       ↓
chat.js: setupSearch() listener
       ├─ Get search query
       └─ supabase.from('chat_messages').ilike('text', '%query%')
           ↓
       PostgreSQL: SELECT * FROM chat_messages WHERE text ILIKE
           ↓
       Results returned to frontend
           ↓
       chat.js: renderMessages(results)
           ↓
       Results displayed in message container
```

### Admin Moderation Flow

```
User Reports Message
       ↓
chat.js: reportMessage()
       ├─ Get reason from prompt
       └─ Insert into chat_reports
           ↓
       Admin Opens admin.html
           ↓
       admin.js: checkAdminAccess()
       ├─ Verify user is admin role
       └─ Load all pending reports
           ↓
       Displays report cards with:
       ├─ Reported message content
       ├─ Reason for report
       ├─ Reporter name
       ├─ Delete button
       ├─ Ban button
       └─ Resolve button
           ↓
       Admin clicks "Delete"
           ├─ Deletes message from chat_messages
           └─ Marks report as resolved
           ↓
       Admin clicks "Ban User"
       ├─ Opens modal
       ├─ Selects ban duration
       └─ Creates chat_bans record
           ↓
       Report marked as resolved
       System prevents banned user from sending messages
```

---

## 📊 Data Models

### Message Object
```javascript
{
  id: 123,
  room_id: "general",
  sender_id: "uuid-xxx",
  sender_name: "Alice",
  text: "Hey @Bob, check this out!",
  image_url: "https://supabase.co/.../image.jpg", // Optional
  reply_to: {                                      // Optional
    id: 122,
    sender_name: "Charlie",
    text: "What do you think?"
  },
  mentions: ["Bob"],
  pinned_at: "2026-03-29T10:00:00Z",  // Optional
  created_at: "2026-03-29T10:05:00Z"
}
```

### Report Object
```javascript
{
  id: 456,
  room_id: "general",
  message_id: 123,
  reported_by_uid: "uuid-reporter",
  reported_by_name: "David",
  reported_user_name: "Spammer",
  message_text: "BUY CRYPTO NOW!!!",
  reason: "spam",
  resolved: false,
  created_at: "2026-03-29T10:10:00Z"
}
```

### User Object
```javascript
{
  id: "uuid-xxx",
  display_name: "Alice",
  role: "user",           // or "admin", "moderator"
  is_online: true,
  last_seen: "2026-03-29T10:15:00Z",
  created_at: "2026-03-29T09:00:00Z"
}
```

---

## 🔐 Security Architecture

### Authentication
- Supabase Auth handles login/signup
- Email + password authentication
- JWT tokens stored in browser session
- Auto-refresh on page reload

### Row Level Security (RLS)
```
chat_messages:
  ✅ Anyone can read
  ✅ Only sender can delete
  ✅ Only owner or admin can pin
  
chat_users:
  ✅ Anyone can read (online status)
  ✅ Users can update own profile only
  
chat_reports:
  ✅ Only admins can read
  ✅ Any user can submit
  ✅ Only admins can mark resolved
```

### Image Security
- User IDs prepended to filenames: `userId/timestamp-filename.jpg`
- Files cannot be overwritten (timestamp + random)
- Storage bucket public read, authenticated write only
- Images served via CDN with caching

---

## ⚙️ Configuration Files

### `supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js@2.39.0'

const SUPABASE_URL = 'https://shzxqulhxwmjdipjkwqe.supabase.co'
const SUPABASE_KEY = 'sb_publishable_l5VdADKMm4fwADcrpZn-...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
```

Exports:
- `supabase` - Configured client
- `signUp()` - Register new user
- `signIn()` - Login with email/password
- `signOut()` - Logout
- `getCurrentUser()` - Get session user
- `onAuthStateChange()` - Listen for auth changes
- `subscribeToMessages()` - Real-time messages
- `subscribeToOnlineStatus()` - Real-time user status
- `subscribeToReports()` - Real-time reports

### `chat.js`
Main chat client. Key functions:
- `loadRooms()` - Load all chat rooms
- `switchRoom()` - Change active room
- `loadMessages()` - Load room messages
- `sendMessage()` - Send new message
- `uploadChatImage()` - Upload to Storage
- `deleteMessage()` - Delete message
- `reportMessage()` - Report message
- `togglePinMessage()` - Pin/unpin
- `setupSearch()` - Initialize search
- `setupEmojiPicker()` - Initialize emojis
- `loadOnlineUsers()` - Update presence

### `admin.js`
Admin dashboard client. Key functions:
- `checkAdminAccess()` - Verify admin role
- `loadReports()` - Load all reports
- `renderReports()` - Render report UI
- `deleteMessage()` - Admin delete
- `toggleResolve()` - Mark resolved
- `openBanModal()` - Open ban dialog
- `applyFilters()` - Filter reports

---

## 📈 Database Relationships

```
auth.users
    ↓
    ├→ chat_users (1:1)
    ├→ chat_messages (1:many) - sender_id
    ├→ chat_reports (1:many) - reported_by_uid
    └→ chat_bans (1:many) - created_by

chat_rooms (1:many)
    ├→ chat_messages
    └→ chat_reports

chat_messages (1:many)
    ├→ chat_reports (message_id)
    └→ Self-referencing (reply_to JSONB)
```

---

## 🚀 Deployment Checklist

- [ ] Run all SQL from SUPABASE_SETUP.sql
- [ ] Create chat-images storage bucket (public)
- [ ] Enable all RLS policies
- [ ] Test user registration flow
- [ ] Test message sending + receiving
- [ ] Test image upload
- [ ] Verify pinned messages display
- [ ] Test search functionality
- [ ] Promote test user to admin
- [ ] Test admin dashboard access
- [ ] Test message deletion
- [ ] Test user banning
- [ ] Verify rate limiting works
- [ ] Test @mentions highlighting
- [ ] Test reply threads
- [ ] Check emoji picker
- [ ] Mobile responsive testing
- [ ] Performance load test (many messages)
- [ ] Security: Try to delete others' messages (should fail)
- [ ] Security: Try to access admin panel as user (should fail)

---

## 🔧 Troubleshooting

### Images not uploading?
- Check chat-images bucket exists and is public
- Verify user auth token is valid
- Check browser console for upload errors
- Ensure images < 5MB

### Search not returning results?
- Messages must contain exact text (ILIKE case-insensitive)
- Try searching for common words
- Verify PostgreSQL full-text search enabled

### Admin dashboard not loading?
- Confirm user role = 'admin' in database
- Check user is logged in with correct email
- Look for JWT token in localStorage
- Check RLS policies on chat_reports table

### Real-time not working?
- Verify Supabase realtime enabled
- Check room ID matches exactly
- Look for subscription errors in console
- Try refreshing page

---

## 📚 References

- Supabase Docs: https://supabase.com/docs
- PostgreSQL: https://www.postgresql.org/docs/
- Realtime: https://supabase.com/docs/guides/realtime
- Storage: https://supabase.com/docs/guides/storage
- Auth: https://supabase.com/docs/guides/auth

---

**All documentation complete!** Ready for production. 🚀
