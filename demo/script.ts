// Scripted scenario for the headless demo (npm run demo). The run language is
// English by default (--lang overrides); free-text actions are matched by
// MockLLM keyword heuristics in all three languages.

import type { GameMode } from '../engine/config.js';
import type { UiLanguage } from '../i18n.js';

export type DemoStep = { action: string } | { skip: number };

export interface DemoScript {
  countryName: string;
  mode: GameMode;
  lang: UiLanguage;
  setting: string;
  steps: DemoStep[];
}

export const DEMO_SCRIPT: DemoScript = {
  countryName: 'Rivenmark',
  mode: 'realism',
  lang: 'en',
  setting: 'A small proud nation between the sea and the mountains, '
    + 'in a world much like the turbulent early twentieth century.',
  steps: [
    { action: 'Launch a sweeping education reform: free universities and new technical schools in every province' },
    { skip: 6 },
    { action: 'Raise taxes on large corporations to fill the treasury' },
    { action: 'Ban all opposition newspapers and censor the radio stations' },
    { skip: 4 },
    { action: 'Declare war on our southern neighbor to reclaim the old borderlands' },
    { action: 'Conscript a hundred thousand young men and buy new artillery for the army' },
    { skip: 5 },
    { action: 'Order a nationwide crackdown on corrupt officials and tender fraud' },
    { action: 'Build grand highways, bridges and cheap housing across the country' },
    { skip: 6 },
    { action: 'Stage a national festival with unicorns, clowns and free pizza for every citizen' },
    { action: 'Introduce generous pensions and free medicine for all' },
    { skip: 5 },
    { action: 'Grant amnesty to political prisoners and call for national reconciliation' },
    { action: 'Privatize the state mines to friendly businessmen and ignore their ledgers' },
    { skip: 8 },
    { action: 'Invest in ecology: reforestation and a network of nature reserves' },
    { skip: 10 },
    { action: 'Quietly pack the supreme court while loyal generals swear personal loyalty on television' },
    { skip: 13 },
  ],
};
