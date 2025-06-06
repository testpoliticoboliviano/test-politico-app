import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map } from 'rxjs';
import { TestService } from 'src/app/core/services/api/test.service';

@Component({
  selector: 'app-rate-limit-error',
  templateUrl: './rate-limit-error.component.html',
  styleUrls: ['./rate-limit-error.component.scss']
})
export class RateLimitErrorComponent implements OnInit {

  // Propiedades para rate limiting
  canTakeTest = true;
  remainingTests = -1;
  rateLimitMessage = '';

  constructor(
    private testService: TestService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const sessionId = localStorage.getItem('nolan_test_user_id') || '';
    // Verificar rate limit al cargar la página
    this.checkUserRateLimit(sessionId);
  }

  private checkUserRateLimit(sessionId: string) {
    this.testService.checkAvailableTests(sessionId).subscribe({
      next: (resp) => {
        //console.log('status', resp);
        if(!resp.canTakeTest) {
          this.canTakeTest = resp.canTakeTest;
          //this.remainingTests = resp.availableTests;
          const resetDate = new Date(resp.resetTime);
          this.rateLimitMessage = 'Has alcanzado el límite de tests. Podrás realizar otro después de '+resetDate.toLocaleString()+'.';
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        this.canTakeTest = true;
        //this.remainingTests = 5;
        this.rateLimitMessage = 'Ocurrio un erros intentalo mas tarde '+error;
      }
    });
  }

  goToHome(): void {
    this.router.navigate(['/']); // Navega a la ruta inicial
  }

}
