import { Component, Input, OnInit } from '@angular/core';
import { Candidate } from 'src/app/core/models/candidate.model';
import { CandidateService } from 'src/app/core/services/api/candidate.service';

@Component({
  selector: 'app-closest-candidates',
  templateUrl: './closest-candidates.component.html',
  styleUrls: ['./closest-candidates.component.scss']
})
export class ClosestCandidatesComponent implements OnInit {

  @Input() economicScore: number = 0;
  @Input() personalScore: number = 0;
  @Input() title: string = 'Candidatos más cercanos a tu posición:';
  @Input() closestBadgeText: string = 'MÁS CERCANO';
  
  candidates: Candidate[] = [];
  defaultImageUrl: string = 'assets/images/default-candidate.png';

  constructor(
    private candidateService: CandidateService
  ) { }

  ngOnInit(): void {
    this.loadCandidates();
  }

  private loadCandidates(): void {
    this.candidateService.getCandidates().subscribe(candidates => {
      this.candidates = this.candidateService.findClosestCandidates(
        candidates,
        this.economicScore,
        this.personalScore,
        3
      );
    });
  }

  onImageError(event: any): void {
    // En caso de error al cargar la imagen, usar imagen por defecto
    event.target.src = this.defaultImageUrl;
    event.target.classList.add('error');
  }

}
