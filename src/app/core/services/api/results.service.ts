// src/app/core/services/api/results.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { TestResult } from '../../models/test-result.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { UserSessionService } from './user-session.service';
import { FirebaseCapabilitiesService } from '../firebase-capabilities.service';
import { LocationService } from './location.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class ResultsService {
  private readonly COLLECTION_PATH = 'test-results';
  private readonly RATE_LIMIT_KEY = 'nolan_test_rate_limit';
  private readonly MAX_TESTS_PER_HOUR = 5;

  constructor(
    private firebaseService: FirebaseService,
    private http: HttpClient,
    private userSessionService: UserSessionService,
    private capabilitiesService: FirebaseCapabilitiesService,
    private locationService: LocationService,
    private firestore: AngularFirestore // O lo que uses para Firestore
  ) { }

  // Verificar rate limiting usando Functions o localStorage
  /* private checkRateLimit(userId: string): Observable<boolean> {
    // Verificamos si Functions está disponible
    return this.capabilitiesService.isFunctionsAvailable().pipe(
      switchMap(functionsAvailable => {
        if (functionsAvailable && environment.cloudFunctionsUrl) {
          // Si Functions está disponible, usamos el rate limiting del servidor
          return this.checkRateLimitRemote(userId);
        } else {
          // Si no, usamos el rate limiting local
          return this.checkRateLimitLocal(userId);
        }
      }),
      catchError(error => {
        console.error('Error al verificar rate limiting:', error);
        // En caso de error, permitimos continuar como fallback
        return of(true);
      })
    );
  } */
  private checkRateLimit(userId: string): Observable<boolean> {
    // Si tenemos la URL de Cloud Functions, usamos la función remota
    if (environment.cloudFunctionsUrl) {
      const url = `${environment.cloudFunctionsUrl}/checkRateLimit`;
      return this.http.post<any>(url, { sessionId: userId }).pipe(
        map(response => {
          if (response && response.allowed) {
            console.log(`Rate limit permitido. Solicitudes restantes: ${response.remaining}`);
            return true;
          } else {
            // Si no está permitido, lanzamos un error para manejarlo en el componente
            throw new Error(`Has excedido el límite de tests. Puedes realizar otro después de ${new Date(response.resetTime).toLocaleString()}`);
          }
        }),
        catchError(error => {
          if (error.status === 429) {
            // Error específico de rate limiting
            const resetTime = error.error?.resetTime 
              ? new Date(error.error.resetTime).toLocaleString()
              : 'un tiempo';
            
            throw new Error(`Has excedido el límite de tests. Puedes realizar otro después de ${resetTime}`);
          }
          
          // Para otros errores, intentamos con el método local
          console.warn('Error al usar rate limiting remoto, usando local como fallback:', error);
          return this.checkRateLimitLocal(userId);
        })
      );
    } else {
      // Si no hay URL de Cloud Functions, usamos el método local
      return this.checkRateLimitLocal(userId);
    }
  }

  // Versión remota de rate limiting usando Cloud Functions
  private checkRateLimitRemote(userId: string): Observable<boolean> {
    // Verificar que cloudFunctionsUrl esté definido
    if (!environment.cloudFunctionsUrl) {
      console.warn('cloudFunctionsUrl no está definido en el entorno. Usando rate limiting local como fallback.');
      return this.checkRateLimitLocal(userId);
    }
    
    const url = `${environment.cloudFunctionsUrl}/checkRateLimit`;
    return this.http.post<any>(url, { sessionId: userId }).pipe(
      map(response => {
        if (response && response.allowed) {
          console.log(`Rate limit permitido. Solicitudes restantes: ${response.remaining}`);
          return true;
        } else {
          // Si no está permitido, lanzamos un error para manejarlo en el componente
          throw new Error(`Has excedido el límite de tests. Puedes realizar otro después de ${new Date(response.resetTime).toLocaleString()}`);
        }
      }),
      catchError(error => {
        if (error.status === 429) {
          // Error específico de rate limiting
          const resetTime = error.error?.resetTime 
            ? new Date(error.error.resetTime).toLocaleString()
            : 'un tiempo';
          
          throw new Error(`Has excedido el límite de tests. Puedes realizar otro después de ${resetTime}`);
        }
        
        // Si hay otro tipo de error con Functions, intentamos con el método local
        console.warn('Error al usar rate limiting remoto, usando local como fallback:', error);
        return this.checkRateLimitLocal(userId);
      })
    );
  }

  // Versión local de rate limiting usando localStorage
  private checkRateLimitLocal(userId: string): Observable<boolean> {
    try {
      const now = Date.now();
      const hourInMs = 60 * 60 * 1000;
      
      // Clave única por usuario
      const userRateLimitKey = `${this.RATE_LIMIT_KEY}_${userId}`;
      
      // Recuperar datos de rate limit almacenados localmente
      const rateLimitData = localStorage.getItem(userRateLimitKey);
      let timestamps: number[] = [];
      
      if (rateLimitData) {
        timestamps = JSON.parse(rateLimitData);
        // Filtrar solo timestamps dentro de la última hora
        timestamps = timestamps.filter(time => now - time < hourInMs);
      }
      
      // Verificar si se ha excedido el límite
      if (timestamps.length >= this.MAX_TESTS_PER_HOUR) {
        const oldestTimestamp = Math.min(...timestamps);
        const resetTime = new Date(oldestTimestamp + hourInMs);
        throw new Error(`Has excedido el límite de tests. Puedes realizar otro después de ${resetTime.toLocaleString()}`);
      }
      
      // Añadir el timestamp actual y guardar
      timestamps.push(now);
      localStorage.setItem(userRateLimitKey, JSON.stringify(timestamps));
      
      return of(true);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Has excedido el límite')) {
        return throwError(() => error);
      }
      // Para cualquier otro error, permitimos continuar
      console.error('Error al verificar rate limiting local:', error);
      return of(true);
    }
  }

  // Obtener IP y localización desde Functions o usar fallback
  /* private getIpAndLocation(): Observable<any> {
    return this.capabilitiesService.isFunctionsAvailable().pipe(
      switchMap(functionsAvailable => {
        if (functionsAvailable && environment.cloudFunctionsUrl) {
          // Si Functions está disponible, usamos la geolocalización
          const url = `${environment.cloudFunctionsUrl}/getIpLocation`;
          return this.http.get(url).pipe(
            catchError(error => {
              console.error('Error al obtener localización desde Functions:', error);
              // En caso de error, usamos datos genéricos
              return of(this.getFallbackLocationData());
            })
          );
        } else {
          // Si Functions no está disponible, usamos datos genéricos
          return of(this.getFallbackLocationData());
        }
      }),
      catchError(() => {
        // Fallback final en caso de cualquier error
        return of(this.getFallbackLocationData());
      })
    );
  } */

  private getIpAndLocation(): Observable<any> {
    // Si tenemos la URL de Cloud Functions, usamos la función remota
    if (environment.cloudFunctionsUrl) {
      const url = `${environment.cloudFunctionsUrl}/getIpLocation`;
      return this.http.get<any>(url).pipe(
        catchError(error => {
          console.log('Error al obtener datos de IP', error);          
          return of(this.getFallbackLocationData());
        })
      );
    } else {
      // Si no hay URL de Cloud Functions, usamos el método local
      return of(this.getFallbackLocationData());
    }
  }
  
  // Datos de ubicación genéricos cuando no hay geolocalización
  private getFallbackLocationData(): any {
    return {
      ip: 'unknown',
      country: 'Desconocido',
      region: 'Desconocido',
      city: 'Desconocido'
    };
  }

  // Guardar resultado de test
  /* saveTestResult(result: TestResult): Observable<string> {
    // Obtenemos el userId de la sesión actual
    return this.userSessionService.getUserId().pipe(
      // Verificamos el rate limit
      switchMap(userId => {
        result.userId = userId;
        return this.checkRateLimit(userId);
      }),
      // Obtenemos IP y localización
      switchMap(() => this.getIpAndLocation()),
      // Enriquecemos el resultado con la información adicional
      switchMap(ipData => {
        console.log('service saveTestResult:', ipData);        
        const enrichedResult: TestResult = {
          ...result,
          ipAddress: ipData.ip,
          location: {
            country: ipData.country,
            region: ipData.region,
            city: ipData.city
          },
          timestamp: new Date()
        };
        
        // Agregamos campos opcionales si están disponibles
        if (ipData.latitude !== undefined && ipData.longitude !== undefined) {
          enrichedResult.location = {
            ...enrichedResult.location,
            latitude: ipData.latitude,
            longitude: ipData.longitude
          };
        }
        
        // Guardamos en Firestore
        return this.firebaseService.createDocument<TestResult>(
          this.COLLECTION_PATH, 
          enrichedResult
        );
      }),
      // Incrementamos el contador de tests
      tap(() => {
        this.userSessionService.incrementTestCount().subscribe();
      }),
      catchError(error => {
        console.error('Error al guardar resultado:', error);
        
        // Si es un error de rate limiting, lo propagamos
        if (error.message && error.message.includes('Has excedido el límite de tests')) {
          return throwError(() => new Error(error.message));
        }
        
        // Para otros errores, intentamos guardar sin datos adicionales
        return from(this.firebaseService.createDocument<TestResult>(
          this.COLLECTION_PATH, 
          {
            ...result,
            timestamp: new Date()
          }
        ));
      })
    );
  } */

  /* saveTestResult(testResult: any): Observable<any> {
    // Añadir información de geolocalización al resultado
    return this.locationService.getIpAndLocation().pipe(
      switchMap(location => {
        // Agregar datos de ubicación al resultado
        const resultWithLocation = {
          ...testResult,
          location: {
            city: location.city,
            country: location.country,
            region: location.region || '',
            source: location.source,
            // No incluimos la IP completa por privacidad
            //ipPrefix: location.ip.split('.').slice(0, 2).join('.') + '.*.*',
            ipPrefix: location.ip,
            coords: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          },
          timestamp: new Date()
        };
        console.log('datos antes guardar', resultWithLocation);        
        // Guardar en Firestore
        return from(this.firestore.collection('test-results').add(resultWithLocation));
      }),
      map(docRef => ({
        id: docRef.id,
        saved: true
      })),
      catchError(error => {
        console.error('Error al guardar resultado con ubicación:', error);
        // Intentar guardar sin los datos de ubicación como fallback
        return this.saveBasicTestResult(testResult);
      })
    );
  } */

  saveTestResult(testResult: any): Observable<any> {
    const userLocation = localStorage.getItem('userLocation');
    let location;
    if (userLocation) {
      location = JSON.parse(userLocation);
      console.log('location', location);
    } 
    console.log('userLocation', userLocation);
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
    console.log('datos antes guardar', resultWithLocation);   

    return from(this.firestore.collection('test-results').add(resultWithLocation)).pipe(
      map(docRef => ({
        id: docRef.id,
        saved: true
      })),
      catchError(error => {
        console.error('Error al guardar resultado básico:', error);
        return throwError(() => new Error('No se pudo guardar el resultado del test'));
      })
    );
  }

  // Método de fallback sin datos de ubicación
  private saveBasicTestResult(testResult: any): Observable<any> {
    const result = {
      ...testResult,
      timestamp: new Date()
    };
    
    return from(this.firestore.collection('test-results').add(result)).pipe(
      map(docRef => ({
        id: docRef.id,
        saved: true
      })),
      catchError(error => {
        console.error('Error al guardar resultado básico:', error);
        return throwError(() => new Error('No se pudo guardar el resultado del test'));
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