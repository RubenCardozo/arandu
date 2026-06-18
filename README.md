# Arandu — Digital Newspaper & Local Services Directory

<p align="center">
  <img src="assets/arandu_banner.png" alt="Arandu Banner" width="100%" />
</p>

**Arandu** is a modern, premium digital newspaper and classifieds catalog platform designed for the Spanish-speaking community in Geneva, Switzerland. The platform provides localized cultural journalism, community announcements, jobs, and neighborhood service directories, with integrated user feedback and administrative controls.

---

## 📖 Table of Contents
1. [For Non-Technical Readers (Overview)](#-for-non-technical-readers-overview)
2. [For Technical Readers (Architecture Overview)](#-for-technical-readers-architecture-overview)
3. [Platform Architecture Diagram](#-platform-architecture-diagram)
4. [How It Works Under the Hood](#-how-it-works-under-the-hood)
   - [Frictionless User Interactions](#frictionless-user-interactions)
   - [Administrative Security Isolation](#administrative-security-isolation)
5. [Project Directory Structure](#-project-directory-structure)
6. [Getting Started & Local Installation](#-getting-started--local-installation)
   - [Prerequisites](#prerequisites)
   - [Backend API Setup](#1-backend-api-setup)
   - [Public Frontend Setup](#2-public-frontend-setup)
   - [Admin Frontend Setup](#3-admin-frontend-setup)
7. [Running Tests](#-running-tests)

---

## 👥 For Non-Technical Readers (Overview)

Arandu bridges the gap between local journalism and neighborhood commerce. It is divided into two distinct portals:

* **The Public Website (frontend-public)**:
  * **Read Local News**: Access the *Archivo Editorial* for cultural, economic, and community articles in Geneva.
  * **Search & Filter Directory**: Easily find classified ads (electricians, cleaners, jobs, flat rentals) by typing search terms or filtering by categories.
  * **Engage Anonymously**: Share feedback instantly on any news card or classified listing. You can **like** a post, rate it **1 to 5 stars**, or read and write **comments** without needing to sign up or create an account.
* **The Administration Console (frontend-admin)**:
  * **Manage Content**: A secure dashboard where editors and administrators can publish new articles, review job postings, and organize local directory listings.
  * **Protected Environment**: Completely locked down so that only authorized administrators can access dashboard controls.

---

## 💻 For Technical Readers (Architecture Overview)

Arandu uses a decoupled, scalable, modern stack:

* **Frontend Framework**: **Angular 21** with **Standalone Components**, utilizing Tailwind CSS v4 for clean typography, sage green accents, and a dynamic, retro-newspaper layout.
* **Architecture Pattern**: **Model-View-ViewModel (MVVM)**. All direct communications with external providers (such as Supabase) are abstracted into specialized services (e.g., `InteractionService`, `MediaService`), keeping the components slim and declarative.
* **Backend Layer**: **NestJS** coupled with **Drizzle ORM** for offline schema generation, database migrations, and structural database typing.
* **Database & Auth Provider**: **Supabase (PostgreSQL)**. Supabase Auth handles identity tokens, and the database stores articles, ads, user comments, and ratings.

---

## 📊 Platform Architecture Diagram

The diagram below outlines how the components interact across the frontend, service layer, backend, and Supabase cloud services:

```mermaid
graph TD
    subgraph Frontend Applications (Angular 21)
        PublicApp[frontend-public: Public Site]
        AdminApp[frontend-admin: Admin Panel]
    end

    subgraph Service Layer (MVVM Pattern)
        MediaSrv[MediaService]
        CatalogSrv[ServicesCatalogService]
        JobSrv[JobsService]
        InteractSrv[InteractionService]
        AuthSrv[AuthService]
        SupaSrv[SupabaseService]
    end

    subgraph Backend Layer (NestJS API)
        NestApp[NestJS Backend API]
        DrizzleORM[Drizzle ORM]
    end

    subgraph Database & Identity Layer (Supabase)
        SupaAuth[Supabase Auth Services]
        SupaDB[(PostgreSQL Database)]
    end

    %% Routing / Guarding
    AdminApp -->|Guarded by AuthGuard| Dashboard[Admin Dashboard]
    
    %% API Services to Supabase / Backend Connections
    PublicApp --> MediaSrv
    PublicApp --> CatalogSrv
    PublicApp --> JobSrv
    PublicApp --> InteractSrv
    
    AdminApp --> AuthSrv
    AdminApp --> InteractSrv

    MediaSrv --> SupaSrv
    CatalogSrv --> SupaSrv
    JobSrv --> SupaSrv
    InteractSrv --> SupaSrv
    AuthSrv --> SupaSrv

    SupaSrv -->|HTTPS Requests & JWT| SupaDB
    SupaSrv -->|Auth Methods| SupaAuth

    %% Backend Sync / Migrations
    NestApp --> DrizzleORM
    DrizzleORM -->|Offline Migrations & Schema Push| SupaDB
```

---

## ⚙️ How It Works Under the Hood

### Frictionless User Interactions
Instead of requiring registration for minor feedback, ratings and comments are anonymous.
1. When a card (article or ad) is rendered, the frontend requests its statistics (average stars and like count) from `ratings`.
2. When the user clicks the collapsible *Comentarios y Valoraciones* toggle, the comments for that specific entity ID are lazy-loaded from the `comments` table.
3. Adding a like, star, or comment inserts a record mapped via an `entity_id` and `entity_type` ('media' | 'job' | 'service'), preserving database referential integrity.

### Administrative Security Isolation
To prevent regular users from accessing administrative tools, security check points are enforced at multiple levels:
1. **Router Protection (`AuthGuard`)**: The guard blocks unauthorized navigation by parsing the active Supabase JWT session. It permits access only if `user.app_metadata.role` or `user.user_metadata.role` equals `'admin'`.
2. **Email Fallback/Whitelist**: Users with corporate email addresses ending in `@arandu.ch` are also whitelisted to support testing and administrator staging.
3. **Login Interception**: If a non-admin attempts to log into the admin console, the login method intercepts the response, immediately signs the user out of Supabase to clean up tokens, and returns a clear *"Access denied"* error message.

---

## 📁 Project Directory Structure

```text
├── assets/                     # Shared branding images and assets
├── backend/                    # NestJS API, database schemas, and Drizzle configurations
│   ├── drizzle/                # SQL migration snapshots
│   └── src/
│       └── db/schema.ts        # Database schema definitions
├── frontend-public/            # Public-facing Angular newspaper app (Port 4200)
│   └── src/app/
│       ├── pages/              # Editorial and Classifieds views
│       ├── services/           # Supabase services (Search, Interactions)
│       └── styles.css          # Tailwind CSS v4 styles
├── frontend-admin/             # Administrator console Angular app (Port 4201)
│   └── src/app/
│       ├── guards/             # Auth Guard role validations
│       └── pages/login/        # Login component with admin rejection
└── package.json                # Root package configuration
```

---

## 🚀 Getting Started & Local Installation

### Prerequisites
* **Node.js** (v18 or higher)
* **npm** (v9 or higher)

### 1. Backend API Setup
Configure your database configuration inside `backend/.env` (using your Supabase host connection details) and prepare the database:
```bash
cd backend
npm install

# Generate SQL schema migrations based on backend/src/db/schema.ts
npx drizzle-kit generate
```

### 2. Public Frontend Setup
Install dependencies and launch the public application locally:
```bash
cd frontend-public
npm install

# Start the public site (default: http://localhost:4200)
npm run start
```

### 3. Admin Frontend Setup
Install dependencies and launch the admin application locally:
```bash
cd frontend-admin
npm install

# Start the admin site (default: http://localhost:4201)
npm run start
```

---

## 🧪 Running Tests

Both Angular frontends are configured with **Vitest** for quick, concurrent unit testing. The test suites mock Supabase services to run cleanly in sandbox environments without network dependencies.

To execute the test suite in either frontend, navigate to its directory and run:
```bash
# Run tests in single-run mode
npm run test -- --watch=false
```
