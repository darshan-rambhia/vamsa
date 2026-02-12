# Phase 8 i18n Translation Completion Guide

## Status: Partially Complete

### Completed Files

#### Translation Keys (100% Complete)

- ✅ `apps/web/src/i18n/locales/en/common.json` - Added 160+ new keys
- ✅ `apps/web/src/i18n/locales/hi/common.json` - Added Hindi translations
- ✅ `apps/web/src/i18n/locales/es/common.json` - Added Spanish translations

#### Component Files (15% Complete)

- ✅ `apps/web/src/routes/_authenticated/maps/index.tsx` - Fully translated
- ✅ `apps/web/src/components/maps/map-controls.tsx` - Fully translated

### Remaining Work

The following files need `useTranslation()` added and hardcoded strings replaced with `t()` calls:

#### Maps Components

- `apps/web/src/components/maps/map-popup.tsx`
- `apps/web/src/components/maps/timeline-slider.tsx`
- `apps/web/src/components/maps/interactive-map.tsx` (minimal - mostly no user-facing strings)

#### Activity Components

- `apps/web/src/routes/_authenticated/activity.tsx`
- `apps/web/src/components/activity/ActivityFilterPanel.tsx`

#### Calendar/Subscribe Components

- `apps/web/src/routes/_authenticated/subscribe.tsx`
- `apps/web/src/components/calendar/subscription-instructions.tsx`
- `apps/web/src/components/calendar/create-token-form.tsx`

#### Settings Components

- `apps/web/src/routes/_authenticated/settings/profile.tsx`
- `apps/web/src/components/_authenticated/settings/calendar-tokens.tsx`

#### Media Components (if they exist - need to check)

- `apps/web/src/components/media/media-*.tsx`

#### Place Components (if they exist - need to check)

- `apps/web/src/components/place/place-*.tsx`

#### Source Components (if they exist - need to check)

- `apps/web/src/components/source/source-*.tsx`

#### Events Components (if they exist - need to check)

- `apps/web/src/components/events/event-*.tsx`

### Pattern to Follow

For each file:

1. Add import:

```typescript
import { useTranslation } from "react-i18next";
```

2. In the component function, add:

```typescript
const { t } = useTranslation(["common"]); // or ["people"] for person-related UI
```

3. Replace hardcoded strings:

```typescript
// Before:
<h1>Calendar Subscriptions</h1>

// After:
<h1>{t("calendarSubscriptions")}</h1>
```

### Key Mapping Reference

#### Maps

- "Family Maps" → t("familyMaps")
- "Enable Timeline" → t("enableTimeline")
- "Total Locations" → t("totalLocations")
- "Map Style" → t("mapStyle")
- "Streets" / "Satellite" / "Terrain" → t("streets") / t("satellite") / t("terrain")
- "Marker Colors" → t("markerColors")
- "Birth Events" → t("birthEvents")
- etc.

#### Activity

- "Activity" → t("activity")
- "Recent changes to your family tree" → t("recentChanges")
- "Search activity..." → t("searchActivity")
- "Date Range" → t("dateRange")
- "Last 7 days" → t("last7Days")
- etc.

#### Calendar/Subscribe

- "Calendar Subscriptions" → t("calendarSubscriptions")
- "Generate Access Token" → t("generateAccessToken")
- "Token Name" → t("tokenName")
- "Generate New Token" → t("generateNewToken")
- "Birthday Calendar" → t("birthdayCalendar")
- etc.

#### Settings

- "Profile Settings" → t("profileSettings")
- "Account Information" → t("accountInformation")
- "Calendar Access Tokens" → t("calendarAccessTokens")
- etc.

### Notes

- All translation keys have been added to the locale files with proper English, Hindi, and Spanish translations
- DO NOT translate data values from the database (person names, places, dates, etc.)
- Use `common` namespace for most UI elements
- Use `people` namespace for person-specific elements (if needed for media, events, sources, places)
- All keys follow camelCase convention
- Accessibility attributes (aria-label, etc.) should also be translated

### Testing After Completion

1. Run `bun run typecheck` to ensure no TypeScript errors
2. Run `bun run lint` to check for linting issues
3. Test language switcher in the UI
4. Verify all three languages (en, hi, es) display correctly
5. Check that no hardcoded English strings remain
