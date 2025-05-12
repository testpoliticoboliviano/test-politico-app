// src/app/core/services/user-session.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { tap, map, switchMap, catchError } from 'rxjs/operators';
/* import { FirebaseService } from './api/firebase.service'; */
import { FirebaseService } from './firebase.service';
import { UserSession } from '../../models/user-session.model';

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {
  private readonly STORAGE_KEY = 'nolan_test_user_id';
  private readonly COLLECTION_PATH = 'user-sessions';
  private currentUserId: string | null = null;

  constructor(private firebaseService: FirebaseService) {
    // Intentamos recuperar el ID de usuario del localStorage al iniciar
    this.currentUserId = localStorage.getItem(this.STORAGE_KEY);
  }

  // Obtiene o crea un ID de usuario para la sesión actual
  getUserId(): Observable<string> {
    if (this.currentUserId) {
      // Si ya tenemos un ID guardado, lo actualizamos y devolvemos
      return this.updateSessionActivity(this.currentUserId).pipe(
        map(() => this.currentUserId!)
      );
    } else {
      // Si no existe, creamos una nueva sesión
      return this.createNewSession();
    }
  }

  // Crea una nueva sesión de usuario
  private createNewSession(): Observable<string> {
    const browserInfo = this.getBrowserInfo();
    const newSession: UserSession = {
      id: '', // Se asignará por Firebase
      createdAt: new Date(),
      browserInfo,
      lastActive: new Date(),
      testsTaken: 0
    };

    return from(this.firebaseService.createDocument<UserSession>(
      this.COLLECTION_PATH, 
      newSession
    )).pipe(
      tap(userId => {
        // Guardamos el ID en localStorage y en la variable de la clase
        this.currentUserId = userId;
        localStorage.setItem(this.STORAGE_KEY, userId);
      })
    );
  }

  // Actualiza la actividad de la sesión actual
  private updateSessionActivity(userId: string): Observable<void> {
    return from(this.firebaseService.updateDocument<Partial<UserSession>>(
      this.COLLECTION_PATH,
      userId,
      { 
        lastActive: new Date() 
      }
    )).pipe(
      catchError(error => {
        console.error('Error al actualizar sesión:', error);
        // Si hay un error (posiblemente porque el usuario ya no existe en la BD)
        // Limpiamos el localStorage y creamos una nueva sesión
        localStorage.removeItem(this.STORAGE_KEY);
        this.currentUserId = null;
        return of(undefined);
      })
    );
  }

  // Incrementa el contador de tests realizados
  incrementTestCount(): Observable<void> {
    if (!this.currentUserId) {
      return of(undefined);
    }

    return this.firebaseService
      .getDocument<UserSession>(this.COLLECTION_PATH, this.currentUserId)
      .pipe(
        switchMap(session => {
          const updatedCount = (session.testsTaken || 0) + 1;
          return from(this.firebaseService.updateDocument<Partial<UserSession>>(
            this.COLLECTION_PATH,
            this.currentUserId!,
            { 
              testsTaken: updatedCount,
              lastActive: new Date()
            }
          ));
        }),
        catchError(error => {
          console.error('Error al incrementar contador de tests:', error);
          return of(undefined);
        })
      );
  }

  // Obtiene información básica del navegador para identificación
  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    const browserName = this.detectBrowser(userAgent);
    const platform = navigator.platform;
    return `${browserName} on ${platform}`;
  }

  // Detecta el navegador desde el User Agent
  private detectBrowser(userAgent: string): string {
    if (userAgent.indexOf('Chrome') > -1) {
      return 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      return 'Safari';
    } else if (userAgent.indexOf('Firefox') > -1) {
      return 'Firefox';
    } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
      return 'Internet Explorer';
    } else if (userAgent.indexOf('Edge') > -1) {
      return 'Edge';
    } else {
      return 'Unknown Browser';
    }
  }
}