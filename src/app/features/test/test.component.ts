import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Question } from 'src/app/core/models/question.model';
import { QuestionsService } from 'src/app/core/services/api/questions.service';
import { UserSessionService } from 'src/app/core/services/api/user-session.service';
import { IdeologyService } from 'src/app/core/services/api/ideology.service';
import { ResultsService } from 'src/app/core/services/api/results.service';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { TestResult } from 'src/app/core/models/test-result.model';
import { LocationService } from 'src/app/core/services/api/location.service';
import { LocationResult } from 'src/app/core/models/location-data.model';
import { TestService } from 'src/app/core/services/api/test.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent implements OnInit, OnDestroy {
  questions: Question[] = [];
  currentQuestionIndex: number = 0;
  userAnswers: Array<{
    questionId: string;
    answerId: string;
    question: string;
    answer: string;
    economicScore: number;
    personalScore: number;
  }> = [];
  
  loading: boolean = true;
  error: string | null = null;
  submitting: boolean = false;
  
  // Variables para las animaciones
  displayQuestion: boolean = false;
  transitioningCards: boolean = false;

  // Variables para manejar temporizadores
  private transitionTimer: any = null;
  private loadingTimer: any = null;

  // Nuevas propiedades para el modal de ubicación
  showLocationModal = false;

  constructor(
    private questionsService: QuestionsService,
    private userSessionService: UserSessionService,
    private ideologyService: IdeologyService,
    private resultsService: ResultsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private locationService: LocationService,
    private testService: TestService,
  ) {}

  ngOnInit(): void {
    this.loadQuestions();
  }

  ngOnDestroy(): void {
    // Limpiar temporizadores al destruir el componente
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
    }
  }

  loadQuestions(): void {
    this.loading = true;
    this.error = null;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.displayQuestion = false;
    
    this.questionsService.getQuestions()
      .pipe(
        catchError(error => {
          console.error('Error al cargar preguntas:', error);
          return of([]);
        })
      )
      .subscribe({
        next: questions => {
          
          this.questions = questions;
          this.loading = false;
          
          // Verificamos que tengamos preguntas
          if (questions.length > 0) {
            // Mostramos la primera pregunta con un pequeño delay para la animación
            this.loadingTimer = setTimeout(() => {
              this.displayQuestion = true;
              this.cdr.detectChanges(); // Forzar actualización de la vista
            }, 300);
          } else {
            console.warn('No se recibieron preguntas');
          }
        },
        error: error => {
          console.error('Error inesperado al cargar preguntas:', error);
          this.loading = false;
          this.error = 'Error inesperado al cargar preguntas. Por favor, intenta de nuevo.';
        },
        complete: () => {
          console.log('Carga de preguntas completada');
        }
      });
  }

  onAnswerSelected(answer: {
    questionId: string;
    answerId: string;
    question: string;
    answer: string;
    economicScore: number;
    personalScore: number;
  }): void {
    //console.log('Respuesta seleccionada:', answer.question, '→', answer.answer);
    
    // Guardamos la respuesta
    this.userAnswers.push(answer);
    
    // Estado actual antes de transición
    //console.log('Antes de transición - Índice:', this.currentQuestionIndex, 'Total:', this.questions.length);
    
    // Verificar si hay más preguntas
    const hasMoreQuestions = this.currentQuestionIndex < (this.questions.length - 1);
    //console.log('¿Hay más preguntas?', hasMoreQuestions);
    
    // Preparamos la transición
    this.transitioningCards = true;
    this.displayQuestion = false;
    
    // Esperamos a que termine la animación de salida
    setTimeout(() => {
      if (hasMoreQuestions) {
        // Incrementamos el índice de la pregunta actual
        this.currentQuestionIndex++;
        
        //console.log('ÍNDICE ACTUALIZADO:', this.currentQuestionIndex);
        
        // Forzamos la detección de cambios
        this.cdr.detectChanges();
        
        // Mostramos la siguiente pregunta
        setTimeout(() => {
          this.displayQuestion = true;
          this.transitioningCards = false;
          
          // Forzamos la detección de cambios nuevamente
          this.cdr.detectChanges();
          
          //console.log('Mostrando pregunta', this.currentQuestionIndex + 1, 'de', this.questions.length);
        }, 300);
      } else {
        // Hemos terminado el test
        console.log('Test completado, enviando resultados');
        // this.submitTest();
        this.checkLocationStatus();
        //this.checkUserRateLimit();
      }
    }, 500);
  }

  private async checkLocationStatus() {
    const statusPermission = await this.locationService.checkGeolocationPermission()
    console.log('statusPermission', statusPermission);  
    
    if(statusPermission === 'granted') {
      this.submitTest();
    } else { 
      this.showLocationModal = true;
    }
  }

  submitTest(): void {
    console.log('Enviando resultados del test');
    this.submitting = true;
    this.error = null;
    
    // Obtenemos el ID de usuario
    this.userSessionService.getUserId().subscribe({
      next: userId => {
        // Preparamos el resultado del test
        const testResult = this.ideologyService.prepareTestResult(userId, this.userAnswers);
        
        this.resultsService.saveTestResult(testResult, userId).subscribe({
          next: (result) => {
            console.log('Resultado guardado:', result);
            this.submitting = false;
            
            // Redirigimos a la página de resultados
            this.navigateToResults(testResult);
          },
          error: (error) => {
            console.error('Error al guardar el resultado:', error);
            this.submitting = false;
            
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
              this.router.navigate(['/rate-limit-error']);
            } else {
              this.error = error.message || 'Error al guardar el resultado';
              this.router.navigate(['/error'], { 
                state: { 
                  message: this.error, 
                  danger: true 
                }
              });
            }
          }
        });
      },
      error: error => {
        console.error('Error al obtener ID de usuario:', error);
        this.submitting = false;
        this.error = 'No se pudo identificar la sesión. Por favor, recarga la página e intenta de nuevo.';
      }
    });
  }

  /* private checkUserRateLimit() { 
    const sessionId = localStorage.getItem('nolan_test_user_id') || '';
    this.testService.checkRateLimit(sessionId).subscribe({
      next: (status) => {
        console.log('checkUserRateLimit', status);
        this.checkLocationStatus();
      },
      error: (error) => {
        console.log('error', error);
        this.router.navigate(['/rate-limit-error']); // Navega a la ruta rate limit error
      }
    });
  }

  private async checkLocationStatus() {
    const statusPermission = await this.locationService.checkGeolocationPermission()
    console.log('statusPermission', statusPermission);  
    
    if(statusPermission === 'granted') {
      this.submitTest();
    } else { 
      this.showLocationModal = true;
    }
  }

  onLocationModalClosed(result: LocationResult) {
    // Actualizar la ubicación local si recibimos datos
    if (result.locationData) {            
      // Guardar en localStorage para recordar la preferencia del usuario
      localStorage.setItem('locationPermissionStatus', result.permissionStatus);
    }    
    // Ocultar el modal
    this.showLocationModal = false;
    this.submitTest();
  }

  submitTest(): void {
    console.log('Enviando resultados del test');
    this.submitting = true;
    this.error = null;
    
    // Obtenemos el ID de usuario
    this.userSessionService.getUserId().subscribe({
      next: userId => {
        // Preparamos el resultado del test
        const testResult = this.ideologyService.prepareTestResult(userId, this.userAnswers);
        
        // Guardamos el resultado
        this.resultsService.saveTestResult(testResult)
          .subscribe({
            next: resultId => {
              console.log('Resultado guardado con ID:', resultId);
              this.submitting = false;
              
              // Redirigimos a la página de resultados
              this.navigateToResults(testResult);
            },
            error: error => {
              console.error('Error al guardar el resultado:', error);
              this.submitting = false;
              
              // Verificamos si es un error de rate limiting
              if (error.message && error.message.includes('Has excedido el límite de tests')) {
                this.error = error.message;
                
                // Mostramos mensaje de error pero permitimos ver el resultado actual
                setTimeout(() => {
                  if (confirm('No se pudo guardar el resultado debido al límite de tests, pero puedes ver tu resultado actual. ¿Deseas continuar?')) {
                    this.navigateToResults(testResult);
                  }
                }, 100);
              } else {
                // Para otros errores, mostramos mensaje genérico
                this.error = 'Ocurrió un error al guardar el resultado. Por favor, intenta de nuevo.';
                
                // A pesar del error, permitimos ver el resultado
                setTimeout(() => {
                  if (confirm('Ocurrió un error al guardar el resultado. ¿Deseas ver tu resultado de todos modos?')) {
                    this.navigateToResults(testResult);
                  }
                }, 100);
              }
            }
          });
      },
      error: error => {
        console.error('Error al obtener ID de usuario:', error);
        this.submitting = false;
        this.error = 'No se pudo identificar la sesión. Por favor, recarga la página e intenta de nuevo.';
      }
    });
  } */

  onLocationModalClosed(result: LocationResult) {
    // Actualizar la ubicación local si recibimos datos
    if (result.locationData) {            
      // Guardar en localStorage para recordar la preferencia del usuario
      localStorage.setItem('locationPermissionStatus', result.permissionStatus);
    }    
    // Ocultar el modal
    this.showLocationModal = false;
    this.submitTest();
  }

  private navigateToResults(result: TestResult): void {
    // Redirigimos a la página de resultados con los datos necesarios
    this.router.navigate(['/results'], {
      state: {
        economicScore: result.totalEconomicScore,
        personalScore: result.totalPersonalScore,
        ideologyType: result.ideologyType,
        answers: result.answers
      }
    });
  }

  // Botón para reiniciar el test (útil en caso de error)
  restartTest(): void {
    // Limpiamos temporizadores pendientes
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
    this.error = null;
    this.loadQuestions();
  }

  // Para el botón de volver a la introducción
  goToIntro(): void {
    this.router.navigate(['/']);
  }
  
  // Método para depuración
  logState(prefix: string = ''): void {
    console.group(`Estado [${prefix}]`);
    console.log('currentQuestionIndex:', this.currentQuestionIndex);
    console.log('displayQuestion:', this.displayQuestion);
    console.log('transitioningCards:', this.transitioningCards);
    console.log('questions.length:', this.questions.length);
    console.log('Pregunta actual:', this.questions[this.currentQuestionIndex]?.text || 'N/A');
    console.groupEnd();
  }
}