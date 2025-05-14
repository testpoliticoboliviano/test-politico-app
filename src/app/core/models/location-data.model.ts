export interface LocationData {
    ip: string;
    city: string;
    country: string;
    region?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
    isp?: string;
    source: 'GPS + IP' | 'IP';
}

export interface LocationResult {
    locationData: LocationData | null;
    permissionStatus: 'granted' | 'denied' | 'unknown';
}