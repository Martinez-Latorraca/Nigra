import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from './secureStorage';
import userReducer from './userSlice';
import donationReducer from './donationSlice';

// user slice → SecureStore (JWT + data del user).
// El resto → AsyncStorage (donation dismiss, etc., no sensible).
const userPersistConfig = {
  key: 'user',
  version: 1,
  storage: secureStorage,
};

const rootReducer = combineReducers({
  user: persistReducer(userPersistConfig, userReducer),
  donation: donationReducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  blacklist: ['user'], // user tiene su propio persistor con SecureStore
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
