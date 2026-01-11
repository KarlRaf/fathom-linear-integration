# Landing Page Documentation

## Product Name

**Selected: Meet2Issue**

**Tagline:** Turn meeting conversations into action items automatically

### Alternative Names Considered

1. **CallFlow** — From calls to tickets, automatically
2. **ActionStream** — Transform meetings into action
3. **MeetingBridge** — Bridge meetings to Linear issues
4. **FathomFlow** — Automated action items from meetings

## Deployment Instructions

**Important:** The landing page links to `/login` which assumes it's deployed on the same domain as the Next.js application. If deploying separately, update the login links to use the full application URL (e.g., `https://your-app.vercel.app/login`).

### Option 1: GitHub Pages

1. Create a `docs` folder or use the root directory
2. Place `index.html` in the repository
3. Enable GitHub Pages in repository settings
4. Select the branch and folder containing `index.html`
5. Access your landing page at `https://yourusername.github.io/repository-name/`

### Option 2: Vercel

1. Create a new Vercel project
2. Connect your GitHub repository
3. Configure build settings:
   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: (leave empty)
4. Deploy

Or use Vercel CLI:
```bash
vercel
```

### Option 3: Netlify

1. Drag and drop the `index.html` file to Netlify
2. Or connect your GitHub repository
3. Set build command to empty (or use a simple static site setup)

## Customization

### Colors

The landing page uses Tailwind CSS with a custom color scheme:
- Primary: Indigo (#6366f1)
- Secondary: Purple (#8b5cf6)
- Accent: Pink gradient

To customize colors, edit the Tailwind config in the `<script>` tag within `<head>`.

### Content Updates

All content is in the HTML file. Key sections to update:
- GitHub repository URLs
- Feature descriptions
- Setup instructions
- Footer links

## Notes

- Uses Tailwind CSS via CDN (no build step required)
- Fully responsive design
- Semantic HTML structure
- No JavaScript dependencies
- Optimized for SEO with meta tags
