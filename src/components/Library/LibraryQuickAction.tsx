import { useState } from 'react';
import { Alert } from 'react-native';
import { LibraryItem } from '../../api/velora';
import { useLibraryItem } from '../../hooks/useLibraryItem';
import { ActionSheet } from './ActionSheet';
import { RateReviewSheet } from './RateReviewSheet';

/** The observed Want-movie menu, followed by Velora's approved rating flow. */
export function LibraryQuickAction({ item, onClose, onChanged }: {
  item: LibraryItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [ratingOpen, setRatingOpen] = useState(false);
  const lib = useLibraryItem({
    mediaType: item.media_type, tmdbId: item.tmdb_id, title: item.title,
    posterPath: item.poster_path, backdropPath: item.backdrop_path,
    releaseDate: item.release_date ?? undefined, totalEpisodes: item.total_episodes,
  });
  return <>
    <ActionSheet visible={!ratingOpen} showCancel={false} dismissOnSelect={false} onClose={onClose} options={[
      { label: 'Move to Watched', onPress: () => setRatingOpen(true) },
    ]} />
    <RateReviewSheet visible={ratingOpen} title={item.title}
      subtitle={item.release_date ? `(${item.release_date.slice(0, 4)})` : undefined}
      posterPath={item.poster_path} initialRating={null} initialBody="" saving={lib.saving || lib.loading}
      onClose={onClose} onSave={async (rating, body) => {
        const saved = await lib.setStatusWithReview('watched', rating, body);
        if (saved) { onChanged(); onClose(); }
        else Alert.alert('Could not save', 'Your change could not be confirmed. Please try again.');
      }} />
  </>;
}
