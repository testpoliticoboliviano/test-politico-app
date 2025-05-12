// src/app/core/services/api/firebase.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
  ) { }

  // Método genérico para obtener una colección
  getCollection<T>(path: string): Observable<T[]> {
    return this.firestore.collection<T>(path).valueChanges({ idField: 'id' });
  }

  // Método genérico para obtener un documento
  getDocument<T>(path: string, id: string): Observable<T> {
    return this.firestore.doc<T>(`${path}/${id}`).valueChanges()
      .pipe(
        map(data => {
          if (!data) {
            throw new Error(`Document not found at ${path}/${id}`);
          }
          return { ...data, id } as T;
        })
      );
  }

  // Método genérico para crear un documento
  createDocument<T>(path: string, data: T): Promise<string> {
    const id = this.firestore.createId();
    return this.firestore.doc(`${path}/${id}`).set({
      ...data,
      createdAt: new Date()
    })
      .then(() => id);
  }

  // Método genérico para crear un documento con ID específico
  setDocument<T>(path: string, id: string, data: T): Promise<void> {
    return this.firestore.doc(`${path}/${id}`).set({
      ...data,
      updatedAt: new Date()
    });
  }

  // Método genérico para actualizar un documento
  updateDocument<T>(path: string, id: string, data: Partial<T>): Promise<void> {
    return this.firestore.doc(`${path}/${id}`).update({
      ...data,
      updatedAt: new Date()
    });
  }

  // Método genérico para eliminar un documento
  deleteDocument(path: string, id: string): Promise<void> {
    return this.firestore.doc(`${path}/${id}`).delete();
  }

  // Método para obtener URL de una imagen
  getImageUrl(path: string): Observable<string> {
    return this.storage.ref(path).getDownloadURL();
  }

  // Método para ejecutar consultas con filtros 
  query<T>(
    path: string,
    fieldPath: string,
    opStr: firebase.default.firestore.WhereFilterOp,
    value: any
  ): Observable<T[]> {
    return this.firestore
      .collection<T>(path, ref => ref.where(fieldPath, opStr, value))
      .valueChanges({ idField: 'id' });
  }

  // Método para ejecutar consultas ordenadas
  queryOrdered<T>(
    path: string,
    orderByField: string,
    direction: firebase.default.firestore.OrderByDirection = 'asc'
  ): Observable<T[]> {
    return this.firestore
      .collection<T>(path, ref => ref.orderBy(orderByField, direction))
      .valueChanges({ idField: 'id' });
  }
}