// src/app/shared/components/nolan-chart/nolan-chart.component.ts
import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { Ideology, IdeologyType } from '../../../core/models/ideology.model';
import { IdeologyService } from 'src/app/core/services/api/ideology.service';

@Component({
  selector: 'app-nolan-chart',
  templateUrl: './nolan-chart.component.html',
  styleUrls: ['./nolan-chart.component.scss']
})
export class NolanChartComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() economicScore: number = 0;
  @Input() personalScore: number = 0;
  @Input() ideologyType: IdeologyType | null = null;
  @Input() showLabels: boolean = true;
  @Input() interactive: boolean = false;

  ctx!: CanvasRenderingContext2D;
  ideologies: Ideology[] = [];
  canvasSize = { width: 0, height: 0 };
  
  // Dimensiones del gráfico
  chartPadding = 40;
  axisWidth = 2;
  pointRadius = 8;
  
  // Etiquetas de los ejes
  axisLabels = {
    economic: {
      min: 'Colectivismo Económico',
      max: 'Libertad Económica'
    },
    personal: {
      min: 'Autoritarismo Social',
      max: 'Libertad Personal'
    }
  };
  
  constructor(private ideologyService: IdeologyService) { }

  ngOnInit(): void {
    this.ideologies = this.ideologyService.getIdeologies();
  }
  
  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.drawChart();
  }
  
  private initializeCanvas(): void {
    const canvas = this.chartCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    // Ajustamos el tamaño del canvas para que sea responsivo
    const container = canvas.parentElement;
    if (container) {
      // Hacemos el canvas cuadrado
      const size = Math.min(container.clientWidth, 500);
      canvas.width = size;
      canvas.height = size;
      this.canvasSize = { width: size, height: size };
    }
    
    // Para dispositivos con alta densidad de píxeles
    const dpr = window.devicePixelRatio || 1;
    if (dpr > 1) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
  }
  
  private drawChart(): void {
    const { width, height } = this.canvasSize;
    const ctx = this.ctx;
    
    // Limpiamos el canvas
    ctx.clearRect(0, 0, width, height);
    
    // Dibujamos el fondo
    this.drawBackground();
    
    // Dibujamos los ejes
    this.drawAxes();
    
    // Dibujamos las regiones de ideología
    this.drawIdeologyRegions();
    
    // Dibujamos las etiquetas si están habilitadas
    if (this.showLabels) {
      this.drawAxisLabels();
    }
    
    // Dibujamos el punto del usuario
    this.drawUserPosition();
  }
  
  private drawBackground(): void {
    const { width, height } = this.canvasSize;
    const ctx = this.ctx;
    
    // Fondo blanco
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Dibujamos cuadrícula de fondo
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    
    const gridSize = (width - (this.chartPadding * 2)) / 10;
    
    // Líneas horizontales
    for (let i = 0; i <= 10; i++) {
      const y = this.chartPadding + (i * gridSize);
      ctx.beginPath();
      ctx.moveTo(this.chartPadding, y);
      ctx.lineTo(width - this.chartPadding, y);
      ctx.stroke();
    }
    
    // Líneas verticales
    for (let i = 0; i <= 10; i++) {
      const x = this.chartPadding + (i * gridSize);
      ctx.beginPath();
      ctx.moveTo(x, this.chartPadding);
      ctx.lineTo(x, height - this.chartPadding);
      ctx.stroke();
    }
  }
  
  private drawAxes(): void {
    const { width, height } = this.canvasSize;
    const ctx = this.ctx;
    
    // Estilo de los ejes
    ctx.strokeStyle = '#343a40';
    ctx.lineWidth = this.axisWidth;
    
    // Eje X (Económico)
    ctx.beginPath();
    ctx.moveTo(this.chartPadding, height - this.chartPadding);
    ctx.lineTo(width - this.chartPadding, height - this.chartPadding);
    ctx.stroke();
    
    // Eje Y (Personal)
    ctx.beginPath();
    ctx.moveTo(this.chartPadding, height - this.chartPadding);
    ctx.lineTo(this.chartPadding, this.chartPadding);
    ctx.stroke();
    
    // Marcas en los ejes
    ctx.fillStyle = '#343a40';
    const gridSize = (width - (this.chartPadding * 2)) / 10;
    
    // Marcas eje X
    for (let i = 0; i <= 10; i++) {
      const x = this.chartPadding + (i * gridSize);
      ctx.beginPath();
      ctx.moveTo(x, height - this.chartPadding);
      ctx.lineTo(x, height - this.chartPadding + 5);
      ctx.stroke();
      
      if (i % 2 === 0) {
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(i * 10), x, height - this.chartPadding + 15);
      }
    }
    
    // Marcas eje Y
    for (let i = 0; i <= 10; i++) {
      const y = height - this.chartPadding - (i * gridSize);
      ctx.beginPath();
      ctx.moveTo(this.chartPadding, y);
      ctx.lineTo(this.chartPadding - 5, y);
      ctx.stroke();
      
      if (i % 2 === 0) {
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(String(i * 10), this.chartPadding - 10, y + 3);
      }
    }
  }
  
  private drawIdeologyRegions(): void {
    const { width, height } = this.canvasSize;
    const ctx = this.ctx;
    const chartArea = width - (this.chartPadding * 2);
    
    // Dibujamos cada región de ideología
    this.ideologies.forEach(ideology => {
      const minX = this.chartPadding + (ideology.economicRange.min / 100) * chartArea;
      const maxX = this.chartPadding + (ideology.economicRange.max / 100) * chartArea;
      const minY = height - this.chartPadding - (ideology.personalRange.max / 100) * chartArea;
      const maxY = height - this.chartPadding - (ideology.personalRange.min / 100) * chartArea;
      
      // Dibujamos el rectángulo de la región
      ctx.fillStyle = ideology.color + '80'; // Añadimos transparencia
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      
      // Añadimos el nombre de la ideología
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(
        ideology.name,
        minX + ((maxX - minX) / 2),
        minY + ((maxY - minY) / 2)
      );
    });
  }
  
  private drawAxisLabels(): void {
    const { width, height } = this.canvasSize;
    const ctx = this.ctx;
    
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#495057';
    
    // Etiqueta eje X (Económico)
    ctx.textAlign = 'center';
    ctx.fillText(
      this.axisLabels.economic.max,
      width - this.chartPadding,
      height - 10
    );
    ctx.fillText(
      this.axisLabels.economic.min,
      this.chartPadding,
      height - 10
    );
    
    // Etiqueta eje Y (Personal)
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(
      `${this.axisLabels.personal.min} ← → ${this.axisLabels.personal.max}`,
      -100,
      0
    );
    ctx.restore();
  }

  /** */
  private normalizeScore(score: number): number {
    // Asumimos que el rango de puntuaciones posibles es conocido
    // Por ejemplo, si cada pregunta tiene 5 respuestas con valores -2 a +2
    // y hay 10 preguntas, el rango sería -20 a +20
    const MIN_POSSIBLE_SCORE = -40;
    const MAX_POSSIBLE_SCORE = 40;
    const SCORE_RANGE = MAX_POSSIBLE_SCORE - MIN_POSSIBLE_SCORE;

    console.log('SCORE_RANGE', SCORE_RANGE);    
    console.log('return', ((score - MIN_POSSIBLE_SCORE) / SCORE_RANGE) * 100);    

    // Normalizar al rango 0-100
    return ((score - MIN_POSSIBLE_SCORE) / SCORE_RANGE) * 100;
  }
  /** */
  
  private drawUserPosition(): void {
    if (this.economicScore === 0 && this.personalScore === 0) {
      return;
    }
    
    const { width, height } = this.canvasSize;
    const ctx = this.ctx;
    const chartArea = width - (this.chartPadding * 2);
    
    // Normalizamos los valores si es necesario
    /* const economicPercent = Math.min(Math.max(this.economicScore, 0), 100);
    const personalPercent = Math.min(Math.max(this.personalScore, 0), 100); */
    const economicScoreNormalize = this.normalizeScore(this.economicScore);
    const personalScoreNormalize = this.normalizeScore(this.personalScore);
    const economicPercent = Math.min(Math.max(economicScoreNormalize, 0), 100);
    const personalPercent = Math.min(Math.max(personalScoreNormalize, 0), 100);

    console.log('this.economicScore: '+this.economicScore+' economicScoreNormalize: '+economicScoreNormalize+' economicPercent: '+economicPercent);    
    console.log('this.personalScore: '+this.economicScore+' personalScoreNormalize: '+personalScoreNormalize+' personalPercent: '+personalPercent);    
    
    // Calculamos la posición en el canvas
    const x = this.chartPadding + (economicPercent / 100) * chartArea;
    const y = height - this.chartPadding - (personalPercent / 100) * chartArea;
    
    // Dibujamos líneas de referencia
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = '#6c757d';
    ctx.lineWidth = 1;
    
    // Línea horizontal
    ctx.beginPath();
    ctx.moveTo(this.chartPadding, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Línea vertical
    ctx.beginPath();
    ctx.moveTo(x, height - this.chartPadding);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Dibujamos el punto del usuario
    ctx.beginPath();
    ctx.arc(x, y, this.pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#dc3545';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Etiqueta con la ideología
    if (this.ideologyType) {
      const ideology = this.ideologyService.getIdeologyByType(this.ideologyType);
      if (ideology) {
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Tu posición: ${ideology.name}`,
          width / 2,
          this.chartPadding / 2
        );
      }
    }
  }
  
  // Método público para redibujar el gráfico (por ejemplo, en caso de cambio de tamaño)
  public redraw(): void {
    this.initializeCanvas();
    this.drawChart();
  }

  // src/app/shared/components/nolan-chart/nolan-chart.component.ts
  // Añadir estos métodos a la clase NolanChartComponent

  // Métodos para la funcionalidad interactiva
  onEconomicSliderChange(event: Event): void {
    const slider = event.target as HTMLInputElement;
    this.economicScore = parseInt(slider.value, 10);
    
    // Recalculamos la ideología si están definidos ambos valores
    if (this.personalScore > 0) {
      this.recalculateIdeology();
    }
    
    // Redibujamos el gráfico
    this.drawChart();
  }

  onPersonalSliderChange(event: Event): void {
    const slider = event.target as HTMLInputElement;
    this.personalScore = parseInt(slider.value, 10);
    
    // Recalculamos la ideología si están definidos ambos valores
    if (this.economicScore > 0) {
      this.recalculateIdeology();
    }
    
    // Redibujamos el gráfico
    this.drawChart();
  }

  private recalculateIdeology(): void {
    this.ideologyType = this.ideologyService.calculateIdeology(
      this.economicScore,
      this.personalScore
    );
  }

  // Métodos para responsive
  @HostListener('window:resize')
  onResize(): void {
    this.redraw();
  }

}