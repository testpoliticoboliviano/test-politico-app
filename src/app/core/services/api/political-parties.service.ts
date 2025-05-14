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
            return of([]);
          }
          
          // Verificamos si Storage está disponible
          return this.capabilitiesService.isStorageAvailable().pipe(
            switchMap(storageAvailable => {
              if (storageAvailable) {
                // Si Storage está disponible, obtenemos las imágenes de Firebase
                return this.getPartiesWithStorageImages(parties);
              } else {
                // Si no, usamos las URLs directas
                return of(parties);
              }
            }),
            catchError(() => {
              // En caso de error, devolvemos los partidos con las URLs directas
              return of(parties);
            })
          );
        })
      );
  }
  
  // Versión con imágenes de Firebase Storage
  private getPartiesWithStorageImages(parties: PoliticalParty[]): Observable<PoliticalParty[]> {
    const partiesWithImages$ = parties.map(party => {
      // Si ya tiene una URL completa (http://, https://), la usamos directamente
      if (party.imageUrl && (party.imageUrl.startsWith('http://') || party.imageUrl.startsWith('https://'))) {
        return of(party);
      }
      
      // Si no, intentamos obtenerla de Storage
      return this.firebaseService.getImageUrl(`parties/${party.id}.jpg`)
        .pipe(
          map(imageUrl => ({
            ...party,
            imageUrl
          })),
          catchError(() => {
            // Si falla, intentamos con .png
            return this.firebaseService.getImageUrl(`parties/${party.id}.png`)
              .pipe(
                map(imageUrl => ({
                  ...party,
                  imageUrl
                })),
                catchError(() => {
                  // Si aún falla, devolvemos el partido con la URL original
                  console.warn(`No se pudo obtener imagen para ${party.id}`);
                  return of(party);
                })
              );
          })
        );
    });
    
    return forkJoin(partiesWithImages$);
  }

  // Obtener todos los partidos políticos
  getAllParties(): Observable<PoliticalParty[]> {
    return this.firebaseService.getCollection<PoliticalParty>(this.COLLECTION_PATH)
      .pipe(
        switchMap(parties => {
          // Misma lógica que en getPartiesByIdeology
          return this.capabilitiesService.isStorageAvailable().pipe(
            switchMap(storageAvailable => {
              if (storageAvailable) {
                return this.getPartiesWithStorageImages(parties);
              } else {
                return of(parties);
              }
            }),
            catchError(() => {
              return of(parties);
            })
          );
        })
      );
  }
}