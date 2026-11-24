import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { veloraApi } from '../../api/velora';
import { AppButton } from '../../components/common/AppButton';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { batchEntries, buildCommitItem, CommitItem, Gap } from '../../services/mustImport/payload';
import { parseMustFiles } from '../../services/mustImport/parse';
import { matchAll, tmdbSeasonCheck } from '../../services/mustImport/runner';
import { MatchResult, MustItem, TmdbCandidate } from '../../services/mustImport/types';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

type Phase = 'pick' | 'matching' | 'preview' | 'importing' | 'done';
type Matches = Map<string, MatchResult & { failed?: boolean }>;

/**
 * Import a Must profile from export files. Nothing is fetched from Must by the app. Existing Velora
 * titles are never overwritten; everything that cannot be imported is listed at the end.
 */
export const ImportMustScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [phase, setPhase] = useState<Phase>('pick');
  const [items, setItems] = useState<MustItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [matches, setMatches] = useState<Matches>(new Map());
  const [chosen, setChosen] = useState<Record<string, TmdbCandidate | 'skip'>>({});
  const [progress, setProgress] = useState('');
  const [picking, setPicking] = useState<MustItem | null>(null);
  const [report, setReport] = useState<{ created: number; kept: number; failed: string[]; episodes: number; gaps: Gap[]; unmatched: string[] } | null>(null);
  const cancel = useRef({ cancelled: false });

  const pickFiles = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], multiple: true, copyToCacheDirectory: true });
      if (res.canceled) return;
      const parsed: unknown[] = [];
      for (const a of res.assets) {
        try {
          parsed.push(JSON.parse(await FileSystem.readAsStringAsync(a.uri)));
        } catch {
          Alert.alert('Not a JSON file', `${a.name} could not be read.`);
          return;
        }
      }
      const r = parseMustFiles(parsed);
      if (r.items.length === 0) {
        Alert.alert('Nothing to import', r.warnings.join('\n') || 'No movies or shows found.');
        return;
      }
      setItems(r.items);
      setWarnings(r.warnings);
      setPhase('matching');
      cancel.current = { cancelled: false };
      const m = await matchAll(r.items, (p) => setProgress(`Matching ${p.done} of ${p.total} titles on TMDB`), cancel.current);
      if (cancel.current.cancelled) return;
      setMatches(m);
      setPhase('preview');
    } catch (e: any) {
      Alert.alert('Could not read files', e?.message ?? 'Try again.');
      setPhase('pick');
    }
  }, []);

  const resolved = useCallback(
    (it: MustItem): TmdbCandidate | null => {
      const c = chosen[it.mustId];
      if (c === 'skip') return null;
      if (c) return c;
      const m = matches.get(it.mustId);
      return m?.confidence === 'sure' ? m.best : null;
    },
    [chosen, matches],
  );

  const groups = useMemo(() => {
    const sure: MustItem[] = [], review: MustItem[] = [], none: MustItem[] = [];
    for (const it of items) {
      const m = matches.get(it.mustId);
      if (chosen[it.mustId] && chosen[it.mustId] !== 'skip') sure.push(it);
      else if (chosen[it.mustId] === 'skip') none.push(it);
      else if (m?.confidence === 'sure') sure.push(it);
      else if (m?.confidence === 'review') review.push(it);
      else none.push(it);
    }
    return { sure, review, none };
  }, [items, matches, chosen]);

  const run = useCallback(async () => {
    setPhase('importing');
    const gaps: Gap[] = [];
    const entries: CommitItem[] = [];
    const todo = items.filter((it) => resolved(it));
    const unmatched = items.filter((it) => !resolved(it)).map((it) => `${it.title}${it.year ? ` (${it.year})` : ''}`);
    let n = 0;
    for (const it of todo) {
      const tmdb = resolved(it)!;
      n++;
      if (n % 10 === 0) setProgress(`Preparing ${n} of ${todo.length}`);
      const needsCheck = it.type === 'tv' && it.seasons?.some((s) => s.watchedEpisodes.length > 0);
      const check = it.type === 'tv' ? await tmdbSeasonCheck(tmdb.id) : null;
      const built = buildCommitItem(it, tmdb, check ? { tmdbCounts: check.tmdbCounts, totalEpisodes: check.totalEpisodes } : needsCheck ? { tmdbCounts: null, totalEpisodes: 0 } : undefined);
      entries.push(built.entry);
      gaps.push(...built.gaps);
    }
    let created = 0, kept = 0, episodes = 0;
    const failed: string[] = [];
    const titleOf = new Map(items.map((i) => [i.mustId, i.title]));
    const batches = batchEntries(entries);
    let b = 0;
    for (const batch of batches) {
      b++;
      setProgress(`Saving batch ${b} of ${batches.length}`);
      try {
        const res = await veloraApi.importMust(batch);
        for (const r of res.results) {
          if (r.outcome === 'created') created++;
          else if (r.outcome === 'existing_kept') kept++;
          else failed.push(`${titleOf.get(r.mustId) ?? r.mustId}: ${r.error ?? 'failed'}`);
          episodes += r.episodesAdded;
        }
      } catch (e: any) {
        for (const x of batch) failed.push(`${x.title}: ${e?.message ?? 'request failed'}`);
      }
    }
    setReport({ created, kept, failed, episodes, gaps, unmatched });
    setPhase('done');
  }, [items, resolved]);

  const confirmRun = () =>
    Alert.alert(
      'Import into your library?',
      `${groups.sure.length} titles will be added. Titles already in Velora are not changed. Titles you did not confirm are skipped and listed.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Import', onPress: run }],
    );

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: ui.space.lg, paddingTop: insets.top + ui.space.md, paddingBottom: insets.bottom + 40 }}>
      <ScreenHeader title="Import from Must" onBack={() => navigation.goBack()} />

      {phase === 'pick' && (
        <>
          <Text style={styles.body}>
            Choose your Must export files (JSON). Velora does not connect to Must. Matching uses TMDB. Titles already in your library are never changed, and
            original add dates are unknown in Must, so imported titles get today's date.
          </Text>
          <AppButton title="Choose export files" onPress={pickFiles} />
        </>
      )}

      {(phase === 'matching' || phase === 'importing') && (
        <>
          <Text style={styles.body}>{progress || 'Working...'}</Text>
          {phase === 'matching' && <AppButton variant="secondary" title="Cancel" onPress={() => { cancel.current.cancelled = true; setPhase('pick'); }} />}
        </>
      )}

      {phase === 'preview' && (
        <>
          <Text style={styles.h}>Found {items.length} titles</Text>
          <Text style={styles.body}>
            {items.filter((i) => i.status === 'want').length} Want, {items.filter((i) => i.status === 'watched' && i.type === 'movie').length} watched movies,{' '}
            {items.filter((i) => i.type === 'tv' && i.status !== 'want').length} series ({items.filter((i) => i.type === 'tv' && i.seasons === null && i.status !== 'want').length} without episode detail in the file).
          </Text>
          {warnings.map((w) => <Text key={w} style={styles.warn}>{w}</Text>)}
          <Text style={styles.row}>Matched automatically: {groups.sure.length}</Text>
          <Text style={styles.row}>Need your pick: {groups.review.length}</Text>
          <Text style={styles.row}>No match or skipped: {groups.none.length}</Text>
          {groups.review.map((it) => (
            <Pressable key={it.mustId} style={styles.item} onPress={() => setPicking(it)}>
              <Text style={styles.itemTitle}>{it.title}{it.year ? ` (${it.year})` : ''}</Text>
              <Text style={styles.itemSub}>{matches.get(it.mustId)?.reason}. Tap to choose.</Text>
            </Pressable>
          ))}
          {groups.none.slice(0, 40).map((it) => (
            <Pressable key={it.mustId} style={styles.item} onPress={() => matches.get(it.mustId)?.candidates.length ? setPicking(it) : undefined}>
              <Text style={styles.itemTitle}>{it.title}{it.year ? ` (${it.year})` : ''}</Text>
              <Text style={styles.itemSub}>{chosen[it.mustId] === 'skip' ? 'Skipped' : matches.get(it.mustId)?.reason}</Text>
            </Pressable>
          ))}
          <View style={{ height: 14 }} />
          <AppButton title={`Import ${groups.sure.length} titles`} onPress={confirmRun} disabled={groups.sure.length === 0} />
        </>
      )}

      {phase === 'done' && report && (
        <>
          <Text style={styles.h}>Import finished</Text>
          <Text style={styles.row}>Added: {report.created}</Text>
          <Text style={styles.row}>Already in Velora, left unchanged: {report.kept}</Text>
          <Text style={styles.row}>Episodes added: {report.episodes}</Text>
          <Text style={styles.row}>Not imported (no confirmed match): {report.unmatched.length}</Text>
          <Text style={styles.row}>Failed: {report.failed.length}</Text>
          {report.failed.slice(0, 30).map((f) => <Text key={f} style={styles.warn}>{f}</Text>)}
          {report.gaps.length > 0 && <Text style={styles.h}>Data gaps ({report.gaps.length})</Text>}
          {report.gaps.slice(0, 60).map((g, i) => <Text key={g.mustId + i} style={styles.itemSub}>{g.title}: {g.note}</Text>)}
          {report.unmatched.length > 0 && <Text style={styles.h}>Not imported</Text>}
          {report.unmatched.slice(0, 80).map((u) => <Text key={u} style={styles.itemSub}>{u}</Text>)}
          <View style={{ height: 14 }} />
          <AppButton title="Done" onPress={() => navigation.goBack()} />
        </>
      )}

      <Modal visible={!!picking} animationType="slide" transparent onRequestClose={() => setPicking(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.h}>{picking?.title}{picking?.year ? ` (${picking.year})` : ''}</Text>
            {(picking ? matches.get(picking.mustId)?.candidates ?? [] : []).map((c) => (
              <Pressable key={c.id} style={styles.item} onPress={() => { setChosen((p) => ({ ...p, [picking!.mustId]: c })); setPicking(null); }}>
                <Text style={styles.itemTitle}>{c.title}{c.year ? ` (${c.year})` : ''}</Text>
                <Text style={styles.itemSub}>TMDB {c.id}</Text>
              </Pressable>
            ))}
            <AppButton variant="secondary" title="Skip this title" onPress={() => { setChosen((p) => ({ ...p, [picking!.mustId]: 'skip' })); setPicking(null); }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  h: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  row: { color: colors.textPrimary, fontSize: 14, marginBottom: 6 },
  warn: { color: colors.error, fontSize: 12, marginBottom: 4 },
  item: { backgroundColor: colors.surface, borderRadius: ui.radius.button, padding: 12, marginBottom: 8 },
  itemTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  itemSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 4 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { backgroundColor: colors.background, padding: 18, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 4 },
});
