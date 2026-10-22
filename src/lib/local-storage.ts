// iOS/Android have no `localStorage`; this backs it with SQLite so the auth session persists.
import 'expo-sqlite/localStorage/install';
