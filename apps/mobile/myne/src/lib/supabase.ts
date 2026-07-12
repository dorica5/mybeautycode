import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import Constants from "expo-constants";

const supabaseUrl = Constants?.expoConfig?.extra?.SUPABASE_URL;
const supabaseAnonKey = Constants?.expoConfig?.extra?.SUPABASE_ANON;


console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey?.substring(0, 20) + '...');

// Cross-platform storage adapter
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      // Web environment - use localStorage with safety check
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key)
      }
      return null
    } else {
      // Mobile - use SecureStore for better security
      try {
        return await SecureStore.getItemAsync(key)
      } catch (error) {
        // Fallback to AsyncStorage if SecureStore fails
        return await AsyncStorage.getItem(key)
      }
    }
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value)
      }
    } else {
      try {
        await SecureStore.setItemAsync(key, value)
      } catch (error) {
        // Fallback to AsyncStorage if SecureStore fails
        await AsyncStorage.setItem(key, value)
      }
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key)
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(key)
      } catch (error) {
        // Fallback to AsyncStorage if SecureStore fails
        await AsyncStorage.removeItem(key)
      }
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})