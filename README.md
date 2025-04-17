# MongoDB Reader

A React-based application for connecting to MongoDB databases and running queries against collections.

## Setup

Before running the application, you need to install all dependencies:

```bash
npm run install-all
```

This will install dependencies for:
- The main Next.js application
- The React client components
- The Express backend server

## Running the Application

To run the application in development mode:

```bash
npm run dev
```

This will start both the Next.js frontend and the Express backend server simultaneously.

If you want to only start the server:

```bash
npm run server
```

## Features

- Connect to MongoDB databases with multiple authentication methods
- View and select databases and collections
- Execute various queries (find, findOne, aggregate, etc.)
- View results in JSON or table format
- Multiple query editors in tabs

## Troubleshooting

If you encounter issues connecting to the server:

1. Make sure MongoDB is running on your system
2. Check that the server is running (port 5000)
3. If you see "Cannot find module" errors, run `npm run install-all` again
