# SmartSense Music

SmartSense Music is an intelligent, context aware mobile application built with React Native and Expo. It uses device sensors and location data to adapt the user experience and music recommendations based on the user's current environment, time of day, and activity.

## Features

- **Context Awareness**: Automatically detects and adapts to:
  - **Time of Day** (Morning, Afternoon, Evening, Night)
  - **Location** (GPS coordinates and saved locations)
  - **Environment** (Light levels, Sound levels)
  - **User Activity** (Stationary, Walking, etc. via Accelerometer)
- **Authentication**: Secure user authentication using Clerk.
- **Dynamic Theming**: UI adapts based on sensor data and system preferences.
- **Tab Navigation**: Easy access to Music, Uploads, Settings, and Home dashboard.
- **File Uploads**: Integration with Expo Document Picker.
- **Sensor Integration**: Utilizes device sensors (Accelerometer, LightSensor) and location services.

## Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (SDK 54)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Authentication**: [Clerk](https://clerk.com/)
- **Styling**: React Native StyleSheet, Expo Linear Gradient, Expo Blur
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Sensors**: Expo Sensors, Expo Location, Expo AV

## Prerequisites

- Node.js (LTS recommended)
- [Expo Go](https://expo.dev/go) app on your mobile device (iOS/Android) or an emulator.

## Configuration

You need to set up your environment variables. Create a `.env` file in the root directory (or ensure your environment has them):

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd smartsense-music
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

Start the development server:

```bash
npx expo start
```

- **Scan the QR code** with the Expo Go app (Android) or Camera app (iOS).
- Press `a` to open in Android Emulator.
- Press `i` to open in iOS Simulator.
- Press `w` to open in Web browser.

## Project Structure

```
d:\Mobile-App\
├── app/                 # Expo Router pages and layouts
│   ├── (auth)/          # Authentication routes (Sign In/Up)
│   ├── (tabs)/          # Main app tabs (Home, Music, Settings, Upload)
│   ├── _layout.tsx      # Root layout with providers
│   └── ...
├── assets/              # Images and static assets
├── components/          # Reusable UI components
├── constants/           # App configuration and themes
├── context/             # React Contexts (Auth, Sensor)
├── hooks/               # Custom React hooks
├── services/            # API and utility services
└── ...
```
