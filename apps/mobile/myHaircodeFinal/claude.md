# myHaircode - Codebase Documentation

## Project Overview

**myHaircode** is a React Native mobile application that connects hairdressers with their clients, providing a digital platform for managing hair-related services, records, and inspiration. It serves as a comprehensive "hair journal" and client management system.

### Purpose
- **For Hairdressers**: Create and manage "haircodes" (service records) for clients, track client relationships, manage inspiration galleries
- **For Clients**: View their complete hair history, manage their hairdressers, save inspiration images, receive service notifications

### User Types
- **HAIRDRESSER**: Professionals who create haircodes for clients, manage client relationships
- **CLIENT**: Users who receive services and maintain their hair history

---

## Technology Stack

### Frontend/Mobile
- **React Native**: 0.81.4
- **React**: 19.1.0
- **Expo SDK**: 54.0.7 (managed workflow with dev client)
- **TypeScript**: 5.9.2
- **Navigation**: Expo Router 6.0.5 (file-based routing)

### Backend/Database
- **Supabase**: Complete backend solution
  - PostgreSQL database
  - Authentication
  - Storage (avatars, haircode media, inspiration images)
  - Real-time subscriptions
  - Edge functions
- **Supabase JS Client**: 2.39.5

### State Management
- **React Query (TanStack Query)**: 5.62.3 - Server state management
- **Context API**: Global UI state (Auth, Camera, Image, RealTime)
- **React useState/useReducer**: Local component state

### UI Components & Styling
- **Phosphor React Native**: Icon library
- **React Native Reanimated**: 4.1.0 - Animations
- **React Native Gesture Handler**: Touch interactions
- **React Native Linear Gradient**: Gradients
- **Expo Linear Gradient**: Expo-specific gradients
- **React Native Vector Icons**: Additional icons
- **React Native Elements**: UI components
- **Radix UI**: Dialog, tabs, and other primitives

### Media Handling
- **Expo Camera**: 17.0.8 - Camera functionality
- **Expo Image Picker**: 17.0.8 - Photo/video selection
- **Expo Image Manipulator**: 14.0.7 - Image processing
- **Expo AV**: Video playback
- **React Native SVG**: Vector graphics support

### Utilities
- **Date-fns & Dayjs**: Date formatting and manipulation
- **Libphonenumber-js**: Phone number validation
- **PostHog**: 4.7.1 - Product analytics
- **Expo Notifications**: 0.32.11 - Push notifications
- **Base64-arraybuffer**: File encoding
- **Expo Secure Store**: Secure credential storage
- **Async Storage**: Local data persistence

### Development Tools
- **Babel**: preset-expo
- **ESLint**: 9.20.1
- **Jest**: 29.7.0 with jest-expo
- **React Native SVG Transformer**: SVG file support

---

## Project Structure

```
myHaircodeFinal/
├── src/                        # Source code
│   ├── app/                    # Expo Router screens (file-based routing)
│   │   ├── (auth)/            # Authentication flow
│   │   │   ├── Splash.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   ├── SignIn.tsx
│   │   │   ├── SignUp.tsx
│   │   │   ├── Reset.tsx
│   │   │   ├── reset-password.tsx
│   │   │   ├── CheckMail.tsx
│   │   │   └── Delete.tsx
│   │   ├── (client)/          # Client-specific screens
│   │   │   └── (tabs)/        # Client tab navigation
│   │   │       ├── home.tsx
│   │   │       ├── notifications.tsx
│   │   │       ├── userList.tsx (search hairdressers)
│   │   │       └── profile.tsx
│   │   ├── (hairdresser)/     # Hairdresser-specific screens
│   │   │   └── (tabs)/        # Hairdresser tab navigation
│   │   │       ├── home.tsx
│   │   │       ├── notifications.tsx
│   │   │       ├── myInspiration.tsx
│   │   │       └── profile.tsx
│   │   ├── (setup)/           # Onboarding/setup flow
│   │   │   ├── Setup.tsx
│   │   │   ├── ChooseRole.tsx
│   │   │   ├── ClientSetup.tsx
│   │   │   ├── HairdresserSetup.tsx
│   │   │   ├── FullName.tsx
│   │   │   ├── PhoneNumber.tsx
│   │   │   ├── ProfilePicture.tsx
│   │   │   └── TermsAndPrivacy.tsx
│   │   ├── haircodes/         # Haircode management
│   │   │   ├── new_haircode.tsx
│   │   │   ├── single_haircode.tsx
│   │   │   ├── see_haircode_client.tsx
│   │   │   ├── [id].tsx
│   │   │   ├── qr_scanner.tsx
│   │   │   ├── rapport_user.tsx
│   │   │   └── view_gallery.tsx
│   │   ├── inspiration/       # Inspiration gallery
│   │   │   ├── index.tsx
│   │   │   ├── share.tsx
│   │   │   └── delete.tsx
│   │   ├── Screens/           # Shared screens
│   │   │   ├── ImageDetails.tsx
│   │   │   ├── paywall.tsx
│   │   │   └── feedback.tsx
│   │   ├── Notifications/     # Notification screens
│   │   └── _layout.tsx        # Root layout with providers
│   ├── api/                   # Data layer (React Query hooks)
│   │   ├── haircodes/         # Haircode CRUD operations
│   │   │   ├── useListClientHaircodes.tsx
│   │   │   ├── useLatestHaircodes.tsx
│   │   │   ├── useAddHaircode.tsx
│   │   │   ├── useUpdateHaircode.tsx
│   │   │   └── useDeleteHaircode.tsx
│   │   ├── profiles/          # User profile operations
│   │   │   ├── useUserProfile.tsx
│   │   │   ├── useUpdateProfile.tsx
│   │   │   └── useSearchUsers.tsx
│   │   ├── inspirations/      # Inspiration operations
│   │   ├── notifications/     # Notification operations
│   │   └── moderation.ts      # Content moderation/blocking
│   ├── components/            # Reusable UI components (45+ components)
│   │   ├── HaircodeCard.tsx
│   │   ├── SearchInput.tsx
│   │   ├── SearchResults.tsx
│   │   ├── RemoteImage.tsx
│   │   ├── RemoteVideo.tsx
│   │   ├── NotificationItem.tsx
│   │   ├── ProfileModal.tsx
│   │   ├── DraggableModal.tsx
│   │   ├── CameraPreview.tsx
│   │   └── ... (many more)
│   ├── providers/             # React Context providers
│   │   ├── AuthProvider.tsx   # Authentication state
│   │   ├── QueryProvider.tsx  # React Query configuration
│   │   ├── CameraProvider.tsx # Camera state management
│   │   ├── ImageProvider.tsx  # Image caching/management
│   │   ├── RealTimeProvider.tsx # Supabase real-time subscriptions
│   │   └── SetupProvider.tsx  # Setup flow state
│   ├── constants/             # Constants and types
│   │   ├── Colors.ts          # Color palette
│   │   ├── Icons.js           # Icon definitions
│   │   └── types.tsx          # TypeScript type definitions
│   ├── lib/                   # Core libraries
│   │   └── supabase.ts        # Supabase client configuration
│   ├── utils/                 # Utility functions
│   │   ├── responsive.ts      # Responsive design helpers
│   │   └── ... (various helpers)
│   └── hooks/                 # Custom React hooks
├── assets/                    # Static assets
│   ├── fonts/                 # Inter font family
│   ├── images/               # App images
│   ├── data/                 # Static data files
│   │   ├── inspiration_data.ts
│   │   └── profiles.ts
│   └── icons/                # Icon assets
├── supabase/                 # Supabase configuration
│   ├── functions/            # Edge functions
│   │   ├── send-notification/
│   │   └── deleteUser/
│   ├── migrations/           # Database migrations (SQL)
│   └── config.toml           # Supabase config
├── plugins/                  # Expo config plugins
├── android/                  # Android native code
├── hooks/                    # Project hooks
├── scripts/                  # Build/deploy scripts
├── .env                      # Environment variables
├── app.config.js             # Dynamic Expo config
├── app.json                  # Expo app configuration
├── eas.json                  # EAS Build configuration
├── metro.config.js           # Metro bundler config
├── tsconfig.json             # TypeScript configuration
├── babel.config.js           # Babel configuration
├── eslint.config.mjs         # ESLint configuration
└── package.json              # Dependencies
```

---

## Core Features

### 1. Haircodes (Service Records)
- **Create/Edit/Delete**: Hairdressers can manage service records for clients
- **Media Gallery**: Support for multiple images and videos per haircode
- **Service Details**: Description, pricing, duration, services performed
- **QR Code Scanning**: Quick access to haircodes via QR codes
- **Access Control**: Only hairdresser and client can view their shared haircodes
- **Files**: `src/app/haircodes/*`, `src/api/haircodes/*`

### 2. User Profiles
- **Avatar Management**: Upload and manage profile pictures
- **Personal Information**: Full name, phone number, about me
- **Hairdresser Fields**: Salon name, booking site, social media links
- **Client Fields**: Hair structure, thickness, natural color, grey percentage
- **Role-Based Setup**: Different onboarding flows for clients vs hairdressers
- **Files**: `src/app/(setup)/*`, `src/api/profiles/*`

### 3. Inspiration Gallery
- **Save Inspirations**: Hairdressers can save hair inspiration images
- **Share with Clients**: Send inspirations to specific clients
- **Multi-Resolution**: Low, medium, and high-resolution image variants for performance
- **Delete Management**: Remove unwanted inspirations
- **Files**: `src/app/inspiration/*`, `src/api/inspirations/*`

### 4. Relationship Management
- **Hairdresser-Client Connections**: Track relationships between users
- **Friend Requests**: Send/accept connection requests
- **User Search**: Find hairdressers or clients by name/phone
- **Block/Unblock**: User moderation capabilities
- **Relationship Status**: Pending, accepted, blocked states
- **Files**: `src/app/(client)/(tabs)/userList.tsx`, `src/api/moderation.ts`

### 5. Notifications System
- **Push Notifications**: Expo Notifications integration
- **Real-time Updates**: Supabase real-time subscriptions
- **Notification Types**:
  - `FRIEND_REQUEST`: New connection request
  - `FRIEND_ACCEPTED`: Connection accepted
  - `INSPIRATION_SHARED`: New inspiration shared
  - `HAIRCODE_ADDED`: New haircode created
- **Unread Badges**: Visual indicators for unread notifications
- **Files**: `src/app/Notifications/*`, `src/api/notifications/*`

### 6. Authentication & Authorization
- **Email/Password Auth**: Supabase authentication
- **Session Management**: Secure token storage (SecureStore on mobile)
- **User Status Checking**: Banned/restricted account handling
- **Setup Completion**: Multi-step onboarding flow
- **Password Reset**: Email-based password recovery
- **Files**: `src/app/(auth)/*`, `src/providers/AuthProvider.tsx`

### 7. Camera & Media
- **In-App Camera**: Custom camera interface
- **Photo/Video Picker**: Access device gallery
- **Image Manipulation**: Resize, compress before upload
- **Video Playback**: Built-in video player
- **Files**: `src/providers/CameraProvider.tsx`, `src/components/CameraPreview.tsx`

### 8. Analytics
- **PostHog Integration**: Product analytics tracking
- **Event Tracking**: User actions, feature usage
- **User Identification**: Role-based analytics
- **Files**: `src/app/_layout.tsx` (PostHog initialization)

---

## Data Models

### Database Tables (Supabase PostgreSQL)

#### `profiles`
```typescript
{
  id: UUID (references auth.users)
  email: string
  full_name: string
  phone_number: string
  avatar_url: string
  about_me: text
  user_type: 'HAIRDRESSER' | 'CLIENT'

  // Hairdresser-specific
  salon_name: string
  salon_phone_number: string
  booking_site: string
  social_media: string

  // Client-specific
  hair_structure: string
  hair_thickness: string
  natural_hair_color: string
  grey_hair_percentage: string

  // System fields
  setup_status: string
  is_subscribed: boolean
  push_token: string
  signup_date: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

#### `haircodes`
```typescript
{
  id: UUID
  created_at: timestamp
  client_id: UUID (references profiles)
  hairdresser_id: UUID (references profiles)
  service_description: text
  services: string[] | string
  price: numeric
  duration: string
  hairdresser_name: string
}
```

#### `haircode_media`
```typescript
{
  haircode_id: UUID (references haircodes)
  media_url: string (storage path)
  media_type: 'image' | 'video'
}
```

#### `hairdresser_clients`
```typescript
{
  hairdresser_id: UUID (references profiles)
  client_id: UUID (references profiles)
  created_at: timestamp
  // Relationship table
}
```

#### `inspirations`
```typescript
{
  id: UUID
  created_at: timestamp
  owner_id: UUID (references profiles)
  image_url: string
  low_res_image_url: string
  low_middle_res_url: string
  high_middle_res_url: string
}
```

#### `notifications`
```typescript
{
  id: UUID
  created_at: timestamp
  user_id: UUID (references profiles)
  sender_id: UUID (references profiles)
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'INSPIRATION_SHARED' | 'HAIRCODE_ADDED'
  message: string
  body: text
  read: boolean
  image_url: string
}
```

#### `blocked_users`
```typescript
{
  blocker_id: UUID (references profiles)
  blocked_id: UUID (references profiles)
  created_at: timestamp
}
```

### Storage Buckets
- **avatars**: User profile pictures
- **haircode_images**: Haircode media (images and videos)
- **inspirations**: Inspiration images (with multiple resolutions)

### RPC Functions (Database Functions)
- `can_user_perform_action`: Check if user is banned/restricted
- `get_clients_profiles_with_relationship`: Get clients with relationship status
- `get_hairdressers_with_relationship`: Get hairdressers with relationship status

---

## Routing Structure (Expo Router)

### Authentication Routes
- `/Splash` - Landing screen
- `/Onboarding` - First-time user intro
- `/SignIn` - Login
- `/SignUp` - Registration
- `/Reset` - Password reset request
- `/reset-password` - Password reset form
- `/CheckMail` - Email verification screen
- `/Delete` - Account deletion

### Setup Routes
- `/Setup` - Initial setup screen
- `/ChooseRole` - Select HAIRDRESSER or CLIENT
- `/ClientSetup` or `/HairdresserSetup` - Role-specific setup
- `/FullName` - Enter full name
- `/PhoneNumber` - Enter phone number
- `/ProfilePicture` - Upload avatar
- `/TermsAndPrivacy` - Accept terms

### Client Routes
- `/(client)/(tabs)/home` - Client dashboard
- `/(client)/(tabs)/notifications` - View notifications
- `/(client)/(tabs)/userList` - Search and add hairdressers
- `/(client)/(tabs)/profile` - Client profile
- `/userList/hairdresserProfile/[id]` - View hairdresser profile

### Hairdresser Routes
- `/(hairdresser)/(tabs)/home` - Hairdresser dashboard
- `/(hairdresser)/(tabs)/notifications` - View notifications
- `/(hairdresser)/(tabs)/myInspiration` - Inspiration gallery
- `/(hairdresser)/(tabs)/profile` - Hairdresser profile
- `/clientProfile/[id]` - View client profile

### Haircode Routes
- `/haircodes/new_haircode` - Create new haircode
- `/haircodes/single_haircode` - View haircode details
- `/haircodes/see_haircode_client` - Client's haircode list
- `/haircodes/[id]` - Dynamic haircode view
- `/haircodes/qr_scanner` - Scan QR code
- `/haircodes/rapport_user` - Generate user report
- `/haircodes/view_gallery` - View media gallery

### Inspiration Routes
- `/inspiration` - Main inspiration gallery
- `/inspiration/share` - Share inspiration with client
- `/inspiration/delete` - Delete inspiration

### Utility Routes
- `/support` - Contact support
- `/restricted` - Restricted account screen
- `/Screens/ImageDetails` - Full-screen image viewer
- `/Screens/paywall` - Subscription paywall
- `/Screens/feedback` - Submit feedback

---

## State Management Architecture

### Provider Hierarchy (in `src/app/_layout.tsx`)
```tsx
<PostHogProvider>
  <AuthProvider>
    <RealTimeProvider>
      <QueryProvider>
        <ImageProvider>
          <MarkProvider>
            <CameraProvider>
              <SetupProvider>
                {/* App content */}
              </SetupProvider>
            </CameraProvider>
          </MarkProvider>
        </ImageProvider>
      </QueryProvider>
    </RealTimeProvider>
  </AuthProvider>
</PostHogProvider>
```

### State Management Layers

1. **Server State** (React Query)
   - Data fetching and caching
   - Optimistic updates
   - Cache invalidation
   - Background refetching
   - Example: `useListClientHaircodes`, `useUserProfile`

2. **Global UI State** (Context API)
   - **AuthProvider**: Current user, session, authentication status
   - **RealTimeProvider**: Supabase real-time subscriptions
   - **ImageProvider**: Image caching and management
   - **CameraProvider**: Camera state and permissions
   - **SetupProvider**: Setup flow progress

3. **Local Component State** (useState/useReducer)
   - Form inputs
   - UI toggles
   - Temporary data

### Real-time Subscriptions
The `RealTimeProvider` sets up Supabase real-time channels for:
- Notifications (new notifications trigger query invalidation)
- Haircode updates
- Profile changes
- Relationship updates

---

## Key Architectural Patterns

### 1. File-Based Routing
Uses Expo Router with grouped routes for organization:
- `(auth)` - Authentication screens
- `(client)` - Client-specific screens
- `(hairdresser)` - Hairdresser-specific screens
- `(setup)` - Onboarding flow
- `(tabs)` - Tab navigation within roles

### 2. Custom Hooks Pattern
All data operations are abstracted into custom React Query hooks:
```typescript
// Example: src/api/haircodes/useListClientHaircodes.tsx
export const useListClientHaircodes = (clientId: string) => {
  return useQuery({
    queryKey: ['haircodes', 'client', clientId],
    queryFn: async () => {
      // Supabase query logic
    },
  });
};
```

### 3. Real-time Data Synchronization
Combines React Query with Supabase real-time:
- Subscribe to database changes
- Automatically invalidate React Query cache
- UI updates reactively

### 4. Multi-Resolution Images
Inspiration images are stored in 4 resolutions:
- `low_res_image_url` - Thumbnails
- `low_middle_res_url` - Preview
- `high_middle_res_url` - Full screen
- `image_url` - Original

### 5. Role-Based Access Control
- Separate navigation structures for clients and hairdressers
- Different features available based on `user_type`
- Relationship-based data access (only see haircodes from connected users)

### 6. Secure Storage Strategy
- **Mobile**: Expo SecureStore (encrypted)
- **Web**: localStorage (fallback)
- Stores: session tokens, user preferences

### 7. Optimistic Updates
React Query mutations with optimistic updates:
```typescript
useMutation({
  mutationFn: updateProfile,
  onMutate: async (newData) => {
    // Optimistically update cache
  },
  onSuccess: () => {
    // Invalidate and refetch
  },
});
```

### 8. Component Composition
Reusable components with clear responsibilities:
- Presentational components (UI only)
- Container components (data + logic)
- Provider components (context)

### 9. Error Handling
- Try-catch blocks in async operations
- User-facing alerts for errors
- Graceful fallbacks for missing data
- Error boundaries (React Error Boundaries)

### 10. Performance Optimizations
- FlatList virtualization for long lists
- Image preloading
- Memoization (`useMemo`, `useCallback`)
- Query prefetching
- Lazy loading of routes

---

## Build & Deployment

### Build Profiles (EAS Build)

**Development**
```json
{
  "developmentClient": true,
  "distribution": "internal"
}
```

**Preview**
```json
{
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

**Production**
```json
{
  "autoIncrement": true,
  "android": {
    "buildType": "apk"
  }
}
```

### App Identifiers
- **iOS**: `com.dorica.myHaircodeFinal1`
- **Android**: `com.dorica.myHaircodeFinal`

### Scripts
```bash
# Start dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm test

# Lint code
npm run lint
```

### Environment Variables (.env)
```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_FUNCTION_URL=<your-functions-url>
```

### Supabase Edge Functions
- **send-notification**: Push notification delivery
- **deleteUser**: Account deletion cleanup

---

## Development Guidelines

### Code Organization
- Keep components small and focused
- Use TypeScript for type safety
- Abstract data operations into custom hooks
- Separate business logic from UI

### Naming Conventions
- **Components**: PascalCase (`HaircodeCard.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useUserProfile.tsx`)
- **Types**: PascalCase (`Profile`, `Haircode`)
- **Constants**: UPPER_SNAKE_CASE

### File Structure
- One component per file
- Colocate related files (component + styles + tests)
- Use index files for public exports

### TypeScript Usage
- Enable strict mode
- Define interfaces for all data structures
- Avoid `any` type
- Use type inference where possible

### React Query Best Practices
- Use queryKeys consistently
- Implement proper cache invalidation
- Handle loading and error states
- Implement optimistic updates where appropriate

### Supabase Best Practices
- Use Row Level Security (RLS) policies
- Leverage database functions for complex queries
- Use storage buckets with proper access policies
- Implement proper error handling

---

## Testing

### Test Setup
- **Framework**: Jest 29.7.0
- **Preset**: jest-expo
- **Location**: `src/components/__tests__/`

### Current Test Coverage
Minimal - mostly infrastructure in place. Manual testing via development builds.

### Testing Strategy (Recommended)
- Unit tests for utilities and hooks
- Component tests with React Testing Library
- Integration tests for critical flows
- E2E tests for complete user journeys

---

## Common Tasks

### Adding a New Screen
1. Create file in appropriate `src/app/` directory
2. Use Expo Router conventions
3. Add to navigation if needed
4. Implement with proper TypeScript types

### Adding a New API Hook
1. Create file in `src/api/<domain>/`
2. Use React Query (`useQuery` or `useMutation`)
3. Define proper TypeScript types
4. Export hook for use in components

### Adding a New Component
1. Create file in `src/components/`
2. Use TypeScript for props
3. Keep component focused and reusable
4. Add to index file if needed

### Database Changes
1. Write migration in `supabase/migrations/`
2. Test locally with Supabase CLI
3. Deploy to staging/production
4. Update TypeScript types

### Adding Push Notifications
1. Define notification type
2. Update database schema
3. Implement in `send-notification` edge function
4. Add UI handling in app

---

## Troubleshooting

### Common Issues

**Build Failures**
- Clear Metro cache: `npx expo start -c`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Expo SDK compatibility

**Supabase Connection Issues**
- Verify `.env` file has correct credentials
- Check Supabase project status
- Verify RLS policies allow access

**Navigation Issues**
- Check route file naming (lowercase, hyphens)
- Verify group naming with parentheses
- Check for duplicate routes

**Image Upload Issues**
- Verify storage bucket permissions
- Check file size limits
- Verify image manipulation settings

**Real-time Not Working**
- Check Supabase real-time is enabled
- Verify subscription setup in RealTimeProvider
- Check network connectivity

---

## Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)

### Key Dependencies
- [Phosphor Icons](https://phosphoricons.com/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [PostHog](https://posthog.com/docs)

---

## Project Health

### Current Status
- **Version**: Active development
- **Platform**: iOS & Android
- **Architecture**: New React Native Architecture enabled
- **Testing**: Infrastructure in place, minimal coverage
- **Documentation**: This file + inline code comments

### Known Limitations
- Portrait-only orientation
- Mobile-only (web not optimized)
- Minimal test coverage
- Documentation could be expanded

### Future Considerations
- Expand test coverage
- Add web responsiveness
- Implement landscape support
- Add more comprehensive error logging
- Performance monitoring
- Accessibility improvements

---

Last Updated: 2025-01-16
