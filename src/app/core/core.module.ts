import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

// Servicios
import { FirebaseService } from './services/api/firebase.service';
import { QuestionsService } from './services/api/questions.service';
import { ResultsService } from './services/api/results.service';
import { PoliticalPartiesService } from './services/api/political-parties.service';
import { IdeologyService } from './services/api/ideology.service';
import { UserSessionService } from './services/api/user-session.service';
import { FirebaseCapabilitiesService } from './services/firebase-capabilities.service';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  providers: [
    FirebaseService,
    QuestionsService,
    ResultsService,
    PoliticalPartiesService,
    IdeologyService,
    UserSessionService,
    FirebaseCapabilitiesService
  ]
})
export class CoreModule { }
