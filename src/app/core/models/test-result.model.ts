import { IdeologyType } from "./ideology.model";

// src/app/core/models/test-result.model.ts
export interface TestResult {
  id?: string;
  userId: string;         // Identificador anónimo de sesión/browser
  timestamp: Date;
  answers: {
    questionId: string;
    answerId: string;
    question: string;     // Texto de la pregunta
    answer: string;       // Texto de la respuesta
    economicScore: number;
    personalScore: number;
  }[];
  totalEconomicScore: number;
  totalPersonalScore: number;
  ideologyType: IdeologyType;
  ipAddress?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;    // Coordenadas geográficas (opcionales)
    longitude?: number;
  };
}