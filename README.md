# ALX Polly: A Polling Application

Welcome to ALX Polly, a full-stack p## Security Best Practices Implemented

The application now follows these security best practices:

1. **Defense-in-Depth Strategy**:
   - Multiple layers of security controls
   - Both client and server side validation
   - Least privilege principle enforced

2. **Secure API Design**:
   - CSRF protection for all state-changing operations
   - Input validation on all endpoints
   - Proper error handling to prevent information disclosure

3. **Modern Security Headers**:
   - Content Security Policy (CSP)
   - X-Frame-Options to prevent clickjacking
   - X-Content-Type-Options to prevent MIME type sniffing
   - Referrer-Policy to control information leakage

4. **Secure Authentication**:
   - Server-side validation of authentication state
   - HTTP-only cookies for session management
   - Protection against session fixation

5. **Rate Limiting and Abuse Prevention**:
   - Prevention of multiple votes from the same user
   - Validation against manipulation of poll options
   - Authenticated access for sensitive operationstion built with Next.js, TypeScript, and Supabase. This project serves as a practical learning ground for modern web development concepts, with a special focus on identifying and fixing common security vulnerabilities.

## About the Application

ALX Polly allows authenticated users to create, share, and vote on polls. It's a simple yet powerful application that demonstrates key features of modern web development:

-   **Authentication**: Secure user sign-up and login.
-   **Poll Management**: Users can create, view, and delete their own polls.
-   **Voting System**: A straightforward system for casting and viewing votes.
-   **User Dashboard**: A personalized space for users to manage their polls.

The application is built with a modern tech stack:

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Database**: [Supabase](https://supabase.io/)
-   **UI**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
-   **State Management**: React Server Components and Client Components

---

## 🚀 Security Audit Results

This application has undergone a thorough security audit to identify and fix several vulnerabilities. The security audit process focused on critical areas of web application security:

### Identified Vulnerabilities

The following critical security issues were identified and remediated:

1. **Authorization Vulnerabilities**:
   - Missing ownership checks in poll deletion and editing functions
   - Admin panel without proper access controls
   - Insecure Direct Object References (IDOR) allowing unauthorized data access

2. **Input Validation Weaknesses**:
   - Insufficient input sanitization exposing the app to XSS attacks
   - Missing validation for user inputs
   - No protection against malicious data injection

3. **Authentication Flaws**:
   - Client-side only authentication checks
   - Sensitive information leakage in console logs
   - Weak protection of authenticated routes

4. **API Security Issues**:
   - Non-protected API routes
   - Missing rate limiting for voting
   - Lack of CSRF protection for state-changing operations

### Security Improvements

All identified vulnerabilities have been addressed with comprehensive fixes:

1. **Enhanced Authorization**:
   - Proper ownership validation for all user resources
   - Server-side role-based access controls
   - Secured admin functionality

2. **Robust Input Validation**:
   - Comprehensive input sanitization and validation
   - Protection against XSS and injection attacks
   - Length and content restrictions on user inputs

3. **Strengthened Authentication**:
   - Server-side authentication verification
   - Eliminated sensitive information exposure
   - Proper session management

For a complete breakdown of all security issues and their remediation steps, please see the [SECURITY_AUDIT.md](SECURITY_AUDIT.md) document.

### Where to Start?

A good security audit involves both static code analysis and dynamic testing. Here’s a suggested approach:

1.  **Familiarize Yourself with the Code**:
    -   Start with `app/lib/actions/` to understand how the application interacts with the database.
    -   Explore the page routes in the `app/(dashboard)/` directory. How is data displayed and managed?
    -   Look for hidden or undocumented features. Are there any pages not linked in the main UI?

2.  **Use Your AI Assistant**:
    -   This is an open-book test. You are encouraged to use AI tools to help you.
    -   Ask your AI assistant to review snippets of code for security issues.
    -   Describe a feature's behavior to your AI and ask it to identify potential attack vectors.
    -   When you find a vulnerability, ask your AI for the best way to patch it.

---

## Getting Started

To run this security-hardened version of the application:

### 1. Prerequisites

-   [Node.js](https://nodejs.org/) (v20.x or higher recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   A [Supabase](https://supabase.io/) account for authentication and database services

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd alx-polly
npm install
```

### 3. Environment Variables

Create a `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Running the Development Server

Start the application in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Conclusion

This project demonstrates the importance of security in web application development. By identifying and fixing vulnerabilities early in the development process, we can create more robust and secure applications. The security audit process documented here can serve as a template for securing other web applications.

Remember: security is not a one-time activity but an ongoing process that requires continuous attention and improvement.
