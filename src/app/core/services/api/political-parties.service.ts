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
          
          return of(parties);
        })
      );
  }

  // Obtener todos los partidos políticos
  getAllParties(): Observable<PoliticalParty[]> {
    return this.firebaseService.getCollection<PoliticalParty>(this.COLLECTION_PATH)
      .pipe(
        switchMap(parties => {
          return of(parties);
        })
      );
  }
}