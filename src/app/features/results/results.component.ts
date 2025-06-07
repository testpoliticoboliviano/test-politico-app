// src/app/features/results/results.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IdeologyType } from 'src/app/core/models/ideology.model';
import { PoliticalParty } from 'src/app/core/models/political-party.model';
import { IdeologyService } from 'src/app/core/services/api/ideology.service';
import { PoliticalPartiesService } from 'src/app/core/services/api/political-parties.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { FunctionsService } from 'src/app/core/services/functions.service';
import { CandidateService } from 'src/app/core/services/api/candidate.service';
import { Candidate } from 'src/app/core/models/candidate.model';

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
    trigger('slideInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('slideInRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(30px)' }),
        animate('600ms 100ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
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
    ]),
    trigger('expandCollapse', [
      transition(':enter', [
        style({ opacity: 0, height: 0, transform: 'scaleY(0.8)' }),
        animate('300ms ease-out', style({ opacity: 1, height: '*', transform: 'scaleY(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, height: 0, transform: 'scaleY(0.8)' }))
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
    private politicalPartiesService: PoliticalPartiesService,
    private utilFunctions: FunctionsService
  ) {
    // Intentamos recuperar los datos de la navegación
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    
    if (navigationState) {
      this.economicScore = this.utilFunctions.normalizeScore(navigationState['economicScore']);
      this.personalScore = this.utilFunctions.normalizeScore(navigationState['personalScore']);
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

  getIdeologyIcon(): string {
    const iconMap: { [key: string]: string } = {
      libertarian: 'fas fa-balance-scale',
      authoritarian: 'fas fa-crown',
      conservative: 'fas fa-landmark',
      progressive: 'fas fa-fist-raised',
      centrist: 'fas fa-dot-circle'
    };
    
    return iconMap[this.ideologyType] || 'fas fa-circle';
  }

  getScoreDescription(type: 'economic' | 'personal', score: number): string {
    if (type === 'economic') {
      if (score < 30) return 'Prefieres una economía controlada por el estado';
      if (score < 70) return 'Buscas un balance entre mercado libre y regulación';
      return 'Apoyas fuertemente el libre mercado';
    } else {
      if (score < 30) return 'Valoras el orden y la autoridad sobre las libertades individuales';
      if (score < 70) return 'Equilibras las libertades personales con la necesidad de orden';
      return 'Priorizas las libertades individuales y civiles';
    }
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
    const shareData = {
      title: 'Mi resultado en el Test de Orientación Política',
      text: `Mi ideología política es: ${this.ideologyName}. Puntuación económica: ${this.economicScore}%, personal: ${this.personalScore}%. ¿Cuál es la tuya?`,
      url: window.location.origin
    };

    // Intentar usar Web Share API
    if (navigator.share && this.isMobileDevice()) {
      navigator.share(shareData)
        .then(() => console.log('Resultado compartido exitosamente'))
        .catch((error) => console.error('Error al compartir:', error));
    } else {
      // Fallback: copiar al portapapeles con mejor feedback
      const shareText = `${shareData.text}\n\nRealiza el test en: ${shareData.url}`;
      
      navigator.clipboard.writeText(shareText)
        .then(() => {
          this.showShareNotification();
        })
        .catch(() => {
          // Fallback del fallback: seleccionar texto
          this.fallbackCopyToClipboard(shareText);
        });
    }
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private showShareNotification(): void {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'share-notification';
    notification.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>¡Resultado copiado al portapapeles!</span>
    `;
    
    // Estilos inline para la notificación
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f3b41;
      color: white;
      padding: 12px 24px;
      border-radius: 30px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      animation: slideUp 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease-out forwards';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showShareNotification();
    } catch (err) {
      console.error('Error al copiar:', err);
      alert('No se pudo copiar el resultado. Por favor, copia este texto manualmente:\n\n' + text);
    }
    
    document.body.removeChild(textArea);
  }

}