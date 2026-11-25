import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MediaItem } from '../../api/types';
import { getTVByGenre } from '../../api/tv';
import { veloraApi } from '../../api/velora';
import { useAuth } from '../../state/AuthContext';
import { useAppTheme } from '../../theme/ThemeContext';
import { AppLoader } from '../common/AppLoader';
import { PosterRowSkeleton } from '../Skeleton/ContentSkeletons';

// Velora-owned collections selected from real TMDB TV genres. These are not
// Must editorial lists. The saved snapshot is exactly the titles shown in the
// collection, so neither progress nor a denominator silently means all TV.
const GROUPS = [
  { id: 10765, name: 'Sci-Fi & Fantasy TV', icon: 'planet-outline' as const },
  { id: 18, name: 'Drama series', icon: 'film-outline' as const },
  { id: 35, name: 'Comedy series', icon: 'tv-outline' as const },
  { id: 80, name: 'Crime series', icon: 'search-outline' as const },
];
type Card = typeof GROUPS[number] & { ids: number[]; items: MediaItem[]; watched: number | null };
export function TVCollections() {
  const { user, apiReady } = useAuth();
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setFailed(false);
    void (async () => {
      try {
        const result = await Promise.all(GROUPS.map(async group => { const rows = await getTVByGenre(group.id, 1); return { ...group, ids: rows.map(t => t.id), items: rows.map(t => ({ id: t.id, title: t.name, media_type: 'tv' as const, poster_path: t.poster_path, backdrop_path: t.backdrop_path, overview: t.overview, vote_average: t.vote_average })), watched: null as number | null }; }));
        let watched = new Set<number>();
        let hasLibrary = false;
        if (user && apiReady) {
          try { const {items} = await veloraApi.getLibrary('watched', 'tv'); watched = new Set(items.map(t => t.tmdb_id)); hasLibrary = true; } catch { /* unknown progress stays unknown */ }
        }
        if (active) setCards(result.filter(c => c.ids.length).map(c => ({ ...c, watched: hasLibrary ? c.ids.filter(id => watched.has(id)).length : null })));
      } catch { if (active) setFailed(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user?.username, apiReady, retry]));
  return <View style={{ marginTop: 22, paddingHorizontal: 20, gap: 12 }}>
    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Collections{cards.length ? ` · ${cards.length}` : ''}</Text>
    <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Velora picks from TMDB</Text>
    {loading && !cards.length ? <PosterRowSkeleton /> : null}
    {failed && <Pressable onPress={() => setRetry(n => n + 1)}><Text style={{ color: colors.textSecondary }}>Could not load collections. Tap to retry.</Text></Pressable>}
    {cards.map(card => <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={card.name} onPress={() => navigation.navigate('TVCollection', { title: card.name, items: card.items })} style={{ minHeight: 164, borderRadius: 5, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Ionicons name={card.icon} size={36} color={colors.textSecondary} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 12, textAlign: 'center' }}>{card.name}</Text>
      <Text style={{ fontSize: 17, color: colors.textTertiary, marginTop: 4 }}>{card.watched !== null ? `${card.watched} of ${card.ids.length}` : `${card.ids.length} series`}</Text>
    </Pressable>)}
  </View>;
}
