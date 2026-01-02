# Vercel CLI Setup Guide

## Install Vercel CLI

If not already installed:

```bash
npm install -g vercel
```

## Link Project to Vercel

Link your local project to the existing Vercel project:

```bash
cd /Users/karlrafidimanana/Documents/Cursor
vercel link
```

This will:
1. Open your browser to authenticate with Vercel
2. Ask which project to link to: Select `fathom-linear-integration`
3. Ask which scope: Select your account/team
4. Create/update `.vercel/project.json` and `.vercel/README.md`

## Useful Vercel CLI Commands

### Check Environment Variables

```bash
vercel env ls
```

### View Environment Variables for Specific Environment

```bash
vercel env ls production
vercel env ls preview
vercel env ls development
```

### Pull Environment Variables

Download environment variables from Vercel to `.env.local`:

```bash
vercel env pull .env.local
```

### View Logs

View real-time logs from your deployment:

```bash
vercel logs
```

Or view logs for a specific deployment:

```bash
vercel logs [deployment-url]
```

### List Deployments

```bash
vercel ls
```

### View Project Info

```bash
vercel inspect
```

### Deploy

Deploy to preview:

```bash
vercel
```

Deploy to production:

```bash
vercel --prod
```

## Check Current Link Status

Check if project is linked:

```bash
cat .vercel/project.json
```

## Unlink (if needed)

To unlink the project:

```bash
rm -rf .vercel
```

## Troubleshooting

### "Not linked to a project"

If you get this error, run:
```bash
vercel link
```

### "Project not found"

Make sure you're authenticated:
```bash
vercel login
```

Then try linking again:
```bash
vercel link
```

### View logs without linking

You can also view logs directly from the Vercel dashboard, but CLI gives you more control.

