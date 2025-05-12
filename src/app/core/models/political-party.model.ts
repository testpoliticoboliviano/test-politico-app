import { IdeologyType } from "./ideology.model";

// src/app/core/models/political-party.model.ts
export interface PoliticalParty {
  id: string;
  name: string;
  country: string;
  description: string;
  ideologyType: IdeologyType;
  imageUrl: string;
  websiteUrl?: string;
}