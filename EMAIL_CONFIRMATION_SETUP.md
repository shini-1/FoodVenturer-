# Email Confirmation Deep Link Setup

## What Was Changed

1. **app.json** - Added deep linking scheme: `foodventurer://`
2. **App.tsx** - Added deep link handler for email confirmations
3. **Package dependency** - Need to install `expo-linking`

## Step 1: Install Required Package

Run this command:

```bash
npx expo install expo-linking
```

## Step 2: Configure Supabase Redirect URLs

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
   https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/auth/url-configuration

2. Set **Site URL** to:
   ```
   foodventurer://
   ```

3. Add these **Redirect URLs**:
   ```
   foodventurer://**
   com.codeblooded.foodventurer://**
   exp://localhost:8081/**
   ```

4. Click **Save**

## Step 3: Test Email Confirmation

### For Development (Expo Go):
1. Send confirmation email
2. Click link in email
3. It will open your app
4. Check console logs for: `✅ Session set successfully!`

### For Production Build:
1. Build new APK with GitHub Actions
2. Install on device
3. Send confirmation email
4. Click link - it will open the app
5. User will be automatically logged in

## How It Works

1. **User clicks email link** → Opens URL like:
   ```
   foodventurer://#access_token=xxx&refresh_token=yyy&type=signup
   ```

2. **App receives deep link** → `handleDeepLink()` function is called

3. **Extract tokens** → Parse URL parameters

4. **Set session** → Call `supabase.auth.setSession()`

5. **Navigate** → Redirect user to appropriate screen

## Console Logs to Watch For

When email confirmation works, you'll see:
```
📱 Deep link received: foodventurer://#access_token=...
🔐 Setting session from deep link...
✅ Session set successfully!
Email confirmed successfully!
```

## Troubleshooting

### Link opens in browser instead of app
- Make sure you've set the redirect URLs in Supabase
- Rebuild the app after adding the scheme to app.json

### "expo-linking not found" error
- Run: `npx expo install expo-linking`
- Restart Expo dev server

### Session not setting
- Check console logs for errors
- Verify tokens are being extracted from URL
- Check Supabase auth logs

## For Production

After installing `expo-linking` and testing:

1. Commit changes
2. Push to GitHub
3. GitHub Actions will build new APK
4. Download and install
5. Test email confirmation flow

---

**Current Status:**
- ✅ Deep linking configured in app.json
- ✅ Deep link handler added to App.tsx
- ⏳ Need to install expo-linking
- ⏳ Need to configure Supabase redirect URLs
