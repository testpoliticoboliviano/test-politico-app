import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IntroComponent } from './features/intro/intro.component';
import { TestComponent } from './features/test/test.component';
import { ResultsComponent } from './features/results/results.component';

const routes: Routes = [
  { path: '', component: IntroComponent },
  { path: 'test', component: TestComponent },
  { path: 'results', component: ResultsComponent },
  { path: '**', redirectTo: '' } // Redirigir a inicio para rutas no encontradas
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
