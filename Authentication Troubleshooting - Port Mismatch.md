# Authentication Troubleshooting - Port Mismatch

## Problem
Authentication (login and registration) fails with "Network Error" or "Connection Refused" despite the backend server running correctly.

### Symptoms
- Login/register buttons show error messages
- Console shows: `ERR_CONNECTION_REFUSED`
- API health checks work on a different port
- Backend logs show no incoming requests

### Example Console Output
```
AuthContext: Calling apiRegister...
Registration error detail: Network Error
Failed to load resource: net::ERR_CONNECTION_REFUSED 
  http://localhost:3000/api/auth/register
```

---

## Diagnosis Steps

### 1. Identify Configured Port
Check your API configuration file:

```typescript
// src/services/api.ts
const BASE_URL = `http://${origin}:3000`;  // What port is configured?
```

### 2. Find Running Backend Port
```bash
# Check what's running on common ports
lsof -i :3000
lsof -i :3001

# Or test health endpoints
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
```

### 3. Compare Results
If the health check succeeds on port 3001 but your app is configured for 3000, you've found the mismatch.

---

## Solution

Update **all** port references to match your running backend:

### Files to Check

**`src/services/api.ts`**
```typescript
// Before
const BASE_URL = `http://${origin}:3000`;

// After  
const BASE_URL = `http://${origin}:3001`;
```

**`src/services/socket.ts`** (if using WebSockets)
```typescript
// Before
const SOCKET_URL = `http://${origin}:3000`;

// After
const SOCKET_URL = `http://${origin}:3001`;
```

### Find All Port References
```bash
grep -r ":3000" src/
grep -r "localhost:3000" src/
```

---

## Why This Happens

Common causes of port mismatch:

1. **Docker configuration changed** - Backend port remapped in `docker-compose.yml`
2. **Environment variables** - `.env` file has different port
3. **Default port conflict** - Another service already using port 3000
4. **Backend refactoring** - Server port updated but client wasn't

---

## Prevention

### Use Environment Variables
```typescript
// api.ts
const PORT = process.env.EXPO_PUBLIC_API_PORT || '3001';
const BASE_URL = `http://${origin}:${PORT}`;
```

**`.env`**
```
EXPO_PUBLIC_API_PORT=3001
```

### Add Connection Logging
```typescript
console.log('API URL:', API_URL);
console.log('Socket URL:', SOCKET_URL);
```

Check these logs on app startup to quickly identify configuration issues.

---

## Verification

After fixing:

1. Restart the Expo dev server: `npx expo start --clear`
2. Check console for correct URL: `API URL: http://localhost:3001/api`
3. Test registration with new account
4. Test login with existing account
5. Verify WebSocket connection (if applicable)

---

## Related
- [[Expo Web - SecureStore Fix]]
- [[Docker Backend Configuration]]
