import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FunctionsService {

  constructor() { }

  normalizeScore(score: number): number {
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

}
