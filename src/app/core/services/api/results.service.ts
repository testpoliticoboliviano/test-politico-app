// src/app/core/services/api/results.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { TestResult } from '../../models/test-result.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ResultsService {
  private readonly COLLECTION_PATH = 'test-results';

  constructor(
    private firebaseService: FirebaseService,
    private http: HttpClient,
  ) { }
  
  // Guardar resultado de test
  saveTestResult(testResult: any, sessionId: string): Observable<{
    resultId: string;
    remaining: number;
    resetTime: number;
  }> {
    const userLocation = localStorage.getItem('userLocation');
    let location;
    if (userLocation) {
      location = JSON.parse(userLocation);
    } 
    const resultWithLocation = {
      ...testResult,
      location: {
        city: location.city,
        country: location.country,
        region: location.region || '',
        source: location.source,
        ipPrefix: location.ip,
        coords: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      },
      timestamp: new Date()
    };
    //console.log('datos antes guardar', resultWithLocation);   

    const url = `${environment.cloudFunctionsUrl}/saveTestWithRateLimit`;
    
    return this.http.post<any>(url, {
      testResult: resultWithLocation,
      sessionId
    }).pipe(
      map(response => ({
        resultId: response.resultId,
        remaining: response.rateLimit.remaining,
        resetTime: response.rateLimit.resetTime
      })),
      catchError(error => {
        //console.log('Error al guardar test', error);
        // Manejar errores específicos de rate limit (429)
        if (error.status === 429) {
          return throwError(() => ({
            code: 'RATE_LIMIT_EXCEEDED',
            message: error.error?.message || 'Has excedido el límite de tests permitidos',
            resetTime: error.error?.resetTime
          }));
        }
        
        // Otros errores
        return throwError(() => ({
          code: 'ERROR_SAVING',
          message: 'Error al guardar el test'
        }));
      })
    );
  }

  // Obtener resultados de un usuario
  getUserResults(userId: string): Observable<TestResult[]> {
    return this.firebaseService.query<TestResult>(
      this.COLLECTION_PATH, 
      'userId', 
      '==', 
      userId
    ).pipe(
      map(results => results.sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      }))
    );
  }
}