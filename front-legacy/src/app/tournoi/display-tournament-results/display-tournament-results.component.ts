import { Component, OnInit } from '@angular/core';
import {Tournoi} from '../../models/tournoi.model';
import {ActivatedRoute, Router} from '@angular/router';
import {TournoiService} from '../../services/tournoi.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Joueur} from '../../models/joueur.model';
import {Match} from '../../models/match.model';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-display-tournament-results',
  templateUrl: './display-tournament-results.component.html',
  styleUrls: ['./display-tournament-results.component.scss']
})
export class DisplayTournamentResultsComponent implements OnInit {

  tournoi: Tournoi; // Le tournoi sur lequel on travaille
  currentTournamentIndex: number; // Index dans la base du tournoi en cours

  joueursDuTournoi: Joueur[] ;
  playerFocus: number ;

  chercherJoueur: FormGroup ;

  infoMsg: string ;
  displayInfoMsg: boolean ;
  displayToPlayers: boolean ;

  constructor(private route: ActivatedRoute,
              private tournoiService: TournoiService,
              private formBuilder: FormBuilder,
              private authService: AuthService,
              private router: Router) { }

  ngOnInit(): void {
    this.tournoi = new Tournoi('', '', +'') ;
    this.currentTournamentIndex = this.route.snapshot.params['id'];

    this.tournoiService.getTournois();
    this.tournoiService.emitTournois();

    this.tournoiService.getSingleTournoi(this.currentTournamentIndex).then(
      (tournoi: Tournoi) => {
        this.tournoi = tournoi ;
        this.joueursDuTournoi = this.tournoi.currentStanding ;
      }) ;

    this.playerFocus = -1 ;

    this.initForm();
  }

  initForm(): void{
    this.chercherJoueur = this.formBuilder.group({
      search: ['', Validators.required]
    }) ;
  }

  onBackToEvents(): void{
    this.router.navigate(['listetournois']);
  }

  setFocusPlayer(focus: number): void{
    this.playerFocus = focus ;
  }
}


