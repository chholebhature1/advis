# Custom Onboarding Inputs - Quick Test Guide

## What Was Fixed

✅ **Form Payload**: Now explicitly maps custom values to numeric columns via custom-to-numeric override logic
✅ **API Route**: Enhanced with debug logging to track custom field extraction
✅ **Precedence**: Guaranteed numeric > custom > band across all layers
✅ **Tests**: 8/8 custom input flow tests passing

## How to Test

### Test Scenario 1: Custom Income (₹50 Lakhs)

1. **Open onboarding form** at `http://localhost:3000/onboarding`
2. **Navigate to "Financial Snapshot" screen**
3. **Select** "Custom income" instead of band
4. **Enter** `5000000` in the custom income field
5. **Open browser console** (F12 → Console tab)
6. **Look for logs**:
   ```
   [Onboarding Form] Income custom override: income_custom_amount = 5000000 → monthly_income_inr
   [Onboarding Form] Final payload: { 
     income: 5000000,
     sip: 500000,
     years: 20,
     income_custom: 5000000
   }
   [API Submit] Extracted raw values: {
     monthlyIncome: 5000000,
     income_custom_amount: 5000000,
     ...
   }
   [API Submit] Final resolved values: {
     monthly_income_inr: 5000000,
     monthly_income_band: "custom",
     ...
   }
   ```

### Test Scenario 2: Custom SIP (₹5 Lakhs or Higher)

1. **Navigate to "Monthly Capacity" screen**
2. **Select** "Custom amount" instead of band
3. **Enter** `500000` or higher (e.g., `1500000` for ₹15 Lakhs)
4. **Verify logs** show:
   ```
   [Onboarding Form] SIP custom override: sip_custom_amount = 500000 → monthly_investable_surplus_inr
   [API Submit] Final resolved values: { monthly_investable_surplus_inr: 500000, ... }
   ```

### Test Scenario 3: Custom Horizon (20 Years)

1. **Navigate to "Time Horizon" screen**
2. **Select** "Custom timeline" instead of band
3. **Enter** `20`
4. **Verify logs** show:
   ```
   [Onboarding Form] Horizon custom override: time_horizon_custom_years = 20 → target_horizon_years
   [API Submit] Final resolved values: { target_horizon_years: 20, ... }
   ```

### Test Scenario 4: Full Custom Flow

1. **Fill all three custom inputs** (income, SIP, horizon)
2. **Complete form submission**
3. **Check Network tab** (F12 → Network):
   - POST to `/api/onboarding/submit`
   - Check request payload includes:
     ```json
     {
       "monthly_income_inr": 5000000,
       "monthly_investable_surplus_inr": 500000,
       "target_horizon_years": 20,
       "monthly_income_band": "custom",
       "monthly_investment_capacity_band": "custom",
       "time_horizon_band": "custom"
     }
     ```

### Test Scenario 5: Verify Database Storage

After submission, query the database:

```sql
SELECT 
  monthly_income_inr,
  monthly_investable_surplus_inr,
  target_horizon_years,
  monthly_income_band,
  monthly_investment_capacity_band,
  target_goal_horizon_band,
  created_at
FROM profiles
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**:
```
monthly_income_inr: 5000000 (NOT band default)
monthly_investable_surplus_inr: 500000 (NOT band default 75000)
target_horizon_years: 20 (NOT band default)
monthly_income_band: custom
monthly_investment_capacity_band: custom
target_goal_horizon_band: custom
```

## Validation Checklist

- [ ] Form logs show "custom override" messages when custom values selected
- [ ] API logs show extracted raw values including custom amounts
- [ ] API logs show final resolved values equal to custom inputs (not band defaults)
- [ ] Network request payload contains numeric columns populated with custom values
- [ ] Database query returns custom numeric values (not defaults)
- [ ] Custom values persist across sessions (refresh page, custom values still there)
- [ ] High custom values (e.g., ₹15L SIP) are NOT capped to band default

## Debug Commands

### View form state in console:

```javascript
// After filling custom values, in browser console:
fetch('/api/onboarding/submit', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'YOUR_SESSION_ID',
    answers: {
      monthly_income_band: 'custom',
      income_custom_amount: 5000000,
      monthly_investment_capacity_band: 'custom',
      sip_custom_amount: 500000,
      time_horizon_band: 'custom',
      time_horizon_custom_years: 20
    }
  })
}).then(r => r.json()).then(console.log);
```

### Query database from Supabase dashboard:

```sql
-- View all onboarding submissions
SELECT 
  id, 
  user_id,
  monthly_income_inr,
  monthly_investable_surplus_inr,
  target_horizon_years,
  created_at
FROM profiles
WHERE monthly_income_band = 'custom'
ORDER BY created_at DESC;

-- View custom income values
SELECT 
  monthly_income_inr,
  COUNT(*) as count
FROM profiles
WHERE monthly_income_band = 'custom'
GROUP BY monthly_income_inr
ORDER BY monthly_income_inr DESC;
```

## Expected Console Output

When form is submitted with custom values:

```
[Onboarding Form] Income custom override: income_custom_amount = 5000000 → monthly_income_inr
[Onboarding Form] SIP custom override: sip_custom_amount = 500000 → monthly_investable_surplus_inr
[Onboarding Form] Horizon custom override: time_horizon_custom_years = 20 → target_horizon_years
[Onboarding Form] Final payload: {
  income: 5000000,
  sip: 500000,
  years: 20,
  income_band: 'custom',
  sip_band: 'custom',
  horizon_band: 'custom',
  income_custom: 5000000,
  sip_custom: 500000,
  years_custom: 20
}
[API Submit] Extracted raw values: {
  monthlyIncome: 5000000,
  sipCapacity: 500000,
  horizonYears: 20,
  horizonBandRaw: 'custom',
  capacityBandRaw: 'custom',
  incomeBandRaw: 'custom',
  income_custom_amount: 5000000,
  sip_custom_amount: 500000,
  time_horizon_custom_years: 20
}
[API Submit] Final resolved values: {
  monthly_income_inr: 5000000,
  monthly_investable_surplus_inr: 500000,
  target_horizon_years: 20,
  monthly_income_band: 'custom',
  monthly_investment_capacity_band: 'custom',
  time_horizon_band: 'custom'
}
```

## Fail Conditions (These Should NOT Happen)

❌ If custom income 5000000 shows as 20000 in DB → Band fallback was used instead of custom
❌ If custom SIP 500000 shows as 75000 in DB → Band default was used instead of custom
❌ If custom horizon 20 shows as 5 in DB → Band midpoint was used instead of custom
❌ If custom values are missing from API payload → Form mapping incomplete
❌ If no "custom override" logs appear → Form override logic not executing

## Files Changed

1. **src/components/OnboardingForm.tsx**
   - Enhanced `buildAllAnswersPayload()` with custom override logic
   - Added console logging for debugging

2. **src/app/api/onboarding/submit/route.ts**
   - Added debug logging for extracted values
   - Added debug logging for final resolved values
   - Custom field extraction already working (enhanced with logging)

3. **test/custom-input-flow.spec.ts** (NEW)
   - 8 comprehensive tests validating custom input flow
   - All tests passing

## Production Build Status

✅ Build passed without errors
✅ All routes compiled successfully
✅ No TypeScript errors
✅ 37 static pages generated
