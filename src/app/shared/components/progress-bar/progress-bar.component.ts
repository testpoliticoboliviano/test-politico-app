// src/app/shared/components/progress-bar/progress-bar.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  animations: [
    trigger('progressAnimation', [
      transition('* => *', [
        style({ width: '{{prevWidth}}%' }),
        animate('{{animationDuration}}ms ease-out', style({ width: '{{width}}%' }))
      ], { params: { prevWidth: 0, width: 0, animationDuration: 300 } })
    ])
  ]
})
export class ProgressBarComponent implements OnChanges {
  @Input() progress: number = 0;
  @Input() maxValue: number = 100;
  @Input() showPercentage: boolean = true;
  @Input() height: string = '10px';
  @Input() color: string = '#007bff';
  @Input() backgroundColor: string = '#e9ecef';
  
  // Propiedad para el binding directo
  progressPercentage: number = 0;
  
  ngOnChanges(changes: SimpleChanges) {
    // Recalcula el porcentaje cuando cambia progress o maxValue
    if (changes['progress'] || changes['maxValue']) {
      this.calculatePercentage();
    }
  }
  
  // Calcula y almacena el porcentaje
  private calculatePercentage(): void {
    // Prevenir división por cero
    if (this.maxValue <= 0) {
      this.progressPercentage = 0;
      return;
    }
    
    // Asegurar que progress esté en el rango correcto
    const validProgress = Math.max(0, Math.min(this.progress, this.maxValue));
    
    // Calcular y redondear el porcentaje
    this.progressPercentage = Math.round((validProgress / this.maxValue) * 100);
    
    // Log para depuración
    //console.log(`ProgressBar: ${this.progress}/${this.maxValue} = ${this.progressPercentage}%`);
  }
}