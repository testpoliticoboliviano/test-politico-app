// src/app/features/intro/intro.component.ts
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { UserSessionService } from 'src/app/core/services/api/user-session.service';
import { LocationData, LocationResult } from 'src/app/core/models/location-data.model';
import { LocationService } from 'src/app/core/services/api/location.service';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerItems', [
      transition(':enter', [
        query('.info-card, .axis-card, .ideology-card, .detail-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('pulseAnimation', [
      transition(':enter', [
        animate('2s ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class IntroComponent implements OnInit {
  @ViewChild('contentSection', { read: ElementRef }) contentSection!: ElementRef;
  
  loading: boolean = false;

  // Propiedades para el modal de ubicación
  showLocationModal = false;
  userLocation: LocationData | null = null;
  showLocationPromptOnFinish = true;

  constructor(
    private router: Router,
    private userSessionService: UserSessionService,
    private locationService: LocationService,
  ) {}

  ngOnInit(): void {
    // Generamos o recuperamos ID de usuario
    this.userSessionService.getUserId().subscribe({
      next: (userId) => {
        //console.log('Usuario identificado:', userId);
      },
      error: (error) => {
        console.error('Error al identificar usuario:', error);
      }
    });
  }

  startTest(): void {
    this.loading = true;
    
    // Pequeña animación antes de verificar ubicación
    setTimeout(() => {
      this.checkLocationStatus();
    }, 300);
  }
  
  private async checkLocationStatus() {
    try {
      const statusPermission = await this.locationService.checkGeolocationPermission();
      console.log('statusPermission', statusPermission);  
      
      if(statusPermission === 'granted') {
        // Si ya tiene permiso, navegar directamente
        this.navigateToTest();
      } else { 
        // Si no tiene permiso, mostrar modal
        this.loading = false;
        this.showLocationModal = true;
      }
    } catch (error) {
      console.error('Error al verificar permisos de ubicación:', error);
      // En caso de error, continuar sin ubicación
      this.navigateToTest();
    }
  }

  onLocationModalClosed(result: LocationResult) {
    //console.log('Resultado del modal de ubicación:', result);    
    
    // Actualizar la ubicación local si recibimos datos
    if (result.locationData) {
      this.userLocation = result.locationData;
      
      // Guardar en localStorage para recordar la preferencia del usuario
      localStorage.setItem('locationPermissionStatus', result.permissionStatus);
    }
    
    // Ocultar el modal
    this.showLocationModal = false;
    
    // Navegar al test
    this.navigateToTest();
  }

  private navigateToTest(): void {
    // Animación de salida antes de navegar
    this.router.navigate(['/test']);
    /* setTimeout(() => {
      this.router.navigate(['/test']);
    }, 200); */
  }

  scrollToContent(): void {
    if (this.contentSection) {
      this.contentSection.nativeElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

}