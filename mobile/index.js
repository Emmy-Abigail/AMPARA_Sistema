import { registerRootComponent } from 'expo';

// Apunta explícitamente al .tsx para que Metro no resuelva el App.js legacy
import App from './App.tsx';

registerRootComponent(App);
