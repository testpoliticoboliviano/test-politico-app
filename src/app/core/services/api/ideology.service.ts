// src/app/core/services/ideology.service.ts
import { Injectable } from '@angular/core';
import { Ideology, IdeologyType } from '../../models/ideology.model';
import { TestResult } from '../../models/test-result.model';

@Injectable({
  providedIn: 'root'
})
export class IdeologyService {
  // Definición de ideologías y sus rangos en el diagrama de Nolan
  private readonly ideologies: Ideology[] = [
    {
      type: IdeologyType.LIBERTARIAN,
      name: 'Libertario',
      description: 'Alta libertad económica y alta libertad personal',
      economicRange: { min: 70, max: 100 },
      personalRange: { min: 70, max: 100 },
      color: '#FFCC00'
    },
    {
      type: IdeologyType.AUTHORITARIAN,
      name: 'Autoritario',
      description: 'Baja libertad económica y baja libertad personal',
      economicRange: { min: 0, max: 30 },
      personalRange: { min: 0, max: 30 },
      color: '#990000'
    },
    {
      type: IdeologyType.CENTRIST,
      name: 'Centrista',
      description: 'Valores moderados en ambos ejes',
      economicRange: { min: 30, max: 70 },
      personalRange: { min: 30, max: 70 },
      color: '#CCCCCC'
    },
    {
      type: IdeologyType.CONSERVATIVE,
      name: 'Conservador',
      description: 'Alta libertad económica y baja libertad personal',
      economicRange: { min: 70, max: 100 },
      personalRange: { min: 0, max: 30 },
      color: '#0000CC'
    },
    {
      type: IdeologyType.PROGRESSIVE,
      name: 'Progresista',
      description: 'Baja libertad económica y alta libertad personal',
      economicRange: { min: 0, max: 30 },
      personalRange: { min: 70, max: 100 },
      color: '#009900'
    }
  ];

  constructor() { }

  // Obtiene todas las ideologías
  getIdeologies(): Ideology[] {
    return this.ideologies;
  }

  // Obtiene una ideología por su tipo
  getIdeologyByType(type: IdeologyType): Ideology | undefined {
    return this.ideologies.find(ideology => ideology.type === type);
  }

  // Calcula la ideología basada en las puntuaciones
  calculateIdeology(economicScore: number, personalScore: number): IdeologyType {
    // Normalizar puntuaciones al rango 0-100
    const normalizedEconomicScore = this.normalizeScore(economicScore);
    const normalizedPersonalScore = this.normalizeScore(personalScore);

    console.log(economicScore + ' normalizedEconomicScore: '+normalizedEconomicScore);    
    console.log(personalScore + ' normalizedPersonalScore: '+normalizedPersonalScore);    

    // Determinar la ideología según la posición en el diagrama de Nolan
    for (const ideology of this.ideologies) {
      if (
        normalizedEconomicScore >= ideology.economicRange.min &&
        normalizedEconomicScore <= ideology.economicRange.max &&
        normalizedPersonalScore >= ideology.personalRange.min &&
        normalizedPersonalScore <= ideology.personalRange.max
      ) {
        return ideology.type;
      }
    }

    // Si por alguna razón no cae en ninguna categoría, asignamos centrista
    return IdeologyType.CENTRIST;
  }

  // Normaliza una puntuación a un rango de 0-100
  private normalizeScore(score: number): number {
    // Asumimos que el rango de puntuaciones posibles es conocido
    // Por ejemplo, si cada pregunta tiene 5 respuestas con valores -2 a +2
    // y hay 10 preguntas, el rango sería -20 a +20
    const MIN_POSSIBLE_SCORE = -40;
    const MAX_POSSIBLE_SCORE = 40;
    const SCORE_RANGE = MAX_POSSIBLE_SCORE - MIN_POSSIBLE_SCORE;

    console.log('SCORE_RANGE', SCORE_RANGE);    
    console.log('return', ((score - MIN_POSSIBLE_SCORE) / SCORE_RANGE) * 100);    

    // Normalizar al rango 0-100
    return ((score - MIN_POSSIBLE_SCORE) / SCORE_RANGE) * 100;
  }

  // Prepara un objeto TestResult con los cálculos necesarios
  prepareTestResult(
    userId: string,
    answers: Array<{
      questionId: string;
      answerId: string;
      question: string;
      answer: string;
      economicScore: number;
      personalScore: number;
    }>
  ): TestResult {
    // Calcular puntuaciones totales
    const totalEconomicScore = answers.reduce(
      (sum, answer) => sum + answer.economicScore, 0
    );
    
    const totalPersonalScore = answers.reduce(
      (sum, answer) => sum + answer.personalScore, 0
    );

    // Determinar la ideología
    const ideologyType = this.calculateIdeology(
      totalEconomicScore, 
      totalPersonalScore
    );

    // Crear y devolver el resultado
    return {
      userId,
      timestamp: new Date(),
      answers,
      totalEconomicScore,
      totalPersonalScore,
      ideologyType
    };
  }
}