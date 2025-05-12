
// src/app/core/models/question.model.ts
export interface Question {
  id: string;
  text: string;
  answers: Answer[];
  order: number;
}

export interface Answer {
  id: string;
  text: string;
  economicScore: number;  // Eje económico (libertad económica)
  personalScore: number;  // Eje personal (libertad personal)
}