# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MongoDB Reader is a Next.js application for connecting to MongoDB databases, browsing collections, and executing queries with a specialized MongoDB editor. It consists of:

- Next.js frontend with React components
- Express backend for MongoDB connection management
- Material UI for the interface

## Commands

### Development
```bash
# Install all dependencies (frontend, server, client)
npm run install-all

# Start development server (both frontend and backend)
npm run dev

# Start only backend server
npm run server

# Build for production
npm run build
npm run start
```

## Architecture

### Frontend Structure
- `/pages/` - Next.js pages
- `/components/` - React components organized by category:
  - `/layout/` - Structural UI components (Header, Sidebar, TabPanel)
  - `/database/` - Database connection components
  - `/editor/` - Code editor and query components
  - `/ui/` - Generic UI components
- `/contexts/` - React contexts for state management
- `/styles/` - CSS styles

### Backend Structure
- `/server/server.js` - Express server entry point
- `/server/routes/` - API endpoints:
  - `connections.js` - Connection management
  - `databases.js` - Database and collection operations
  - `queries.js` - Query execution
- `/server/models/` - Database models

### State Management
The application uses React Context for state management:
- `ConnectionContext` - Manages database connections, active databases, and query execution

## Component Organization

All components should follow these organization principles:
1. Place components in the appropriate category subdirectory
2. Export components from their subdirectory's index.js
3. Import components from their category, not directly from files

Example:
```javascript
// CORRECT:
import { MongoCodeEditor } from '../components/editor';

// INCORRECT:
import MongoCodeEditor from '../components/editor/MongoCodeEditor';
```

## Code Editor Implementation

The MongoDB code editor has several implementations with different capabilities:
- `MongoCodeEditor.js` - Full-featured editor with syntax highlighting and auto-completion
- `SimpleMongoEditor.js` - Simplified version with fewer features
- `UltraSimpleEditor.js` - Textarea-based editor for maximum focus stability

When modifying or extending the editors, ensure:
1. Similar API between implementations
2. Focus handling is preserved
3. Dark/light mode support works consistently

## MongoDB Query Processing

The application supports MongoDB shell syntax:
1. Shell commands (db.collection.operation())
2. Cursor methods (sort, limit, skip)
3. Aggregation pipelines

When modifying query processing code, maintain compatibility with MongoDB shell syntax.

## Important Patterns

1. **Event-based communication**:
   Components communicate via CustomEvents:
   ```javascript
   // Dispatch event
   window.dispatchEvent(new CustomEvent('event-name', { detail: data }));
   
   // Listen for event
   window.addEventListener('event-name', handleEvent);
   ```

2. **Connection management**:
   - Active connections are stored in both client state and server
   - Each connection has a unique token for authentication
   - API calls include the connection token for routing to the right database

3. **Code editor interaction**:
   - Components like QueryEditor expose methods via React refs
   - Ref methods include getCursorPosition, getSelection, etc.