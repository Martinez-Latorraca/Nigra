import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import inboxReducer from "./inboxSlice";
import userReducer from "./userSlice";
import chatReducer from "./chatSlice";
import notificationsReducer from "./notificationsSlice";
import donationReducer from "./donationSlice";

const rootReducer = combineReducers({
    inbox: inboxReducer,
    user: userReducer,
    chats: chatReducer,
    notifications: notificationsReducer,
    donation: donationReducer,
});

const persistConfig = {
    key: "root",
    version: 1,
    storage,
    blacklist: ["chats", "inbox", "notifications"] // donation SÍ persistimos (queremos que el dismiss sobreviva a recargas)
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }),
});

let persistor = persistStore(store);

export { store, persistor };
