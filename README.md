# Pigeon App

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.0.1-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D19.0.0-brightgreen.svg)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange.svg)
![Svelte](https://img.shields.io/badge/svelte-4.0%2B-red.svg)
![TypeScript](https://img.shields.io/badge/typescript-4.0%2B-blue.svg)
![Tauri](https://img.shields.io/badge/tauri-2.0%2B-00c8a0.svg)

Fast and secure messenger for communication built with modern web technologies.

## Overview

Pigeon App is a cross-platform messaging application that provides fast and secure communication. It's built using Tauri for the desktop version and SvelteKit for the web interface.

## Features

- **Cross-platform**: Desktop application using Tauri + Web interface using SvelteKit
- **Real-time messaging**: WebSocket-based real-time communication
- **File attachments**: Support for file uploads (up to 8MB)
- **Avatar management**: User and chat avatar customization
- **Secure authentication**: JWT-based authentication system
- **Type-safe**: Full TypeScript implementation

## Technology Stack

### Frontend
- **SvelteKit** - Modern web framework
- **TypeScript** - Type-safe JavaScript
- **Lucide Svelte** - Icon library
- **@tanstack/svelte-query** - Data fetching and state management

### Backend (Desktop)
- **Tauri** - Rust-based desktop app framework
- **Rust** - Systems programming language
- **tokio** - Async runtime
- **reqwest** - HTTP client
- **tokio-tungstenite** - WebSocket client

### Development Tools
- **Vite** - Build tool and dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Project Structure

```
pigeon-app/
├── src/                   # Frontend source code
│   ├── lib/               # Utility libraries and components
│   │   ├── components/    # Svelte components
│   │   │   ├── forms/     # Form components
│   │   │   │   └── modals/ # Modal components
│   │   │   ├── layout/    # Layout components
│   │   │   ├── media/     # Media-related components
│   │   │   ├── navigation/ # Navigation components
│   │   │   ├── overlays/  # Overlay components
│   │   │   └── shared/    # Shared components
│   │   ├── i18n/          # Internationalization
│   │   │   └── translations/ # Translation files
│   │   ├── queries/       # Data query functions
│   │   ├── stores/        # Svelte stores
│   │   └── types/         # TypeScript types
│   ├── routes/            # Svelte routes
│   ├── app.html           # Svelte app.html
│   ├── app.d.ts           # Svelte app.d.ts
│   └── global.d.ts        # Global type definitions
├── src-tauri/             # Desktop app source code
│   ├── src/
│   │   ├── lib.rs         # Main library
│   │   ├── main.rs        # Application entry point
│   │   └── websocket.rs   # WebSocket implementation
│   ├── capabilities/      # Tauri capabilities
│   ├── gen/               # Generated schemas
│   ├── icons/             # Application icons
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── static/                # Static assets
│   ├── assets/            # Static assets
│   │   └── image/         # Image assets
│   ├── favicon.png        # Application favicon
│   ├── global.css         # Global styles
│   └── manifest.json      # Web manifest
├── package.json           # Node.js dependencies
├── svelte.config.js       # Svelte configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Rust and Cargo
- Tauri CLI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/BenimFurka/pigeon-app.git
cd pigeon-app
```

2. Install dependencies:
```bash
npm install
```

3. Install Tauri CLI (if not already installed):
```bash
npm install -g @tauri-apps/cli
```

### Development

#### Web Development
```bash
npm run dev
```

#### Desktop Development
```bash
npm run tauri dev
```

### Building

#### Web Build
```bash
npm run build
```

#### Desktop Build
```bash
npm run tauri build
```

## Configuration

The application uses a configuration system that can be customized:

- **Server Configuration**: Host, port, and API settings
  > NOTE: The server configuration is not public. It's private and used for development purposes.

- **WebSocket Settings**: Reconnection delay and other WebSocket options
- **App Settings**: Default language and version

Configuration is stored in [src/config.ts](src/config.ts) and can be persisted to localStorage.

## Development Scripts

```bash
# Development
npm run dev              # Start web development server
npm run tauri dev        # Start desktop development

# Building
npm run build            # Build for web
npm run tauri build      # Build desktop application

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run check            # Run Svelte type checking
npm run check:watch      # Watch mode for type checking

# Preparation
npm run prepare          # Sync SvelteKit
```

## License

This project is licensed under the GPL-v3.0 License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

> Thank you for using Pigeon App!