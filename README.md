# x-func.github.io

A modern website built with Next.js, Tailwind CSS, and TypeScript. This is the official website for x-func, showcasing AI-powered solutions that empower the world.

## Tech Stack

- **Next.js 14** - React framework for production with App Router
- **Tailwind CSS** - Utility-first CSS framework for styling
- **TypeScript** - Typed JavaScript for better development experience
- **Next.js Image Optimization** - Optimized image handling (configured for static export)

## Project Structure

```
x-func.github.io/
├── app/                    # Next.js App Router directory
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Homepage/landing page
│   ├── mission/           # Mission page
│   ├── product/           # Product showcase page
│   ├── about/             # About page
│   ├── contact/           # Contact page with form
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Navbar.tsx         # Navigation bar component
│   ├── Footer.tsx         # Footer component
│   ├── Logo.tsx           # Logo icon component
│   ├── ProductCard.tsx    # Product card component
│   └── Section.tsx        # Reusable section wrapper
├── public/                # Static assets
│   └── resource/
│       └── icon.png       # Site logo/icon
└── CNAME                  # Custom domain configuration
```

## Features

### Navigation

The website includes independent pages for each section:

- **Home** - Landing page with overview and quick links
- **Mission** - Detailed mission statement, values, and goals
- **Product** - Comprehensive showcase of all AI-powered products
- **About** - Company story, values, and vision
- **Contact** - Contact form and information

### Pages

#### Home Page (`/`)
- Hero section with call-to-action buttons
- Quick overview cards for Mission, Products, and About
- Product preview grid
- Enhanced footer with navigation links

#### Mission Page (`/mission`)
- Detailed mission statement
- Core values (Global Impact, Accessibility, Efficiency)
- Goals and objectives
- Call-to-action to explore products

#### Product Page (`/product`)
- Detailed information for each product:
  - **AI Image Editor** - Transform and enhance images with AI
  - **AI Language Learning** - Personalized language tutoring
  - **Stock Market Analysis** - AI-powered market insights
  - **News Aggregation** - Curated news content
- Feature lists for each product
- Benefits section
- Contact and demo information

#### About Page (`/about`)
- Company story and background
- Core values (Innovation, Accessibility, Simplicity, Growth)
- Vision statement
- Links to other pages

#### Contact Page (`/contact`)
- Contact form (opens email client)
- Contact information section
- FAQ section
- Availability information

### Components

- **Navbar** - Fixed navigation with active state highlighting, mobile menu, and smooth scrolling
- **Footer** - Consistent footer across all pages with navigation and links
- **Logo** - Custom logo component using icon.png with hover animations
- **ProductCard** - Reusable product card with hover effects
- **Section** - Reusable section wrapper component

### Design Features

- **Responsive Design** - Mobile-first approach, fully responsive
- **Modern UI/UX** - Gradient backgrounds, smooth transitions, hover effects
- **Accessibility** - Semantic HTML, proper alt texts, ARIA labels
- **Performance** - Optimized images, static export for fast loading
- **Custom Branding** - Custom logo icon, gradient color scheme

## Development

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/x-func/x-func.github.io.git
cd x-func.github.io
```

2. Install dependencies:
```bash
npm install
```

### Running Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
```

This generates a static export in the `out/` directory, optimized for GitHub Pages deployment.

### Deployment

The site is configured for static export and can be deployed to:
- GitHub Pages (automatically via Actions)
- Any static hosting service (Netlify, Vercel, etc.)

The `CNAME` file is configured for the custom domain `x-func.com`.

## Content

### Mission

Use AI to empower the world, make AI available for everyone. Provide easy-to-use tooling and improve efficiency.

### Products

Our AI-powered solutions include:

- **AI Image Editor** - Edit images with advanced AI capabilities
- **AI Language Learning** - Make language learning easy and accessible
- **Stock Market Analysis** - Use AI to analyze stock markets and identify trending opportunities
- **News Aggregation** - Aggregate news content and highlight the most useful information

### About

A project aimed to change the world through accessible and powerful AI tools.

### Contact

For inquiries, please email us at: **a@b.com**

## License

This project is private and proprietary.
