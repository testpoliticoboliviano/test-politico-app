// src/app/core/models/user-session.model.ts
export interface UserSession {
  id: string;           // ID único generado para la sesión
  createdAt: Date;      // Momento de creación
  browserInfo: string;  // Información básica del navegador
  lastActive: Date;     // Última actividad
  testsTaken: number;   // Número de tests realizados
}