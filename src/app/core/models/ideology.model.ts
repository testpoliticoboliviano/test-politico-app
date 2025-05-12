// src/app/core/models/ideology.model.ts
export enum IdeologyType {
  LIBERTARIAN = 'libertarian',
  AUTHORITARIAN = 'authoritarian',
  CENTRIST = 'centrist',
  CONSERVATIVE = 'conservative',
  PROGRESSIVE = 'progressive'
}

export interface Ideology {
  type: IdeologyType;
  name: string;
  description: string;
  economicRange: {min: number, max: number};
  personalRange: {min: number, max: number};
  color: string;
}