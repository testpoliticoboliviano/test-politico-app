import { Component, OnInit, Input, Output, EventEmitter, OnChanges, OnDestroy, ChangeDetectorRef, SimpleChanges, HostListener } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { LocationData, LocationResult } from 'src/app/core/models/location-data.model';
import { LocationService } from 'src/app/core/services/api/location.service';

@Component({
  selector: 'app-location-modal',
  templateUrl: './location-modal.component.html',
  styleUrls: ['./location-modal.component.scss']
})
export class LocationModalComponent implements OnInit, OnDestroy, OnChanges {

  @Input() isVisible = false;
  @Output() closed = new EventEmitter<LocationResult>();
  
  // Estados del componente
  locationInfo: LocationData | null = null;
  isLoading = true;
  loadingMessage = 'Verificando permisos de ubicación...';
  hasError = false;
  errorMessage = '';
  
  // Subscripciones
  private subscriptions: Subscription[] = [];
  private timeoutSubscription?: Subscription;
  
  constructor(
    private locationService: LocationService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    if (this.isVisible) {
      this.initializeModal();
    }
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && changes['isVisible'].currentValue) {
      this.initializeModal();
    }
  }
  
  ngOnDestroy(): void {
    this.cleanup();
  }
  
  // Manejo de tecla ESC para cerrar modal
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isVisible && !this.isLoading) {
      this.dismiss('unknown');
    }
  }
  
  // Prevenir scroll del body cuando el modal está abierto
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    event.preventDefault();
  }
  
  /**
   * Inicializa el modal y carga la información de ubicación
   */
  private initializeModal(): void {
    this.resetState();
    this.loadLocationInfo();
    
    // Timeout de seguridad para evitar carga infinita
    /* this.timeoutSubscription = timer(15000).subscribe(() => {
      if (this.isLoading) {
        console.log('Tiempo de espera agotado. Por favor, intenta nuevamente.'); 
        this.handleError('Tiempo de espera agotado. Por favor, intenta nuevamente.');
      }
    }); */
  }
  
  /**
   * Resetea el estado del componente
   */
  private resetState(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.loadingMessage = 'Verificando permisos de ubicación...';
    this.locationInfo = null;
  }
  
  /**
   * Carga la información inicial de ubicación
   */
  private loadLocationInfo(): void {
    this.updateLoadingMessage('Obteniendo tu ubicación aproximada...');
    
    const locationSub = this.locationService.getIpAndLocation()
      .subscribe({
        next: async (location) => {
          this.locationInfo = location;
          await this.checkExistingPermission();
        },
        error: (error) => {
          console.error('Error al obtener ubicación inicial:', error);
          this.handleError('No pudimos obtener tu ubicación. Verifica tu conexión a internet.');
        }
      });
    
    this.subscriptions.push(locationSub);
  }
  
  /**
   * Verifica si ya existe permiso de geolocalización
   */
  private async checkExistingPermission(): Promise<void> {
    try {
      this.updateLoadingMessage('Verificando permisos existentes...');
      
      const permissionStatus = await this.locationService.checkGeolocationPermission();
      
      if (permissionStatus === 'granted') {
        // Si ya tiene permiso, obtener ubicación exacta y cerrar
        this.handlePermissionGranted();
      } else {
        // Mostrar interfaz para solicitar permiso
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error al verificar permisos:', error);
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  
  /**
   * Maneja el caso cuando ya se tiene permiso
   */
  private handlePermissionGranted(): void {
    this.updateLoadingMessage('Obteniendo tu ubicación exacta...');
    
    const permissionSub = this.locationService.requestLocationPermission()
      .subscribe({
        next: (location) => {
          this.closeWithResult({
            locationData: location,
            permissionStatus: 'granted'
          });
        },
        error: (error) => {
          console.error('Error al obtener ubicación exacta:', error);
          // Continuar con ubicación aproximada
          this.closeWithResult({
            locationData: this.locationInfo,
            permissionStatus: 'granted'
          });
        }
      });
    
    this.subscriptions.push(permissionSub);
  }
  
  /**
   * Solicita permiso de ubicación al usuario
   */
  requestPermission(): void {
    console.log(navigator.geolocation);    
    console.log(!navigator.geolocation);    
    if (!navigator.geolocation) {
      this.handleError('Tu navegador no soporta geolocalización. Continuaremos con tu ubicación aproximada.');
      return;
    }
    
    this.isLoading = true;
    this.updateLoadingMessage('Esperando tu respuesta...');
    this.cdr.detectChanges();
    
    // Configuración optimizada para geolocalización
    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      //timeout: 12000,
      maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => this.onGeolocationSuccess(position),
      (error) => this.onGeolocationError(error),
      geoOptions
    );
  }
  
  /**
   * Maneja el éxito de la geolocalización
   */
  private onGeolocationSuccess(position: GeolocationPosition): void {
    this.updateLoadingMessage('Procesando tu ubicación...');
    
    const locationSub = this.locationService.requestLocationPermission()
      .subscribe({
        next: (location) => {
          this.closeWithResult({
            locationData: location,
            permissionStatus: 'granted'
          });
        },
        error: (error) => {
          console.error('Error al procesar ubicación:', error);
          this.handleError('Error al procesar tu ubicación. Continuaremos con la ubicación aproximada.');
        }
      });
    
    this.subscriptions.push(locationSub);
  }
  
  /**
   * Maneja los errores de geolocalización
   */
  private onGeolocationError(error: GeolocationPositionError): void {
    let message = '';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Permiso denegado. Continuaremos con tu ubicación aproximada.';
        this.dismiss('denied');
        return;
      
      case error.POSITION_UNAVAILABLE:
        message = 'Ubicación no disponible. Continuaremos con tu ubicación aproximada.';
        break;
      
      case error.TIMEOUT:
        message = 'Tiempo de espera agotado. Continuaremos con tu ubicación aproximada.';
        break;
      
      default:
        message = 'Error desconocido. Continuaremos con tu ubicación aproximada.';
        break;
    }
    
    console.log('Error de geolocalización:', error.message);
    this.handleError(message);
  }
  
  /**
   * Maneja errores y cierra el modal después de mostrar el mensaje
   */
  private handleError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    this.isLoading = false;
    this.cdr.detectChanges();
    
    // Auto-cerrar después de mostrar el error
    timer(3000).subscribe(() => {
      this.dismiss('unknown');
    });
  }
  
  /**
   * Actualiza el mensaje de carga
   */
  private updateLoadingMessage(message: string): void {
    this.loadingMessage = message;
    this.cdr.detectChanges();
  }
  
  /**
   * Cierra el modal con el resultado especificado
   */
  private closeWithResult(result: LocationResult): void {
    this.cleanup();
    this.closed.emit(result);
    this.isVisible = false;
  }
  
  /**
   * Descarta el modal con el estado especificado
   */
  dismiss(status: 'granted' | 'denied' | 'unknown'): void {
    this.closeWithResult({
      locationData: this.locationInfo,
      permissionStatus: status
    });
  }
  
  /**
   * Limpia subscripciones y timeouts
   */
  private cleanup(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    
    if (this.timeoutSubscription) {
      this.timeoutSubscription.unsubscribe();
      this.timeoutSubscription = undefined;
    }
  }
  
  /**
   * Getter para mostrar el estado de error en el template
   */
  get showError(): boolean {
    return this.hasError && !this.isLoading;
  }
  
  /**
   * Getter para el mensaje a mostrar en la carga
   */
  get currentLoadingMessage(): string {
    return this.loadingMessage;
  }
}
