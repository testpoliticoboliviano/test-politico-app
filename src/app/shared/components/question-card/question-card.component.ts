// src/app/shared/components/question-card/question-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, NgZone } from '@angular/core';
import { Question, Answer } from '../../../core/models/question.model';
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  selector: 'app-question-card',
  templateUrl: './question-card.component.html',
  styleUrls: ['./question-card.component.scss'],
  animations: [
    trigger('cardState', [
      state('visible', style({
        opacity: 1,
        transform: 'translateY(0)'
      })),
      state('hidden', style({
        opacity: 0,
        transform: 'translateY(50px)'
      })),
      transition('hidden => visible', [
        animate('300ms ease-out')
      ]),
      transition('visible => hidden', [
        animate('300ms ease-in')
      ])
    ])
  ]
})
export class QuestionCardComponent implements OnInit, OnChanges {
  @Input() question!: Question;
  @Input() currentIndex: number = 0;
  @Input() totalQuestions: number = 0;
  @Input() animate: boolean = true;
  
  @Output() answerSelected = new EventEmitter<{
    questionId: string;
    answerId: string;
    question: string;
    answer: string;
    economicScore: number;
    personalScore: number;
  }>();
  
  cardState: 'visible' | 'hidden' = 'hidden';
  selectedAnswerId: string | null = null;
  
  // Temporizador para la animación
  private animationTimer: any = null;
  // Llevar registro del ID de la pregunta actual
  private currentQuestionId: string | null = null;
  
  constructor(
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit() {
    this.currentQuestionId = this.question?.id || null;
    
    // Iniciar animación de entrada
    this.startEntranceAnimation();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    //console.log('QuestionCard: ngOnChanges', changes);
    
    // Verificar si cambió la pregunta
    if (changes['question'] && changes['question'].currentValue) {
      const newQuestion = changes['question'].currentValue as Question;
      const oldQuestionId = this.currentQuestionId;
      
      // Solo reiniciar la animación si el ID de la pregunta cambió
      if (newQuestion.id !== this.currentQuestionId) {
        //console.log(`QuestionCard: Cambio de pregunta: ${oldQuestionId} -> ${newQuestion.id}`);
        this.currentQuestionId = newQuestion.id;
        this.selectedAnswerId = null; // Resetear la respuesta seleccionada
        
        // Reiniciar el estado de la tarjeta para la animación
        this.cardState = 'hidden';
        
        // Forzar actualización para asegurar que se aplica el estado hidden
        this.cdr.detectChanges();
        
        // Iniciar animación de entrada para la nueva pregunta
        this.startEntranceAnimation();
      }
    }
  }
  
  ngOnDestroy() {
    // Limpiar temporizador para evitar memory leaks
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  }
  
  // Método para iniciar la animación de entrada
  private startEntranceAnimation() {
    if (this.animate) {      
      // Limpiar temporizador previo si existe
      if (this.animationTimer) {
        clearTimeout(this.animationTimer);
      }
      
      // Usar setTimeout para la animación
      this.animationTimer = setTimeout(() => {
        this.cardState = 'visible';
        this.cdr.detectChanges();
      }, 100);
    } else {
      this.cardState = 'visible';
    }
  }
  
  selectAnswer(answer: Answer): void {
    this.selectedAnswerId = answer.id;
    
    // Emitimos el evento con la información de la respuesta seleccionada
    this.answerSelected.emit({
      questionId: this.question.id,
      answerId: answer.id,
      question: this.question.text,
      answer: answer.text,
      economicScore: answer.economicScore,
      personalScore: answer.personalScore
    });
    
    // Si está habilitada la animación, ocultamos la tarjeta
    if (this.animate) {      
      setTimeout(() => {
        this.cardState = 'hidden';
        this.cdr.detectChanges();
      }, 200);
    }
  }
  
  getProgressPercentage(): number {
    return ((this.currentIndex) / this.totalQuestions) * 100;
  }
}