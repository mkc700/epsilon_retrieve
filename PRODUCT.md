# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

React Native with Expo Router, TypeScript, Node.js/Express backend, MongoDB

## Users

Individuals managing personal productivity tasks: creating and organizing notes, tracking to-do items, and managing agenda/schedule items. Users capture thoughts and tasks throughout their day and need reliable sync across devices.

## Product Purpose

Epsilon Retrieve is a personal productivity application that provides three core tools in one interface: notes, todos, and agenda. The app enables users to quickly capture information, organize it, and access it across devices with cloud synchronization.

## Positioning

Unified productivity hub combining notes, tasks, and schedule in a single mobile application with cloud sync capabilities.

## Operating Context

Users interact with the app throughout their day to quickly capture thoughts, create task lists, and view/manage their agenda. The app supports offline capture with background sync when connectivity is restored. Primary use cases include: meeting notes, grocery lists, study materials, daily task tracking, and schedule management.

## Capabilities and Constraints

**Confirmed functionality:**
- User authentication (signup/login) with JWT tokens
- Create, read, update, delete notes with title and content
- Create and manage to-do items
- Agenda/schedule management
- Cloud synchronization with backend API
- Offline data storage with sync capability
- Cross-platform support (iOS, Android, Web)

**Technical constraints:**
- Backend runs on port 5000
- MongoDB Atlas for cloud storage
- AsyncStorage for local persistence
- API URL configured per platform (localhost for web, local network IP for Android)
- Bearer token authentication for API requests

**Undecided facts:**
- Specific features for notes (rich text, formatting, attachments)
- To-do details (due dates, priorities, reminders)
- Agenda integration with device calendar
- Search functionality
- Categories/tags for organization

## Brand Commitments

- App name: Epsilon Retrieve
- Language: Spanish (UI copy currently in Spanish)
- Bundle identifiers: com.epsilonretrieve.app (iOS/Android)

## Evidence on Hand

- Codebase includes Spanish UI copy
- Backend authentication system implemented
- MongoDB database models for User and Note
- Note detail screen with editing capability
- Sync service for background synchronization
- No marketing materials, testimonials, or case studies currently available

## Product Principles

1. **Quick capture**: Minimize friction when users need to record information
2. **Reliable sync**: Ensure data integrity across devices and offline scenarios
3. **Unified workspace**: Provide notes, todos, and agenda in a single cohesive interface
4. **Simplicity first**: Maintain straightforward user experience without unnecessary complexity

## Accessibility & Inclusion

No specific accessibility requirements established yet.
