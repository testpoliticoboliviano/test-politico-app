// src/app/core/models/candidate.model.ts
export interface Candidate {
    id: string;
    name: string;
    economicLiberty: number; // 0-100
    personalLiberty: number; // 0-100
    imageUrl: string;
    party?: string;
    description?: string;
}