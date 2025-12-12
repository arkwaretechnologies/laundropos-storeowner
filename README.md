# LaundroPOS Store Owner Portal

A separate web application for store owners to manage their laundry business operations.

## Features

- **Store Switching**: Sidebar with ability to switch between multiple stores if the owner has multiple stores assigned
- **User Management**: Add and manage users (cashiers, employees) for your store(s)
- **Services & Pricing**: Manage custom services and pricing for your store (view global services, create/edit custom ones)
- **Orders & QR Codes**: View orders, inspect line items, and print claim stubs with QR codes

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with the same environment variables as the main admin portal:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Login

- This portal is specifically for **Store Owners** and users with store assignments
- Login with your store owner credentials
- The system will automatically load your assigned stores
- Select a store from the sidebar to manage that store's operations

## Project Structure

```
laundropos-store-owner/
├── src/
│   ├── app/
│   │   ├── login/          # Store owner login page
│   │   ├── page.tsx         # Main dashboard with sidebar
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── Sidebar.tsx            # Sidebar navigation with store switcher
│   │   ├── UserManagement.tsx     # User management (filtered by store)
│   │   ├── ServicesManagement.tsx # Services & pricing (filtered by store)
│   │   ├── OrderManagement.tsx    # Orders & QR codes (filtered by store)
│   │   ├── OrderClaimStub.tsx     # QR code claim stub component
│   │   └── StoreAssignment.tsx   # Store assignment component
│   ├── contexts/
│   │   └── StoreContext.tsx       # Store context for managing selected store
│   └── lib/
│       └── supabase.ts            # Supabase client configuration
└── package.json
```

## Differences from Admin Portal

- **Store-focused**: All operations are filtered by the selected store
- **Limited permissions**: Store owners can only:
  - Create/edit/delete custom services (not global services)
  - Manage users assigned to their stores
  - View orders for their stores
- **Store switching**: Sidebar allows switching between multiple stores if owner has multiple assignments

## PWA (Progressive Web App) Setup

This app is configured as a Progressive Web App (PWA) and can be installed on mobile devices and desktops.

### Adding PWA Icons

To complete the PWA setup, you need to add icon files to the `public/` directory:

1. **icon-192.png** - 192x192 pixels (required)
2. **icon-512.png** - 512x512 pixels (required)

You can use your app logo or create icons using tools like:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

Place these files in the `public/` directory and the PWA will be fully functional.

### Installing the App

- **Android/Chrome**: Click the "Install App" button in the sidebar, or use the browser's install prompt
- **iOS/Safari**: Tap the Share button and select "Add to Home Screen"
- **Desktop**: Use the browser's install prompt or the "Install App" button

## Build for Production

```bash
npm run build
npm start
```




