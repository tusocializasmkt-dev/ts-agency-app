import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './client';

export type MarketingAiAction = 'generate_caption' | 'improve_caption' | 'generate_headline' | 'generate_cta' | 'professional_tone' | 'casual_tone' | 'summarize' | 'generate_variations' | 'generate_hashtags' | 'analyze_insights';
export interface MarketingAiRequest { action: MarketingAiAction; brandId: string; content?: string; platform?: string; objective?: string }

const callable = httpsCallable<MarketingAiRequest, { text: string }>(functionsClient, 'marketingAssistant');
export const callMarketingAssistant = async (data: MarketingAiRequest) => (await callable(data)).data;
