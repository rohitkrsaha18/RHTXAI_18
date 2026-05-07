

# RHTX AI — Full-Featured AI SaaS Platform

## Overview
A production-grade ChatGPT-style AI platform with multi-model chat, image generation, file handling, and user profiles — built with React, Tailwind, and Supabase (Lovable Cloud).

---

## 1. Authentication & User Profiles
- Email/password sign-up and login with Supabase Auth
- User profiles table with display name, avatar upload, and preferences
- Auto-created profile on signup via database trigger
- Protected routes — redirect unauthenticated users to login

## 2. ChatGPT-Style UI (Dark Theme)
- **Sidebar**: Chat history list, grouped by date, with search and "New Chat" button
- **Main chat area**: Streaming message bubbles with markdown rendering, code blocks with syntax highlighting, and a copy-code button
- **Input bar**: Text input with send button, file upload button, and image generation toggle
- **Image previews** rendered inline in chat with download option
- **Mobile responsive** layout with collapsible sidebar
- **Smooth animations** for message appearance and transitions
- Modern dark theme as default with clean typography

## 3. AI Chat System (Gemini Flash)
- Streaming responses via Supabase Edge Function calling the Lovable AI Gateway
- Multi-turn conversation memory — full message history sent with each request
- Real-time token-by-token rendering in the UI
- Error handling with toast notifications for rate limits (429) and payment issues (402)

## 4. Smart Task Router
- An AI classification step in the edge function that analyzes user intent
- Routes to:
  - **Text chat** (default) — Gemini Flash for reasoning/conversation
  - **Image generation** — Gemini image model for "generate an image of..." requests
  - **Document Q&A** — when a file is uploaded and user asks questions about it
- The routing uses a lightweight AI prompt to classify intent, not keyword matching

## 5. Image Generation
- Uses Gemini image model (google/gemini-2.5-flash-image) via Lovable AI Gateway
- Generated images displayed inline in chat
- Images stored in Supabase Storage bucket
- Download button on each generated image
- Image generation history saved in the database

## 6. File Upload & Document Q&A
- Upload PDF, DOCX, TXT files via Supabase Storage
- Text extraction in an edge function
- Document content stored and associated with conversations
- Users can ask questions about uploaded documents
- AI responds with answers grounded in the document content

## 7. Database Design (Supabase/PostgreSQL)
- **profiles** — user display name, avatar URL, preferences
- **conversations** — title, user_id, created/updated timestamps
- **messages** — role (user/assistant), content, conversation_id, message type (text/image/file)
- **files** — uploaded file metadata, storage path, user_id
- **generated_images** — prompt, image URL, user_id, conversation_id
- Proper foreign keys, indexes, and RLS policies so users only access their own data

## 8. Key UX Features
- Auto-generated conversation titles based on first message
- Conversation rename and delete
- Scroll-to-bottom on new messages
- Loading indicators during AI responses
- Empty state with suggested prompts to get started
- Settings page for profile editing and preferences

