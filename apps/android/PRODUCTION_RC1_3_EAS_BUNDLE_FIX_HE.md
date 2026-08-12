# Production RC1.3 – EAS Bundle Fix

The EAS cloud build failed in Bundle JavaScript because App.tsx imports expo-status-bar but package.json did not declare expo-status-bar. Local Expo Go tests succeeded because the package had been manually installed on the development machine. EAS installs only declared dependencies.

Fix: add expo-status-bar ~3.0.9, the Expo SDK 54 recommended version.
