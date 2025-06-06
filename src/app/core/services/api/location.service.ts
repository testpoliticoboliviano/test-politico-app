import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, switchMap, map, tap, delay } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocationData } from '../../models/location-data.model';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  private cachedLocation: LocationData | null = null;

  constructor(private http: HttpClient) {
    // Intentar cargar datos almacenados al iniciar el servicio
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        this.cachedLocation = JSON.parse(savedLocation);
      } catch (e) {
        console.error('Error al cargar datos de ubicación guardados:', e);
      }
    }
  }

  /**
   * Obtiene la ubicación del usuario combinando datos de GPS e IP
   * @param forceRefresh Ignorar caché y obtener datos nuevos
   * @returns Observable con datos de ubicación
   */
  getIpAndLocation(forceRefresh: boolean = false): Observable<LocationData> {
    // Usar caché si está disponible y no se solicita actualización forzada
    if (this.cachedLocation && !forceRefresh) {
      return of(this.cachedLocation);
    }

    // Primero obtenemos los datos por IP como base
    return this.getLocationByIp().pipe(
      switchMap(ipLocation => {
        // Intentamos obtener localización más precisa con el GPS
        return this.getLocationByGPS().pipe(
          switchMap(gpsCoords => {
            // Si tenemos coordenadas GPS, hacemos geocodificación inversa
            return this.reverseGeocode(gpsCoords.latitude, gpsCoords.longitude).pipe(
              map(geoData => {
                // Combinamos datos de IP y GPS+geocodificación
                const enhancedLocation: LocationData = {
                  ip: ipLocation.ip,
                  // Usamos los datos de geocodificación inversa si están disponibles
                  city: geoData.city || ipLocation.city,
                  country: geoData.country || ipLocation.country,
                  region: geoData.region || ipLocation.region,
                  // Usamos coordenadas precisas del GPS
                  latitude: gpsCoords.latitude,
                  longitude: gpsCoords.longitude,
                  // Mantenemos datos adicionales de la IP
                  timezone: ipLocation.timezone,
                  isp: ipLocation.isp,
                  // Marcamos que los datos vienen de ambas fuentes
                  source: 'GPS + IP'
                };

                // Guardar en caché y localStorage
                this.cachedLocation = enhancedLocation;
                localStorage.setItem('userLocation', JSON.stringify(enhancedLocation));
                
                return enhancedLocation;
              }),
              catchError(() => {
                // Si la geocodificación falla, usamos los datos GPS + algunos datos de IP
                const fallbackLocation: LocationData = {
                  ...ipLocation,
                  latitude: gpsCoords.latitude,
                  longitude: gpsCoords.longitude,
                  source: 'GPS + IP'
                };
                
                this.cachedLocation = fallbackLocation;
                localStorage.setItem('userLocation', JSON.stringify(fallbackLocation));
                
                return of(fallbackLocation);
              })
            );
          }),
          catchError(() => {
            // Si el GPS falla o es rechazado, usamos solo los datos de IP
            //console.log('GPS no disponible o rechazado, usando solo datos de IP');
            const ipOnlyLocation: LocationData = {
              ...ipLocation,
              source: 'IP'
            };
            
            this.cachedLocation = ipOnlyLocation;
            localStorage.setItem('userLocation', JSON.stringify(ipOnlyLocation));
            
            return of(ipOnlyLocation);
          })
        );
      }),
      catchError(error => {
        console.error('Error al obtener datos de ubicación:', error);
        
        // Si todo falla, usamos datos locales si están disponibles
        if (this.cachedLocation) {
          return of(this.cachedLocation);
        }
        
        // O generamos datos predeterminados como último recurso
        return this.getFallbackLocation();
      })
    );
  }

  /**
   * Obtiene la ubicación mediante la API de IP
   */
  private getLocationByIp(): Observable<LocationData> {
    // Si tenemos la URL de Cloud Functions, usamos la función remota
    if (environment.cloudFunctionsUrl) {
      const url = `${environment.cloudFunctionsUrl}/getIpLocation`;
      return this.http.get<any>(url).pipe(
        map(response => {
          const locationData: LocationData = {  // Especificamos el tipo explícitamente
            ip: response.ip || '0.0.0.0',
            city: response.city || 'Desconocido',
            country: response.country || 'Desconocido',
            region: response.region || '',
            latitude: response.latitude || 0,
            longitude: response.longitude || 0,
            timezone: response.timezone || '',
            isp: response.isp || '',
            source: 'IP'  // Al crear un objeto explícitamente tipado, TypeScript entiende correctamente los literales
          };
          return locationData;
        }),
        // resto de la función...
      );
    } else {
      // Si no tenemos Cloud Functions, usamos API pública
      return this.getLocationByPublicApi();
    }
  }

  /**
   * Obtiene ubicación usando una API pública
   */
  private getLocationByPublicApi(): Observable<LocationData> {
    return this.http.get<any>('https://ipapi.co/json/').pipe(
      map(response => {
        const locationData: LocationData = {  // Especificamos el tipo explícitamente
          ip: response.ip || '0.0.0.0',
          city: response.city || 'Desconocido',
          country: response.country_name || 'Desconocido',
          region: response.region || '',
          latitude: response.latitude || 0,
          longitude: response.longitude || 0,
          timezone: response.timezone || '',
          isp: response.org || '',
          source: 'IP'  // TypeScript respeta el literal aquí
        };
        return locationData;
      })
    );
  }

  /**
   * Obtiene coordenadas precisas usando el GPS del navegador
   */
  private getLocationByGPS(): Observable<{latitude: number, longitude: number}> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error('Geolocalización no soportada en este navegador');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        // Éxito
        (position) => {
          observer.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          observer.complete();
        },
        // Error
        (error) => {
          //console.log('Error de geolocalización GPS:', error.message);
          observer.error(error);
        },
        // Opciones
        {
          enableHighAccuracy: true,     // Alta precisión
          timeout: 10000,               // 10 segundos máximo de espera
          maximumAge: 300000            // Caché de 5 minutos
        }
      );
    });
  }

  /**
   * Realiza geocodificación inversa (coordenadas → dirección)
   */
  private reverseGeocode(latitude: number, longitude: number): Observable<{city: string, country: string, region?: string}> {
    // Usamos Nominatim (OpenStreetMap) - servicio gratuito y sin clave API
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;
    
    return this.http.get<any>(url, {
      headers: {
        // Importante: necesitas identificar tu aplicación según los términos de uso de Nominatim
        'User-Agent': 'TestPoliticoApp/1.0 (testpoliticoboliviano@gmail.com)'
      }
    }).pipe(
      map(response => {
        if (!response || !response.address) {
          throw new Error('Datos de geocodificación no disponibles');
        }
        
        return {
          // Mapeo de campos de Nominatim a nuestros campos
          city: response.address.city || 
                response.address.town || 
                response.address.village || 
                response.address.hamlet || 
                'Desconocido',
          country: response.address.country || 'Desconocido',
          region: response.address.state || 
                 response.address.county || 
                 response.address.region || 
                 ''
        };
      }),
      // OpenStreetMap tiene límites de uso, debemos respetar el rate-limiting
      delay(1000)  // 1 segundo entre solicitudes
    );
  }

  /**
   * Datos de respaldo si todo lo demás falla
   */
  private getFallbackLocation(): Observable<LocationData> {
    // Datos predeterminados para La Paz, Bolivia
    return of({
      ip: '0.0.0.0',
      city: 'La Paz',
      country: 'Bolivia',
      region: 'La Paz',
      latitude: -16.489689,
      longitude: -68.119293,
      source: 'IP'
    });
  }

  /**
   * Verifica si el usuario está en un país específico
   */
  isUserInCountry(countryCode: string): Observable<boolean> {
    return this.getIpAndLocation().pipe(
      map(location => {
        const userCountry = location.country.toLowerCase();
        const targetCountry = countryCode.toLowerCase();
        
        return userCountry === targetCountry ||
               userCountry.includes(targetCountry) ||
               targetCountry.includes(userCountry);
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Solicita específicamente el permiso de geolocalización y devuelve la ubicación mejorada
   * @returns Observable con datos de ubicación que usa GPS si el permiso fue concedido
   */
  requestLocationPermission(): Observable<LocationData> {
    // Fuerza una nueva solicitud ignorando la caché
    return this.getIpAndLocation(true);
  }

  /**
   * Verifica si el navegador soporta geolocalización
   * @returns verdadero si el navegador soporta geolocalización
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Verifica el estado del permiso de geolocalización
   * @returns Promise con el estado del permiso ('granted', 'denied', 'prompt' o 'unknown')
   */
  async checkGeolocationPermission(): Promise<string> {
    if (!this.isGeolocationSupported()) {
      return 'not_supported';
    }
    
    // Verificar permiso si el navegador lo soporta
    if ('permissions' in navigator) {
      try {
        const permissionStatus = await navigator.permissions.query({name: 'geolocation'});
        return permissionStatus.state;
      } catch (error) {
        console.error('Error al verificar permiso:', error);
        return 'unknown';
      }
    }
    
    // Si no podemos verificar explícitamente, intentar obtener la ubicación
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve('denied');
          } else {
            resolve('unknown');
          }
        },
        { timeout: 3000 }
      );
    });
  }

}