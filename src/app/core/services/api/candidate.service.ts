import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Candidate } from '../../models/candidate.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  private readonly COLLECTION_PATH = 'candidates';

  constructor(private firestore: AngularFirestore) { }

  getCandidates(): Observable<Candidate[]> {
    return this.firestore.collection<Candidate>(this.COLLECTION_PATH).valueChanges({ idField: 'id' });
  }

  // Método para calcular la distancia entre dos posiciones políticas
  calculateDistance(
    userEconomic: number, 
    userPersonal: number, 
    candidateEconomic: number, 
    candidatePersonal: number
  ): number {
    const economicDiff = userEconomic - candidateEconomic;
    const personalDiff = userPersonal - candidatePersonal;
    return Math.sqrt(economicDiff * economicDiff + personalDiff * personalDiff);
  }

  // Encontrar candidatos más cercanos al usuario
  findClosestCandidates(
    candidates: Candidate[], 
    userEconomic: number, 
    userPersonal: number, 
    limit: number = 3
  ): Candidate[] {
    return candidates
      .map(candidate => ({
        ...candidate,
        distance: this.calculateDistance(
          userEconomic, 
          userPersonal, 
          candidate.economicLiberty, 
          candidate.personalLiberty
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }
}
