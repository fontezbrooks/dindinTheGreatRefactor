# dindinTheGreatRefactor

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Hono, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Mongoose** - TypeScript-first ORM
- **MongoDB** - Database engine
- **Authentication** - Email & password authentication with Better Auth
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses MongoDB with Mongoose.

1. Make sure you have MongoDB set up.
2. Update your `apps/server/.env` file with your MongoDB connection URI.

3. Apply the schema to your database:
```bash
bun db:push
```


Then, run the development server:

```bash
bun dev
```

Use the Expo Go app to run the mobile application.
The API is running at [http://localhost:3000](http://localhost:3000).



## Project Structure

```
dindinTheGreatRefactor/
├── apps/
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Hono, TRPC)
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `bun dev:native`: Start the React Native/Expo development server
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
