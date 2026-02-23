# Manual Deployment Guide for Student Information Management System

This document outlines the manual steps to build and deploy the Student Information Management System to GitHub Pages.

## Prerequisites

- Node.js installed
- Git installed
- GitHub repository with write access

## Step-by-Step Deployment Process

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/zenmetsu3/SIMS.git
    cd SIMS
    ```

2.  **Install Dependencies**
    Ensure all required packages are installed, including the deployment tool `gh-pages`.
    ```bash
    npm install
    ```

3.  **Build and Deploy**
    Run the deployment script. This script performs the following actions:
    - Creates a `.nojekyll` file in the `public` directory to bypass Jekyll processing on GitHub Pages.
    - Publishes the contents of the `public` folder to the `gh-pages` branch.

    ```bash
    npm run deploy
    ```

4.  **Verify Deployment**
    - Go to your repository on GitHub.
    - Navigate to **Settings** > **Pages**.
    - Ensure the source is set to the `gh-pages` branch.
    - Visit the provided GitHub Pages URL (e.g., `https://zenmetsu3.github.io/SIMS/`).

## Important Note regarding Backend Functionality

The deployed version on GitHub Pages is a **static frontend only**. The backend API (Node.js/Express) runs locally or needs to be hosted on a platform that supports server-side code (like Heroku, Render, or Vercel).

- **Data Persistence**: Without a live backend, the application will not be able to fetch or save student data permanently. It will attempt to connect to `http://localhost:3000` by default.
- **Functionality**: The UI will load, but dynamic features (adding/editing students) will fail unless a backend is running locally or configured to point to a live server.
