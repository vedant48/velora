import { StyleSheet, TextStyle } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,
  heroTagline: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  } as TextStyle,
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  } as TextStyle,
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 6,
  } as TextStyle,
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  } as TextStyle,
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  } as TextStyle,
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  } as TextStyle,
  bodyStrong: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textTertiary,
  } as TextStyle,
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  } as TextStyle,
});
