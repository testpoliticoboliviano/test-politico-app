// src/app/core/services/api/questions.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { Question } from '../../models/question.model';

@Injectable({
  providedIn: 'root'
})
export class QuestionsService {
  private readonly COLLECTION_PATH = 'questions';

  constructor(private firebaseService: FirebaseService) { }

  getQuestions(): Observable<Question[]> {
    /* return this.firebaseService
      .queryOrdered<Question>(this.COLLECTION_PATH, 'order')
      .pipe(
        map(questions => {
          if (!questions || questions.length === 0) {
            throw new Error('No se encontraron preguntas en la base de datos');
          }
          return questions;
        })
      ); */
    return this.firebaseService
    .queryOrdered<Question>(this.COLLECTION_PATH, 'order')
    .pipe(
      map(questions => {
        console.log('QuestionsService: preguntas obtenidas de Firestore:', questions);
        if (!questions || questions.length === 0) {
          console.log('QuestionsService: no se encontraron preguntas en Firestore');
          throw new Error('No se encontraron preguntas en la base de datos');
        }
        
        return questions;
      }),
      catchError(error => {
        console.error('QuestionsService: error al obtener preguntas de Firestore:', error);
        throw new Error('Error al obtener preguntas de la base de datos');
      })
    );
  }

  getQuestionById(id: string): Observable<Question> {
    return this.firebaseService.getDocument<Question>(this.COLLECTION_PATH, id);
  }

  // Método para añadir/actualizar preguntas (sólo para administradores)
  saveQuestion(question: Question): Promise<string> {
    if (question.id) {
      return this.firebaseService
        .updateDocument(this.COLLECTION_PATH, question.id, question)
        .then(() => question.id);
    } else {
      return this.firebaseService.createDocument(this.COLLECTION_PATH, question);
    }
  }
}