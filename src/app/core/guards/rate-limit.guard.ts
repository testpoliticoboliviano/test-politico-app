import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { TestService } from '../services/api/test.service';

@Injectable({
  providedIn: 'root'
})
export class RateLimitGuard implements CanActivate {
  
  constructor(
    private testService: TestService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    const sessionId = localStorage.getItem('nolan_test_user_id') || 'anonymous';

    return this.testService.checkAvailableTests(sessionId).pipe(
      map(resp => {
        //console.log('checkAvailableTests', resp);
        if (!resp.canTakeTest) {
          this.router.navigate(['/rate-limit-error']);
          return false;
        }
        return true;
      }),
      catchError(() => of(true))
    );
  }
  
}
