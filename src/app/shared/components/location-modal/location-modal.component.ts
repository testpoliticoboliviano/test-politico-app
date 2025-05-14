import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { LocationData, LocationResult } from 'src/app/core/models/location-data.model';
import { LocationService } from 'src/app/core/services/api/location.service';

@Component({
  selector: 'app-location-modal',
  templateUrl: './location-modal.component.html',
  styleUrls: ['./location-modal.component.scss']
})
export class LocationModalComponent implements OnInit {

  /*@Input() isVisible = false;
  @Output() closed = new EventEmitter<LocationData | null>();
  
  locationInfo: LocationData | null = null;
  isLoading = true;
  permissionDenied = false;
  
  constructor(private locationService: LocationService) {}
  
  ngOnInit(): void {
    if (this.isVisible) {
      this.loadLocationInfo();
    }
  }
  
  ngOnChanges(): void {
    if (this.isVisible) {
      this.loadLocationInfo();
    }
  }
  
  loadLocationInfo(): void {
    this.isLoading = true;
    this.permissionDenied = false;
    
    this.locationService.getIpAndLocation()
      .subscribe({
        next: (location) => {
          this.locationInfo = location;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }
  
  requestPermission(): void {
    this.isLoading = true;
    this.permissionDenied = false;
    
    this.locationService.requestLocationPermission()
      .subscribe({
        next: (location) => {
          this.locationInfo = location;
          this.isLoading = false;
          
          // Si después de intentarlo seguimos con solo IP, probablemente fue denegado
          if (location.source === 'IP') {
            this.permissionDenied = true;
          }
        },
        error: (error) => {
          console.error('Error al obtener permiso de ubicación:', error);
          this.isLoading = false;
          this.permissionDenied = true;
        }
      });
  }
  
  dismiss(): void {
    this.closed.emit(this.locationInfo);
    this.isVisible = false;
  }
  
  showPermissionInstructions(): void {
    // Detectar el navegador para dar instrucciones específicas
    const browser = this.detectBrowser();
    let instructions = '';
    
    switch(browser) {
      case 'chrome':
        instructions = 'En Chrome: Haz clic en el icono de candado en la barra de dirección > Permisos de sitio > Ubicación > Permitir';
        break;
      case 'firefox':
        instructions = 'En Firefox: Haz clic en el icono de candado en la barra de dirección > Permisos > Acceder a tu ubicación > Permitir';
        break;
      case 'safari':
        instructions = 'En Safari: Preferencias > Sitios web > Ubicación > Permitir para este sitio';
        break;
      case 'edge':
        instructions = 'En Edge: Haz clic en el icono de candado en la barra de dirección > Permisos del sitio > Ubicación > Permitir';
        break;
      default:
        instructions = 'Busca en la configuración de tu navegador la sección de permisos de sitios web y permite el acceso a la ubicación para este sitio.';
    }
    
    alert(`Cómo habilitar tu ubicación:\n\n${instructions}`);
  }
  
  private detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.indexOf('chrome') > -1 && userAgent.indexOf('edge') === -1) {
      return 'chrome';
    } else if (userAgent.indexOf('firefox') > -1) {
      return 'firefox';
    } else if (userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1) {
      return 'safari';
    } else if (userAgent.indexOf('edge') > -1) {
      return 'edge';
    }
    
    return 'other';
  } */

  @Input() isVisible = false;
  @Output() closed = new EventEmitter<LocationResult>();
  
  locationInfo: LocationData | null = null;
  isLoading = true;
  
  constructor(private locationService: LocationService) {}
  
  ngOnInit(): void {
    if (this.isVisible) {
      this.loadLocationInfo();
    }
  }
  
  ngOnChanges(): void {
    if (this.isVisible) {
      this.loadLocationInfo();
    }
  }
  
  loadLocationInfo(): void {
    this.isLoading = true;
    
    this.locationService.getIpAndLocation()
      .subscribe({
        next: async (location) => {
          const statusPermission = await this.locationService.checkGeolocationPermission();
          if(statusPermission === 'granted') {
            this.locationInfo = location;
            this.isLoading = false;
            this.isVisible = false;
            this.closed.emit({
              locationData: location,
              permissionStatus: statusPermission
            });
          } else {
            this.locationInfo = location;
            this.isLoading = false;
          }
        },
        error: () => {
          this.isLoading = false;
          // Cerrar el modal si hay un error al cargar datos iniciales
          this.dismiss('unknown');
        }
      });
  }
  
  requestPermission(): void {
    this.isLoading = true;
    
    // Activar directamente el diálogo de permisos del navegador
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // Éxito - Ahora obtenemos los datos completos con la ubicación GPS
        (position) => {
          this.locationService.requestLocationPermission()
            .subscribe({
              next: (location) => {
                this.isLoading = false;
                // Cerrar inmediatamente con resultado exitoso
                this.closed.emit({
                  locationData: location,
                  permissionStatus: 'granted'
                });
                this.isVisible = false;
              },
              error: (error) => {
                console.error('Error al obtener datos de localización:', error);
                this.isLoading = false;
                // Cerrar con error
                this.dismiss('unknown');
              }
            });
        },
        // Error - El usuario denegó el permiso
        (error) => {
          console.warn('Error de geolocalización:', error.message);
          this.isLoading = false;
          // Cerrar con denegado
          this.dismiss('denied');
        },
        // Opciones
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Navegador no soporta geolocalización
      this.isLoading = false;
      alert('Tu navegador no soporta geolocalización');
      this.dismiss('unknown');
    }
  }
  
  dismiss(status: 'granted' | 'denied' | 'unknown'): void {
    this.closed.emit({
      locationData: this.locationInfo,
      permissionStatus: status
    });
    this.isVisible = false;
  }
}
