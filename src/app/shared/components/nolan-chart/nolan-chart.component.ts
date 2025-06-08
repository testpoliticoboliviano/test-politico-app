// src/app/shared/components/nolan-chart/nolan-chart.component.ts
import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener, Output, EventEmitter } from '@angular/core';
import { Ideology, IdeologyType } from '../../../core/models/ideology.model';
import { IdeologyService } from 'src/app/core/services/api/ideology.service';
import { FunctionsService } from 'src/app/core/services/functions.service';
import { Candidate } from 'src/app/core/models/candidate.model';
import { Subscription } from 'rxjs';
import { CandidateService } from 'src/app/core/services/api/candidate.service';

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
  @Input() interactive: boolean = false;
  @Input() showLabels: boolean = true;
  @Input() showCalibration: boolean = false;
  
  ctx!: CanvasRenderingContext2D;
  ideologies: Ideology[] = [];
  canvasSize = { width: 0, height: 0 };
  
  // Imagen de fondo
  chartImage: HTMLImageElement = new Image();
  imageLoaded: boolean = false;
  
  // Límites del gráfico en el canvas
  private chartBounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
  };

  // Límites de visualización de la imagen
  private imageDisplayBounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  
  pointRadius = 8;
  
  constructor(
    private ideologyService: IdeologyService,
    private utilFunctions: FunctionsService
  ) { }

  ngOnInit(): void {
    this.ideologies = this.ideologyService.getIdeologies();
    this.loadChartImage();
  }
  
  ngAfterViewInit(): void {
    this.initializeCanvas();
    if (this.imageLoaded) {
      this.drawChart();
    }
  }

  ngOnDestroy(): void {
    // Limpiar recursos si es necesario
  }

  private loadChartImage(): void {
    this.chartImage.onload = () => {
      this.imageLoaded = true;
      this.updateChartBounds();
      this.drawChart();
    };
    
    this.chartImage.onerror = () => {
      console.error('Error al cargar la imagen del diagrama');
      // Fallback: usar imagen placeholder o generar gráfico programáticamente
      this.createFallbackChart();
    };
    
    // Ruta a tu imagen del diagrama de Nolan
    this.chartImage.src = 'assets/images/nolan-chart-background.png';
  }

  private createFallbackChart(): void {
    // Crear una imagen simple como fallback si no se carga la imagen principal
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    
    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 500, 500);
    
    // Dibujar ejes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Eje X
    ctx.beginPath();
    ctx.moveTo(50, 450);
    ctx.lineTo(450, 450);
    ctx.stroke();
    
    // Eje Y
    ctx.beginPath();
    ctx.moveTo(50, 450);
    ctx.lineTo(50, 50);
    ctx.stroke();
    
    // Convertir canvas a imagen
    this.chartImage.src = canvas.toDataURL();
  }

  private updateChartBounds(): void {
    const { width, height } = this.canvasSize;
    
    // Calcular cómo se muestra la imagen en el canvas
    const imageAspectRatio = this.chartImage.width / this.chartImage.height;
    const canvasAspectRatio = width / height;
    
    let displayWidth, displayHeight, offsetX, offsetY;
    
    if (canvasAspectRatio > imageAspectRatio) {
      // Canvas es más ancho que la imagen
      displayHeight = height * 0.9; // 90% del alto del canvas
      displayWidth = displayHeight * imageAspectRatio;
      offsetX = (width - displayWidth) / 2;
      offsetY = (height - displayHeight) / 2;
    } else {
      // Canvas es más alto que la imagen
      displayWidth = width * 0.9; // 90% del ancho del canvas
      displayHeight = displayWidth / imageAspectRatio;
      offsetX = (width - displayWidth) / 2;
      offsetY = (height - displayHeight) / 2;
    }
    
    // Guardar las dimensiones de visualización de la imagen
    this.imageDisplayBounds = {
      x: offsetX,
      y: offsetY,
      width: displayWidth,
      height: displayHeight
    };
    
    // 🎯 AJUSTA ESTOS VALORES SEGÚN TU IMAGEN ESPECÍFICA
    const chartAreaPercentages = {
      leftMargin: 0.01,    // Porcentaje desde la izquierda donde empieza el gráfico
      topMargin: 0.03,     // Porcentaje desde arriba donde empieza el gráfico
      rightMargin: 0.03,   // Porcentaje desde la derecha donde termina el gráfico
      bottomMargin: 0.05   // Porcentaje desde abajo donde termina el gráfico
    };
    
    // Calcular los límites exactos del área del gráfico
    this.chartBounds = {
      left: offsetX + (displayWidth * chartAreaPercentages.leftMargin),
      top: offsetY + (displayHeight * chartAreaPercentages.topMargin),
      width: displayWidth * (1 - chartAreaPercentages.leftMargin - chartAreaPercentages.rightMargin),
      height: displayHeight * (1 - chartAreaPercentages.topMargin - chartAreaPercentages.bottomMargin)
    };
  }

  private initializeCanvas(): void {
    const canvas = this.chartCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    const container = canvas.parentElement;
    if (container) {
      const size = Math.min(container.clientWidth, 1200);
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
    if (!this.imageLoaded) return;
    
    const ctx = this.ctx;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    
    // Actualizar límites del gráfico
    this.updateChartBounds();
    
    // Dibujar imagen de fondo
    this.drawBackgroundImage();
    
    // Mostrar overlay de calibración si está activado
    if (this.showCalibration) {
      this.drawCalibrationOverlay();
    }
    
    // Si no estamos en modo calibración, solo dibujar la posición del usuario
    if (!this.showCalibration && (this.economicScore > 0 || this.personalScore > 0)) {
      this.drawUserPosition();
    }
  }

  private drawBackgroundImage(): void {
    const ctx = this.ctx;
    
    // Dibujar la imagen centrada en el canvas
    ctx.drawImage(
      this.chartImage,
      this.imageDisplayBounds.x,
      this.imageDisplayBounds.y,
      this.imageDisplayBounds.width,
      this.imageDisplayBounds.height
    );
  }

  // 🔧 MÉTODO DE CALIBRACIÓN TEMPORAL
  private drawCalibrationOverlay(): void {
    const ctx = this.ctx;
    
    // Dibujar el área del gráfico detectada (rectángulo rojo)
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      this.chartBounds.left, 
      this.chartBounds.top, 
      this.chartBounds.width, 
      this.chartBounds.height
    );
    
    // Dibujar líneas de referencia para los ejes (líneas verdes)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    
    // Líneas verticales cada 25% para el eje económico
    for (let i = 0; i <= 4; i++) {
      const x = this.chartBounds.left + (i / 4) * this.chartBounds.width;
      ctx.beginPath();
      ctx.moveTo(x, this.chartBounds.top);
      ctx.lineTo(x, this.chartBounds.top + this.chartBounds.height);
      ctx.stroke();
      
      // Etiqueta económica
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      
      // Fondo blanco para etiqueta
      const text = `E:${i * 25}%`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - textWidth/2 - 2, this.chartBounds.top - 25, textWidth + 4, 16);
      
      ctx.fillStyle = '#ff0000';
      ctx.fillText(text, x, this.chartBounds.top - 12);
    }
    
    // Líneas horizontales cada 25% para el eje personal
    for (let i = 0; i <= 4; i++) {
      const y = this.chartBounds.top + (i / 4) * this.chartBounds.height;
      ctx.beginPath();
      ctx.moveTo(this.chartBounds.left, y);
      ctx.lineTo(this.chartBounds.left + this.chartBounds.width, y);
      ctx.stroke();
      
      // Etiqueta personal (invertida porque Y crece hacia abajo)
      const text = `P:${(4 - i) * 25}%`;
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'right';
      
      // Fondo blanco para etiqueta
      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.chartBounds.left - textWidth - 15, y - 8, textWidth + 10, 16);
      
      ctx.fillStyle = '#ff0000';
      ctx.fillText(text, this.chartBounds.left - 8, y + 4);
    }
    
    // Puntos de prueba en posiciones conocidas (ahora rotados)
    const testPoints = [
      { x: 0, y: 0, color: '#ff0000', label: 'E:0,P:0 (Centro-Abajo)' },
      { x: 100, y: 0, color: '#00ff00', label: 'E:100,P:0 (Derecha)' },
      { x: 0, y: 100, color: '#0000ff', label: 'E:0,P:100 (Izquierda)' },
      { x: 100, y: 100, color: '#ffff00', label: 'E:100,P:100 (Centro-Arriba)' },
      { x: 50, y: 50, color: '#ff00ff', label: 'E:50,P:50 (Centro)' },
      // Puntos adicionales para verificar la rotación
      { x: 75, y: 25, color: '#00ffff', label: 'E:75,P:25 (Conservador)' },
      { x: 25, y: 75, color: '#ffa500', label: 'E:25,P:75 (Progresista)' }
    ];
    
    testPoints.forEach(point => {
      const pos = this.calculatePosition(point.x, point.y);
      
      // Dibujar círculo de prueba
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = point.color;
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Etiqueta del punto
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      
      // Fondo blanco para la etiqueta
      const textWidth = ctx.measureText(point.label).width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pos.x - textWidth/2 - 3, pos.y - 28, textWidth + 6, 16);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x - textWidth/2 - 3, pos.y - 28, textWidth + 6, 16);
      
      ctx.fillStyle = '#000000';
      ctx.fillText(point.label, pos.x, pos.y - 15);
    });
    
    // Panel de información de depuración
    const panelWidth = 280;
    const panelHeight = 160;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(10, 10, panelWidth, panelHeight);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, panelWidth, panelHeight);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`🔧 MODO CALIBRACIÓN`, 20, 30);
    
    ctx.font = '12px Arial';
    ctx.fillText(`Chart Bounds:`, 20, 50);
    ctx.fillText(`• Left: ${this.chartBounds.left.toFixed(1)}px`, 25, 65);
    ctx.fillText(`• Top: ${this.chartBounds.top.toFixed(1)}px`, 25, 80);
    ctx.fillText(`• Width: ${this.chartBounds.width.toFixed(1)}px`, 25, 95);
    ctx.fillText(`• Height: ${this.chartBounds.height.toFixed(1)}px`, 25, 110);
    
    ctx.fillText(`Canvas: ${this.canvasSize.width}x${this.canvasSize.height}`, 20, 130);
    ctx.fillText(`Image: ${this.chartImage.width}x${this.chartImage.height}`, 20, 145);
    
    // Instrucciones
    ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
    ctx.fillRect(10, this.canvasSize.height - 80, panelWidth + 50, 70);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, this.canvasSize.height - 80, panelWidth + 50, 70);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`📋 INSTRUCCIONES:`, 20, this.canvasSize.height - 60);
    ctx.font = '11px Arial';
    ctx.fillText(`1. El rectángulo ROJO debe coincidir con el área del gráfico`, 20, this.canvasSize.height - 45);
    ctx.fillText(`2. Los círculos deben estar en las posiciones correctas`, 20, this.canvasSize.height - 30);
    ctx.fillText(`3. Ajusta los valores en updateChartBounds()`, 20, this.canvasSize.height - 15);
  }

  private drawUserPosition2(): void {
    if (this.economicScore === 0 && this.personalScore === 0) {
      return;
    }
    
    const ctx = this.ctx;
    const position = this.calculatePosition(this.economicScore, this.personalScore);
    
    // Dibujar sombra del punto
    ctx.beginPath();
    ctx.arc(position.x + 3, position.y + 3, this.pointRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
    
    // Círculo exterior blanco (más grande)
    ctx.beginPath();
    ctx.arc(position.x, position.y, this.pointRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0f3b41';
    ctx.fill();
    ctx.strokeStyle = '#0f3b41';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Círculo medio
    ctx.beginPath();
    ctx.arc(position.x, position.y, this.pointRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f3b41';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Punto central para máxima precisión
    ctx.beginPath();
    ctx.arc(position.x, position.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0f3b41';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Etiqueta "TU POSICIÓN" con máximo contraste
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    const labelY = position.y - this.pointRadius - 15;
    
    // Sombra del texto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    //ctx.fillText('TU POSICIÓN', position.x + 2, labelY + 2);
    ctx.fillText('', position.x + 2, labelY + 2);
    
    // Contorno blanco del texto (más grueso)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    //ctx.strokeText('TU POSICIÓN', position.x, labelY);
    ctx.strokeText('', position.x, labelY);
    
    // Texto principal
    ctx.fillStyle = '#dc3545';
    //ctx.fillText('TU POSICIÓN', position.x, labelY);
    ctx.fillText('', position.x, labelY);
  }

  private drawUserPosition(): void {
    if (this.economicScore === 0 && this.personalScore === 0) {
      return;
    }
    
    const ctx = this.ctx;
    const position = this.calculatePosition(this.economicScore, this.personalScore);
    
    // Dibujar sombra del punto
    /* ctx.beginPath();
    ctx.arc(position.x + 3, position.y + 3, this.pointRadius + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill(); */
    
    // Primer círculo: Azul profundo (#0f3b41)
    ctx.beginPath();
    ctx.arc(position.x, position.y, this.pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f3b41';
    ctx.fill();
    
    // Segundo círculo: Blanco
    ctx.beginPath();
    ctx.arc(position.x, position.y, this.pointRadius * 0.7, 0, Math.PI * 2); // 70% del tamaño base
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Tercer círculo: Azul profundo (#0f3b41) - centro
    ctx.beginPath();
    ctx.arc(position.x, position.y, this.pointRadius * 0.4, 0, Math.PI * 2); // 40% del tamaño base
    ctx.fillStyle = '#0f3b41';
    ctx.fill();
    /*
    // Etiqueta "TU POSICIÓN" con máximo contraste
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    const labelY = position.y - this.pointRadius - 15;
    
    // Sombra del texto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    //ctx.fillText('TU POSICIÓN', position.x + 2, labelY + 2);
    ctx.fillText('', position.x + 2, labelY + 2);
    
    // Contorno blanco del texto (más grueso)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    //ctx.strokeText('TU POSICIÓN', position.x, labelY);
    ctx.strokeText('', position.x, labelY);
    
    // Texto principal
    ctx.fillStyle = '#dc3545';
    //ctx.fillText('TU POSICIÓN', position.x, labelY);
    ctx.fillText('', position.x, labelY);*/
  }

  private calculatePosition(economicScore: number, personalScore: number): { x: number, y: number } {
    // Asegurar que los valores están en el rango 0-100
    const economic = Math.max(0, Math.min(100, economicScore));
    const personal = Math.max(0, Math.min(100, personalScore));
    
    // Convertir porcentajes a coordenadas normalizadas (-1 a 1)
    const normalizedEconomic = (economic / 100) * 2 - 1;  // -1 a 1
    const normalizedPersonal = (personal / 100) * 2 - 1;  // -1 a 1
    
    // Aplicar rotación de 45 grados (π/4 radianes)
    const angle = Math.PI / 4; // 45 grados
    const cos45 = Math.cos(angle);
    const sin45 = Math.sin(angle);
    
    // Rotar los puntos
    const rotatedX = normalizedEconomic * cos45 - normalizedPersonal * sin45;
    const rotatedY = normalizedEconomic * sin45 + normalizedPersonal * cos45;
    
    // Calcular el centro del área del gráfico
    const centerX = this.chartBounds.left + this.chartBounds.width / 2;
    const centerY = this.chartBounds.top + this.chartBounds.height / 2;
    
    // Escalar para que quepa en el área del gráfico (usar el 70% del área disponible)
    const scale = Math.min(this.chartBounds.width, this.chartBounds.height) * 0.35;
    
    // Convertir coordenadas rotadas a coordenadas de canvas
    const x = centerX + rotatedX * scale;
    const y = centerY - rotatedY * scale; // Invertir Y porque canvas Y crece hacia abajo
    
    return { x, y };
  }

  // Métodos de interacción
  onEconomicSliderChange(event: Event): void {
    const slider = event.target as HTMLInputElement;
    this.economicScore = parseInt(slider.value, 10);
    
    if (this.personalScore > 0) {
      this.recalculateIdeology();
    }
        
    this.drawChart();
  }

  onPersonalSliderChange(event: Event): void {
    const slider = event.target as HTMLInputElement;
    this.personalScore = parseInt(slider.value, 10);
    
    if (this.economicScore > 0) {
      this.recalculateIdeology();
    }
    
    this.drawChart();
  }

  private recalculateIdeology(): void {
    const newIdeology = this.ideologyService.calculateIdeology(
      this.economicScore,
      this.personalScore
    );
    
    if (newIdeology !== this.ideologyType) {
      this.ideologyType = newIdeology;
    }
  }

  public redraw(): void {
    this.initializeCanvas();
    if (this.imageLoaded) {
      this.updateChartBounds();
      this.drawChart();
    }
  }

  // Método para activar/desactivar calibración desde el template
  toggleCalibration(): void {
    this.showCalibration = !this.showCalibration;
    this.drawChart();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.redraw();
  }

}