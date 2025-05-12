// src/app/core/services/api/political-parties.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError, mergeMap } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { PoliticalParty } from '../../models/political-party.model';
import { IdeologyType } from '../../models/ideology.model';
import { FirebaseCapabilitiesService } from '../firebase-capabilities.service';

@Injectable({
  providedIn: 'root'
})
export class PoliticalPartiesService {
  private readonly COLLECTION_PATH = 'political-parties';
  private readonly LOCAL_IMAGES_BASE_PATH = 'assets/images/parties/';

  constructor(
    private firebaseService: FirebaseService,
    private capabilitiesService: FirebaseCapabilitiesService
  ) { }

  // Obtener partidos políticos por tipo de ideología
  getPartiesByIdeology(ideologyType: IdeologyType): Observable<PoliticalParty[]> {
    return this.firebaseService
      .query<PoliticalParty>(this.COLLECTION_PATH, 'ideologyType', '==', ideologyType)
      .pipe(
        switchMap(parties => {
          if (parties.length === 0) {
            return of([] as PoliticalParty[]); // Siempre devuelve un array vacío
          }
          
          // Primero verificamos si Storage está disponible
          return this.capabilitiesService.isStorageAvailable().pipe(
            switchMap(storageAvailable => {
              if (storageAvailable) {
                // Si Storage está disponible, obtenemos las imágenes de Firebase
                return this.getPartiesWithStorageImages(parties);
              } else {
                // Si no hay Storage, usamos imágenes locales
                // Asegúrate de que esto devuelva un array
                return of(this.getPartiesWithLocalImages(parties));
              }
            }),
            catchError(error => {
              console.error('Error al obtener imágenes de partidos:', error);
              // En caso de error, devolvemos con imágenes locales como fallback
              // Asegúrate de devolver un array
              return of(this.getPartiesWithLocalImages(parties));
            })
          );
        })
      );
  }
  
  // Versión con imágenes de Firebase Storage
  private getPartiesWithStorageImages(parties: PoliticalParty[]): Observable<PoliticalParty[]> {
    // Si no hay partidos, devuelve un array vacío
    if (parties.length === 0) {
      return of([] as PoliticalParty[]);
    }
    
    const partiesWithImages$ = parties.map(party => {
      return this.firebaseService.getImageUrl(`parties/${party.id}.jpg`)
        .pipe(
          map(imageUrl => ({
            ...party,
            imageUrl
          } as PoliticalParty)),
          catchError(error => {
            console.warn(`No se pudo obtener imagen de Storage para ${party.id}:`, error);
            // Fallback a imagen local si falla Storage
            return of({
              ...party,
              imageUrl: `${this.LOCAL_IMAGES_BASE_PATH}${party.id}.jpg`
            } as PoliticalParty);
          })
        );
    });
    
    return forkJoin(partiesWithImages$);
  }
  
  // Versión con imágenes locales
  // Asegúrate de que esto devuelva PoliticalParty[] de manera consistente
  private getPartiesWithLocalImages(parties: PoliticalParty[]): PoliticalParty[] {
    return parties.map(party => ({
      ...party,
      imageUrl: `${this.LOCAL_IMAGES_BASE_PATH}${party.id}.jpg`
    } as PoliticalParty));
  }

  // Obtener todos los partidos políticos
  getAllParties(): Observable<PoliticalParty[]> {
    return this.firebaseService.getCollection<PoliticalParty>(this.COLLECTION_PATH)
      .pipe(
        switchMap(parties => {
          // Verificamos si Storage está disponible
          return this.capabilitiesService.isStorageAvailable().pipe(
            switchMap(storageAvailable => {
              if (storageAvailable) {
                return this.getPartiesWithStorageImages(parties);
              } else {
                // Asegúrate de devolver un Observable<PoliticalParty[]>
                return of(this.getPartiesWithLocalImages(parties));
              }
            }),
            catchError(() => {
              // Fallback a imágenes locales
              // Asegúrate de devolver un Observable<PoliticalParty[]>
              return of(this.getPartiesWithLocalImages(parties));
            })
          );
        })
      );
  }
}