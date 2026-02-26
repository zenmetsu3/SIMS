# Firebase Integration Documentation

## Overview
This document outlines the integration of Firebase services into the Student Information Management System (SIMS). The integration includes Authentication, Firestore Database, and Cloud Messaging.

## Services Integrated

### 1. Authentication
- **Providers**: Email/Password, Google Sign-In.
- **Client SDK**: `firebase/auth` (Modular v9).
- **Backend Verification**: `admin.auth().verifyIdToken()` (Placeholder logic implemented in `server.js`).
- **Files Modified**:
    - `public/firebase-config.js`: Auth initialization.
    - `public/script.js`: Login/Register logic using `signInWithEmailAndPassword` and `signInWithPopup`.
    - `server.js`: `/api/auth/firebase` endpoint.

### 2. Firestore Database
- **Usage**: Storing user profiles upon registration.
- **Collection Structure**:
    - `users/{uid}`: Stores `email`, `studentId`, `role`, `createdAt`.
- **Realtime Sync**: `syncStudents()` function prepared in `script.js` to listen for updates.
- **Files Modified**:
    - `public/firebase-config.js`: Firestore initialization.
    - `public/script.js`: `setDoc` usage during registration.

### 3. Cloud Messaging (FCM)
- **Usage**: Push notifications.
- **Setup**: Service Worker registered to handle background messages.
- **Files Created**:
    - `public/firebase-messaging-sw.js`: Service Worker.

## Setup Instructions

1.  **Environment Variables**:
    - Create a `.env` file in the root directory.
    - Add `FIREBASE_SERVICE_ACCOUNT` with the content of your service account JSON (for backend Admin SDK).
    ```env
    FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", ...}'
    ```

2.  **Frontend Config**:
    - The configuration is hardcoded in `public/firebase-config.js` using the provided keys.

3.  **Running the App**:
    - `npm install`
    - `npm run dev` (or `node server.js`)
    - Open `http://localhost:3000`

## Security Configuration

### Firestore Security Rules
Deploy these rules to your Firebase Console to secure the database:

```proto
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Students collection (example)
    match /students/{studentId} {
      allow read: if request.auth != null; // Authenticated users can read
      allow write: if false; // Only Admin SDK (backend) can write
    }
  }
}
```

### Backend Security
- The `/api/auth/firebase` endpoint verifies the ID Token sent by the client.
- **Rate Limiting**: Applied via `express-rate-limit` to prevent abuse.
- **Token Verification**: Uses `firebase-admin` to cryptographically verify tokens (requires service account).

## Testing Procedures

### Unit Testing
- Run `npm test` (if configured) to test backend logic.

### Integration Testing (Manual)
1.  **Registration**:
    - Go to "Student" login -> "Create New Account".
    - Fill form and submit.
    - Verify alert "Registration successful".
    - Verify user created in Firebase Console -> Authentication.
    - Verify document created in Firebase Console -> Firestore -> `users`.

2.  **Login**:
    - Go to "Student" login.
    - Enter credentials.
    - Verify successful login and redirection to dashboard.
    - Verify "Sign in with Google" popup works.

3.  **Notifications**:
    - On login, check console for "FCM Token".
    - Send a test message from Firebase Console -> Cloud Messaging using the token.
