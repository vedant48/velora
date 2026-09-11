import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value != null ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore write errors silently
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore remove errors silently
    }
  },
};
