import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Componentes compartidos
import { NolanChartComponent } from './components/nolan-chart/nolan-chart.component';
import { QuestionCardComponent } from './components/question-card/question-card.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { ExampleDirective } from './directives/example.directive';
import { LocationModalComponent } from './components/location-modal/location-modal.component';

@NgModule({
  declarations: [
    NolanChartComponent,
    QuestionCardComponent,
    ProgressBarComponent,
    ExampleDirective,
    LocationModalComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
    // Módulos
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    
    // Componentes
    NolanChartComponent,
    ProgressBarComponent,
    QuestionCardComponent,
    LocationModalComponent
  ]
})
export class SharedModule { }
