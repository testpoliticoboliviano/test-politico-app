import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent implements OnInit {

  errorMessage: string = 'Ha ocurrido un error.';
  isDanger: boolean = true;

  constructor(private router: Router) {}

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.errorMessage = navigation.extras.state['message'] || this.errorMessage;
      this.isDanger = navigation.extras.state['danger'] || this.isDanger;
    }
  }

  goToHome(): void {
    this.router.navigate(['/']); // Navega a la ruta inicial
  }

}
