// src/app/features/intro/intro.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { UserSessionService } from 'src/app/core/services/api/user-session.service';

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

  constructor(
    private router: Router,
    private userSessionService: UserSessionService
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
    
    // Redirigimos a la página del test
    setTimeout(() => {
      this.router.navigate(['/test']);
    }, 500);
  }
}