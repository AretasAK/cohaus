import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalDocScreen } from './LegalDocScreen';
import { privacy } from '../../legal/content';

export function PrivacyScreen({ navigation }: any) {
  const { t } = useTranslation();
  return <LegalDocScreen navigation={navigation} title={t('legal.privacy')} docs={privacy} />;
}
