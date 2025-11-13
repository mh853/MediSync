# UI-Based API Credential Management

## Overview

MediSync now supports **multi-tenant API credential management** through a user-friendly UI. Each hospital can configure their own Meta Ads, Kakao Moment, and Google Ads API credentials independently.

## Architecture Changes

### Before (Environment Variables)
```
.env.local
├── META_APP_ID=shared_for_all_hospitals
├── META_APP_SECRET=shared_for_all_hospitals
├── KAKAO_REST_API_KEY=shared_for_all_hospitals
└── GOOGLE_CLIENT_ID=shared_for_all_hospitals
```
❌ **Problem**: All hospitals share the same API credentials (not multi-tenant friendly)

### After (Database Storage)
```
Database: api_credentials table
├── Hospital A → Meta credentials
├── Hospital B → Meta credentials
├── Hospital A → Kakao credentials
└── Hospital B → Google credentials
```
✅ **Solution**: Each hospital has independent API credentials in database

## Database Schema

### Table: `api_credentials`

```sql
CREATE TABLE api_credentials (
  id UUID PRIMARY KEY,
  hospital_id UUID REFERENCES hospitals(id),
  platform TEXT CHECK (platform IN ('meta', 'kakao', 'google')),
  credentials JSONB,  -- Encrypted storage
  is_active BOOLEAN,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(hospital_id, platform)
);
```

### Row-Level Security (RLS)

- **SELECT**: Users can view their hospital's credentials
- **INSERT/UPDATE**: Hospital owners, admins, and marketing managers only
- **DELETE**: Hospital owners only

## UI Features

### Settings Page: `/dashboard/settings/api-credentials`

**Features:**
1. **Expandable Platform Cards**
   - Meta Ads (blue)
   - Kakao Moment (yellow)
   - Google Ads (red)

2. **Setup Guides**
   - Inline setup instructions per platform
   - Links to official developer consoles
   - Links to detailed setup documentation

3. **Credential Forms**
   - Meta: App ID, App Secret
   - Kakao: REST API Key, JavaScript Key
   - Google: Client ID, Client Secret, Developer Token

4. **Status Indicators**
   - ✓ 연동됨 (Validated)
   - 설정됨 (Configured but not validated)
   - Not configured (expandable to add)

5. **Security Features**
   - Password-type inputs for secrets
   - Encrypted storage in database
   - Permission-based access control

## OAuth Flow Updates

### Before
```typescript
// Hard-coded or environment variable fallback
const clientId = process.env.META_APP_ID || 'YOUR_META_APP_ID'
```

### After
```typescript
// Fetch from database per hospital
const { data: credentialData } = await supabase
  .from('api_credentials')
  .select('credentials')
  .eq('hospital_id', userProfile.hospital_id)
  .eq('platform', 'meta')
  .single()

const credentials = credentialData.credentials as MetaCredentials
const clientId = credentials.app_id
```

### Error Handling

If credentials are not configured:
```json
{
  "error": "META API 인증 정보가 설정되지 않았습니다.",
  "needsSetup": true,
  "setupUrl": "/dashboard/settings/api-credentials"
}
```

## File Changes

### New Files
1. **`supabase/migrations/20240115000000_create_api_credentials.sql`**
   - Database schema and RLS policies

2. **`src/app/dashboard/settings/api-credentials/page.tsx`**
   - UI for credential management (580 lines)

### Modified Files
1. **`src/types/database.types.ts`**
   - Added `ApiPlatform` type
   - Added credential interfaces (Meta, Kakao, Google)
   - Added `api_credentials` table types

2. **`src/app/api/ad-accounts/connect/[platform]/route.ts`**
   - Load credentials from database
   - Error handling for missing credentials
   - Type-safe credential usage

3. **`src/app/dashboard/settings/page.tsx`**
   - Added prominent link to API credentials page

4. **`docs/AD_PLATFORM_SETUP.md`**
   - Updated with UI-based setup instructions

5. **`.env.example`**
   - Removed API credential environment variables
   - Added note about UI-based management

## Security Considerations

### Encryption
- Credentials stored as JSONB in database
- Database-level encryption via Supabase
- Future: Add application-level encryption for additional security

### Access Control
- RLS policies restrict access to hospital's own credentials
- Role-based permissions for create/update/delete
- Audit trail via `created_at` and `updated_at`

### Best Practices
- Never log credentials
- Use password-type inputs in UI
- Validate credentials before activation (future enhancement)
- Regular credential rotation recommended

## Usage Guide

### For Hospital Administrators

1. **Navigate to Settings**
   - Dashboard → Settings → "광고 플랫폼 API 연동 설정"

2. **Configure Meta Ads**
   - Click Meta Ads card to expand
   - Follow setup guide link
   - Enter App ID and App Secret from Meta for Developers
   - Click "저장" (Save)

3. **Configure Kakao Moment**
   - Click Kakao Moment card to expand
   - Follow setup guide link
   - Enter REST API Key and JavaScript Key from Kakao Developers
   - Click "저장" (Save)

4. **Configure Google Ads**
   - Click Google Ads card to expand
   - Follow setup guide link
   - Enter Client ID, Client Secret, and Developer Token
   - Click "저장" (Save)

5. **Connect Ad Accounts**
   - Navigate to "광고 계정" (Ad Accounts)
   - Click "광고 계정 연동" (Connect Ad Account)
   - Select platform (Meta, Kakao, or Google)
   - Complete OAuth flow

### For Developers

**Testing Locally:**
```bash
# 1. Run database migrations
npx supabase migration up

# 2. Start dev server
npm run dev

# 3. Navigate to http://localhost:3000/dashboard/settings/api-credentials

# 4. Configure credentials via UI

# 5. Test OAuth flow at http://localhost:3000/dashboard/ad-accounts
```

**Production Deployment:**
```bash
# 1. Push changes to GitHub
git push origin main

# 2. Vercel auto-deploys

# 3. Run migrations on production Supabase
npx supabase db push --project-ref YOUR_PROJECT_REF
```

## Migration Path

### From Environment Variables to Database

For existing deployments with environment variables:

1. **Keep existing environment variables** (temporary backward compatibility if needed)
2. **Deploy new code** with database schema
3. **Migrate credentials** via UI:
   - Log in as hospital admin
   - Navigate to API credentials settings
   - Enter credentials from environment variables
   - Save each platform
4. **Verify** OAuth flows work with database credentials
5. **Remove** environment variables from Vercel/hosting platform

### Bulk Migration Script (Optional)

For migrating multiple hospitals programmatically:

```sql
-- Example: Insert credentials for existing hospitals
INSERT INTO api_credentials (hospital_id, platform, credentials)
SELECT
  id as hospital_id,
  'meta' as platform,
  jsonb_build_object(
    'app_id', 'YOUR_META_APP_ID',
    'app_secret', 'YOUR_META_APP_SECRET'
  ) as credentials
FROM hospitals
WHERE id IN (SELECT DISTINCT hospital_id FROM users);
```

## Future Enhancements

### Phase 1 (Current) ✅
- [x] Database schema for credentials
- [x] UI for credential management
- [x] OAuth flow using database credentials
- [x] RLS policies for security

### Phase 2 (Planned)
- [ ] Credential validation API endpoint
- [ ] Test connection functionality in UI
- [ ] Application-level encryption (AES-256)
- [ ] Credential rotation reminders
- [ ] Audit logs for credential changes

### Phase 3 (Future)
- [ ] Webhook validation for platform status
- [ ] Automatic token refresh handling
- [ ] Credential health monitoring
- [ ] Multi-region credential management

## Troubleshooting

### "API 인증 정보가 설정되지 않았습니다" Error

**Cause**: Credentials not configured for the platform

**Solution**:
1. Navigate to `/dashboard/settings/api-credentials`
2. Click the platform card (Meta, Kakao, or Google)
3. Fill in all required fields
4. Click "저장" (Save)
5. Retry ad account connection

### Credentials Not Loading

**Check**:
1. User has correct hospital_id in profile
2. RLS policies allow access
3. Database migration ran successfully
4. Credentials exist for hospital + platform combination

**Debug Query**:
```sql
SELECT * FROM api_credentials
WHERE hospital_id = 'YOUR_HOSPITAL_ID'
AND platform = 'meta';
```

### OAuth Flow Fails with "Invalid Client ID"

**Check**:
1. Credentials saved correctly in database
2. App ID matches exactly from developer console
3. No extra spaces in credentials
4. Platform app is in correct mode (development vs production)

## Support

For issues or questions:
- Documentation: `/docs/AD_PLATFORM_SETUP.md`
- API Credentials UI: `/dashboard/settings/api-credentials`
- GitHub Issues: https://github.com/mh853/MediSync/issues
