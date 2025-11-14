# Database Migration Guide - API Credentials Table

## Issue
Error: "Could not find the table 'public.api_credentials' in the schema cache"

## Solution
The `api_credentials` table needs to be created in your Supabase database. Follow these steps:

---

## Option 1: Supabase Dashboard (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your MediSync project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run Migration SQL
Copy and paste the following SQL into the editor and click "Run":

```sql
-- Create api_credentials table
CREATE TABLE IF NOT EXISTS public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'kakao', 'google')),
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, platform)
);

-- Enable RLS
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- Users can view own hospital credentials
CREATE POLICY "Users can view own hospital credentials"
  ON public.api_credentials FOR SELECT
  USING (hospital_id IN (
    SELECT hospital_id FROM public.users WHERE id = auth.uid()
  ));

-- Hospital owners and admins can insert credentials
CREATE POLICY "Hospital owners and admins can insert credentials"
  ON public.api_credentials FOR INSERT
  WITH CHECK (hospital_id IN (
    SELECT hospital_id FROM public.users
    WHERE id = auth.uid()
    AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
  ));

-- Hospital owners and admins can update credentials
CREATE POLICY "Hospital owners and admins can update credentials"
  ON public.api_credentials FOR UPDATE
  USING (hospital_id IN (
    SELECT hospital_id FROM public.users
    WHERE id = auth.uid()
    AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
  ));

-- Hospital owners can delete credentials
CREATE POLICY "Hospital owners can delete credentials"
  ON public.api_credentials FOR DELETE
  USING (hospital_id IN (
    SELECT hospital_id FROM public.users
    WHERE id = auth.uid() AND role = 'hospital_owner'
  ));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_credentials_hospital_platform
  ON public.api_credentials(hospital_id, platform);

-- Add comment for documentation
COMMENT ON TABLE public.api_credentials IS 'Stores API credentials for each hospital to connect to advertising platforms (Meta, Kakao, Google)';
```

### Step 3: Verify Table Creation
Run this verification query:

```sql
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'api_credentials'
ORDER BY ordinal_position;
```

You should see all the columns listed (id, hospital_id, platform, credentials, etc.)

### Step 4: Test RLS Policies
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'api_credentials';

-- List all policies
SELECT * FROM pg_policies WHERE tablename = 'api_credentials';
```

---

## Option 2: Using Supabase CLI (If linked)

If you have Supabase CLI set up and linked:

```bash
# Link your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

---

## Verification

After running the migration, verify it worked:

1. **Check in Supabase Dashboard**:
   - Go to "Table Editor"
   - Look for `api_credentials` table
   - Verify columns exist

2. **Test in Application**:
   - Navigate to `/dashboard/settings/api-credentials`
   - The error should be gone
   - Try saving credentials for any platform

---

## Troubleshooting

### Error: "relation 'public.hospitals' does not exist"
The `api_credentials` table references the `hospitals` table. Make sure the hospitals table exists first.

### Error: "role does not exist"
Check that your Supabase user has proper permissions. You may need to run as postgres user in SQL Editor.

### Error: Policy already exists
If you're re-running the migration, drop existing policies first:
```sql
DROP POLICY IF EXISTS "Users can view own hospital credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Hospital owners and admins can insert credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Hospital owners and admins can update credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Hospital owners can delete credentials" ON public.api_credentials;
```

---

## Next Steps

After successful migration:
1. ✅ Database table created
2. ✅ RLS policies enabled
3. ✅ Application can now store/retrieve credentials
4. 📝 Configure API credentials via UI at `/dashboard/settings/api-credentials`

---

## Support

If you encounter any issues:
- Check Supabase logs in Dashboard → Logs
- Verify your user has proper role (hospital_owner, hospital_admin, or marketing_manager)
- Ensure hospitals table exists and has your hospital_id
