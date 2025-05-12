// src/app/core/services/firebase-capabilities.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseCapabilitiesService {
  // Guardamos en caché los resultados de las verificaciones
  private hasFirestore = true; // Asumimos que esto siempre está disponible
  private hasStorageCache: boolean | null = null;
  private hasFunctionsCache: boolean | null = null;

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private functions: AngularFireFunctions,
    private http: HttpClient
  ) { }

  /**
   * Verifica si Firebase Storage está disponible
   */
  isStorageAvailable(): Observable<boolean> {
    // Si ya verificamos, devolvemos el resultado en caché
    if (this.hasStorageCache !== null) {
      return of(this.hasStorageCache);
    }

    // Intentamos acceder a una referencia de prueba
    try {
      // Intenta obtener una referencia a un archivo de prueba
      const testRef = this.storage.ref('test.txt');
      
      return from(testRef.getDownloadURL().toPromise()
        .then(() => {
          // Si no hay error, Storage está disponible
          this.hasStorageCache = true;
          return true;
        })
        .catch(error => {
          // Verificamos el código de error
          // 404 significa que Storage está disponible pero el archivo no existe
          if (error && error.code === 'storage/object-not-found') {
            this.hasStorageCache = true;
            return true;
          }
          
          // Cualquier otro error podría indicar que Storage no está habilitado
          console.warn('Firebase Storage no parece estar disponible:', error);
          this.hasStorageCache = false;
          return false;
        }));
    } catch (e) {
      console.warn('Error al verificar Firebase Storage:', e);
      this.hasStorageCache = false;
      return of(false);
    }
  }

  /**
   * Verifica si Firebase Functions está disponible
   */
  isFunctionsAvailable(): Observable<boolean> {
    // Si ya verificamos, devolvemos el resultado en caché
    if (this.hasFunctionsCache !== null) {
      return of(this.hasFunctionsCache);
    }

    // Verificamos si hay una URL de Cloud Functions en environment
    if (!environment.cloudFunctionsUrl) {
      this.hasFunctionsCache = false;
      return of(false);
    }

    // Intentamos hacer una solicitud a una función de prueba o verificar el estado
    const pingUrl = `${environment.cloudFunctionsUrl}/_ping`;
    
    return this.http.get(pingUrl, { responseType: 'text' }).pipe(
      timeout(5000), // Timeout después de 5 segundos
      map(() => {
        // Si no hay error, Functions está disponible
        this.hasFunctionsCache = true;
        return true;
      }),
      catchError(error => {
        // Incluso algunos errores HTTP pueden indicar que Functions está habilitado
        // Por ejemplo, un error 404 significa que el endpoint no existe pero Functions sí
        if (error.status && error.status !== 0) {
          this.hasFunctionsCache = true;
          return of(true);
        }
        
        console.warn('Firebase Functions no parece estar disponible:', error);
        this.hasFunctionsCache = false;
        return of(false);
      })
    );
  }

  /**
   * Verifica si Firestore está disponible (esto siempre debe ser verdadero)
   */
  isFirestoreAvailable(): Observable<boolean> {
    return of(this.hasFirestore);
  }

  /**
   * Obtiene todas las capacidades disponibles
   */
  getAllCapabilities(): Observable<{firestore: boolean, storage: boolean, functions: boolean}> {
    return of({
      firestore: this.hasFirestore,
      storage: this.hasStorageCache ?? false,
      functions: this.hasFunctionsCache ?? false
    });
  }
}