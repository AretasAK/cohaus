import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalDocScreen } from './LegalDocScreen';
import { terms } from '../../legal/content';

export function TermsScreen({ navigation }: any) {
  const { t } = useTranslation();
  return <LegalDocScreen navigation={navigation} title={t('legal.terms')} docs={terms} />;
}
