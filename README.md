# ALX Polly Security Audit

This document outlines the security vulnerabilities discovered during the audit of the ALX Polly application and the steps taken to remediate them.

## Security Vulnerabilities Overview

| # | Vulnerability | Severity | Status |
|---|--------------|----------|--------|
| 1 | Lack of Authorization in Poll Deletion | High | Fixed |
| 2 | Admin Page Without Access Controls | Critical | Fixed |
| 3 | Insufficient Input Validation/Sanitization | High | Fixed |
| 4 | Missing Rate Limiting for Voting | Medium | Fixed |
| 5 | Client-Side Only Authentication Checks | High | Fixed |
| 6 | Sensitive Information in Console Logs | Medium | Fixed |
| 7 | Insecure Direct Object References (IDOR) | High | Fixed |
| 8 | Non-Protected API Routes | High | Fixed |
| 9 | Missing CSRF Protection | High | Fixed |
| 10 | Insecure Sharing Features | Medium | Fixed |

## Detailed Findings and Remediations

### 1. Lack of Authorization in Poll Deletion

**Vulnerability**: The `deletePoll` function in `poll-actions.ts` did not verify that the user attempting to delete a poll was the owner of that poll.

**Impact**: Any authenticated user could delete any poll in the system by knowing the poll ID, allowing unauthorized destruction of data.

**Remediation**: 
- Added user ownership validation checks in the `deletePoll` function
- Implemented secure retrieval of the poll owner before allowing deletion
- Added proper error handling for unauthorized deletion attempts

```typescript
// Before
export async function deletePoll(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/polls");
  return { error: null };
}

// After
export async function deletePoll(id: string) {
  const supabase = await createClient();
  
  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError) return { error: userError.message };
  if (!user) return { error: "You must be logged in to delete a poll." };
  
  // Check if the user is the owner of the poll
  const { data: poll, error: fetchError } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", id)
    .single();
    
  if (fetchError) return { error: fetchError.message };
  if (!poll) return { error: "Poll not found" };
  if (poll.user_id !== user.id) return { error: "You can only delete your own polls" };
  
  // Now perform the delete operation
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) return { error: error.message };
  
  revalidatePath("/polls");
  return { error: null };
}
```

### 2. Admin Page Without Access Controls

**Vulnerability**: The Admin page (`/app/(dashboard)/admin/page.tsx`) had no authentication check to verify that the user accessing it had admin privileges.

**Impact**: Any user could access the admin panel, view all polls in the system, and perform administrative actions.

**Remediation**:
- Created a server-side admin role check in a new `admin-actions.ts` file
- Implemented role-based access control with server-side redirection
- Removed client-side admin data fetching to prevent data exposure
- Made the admin page a server component that automatically checks admin status

```typescript
// New server-side admin check function
export async function checkAdminAccess() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // If error or no user, redirect to login
  if (error || !user) {
    redirect('/login');
  }
  
  // Check if user has admin role
  if (!user.user_metadata?.isAdmin) {
    // Not an admin, redirect to polls page
    redirect('/polls');
  }
  
  // User is an admin, return true
  return true;
}
```

### 3. Insufficient Input Validation/Sanitization

**Vulnerability**: The poll creation and editing functionality didn't properly sanitize or validate input, potentially allowing for injection attacks.

**Impact**: Malicious users could inject harmful content into poll questions or options, leading to stored XSS attacks.

**Remediation**:
- Added input length limits on questions and options
- Implemented pattern checks to prevent script injection
- Added sanitization of HTML special characters
- Incorporated validation both on client and server side

```typescript
// Example of input validation and sanitization for poll creation
// Basic validation
if (!question || options.length < 2) {
  return { error: "Please provide a question and at least two options." };
}

// Additional input validation and sanitization
if (question.length > 500) {
  return { error: "Question is too long. Maximum 500 characters allowed." };
}

// Validate each option
for (const option of options) {
  if (typeof option !== 'string') {
    return { error: "Invalid option format." };
  }
  
  if (option.length > 200) {
    return { error: "Option text is too long. Maximum 200 characters allowed." };
  }
  
  // Prevent script injections in options
  if (option.includes('<script') || option.includes('javascript:')) {
    return { error: "Invalid characters detected in options." };
  }
}

// Create sanitized versions of inputs
const sanitizedQuestion = question
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .trim();
```

### 4. Missing Rate Limiting for Voting

**Vulnerability**: The `submitVote` function in `poll-actions.ts` didn't have any rate limiting or checks to prevent multiple votes from the same user.

**Impact**: Users could submit multiple votes for a single poll, skewing the results and undermining the integrity of the polling system.

**Remediation**:
- Required login for voting to track user identities
- Added checks for existing votes from the same user
- Implemented validation for option index to prevent manipulated votes
- Added error handling for unauthorized voting attempts

```typescript
// Check if user has already voted on this poll
const { data: existingVotes, error: checkError } = await supabase
  .from("votes")
  .select("id")
  .eq("poll_id", pollId)
  .eq("user_id", user.id);
  
if (checkError) return { error: checkError.message };

// If user has already voted, prevent multiple votes
if (existingVotes && existingVotes.length > 0) {
  return { error: "You have already voted on this poll." };
}
```

### 5. Client-Side Only Authentication Checks

**Vulnerability**: The authentication system relied heavily on client-side checks, which could be easily bypassed.

**Impact**: An attacker could modify client-side code to bypass authentication checks and gain unauthorized access.

**Remediation**:
- Implemented server-side authentication checks for all protected routes
- Added middleware to verify authentication tokens before processing requests
- Enhanced the auth context to securely handle authentication state
- Used server components to perform sensitive operations

### 6. Sensitive Information in Console Logs

**Vulnerability**: The auth context (`auth-context.tsx`) was logging sensitive authentication information to the browser console.

**Impact**: In a production environment, this would leak user session information to the browser console, which could be accessed by malicious scripts.

**Remediation**:
- Removed all console logs containing sensitive user data
- Replaced error logging with minimal information
- Ensured no session tokens or user details are exposed through logs

```typescript
// Before
if (error) {
  console.error('Error fetching user:', error);
}
if (mounted) {
  setUser(data.user ?? null);
  setSession(null);
  setLoading(false);
  console.log('AuthContext: Initial user loaded', data.user);
}

// After
if (error) {
  // Log minimal info - avoid exposing sensitive data
  console.error('Error fetching user authentication state');
}
if (mounted) {
  setUser(data.user ?? null);
  setSession(null);
  setLoading(false);
}
```

### 7. Insecure Direct Object References (IDOR)

**Vulnerability**: The poll editing functionality allowed direct access to polls via their ID without properly verifying ownership.

**Impact**: Users could potentially edit polls they didn't own by simply guessing or obtaining poll IDs.

**Remediation**:
- Added ownership checks before allowing poll updates
- Implemented server-side verification of user identity
- Enhanced error handling to prevent unauthorized access
- Sanitized inputs for poll updates

```typescript
// Check if the poll exists and belongs to the user
const { data: existingPoll, error: fetchError } = await supabase
  .from("polls")
  .select("user_id")
  .eq("id", pollId)
  .single();
  
if (fetchError) {
  return { error: fetchError.message };
}

if (!existingPoll) {
  return { error: "Poll not found" };
}

if (existingPoll.user_id !== user.id) {
  return { error: "You can only update your own polls" };
}
```

### 8. Non-Protected API Routes

**Vulnerability**: The API routes for poll management didn't have consistent authentication and authorization checks.

**Impact**: Unauthorized users could potentially access sensitive data or perform unauthorized operations.

**Remediation**:
- Added authentication checks to all API routes
- Implemented consistent authorization patterns
- Created dedicated admin functions with proper access control
- Enhanced error handling to prevent information disclosure

### 9. Missing CSRF Protection

**Vulnerability**: No CSRF tokens or protection mechanisms were implemented for forms and state-changing operations.

**Impact**: The application was vulnerable to Cross-Site Request Forgery attacks where attackers could trick users into performing unintended actions.

**Remediation**:
- Implemented a CSRF token generation and validation system
- Added CSRF tokens to all forms that change state
- Created middleware to verify CSRF tokens
- Added proper HTTP-only cookies with secure attributes

```typescript
// CSRF Token Generation
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = cookies();
  
  // Store the token in a HTTP-only cookie to prevent XSS attacks
  cookieStore.set('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 hour expiry
  });
  
  return token;
}

// CSRF Token Validation
export async function validateCsrfToken(token: string): Promise<boolean> {
  const cookieStore = cookies();
  const storedToken = cookieStore.get('csrf_token')?.value;
  
  if (!storedToken || !token || token !== storedToken) {
    return false;
  }
  
  // Generate a new token after validation to prevent replay attacks
  await generateCsrfToken();
  
  return true;
}
```

### 10. Insecure Sharing Features

**Vulnerability**: The sharing component (`vulnerable-share.tsx`) had potential security issues with parameter sanitization and window opening.

**Impact**: Possible XSS vulnerabilities and security concerns with opened windows having access to opener window.

**Remediation**:
- Renamed component from `VulnerableShare` to `SecureShare`
- Added proper input sanitization for all shared content
- Used `encodeURIComponent` for URL parameters
- Implemented `rel="noopener noreferrer"` equivalent in JavaScript
- Added null checks and error handling

```javascript
// Before
const shareOnTwitter = () => {
  const text = encodeURIComponent(`Check out this poll: ${pollTitle}`);
  const url = encodeURIComponent(shareUrl);
  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    "_blank",
  );
};

// After
const shareOnTwitter = () => {
  if (!shareUrl) return;
  
  const text = encodeURIComponent(`Check out this poll: ${sanitizedTitle}`);
  const url = encodeURIComponent(shareUrl);
  // Use rel="noopener noreferrer" equivalent in JS
  const newWindow = window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    "_blank"
  );
  if (newWindow) newWindow.opener = null;
};
```

## Additional Security Enhancements

### Security Headers

To further strengthen the application's security posture, we implemented security headers in the middleware:

```typescript
// Added security headers in middleware
const secureHeaders = new Headers(response.headers);

// Security headers
secureHeaders.set('X-Frame-Options', 'DENY');
secureHeaders.set('X-Content-Type-Options', 'nosniff');
secureHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
secureHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

// Content Security Policy
secureHeaders.set(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;"
);
```

### Server-Side Component Security

We leveraged Next.js's server components to perform authentication and authorization checks server-side, making them more secure and resistant to client-side tampering.

## Conclusion

The security audit of ALX Polly revealed several critical and high-severity vulnerabilities that could have compromised the application's data integrity, user privacy, and overall security. By implementing proper authorization checks, input validation, CSRF protection, and other security best practices, we have significantly improved the application's security posture.

The remediation steps followed industry best practices and addressed each vulnerability systematically, ensuring that the application now properly validates user permissions, sanitizes inputs, prevents CSRF attacks, and includes defense-in-depth measures through security headers and server-side validation.

This document serves as a reminder of the importance of security-first development practices and the need for regular security audits to identify and address potential vulnerabilities.
