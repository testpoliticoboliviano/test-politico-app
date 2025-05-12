// src/app/features/results/results.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IdeologyType } from 'src/app/core/models/ideology.model';
import { PoliticalParty } from 'src/app/core/models/political-party.model';
import { IdeologyService } from 'src/app/core/services/api/ideology.service';
import { PoliticalPartiesService } from 'src/app/core/services/api/political-parties.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerList', [
      transition(':enter', [
        query('.list-item', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(80, [
            animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class ResultsComponent implements OnInit {
  // Datos del resultado
  economicScore: number = 0;
  personalScore: number = 0;
  ideologyType: IdeologyType = IdeologyType.CENTRIST;
  userAnswers: Array<{
    questionId: string;
    answerId: string;
    question: string;
    answer: string;
    economicScore: number;
    personalScore: number;
  }> = [];
  
  // Datos adicionales
  ideologyName: string = '';
  ideologyDescription: string = '';
  relatedParties: PoliticalParty[] = [];
  
  // Estado de la UI
  loading: boolean = true;
  loadingParties: boolean = true;
  showAnswers: boolean = false;

  constructor(
    private router: Router,
    private ideologyService: IdeologyService,
    private politicalPartiesService: PoliticalPartiesService
  ) {
    // Intentamos recuperar los datos de la navegación
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    
    if (navigationState) {
      this.economicScore = navigationState['economicScore'];
      this.personalScore = navigationState['personalScore'];
      this.ideologyType = navigationState['ideologyType'];
      this.userAnswers = navigationState['answers'] || [];
      this.loading = false;
    } else {
      // Si no hay datos de navegación, redirigimos al inicio
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    if (!this.loading) {
      // Obtenemos más información sobre la ideología
      const ideology = this.ideologyService.getIdeologyByType(this.ideologyType);
      if (ideology) {
        this.ideologyName = ideology.name;
        this.ideologyDescription = ideology.description;
      }
      
      // Cargamos partidos políticos relacionados
      this.loadRelatedParties();
    }
  }

  loadRelatedParties(): void {
    this.loadingParties = true;
    
    this.politicalPartiesService.getPartiesByIdeology(this.ideologyType)
      .subscribe({
        next: (parties) => {
          this.relatedParties = parties;
          this.loadingParties = false;
        },
        error: (error) => {
          console.error('Error al cargar partidos políticos:', error);
          this.loadingParties = false;
        }
      });
  }

  toggleAnswers(): void {
    this.showAnswers = !this.showAnswers;
  }

  retakeTest(): void {
    this.router.navigate(['/test']);
  }

  goToIntro(): void {
    this.router.navigate(['/']);
  }

  shareResults(): void {
    // Implementación básica para compartir (podría expandirse)
    if (navigator.share) {
      navigator.share({
        title: 'Mi resultado en el Test Político',
        text: `Mi ideología política es: ${this.ideologyName}. Mi puntuación económica: ${this.economicScore}, personal: ${this.personalScore}.`,
        url: window.location.href
      })
        .catch((error) => console.error('Error al compartir:', error));
    } else {
      // Fallback para navegadores que no soportan Web Share API
      const shareText = `Mi ideología política es: ${this.ideologyName}. Mi puntuación económica: ${this.economicScore}, personal: ${this.personalScore}.`;
      
      // Copiamos al portapapeles
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Resultado copiado al portapapeles'))
        .catch(() => alert('No se pudo copiar al portapapeles'));
    }
  }
}