# Firebase Realtime Database Integration Guide

## Overview
This document details the integration of Firebase Realtime Database (RTDB) into the Student Information Management System (SIMS). The integration replaces/augments the file-based and Firestore storage with a low-latency, real-time JSON database.

**Database URL**: `https://sims-f3281-default-rtdb.firebaseio.com/`

## Architecture

### Data Models
The database is structured as a JSON tree:

1.  **`/users/{uid}`**
    *   Stores authentication metadata and user roles.
    *   **Fields**: `email`, `studentId`, `role`, `createdAt`.
    *   **Security**: Users can only read/write their own node.

2.  **`/students/{studentId}`**
    *   Stores student academic records and profile info.
    *   **Fields**: `firstName`, `lastName`, `course`, `yearLevel`, `status`, `grades`.
    *   **Security**: Readable by Authenticated users (or just Admins/Self). Writable by Admins.

### Files Created/Modified
*   **`public/firebase-config.js`**: Initialized `rtdb` service.
*   **`public/database-service.js`**: Created a service layer with CRUD operations (`setStudent`, `getStudent`, `updateStudent`, `deleteStudent`, `subscribeToStudents`).
*   **`public/script.js`**:
    *   Updated `handleAdminLogin` to start real-time sync.
    *   Implemented `syncStudents()` to listen to RTDB updates.
    *   Updated Registration logic to save to RTDB.

## Implementation Details

### 1. Initialization
In `firebase-config.js`, we import `getDatabase` and initialize it with the `databaseURL`.

```javascript
import { getDatabase } from "firebase/database";
const firebaseConfig = {
  // ...
  databaseURL: "https://sims-f3281-default-rtdb.firebaseio.com/"
};
const rtdb = getDatabase(app);
```

### 2. CRUD Operations (Database Service)
The `DatabaseService` object in `public/database-service.js` provides a clean API for database interactions.

*   **Create/Set**: `set(ref(rtdb, path), data)`
*   **Read**: `get(child(ref(rtdb), path))`
*   **Update**: `update(ref(rtdb, path), updates)`
*   **Delete**: `remove(ref(rtdb, path))`
*   **Listen**: `onValue(ref(rtdb, path), callback)`

### 3. Real-time Synchronization
The `syncStudents` function in `script.js` establishes a persistent connection (WebSocket) to the `/students` node. Any change (add/edit/delete) by any client is immediately pushed to all connected clients.

```javascript
const unsubscribe = onValue(studentsRef, (snapshot) => {
    const data = snapshot.val();
    // Update UI
});
```

## Security Rules
Deploy these rules to the Firebase Console -> Realtime Database -> Rules tab.

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "students": {
      ".read": "auth != null",
      ".write": "auth != null", // In production, restrict to root.child('users').child(auth.uid).child('role').val() === 'admin'
      "$studentId": {
        ".indexOn": ["status", "course"]
      }
    }
  }
}
```

## Testing & Verification

1.  **Registration Test**:
    *   Register a new user via the UI.
    *   **Verify**: Check Firebase Console -> Realtime Database. You should see entries in both `/users` and `/students`.

2.  **Real-time Sync Test**:
    *   Open the Admin Dashboard in two different browser windows/tabs.
    *   In Window A, register a new student or update an existing one (if edit implemented).
    *   **Verify**: Window B should automatically update the table without refreshing.

3.  **Offline Persistence**:
    *   The Firebase SDK automatically handles temporary network disconnects, queuing writes and syncing when online.

## Error Handling
*   All database operations are wrapped in `try/catch` blocks.
*   Errors are logged to the console for debugging.
*   The `onValue` listener includes an error callback to handle permission denied or network cancellation events.
