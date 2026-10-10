# Firebase authentication setup

1. Create or open a Firebase project.
2. Add a Web app in **Project settings → Your apps**.
3. Enable **Authentication → Sign-in method → Email/Password**. Enable Google too if you want the Google button.
4. Copy `.env.example` to `.env.local` and fill in the Web app configuration values.
5. Restart Vite after changing environment variables.

Unauthenticated visitors see the public Home, About, and Login pages. The data studio renders only after Firebase reports an authenticated user. The studio's **Sign out** control returns to the public login gate.
