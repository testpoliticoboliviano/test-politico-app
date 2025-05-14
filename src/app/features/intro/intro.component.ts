// src/app/features/intro/intro.component.ts
import { Component, OnInit } from '@angular/core';
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
        query('.feature-item', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class IntroComponent implements OnInit {
  loading: boolean = false;

  // Nuevas propiedades para el modal de ubicación
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
        console.log('Usuario identificado:', userId);
      },
      error: (error) => {
        console.error('Error al identificar usuario:', error);
      }
    });
  }

  startTest(): void {
    this.loading = true;
    
    this.checkLocationStatus();

    // Redirigimos a la página del test
    /* setTimeout(() => {
      this.router.navigate(['/test']);
    }, 500); */
  }
  
  private async checkLocationStatus() {
    const statusPermission = await this.locationService.checkGeolocationPermission()
    console.log('statusPermission', statusPermission);  
    
    if(statusPermission === 'granted') {
      setTimeout(() => {
        this.router.navigate(['/test']);
      }, 500); 
    } else { 
      this.showLocationModal = true;
    }
  }

  /* private checkLocationStatus() {
    // Intentar obtener la ubicación actual (sin forzar actualización)
    this.locationService.getIpAndLocation()
      .subscribe(location => {
        this.userLocation = location;
        
        // Si solo tenemos ubicación por IP, mostraremos modal al finalizar
        this.showLocationPromptOnFinish = location.source === 'IP';
        
        // Si es la primera visita y solo tenemos IP, mostrar modal al inicio
        if (location.source === 'IP' && !localStorage.getItem('locationPromptShown')) {
          this.showLocationModal = true;
          localStorage.setItem('locationPromptShown', 'true');
        }
      });
  } */

  onLocationModalClosed(result: LocationResult) {
    console.log('result', result);    
    // Actualizar la ubicación local si recibimos datos
    if (result.locationData) {
      this.userLocation = result.locationData;
            
      // Guardar en localStorage para recordar la preferencia del usuario
      localStorage.setItem('locationPermissionStatus', result.permissionStatus);
    }    
    // Ocultar el modal
    this.showLocationModal = false;
    this.router.navigate(['/test']);
  }

}