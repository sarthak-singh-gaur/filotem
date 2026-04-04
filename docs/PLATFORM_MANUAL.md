# Filotem Platform Manual

## 1. Architecture Vision
Filotem is designed as a **"Single Shell, Multi-App"** platform. Instead of creating disjointed, standalone repositories for every new project (like the legacy "Friends Table API" vs "React App"), we have consolidated everything into a single ecosystem. The outer layer (the "Shell") manages authentication, global state, and routing. When a user requests an application—like "Friends Table"—it is fetched or rendered within this authenticated wrapper. This provides a seamless, OS-like experience on both desktop and mobile, ensuring users only log in once to access a growing suite of tools.

## 2. Global Shell
The frontend is driven by Vite + React + TypeScript.
The entry point (`src/App.tsx`) initializes the Router and wraps it in our context providers (`AuthProvide`, `AppStateProvider`).
The shell UI includes:
- **`Layout.tsx`**: A responsive wrapper maintaining the application frame.
- **`Navbar.tsx`**: The top navigation bar indicating user state, app selection, and providing a gateway to settings or sign-out.
- **`AuthGate`**: A crucial Higher-Order Component inside `App.tsx` that blocks unauthenticated rendering. If no token is detected, users are pushed gracefully to the `/auth` route.

## 3. Unified Backend
The backend, located in the root `/backend` folder, handles the entire Filotem network. It is built natively on Node.js and Express. It acts as the gatekeeper for data, utilizing modular service routes under `/api/*`.
- **`package.json`**: Tracks server dependencies (`express`, `mongoose`, `jsonwebtoken`, `socket.io`, `bcryptjs`, `cors`).
- **`index.js`**: Re-exports all routes, bootstraps Mongoose to the Atlas cluster, manages CORS (permissively for local Vite environments), and binds the Socket.io server to the HTTP instance.

## 4. Authentication Flow
Authentication determines identity across the platform.
1. **Login/Register**: Handled inside `src/pages/AuthPage.tsx`, hitting the `/api/auth/register` or `.../login` backend routes.
2. **Token Minting**: The backend uses JWT, sealing the User ID over the wire.
3. **Storage**: The token is stored securely in the browser's `localStorage` precisely under the key `filotem_token`.
4. **Resilience**: Upon any page load, `AuthProvider.tsx` attempts an opaque background fetch with this token. If successful, user data is populated globally. If fake or expired, it wipes the token and forces a re-login.

## 5. Database Modeling
Data architecture relies on MongoDB Collections using Mongoose for schemas.
- **User Models**: Storing unique identifiers, hashed passwords (bcrypt), profile metadata, and creation timestamps.
- **Friend requests**: A relationship-mapping collection explicitly handling `sender`, `receiver`, and `status` paradigms (`pending`, `accepted`, `rejected`).
- **Messages**: Time-series text blocks bridging the exact `senderId` and `receiverId`.

## 6. Real-time Infrastructure
Instant interactions bypass traditional REST by leveraging **Socket.io**.
In `backend/socket/chat.js`, users establish persistent WebSocket connections authenticated via their ID.
When a user logs in, the client emits a `register` event saving their socket ID to a centralized Redis-like memory map. Any explicit peer-to-peer message directly resolves their socket ID to prevent network flooding and guarantees 1-to-1 secure real-time messaging.

## 7. State Management
Rather than relying on heavy global stores like Redux, Filotem utilizes React Contexts logically separated by concern:
- **`AuthContext`**: Exclusively stores the `token`, `user` payload, and handles session lifecycle actions (`login`, `logout`, `register`).
- **`AppStateContext`**: For non-user app states, such as a unified theme toggle (light/dark mode) or active-app tracking.

## 8. App Registry
The platform is conceptually a "store" of applications.
Presently, it lists them manually or pseudo-dynamically. In the future, a `/registry` array map dictates exactly which apps (e.g., "Friends Table") are available to launch. Each mapped component is lazy-loaded directly into the canvas.

## 9. Mobile Roadmap
Filotem is primarily targeted towards bridging web flexibility with mobile intimacy.
1. The web-shell guarantees responsiveness.
2. Web features can compile to Android APKs leveraging React Native or Capacitor wrappers directly translating HTML/DOM concepts to mobile native views.
The strategy pivots towards hosting backend endpoints universally while distributing the compiled HTML statically wrapped inside mobile clients.

## 10. The Friends Table App
The flagship application of Filotem is the "Friends Table".
It functions as an advanced social mapping and messaging tool where users can build secure, tight-knit communities (tables). 
Inside the shell, `src/apps/FriendsTableApp.tsx` handles the UI and UX for this feature, using glassmorphic cards to display real-time updates and interactions specific solely to this context.

## 11. API Endpoints
Backend APIs follow REST conventions:
- **`POST /api/auth/register`**: Creates account.
- **`POST /api/auth/login`**: Issues JWT.
- **`GET /api/auth/me`**: Parses JWT Header to return User Schema.
- **`GET /api/users/search`**: General regex lookups for finding peers.
- **`POST /api/friends/request`**: Mutates the Friend Request status.
- **`GET /api/messages/:userId`**: Extracts chat history strictly bound to the Auth'd user.

## 12. Frontend Styling
Styled using **Tailwind CSS**.
The design mandate implies vibrant aesthetics, soft glassmorphic textures (blur utilities, slight borders), and dynamic animations. Colors drift towards premium palettes (stone, elegant blacks, white/blue washes). 
We heavily utilize `animate-in` fade directives to make the UI feel reactive and alive, not static.

## 13. Security Standards
1. **Hashes**: All user credentials pass through standard `bcrypt` cycles. Clear-text passwords never touch the DB.
2. **CORS**: Enforced Origin checks. Only Vite's default dev environment boundaries (`localhost:5173`) are fully open inside `.env`.
3. **Route Guards**: Critical data-modifying endpoints inject `middleware/auth.js` explicitly demanding the `Authorization: Bearer <TOKEN>` signature.

## 14. Local Development
*Prerequisites*: Node.js v24+, MongoDB Local/Atlas.
1. Branch root repository.
2. `cd backend && npm install`. Setup backend `.env` variables (MongoDB URI).
3. `node index.js`. Server starts on port 5000.
4. From root, `npm install && npm run dev`. UI boots to port `5173`.
5. Frontend relies on `VITE_API_URL` locally pointing to `localhost:5000`.

## 15. Deployment: Backend
When shipping the API:
- Create instances in Render or Railway.
- Define `MONGODB_URI` properly ensuring the IP cluster restrictions in MongoDB Atlas allow connections (whitelist `0.0.0.0/0` safely or track specific VPC IPs).
- Start commands simply resolve to `npm start` referencing `index.js`.

## 16. Deployment: Frontend
Vite strictly outputs static artifacts via `npm run build` targeting a `dist/` directory.
- Hook repository to Vercel/Netlify.
- Define `VITE_API_URL` resolving directly to the remote Render/Railway instance from Step 15.
- The `dist/` artifact is inherently scalable edge-CDN content.

## 17. Scalability
Adding the next app:
1. Touch a new component file inside `src/apps/NewApp.tsx`.
2. Link the app conceptually in `src/registry/apps.ts`.
3. Give it a distinct route in the single Shell `App.tsx` router switch.
4. Scale backend APIs as required.

## 18. Asset Management
Static assets (SVGs, Hero images) live explicitly in `src/assets`.
Images optimize upon Vite compilation. `friends-table-logo.svg` remains lightweight ensuring fast FCP (First Contentful Paint) while larger arrays (like `hero.png`) load asynchronously avoiding blocking JS main threads.

## 19. Troubleshooting
* **SSL Alert Number 80** -> Your MongoDB Atlas network settings are blocking the IP. Add your current IP manually in the Atlas Networking Dashboard.
* **CORS Error** -> Client is hitting an unapproved port, verify Vite's running URL matches the `backend/index.js` allowlist array.
* **401 Unauthorized** -> The JWT token might have been wiped or expired. Ensure `/api/auth/me` verifies before making secured payload fetches.

## 20. Conclusion
Filotem transitions from an isolated sandbox script into an extremely cohesive, highly scalable production architecture. The single global shell architecture minimizes overhead context shifts allowing seamless and boundless horizontal app addition in the future.
