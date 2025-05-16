import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { catchError, combineLatest, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RateLimitData, RateLimitSettings } from '../../models/rate-limit.model';

@Injectable({
  providedIn: 'root'
})
export class TestService {

  // Añadir una propiedad para almacenar el estado del rate limit
  private rateLimitStatus: { allowed: boolean, remaining: number, resetTime: number } | null = null;
  // Cache de la configuración
  private settings$: Observable<RateLimitSettings>;

  constructor(
    private http: HttpClient,
    private firestore: AngularFirestore
  ) {
    // Inicializar la caché de configuración
    this.settings$ = this.firestore.collection('settings').doc<RateLimitSettings>('rate-limits').valueChanges().pipe(
      map(settings => {
        if (!settings) {
          // Valores predeterminados si no hay configuración
          return {
            windowMs: 5 * 60 * 1000,
            maxRequests: 5
          };
        }
        return settings;
      }),
      shareReplay(1) // Compartir la misma respuesta con múltiples observadores
    );
  }

  /**
   * Verifica si el usuario puede realizar un nuevo test basado en límites de frecuencia
   * @param userId Identificador único del usuario (sessionId o IP)
   * @returns Observable con el estado del límite de frecuencia
   */
  checkRateLimit(userId: string): Observable<{allowed: boolean, remaining: number, resetTime: number}> {
    // Si hay configuración de Cloud Functions, usamos la función remota
    if (environment.cloudFunctionsUrl) {
      const url = `${environment.cloudFunctionsUrl}/checkRateLimit`;
      
      return this.http.post<any>(url, { sessionId: userId }).pipe(
        tap(response => {
          console.log('checkRateLimit', response);          
          // Almacenar el estado del rate limit para uso futuro
          if (response) {
            console.log('checkRateLimit res', response);          
            this.rateLimitStatus = {
              //allowed: response.remaining === 0 ? false : response.allowed,
              allowed: response.allowed,
              remaining: response.remaining,
              resetTime: response.resetTime
            };
            console.log('checkRateLimit res', this.rateLimitStatus);          
          }
        }),
        map(response => {
          console.log('map ', response);
          console.log('map ', {
            allowed: response.remaining === 0 ? false : response.allowed,
            remaining: response.remaining,
            resetTime: response.resetTime
          });
          return {
            allowed: response.remaining === 0 ? false : response.allowed,
            remaining: response.remaining,
            resetTime: response.resetTime
          };       
        }),
        catchError(error => {
          console.log('checkRateLimit error', error);  
          if (error.status === 429) {
            // Error específico de rate limiting
            const resetTime = error.error?.resetTime 
              ? error.error.resetTime
              : Date.now() + (60 * 60 * 1000); // Default: 1 hora
            
            // Actualizar estado con la información del error
            this.rateLimitStatus = {
              allowed: false,
              remaining: 0,
              resetTime: resetTime
            };
            
            return throwError(() => ({
              code: 'RATE_LIMIT_EXCEEDED',
              message: error.error?.message || 'Has excedido el límite de tests permitidos',
              resetTime: resetTime
            }));
          }
          
          // Otros errores, permitir por defecto
          console.warn('Error al verificar rate limit, permitiendo por defecto:', error);
          return of({ allowed: true, remaining: 999, resetTime: 0 });
        })
      );
    } else {
      // Si no hay URL de Cloud Functions, siempre permitimos
      console.warn('No hay configuración de Cloud Functions, omitiendo verificación de rate limit');
      return of({ allowed: true, remaining: 999, resetTime: 0 });
    }
  }

  /**
   * Obtiene el número restante de tests permitidos
   * @returns Número de tests restantes o -1 si no hay límite
   */
  getRemainingTests(): number {
    return this.rateLimitStatus ? this.rateLimitStatus.remaining : -1;
  }

  /**
   * Verifica si el usuario puede iniciar un nuevo test
   * @param userId Identificador del usuario
   * @returns Observable<boolean> true si puede iniciar un test
   */
  canStartTest(userId: string): Observable<boolean> {
    /* return this.checkRateLimit(userId).pipe(
      map(status => status.allowed),
      catchError(() => of(true)) // En caso de error, permitimos por defecto
    ); */
    return this.checkRateLimit(userId).pipe(
      map(status => {
        console.log('checkRateLimit', status);        
        return status.allowed
      }),
      catchError((error) => {
        console.log('checkRateLimit', error);        
        return of(false)
      }) // En caso de error, permitimos por defecto
    );
  }

  /**
   * Obtiene un mensaje formateado sobre el límite de frecuencia
   * @returns Mensaje informativo sobre tests restantes
   */
  getRateLimitMessage(rateLimitStatus: { allowed: any; remaining: any; resetTime: any; }): string {
    if (!rateLimitStatus) {
      return '';
    }

    if (rateLimitStatus.allowed) {
      return `Te quedan ${rateLimitStatus.remaining} tests disponibles hoy.`;
    } else {
      const resetDate = new Date(rateLimitStatus.resetTime);
      return `Has alcanzado el límite de tests. Podrás realizar otro después de ${resetDate.toLocaleString()}.`;
    }
  }

  /**
   * Verifica cuántos tests tiene disponibles el usuario y si puede realizar un test
   * @param userId ID del usuario o sesión
   * @returns Observable con información sobre tests disponibles
   */
  checkAvailableTests(userId: string): Observable<{
    canTakeTest: boolean,
    availableTests: number,
    resetTime: number//,
    //config: RateLimitSettings
  }> {
    // Sanitizamos el ID igual que en la Cloud Function
    const sanitizedId = String(userId).replace(/[\/\.#\$\[\]]/g, '_');
    
    // Combinar configuración y datos del usuario
    return combineLatest([
      this.settings$,
      this.firestore.collection('rate-limits').doc<RateLimitData>(sanitizedId).get()
    ]).pipe(
      map(([settings, doc]) => {
        const windowMs = settings.windowMs;
        const maxRequests = settings.maxRequests;
        const now = Date.now();
        
        // Si el documento no existe, tiene todos los tests disponibles
        if (!doc.exists) {
          return {
            canTakeTest: true,
            availableTests: maxRequests,
            resetTime: 0,
            //config: settings
          };
        }
        
        const data = doc.data() as RateLimitData;
        
        // Verificar usando el enfoque de períodos
        if (data.periodStart !== undefined && data.count !== undefined) {
          const periodStart = data.periodStart;
          const periodEnd = periodStart + windowMs;
          
          // Si estamos dentro del período activo
          if (now < periodEnd) {
            // Verificar si ha excedido el límite
            if (data.count >= maxRequests) {
              return {
                canTakeTest: false,
                availableTests: 0,
                resetTime: periodEnd,
                //config: settings
              };
            }
            
            // No ha excedido el límite
            return {
              canTakeTest: true,
              availableTests: maxRequests - data.count,
              resetTime: periodEnd,
              //config: settings
            };
          } else {
            // El período ha terminado
            return {
              canTakeTest: true,
              availableTests: maxRequests,
              resetTime: 0,
              //config: settings
            };
          }
        }
        
        // Valores por defecto
        return {
          canTakeTest: true,
          availableTests: maxRequests,
          resetTime: 0,
          //config: settings
        };
      }),
      catchError(error => {
        console.error('Error al verificar tests disponibles:', error);
        // Obtener solo la configuración para valores predeterminados
        return this.settings$.pipe(
          map(settings => ({
            canTakeTest: true,
            availableTests: 1, // Valor conservador
            resetTime: 0,
            //config: settings
          }))
        );
      })
    );
  }
  
}
