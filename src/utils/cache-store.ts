import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEnvelope<T> = {
  data: T;
  updatedAt: string;
};

export async function readCachedValue<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.updatedAt !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedValue<T>(key: string, data: T): Promise<CacheEnvelope<T>> {
  const envelope: CacheEnvelope<T> = {
    data,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(key, JSON.stringify(envelope));
  return envelope;
}
