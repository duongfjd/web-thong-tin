# Deployment Guide

This guide will help you deploy the Community Platform to production.

## Prerequisites

- GitHub repository with code pushed
- Vercel account (https://vercel.com)
- Supabase account with database set up
- Stripe account (optional, for payments)

## Step 1: Prepare Your Database

1. Go to your Supabase dashboard
2. Navigate to the SQL editor
3. Copy the contents of `scripts/setup-database.sql`
4. Execute the SQL in your Supabase project
5. Note your database URL and API key

## Step 2: Set Up Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Stripe (Optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key_here
STRIPE_SECRET_KEY=your_secret_key_here
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B: Using GitHub Integration

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Set environment variables in Vercel dashboard
4. Click "Deploy"

## Step 4: Configure Supabase Settings

### Enable RLS Policies

All tables already have RLS enabled. Verify in Supabase dashboard:

1. Go to Authentication → Policies
2. Check that all policies are enabled

### Set Up Webhooks (Optional)

For Stripe payments, set up webhooks:

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `charge.failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## Step 5: Configure Production Settings

### Supabase

1. Go to Settings → API
2. Copy production URL and API key
3. Update environment variables in Vercel

### Enable Auth Email Confirmation

1. Go to Authentication → Email Templates
2. Customize confirmation email
3. Set up email sending (SendGrid recommended)

## Step 6: Monitor & Maintain

### Performance

- Use Vercel Analytics to monitor performance
- Check Supabase database metrics
- Set up error tracking (optional)

### Security

- Regularly review Supabase logs
- Monitor for suspicious API activity
- Keep dependencies updated: `npm update`

### Backups

- Enable automatic backups in Supabase
- Test restore procedures regularly

## Troubleshooting

### Database Connection Issues

1. Check environment variables are set correctly
2. Verify Supabase project is active
3. Check database user permissions

### Stripe Webhook Errors

1. Verify webhook secret is correct
2. Check webhook endpoint is accessible
3. Review Stripe webhook logs

### Performance Issues

1. Add database indexes (already included in schema)
2. Enable caching in Supabase
3. Optimize images and assets

## Scaling

### Database

- Monitor connections and queries
- Add read replicas for read-heavy workloads
- Archive old data regularly

### Application

- Use Vercel Edge Functions for performance
- Enable image optimization
- Implement caching headers

### Storage

- Set up CDN for media files
- Use Supabase Storage for large files
- Implement cleanup jobs for orphaned files

## Support

For issues:
1. Check Vercel logs: `vercel logs`
2. Check Supabase logs
3. Review error tracking service
4. Contact support for your hosting provider

## Rollback

If deployment issues occur:

```bash
# Rollback to previous version
vercel rollback
```

## Next Steps

1. Set up monitoring and alerts
2. Configure automated backups
3. Set up CI/CD pipeline for automated deployments
4. Configure email notifications
5. Set up analytics and reporting
