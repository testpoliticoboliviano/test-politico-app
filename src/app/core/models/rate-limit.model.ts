// Interfaz para los datos del rate limit
export interface RateLimitData {
    periodStart?: number;
    count?: number;
    timestamps?: number[];
    lastUpdated?: number;
    created?: number;
    [key: string]: any; // Para cualquier otra propiedad
}

// Interfaz para la configuración
export interface RateLimitSettings {
    windowMs: number;
    maxRequests: number;
    cleanupDays?: number;
}