import {Component, OnInit} from '@angular/core';
import {Tournoi} from '../../models/tournoi.model';
import {ActivatedRoute, Router} from '@angular/router';
import {TournoiService} from '../../services/tournoi.service';
import {FormBuilder} from '@angular/forms';
import {Joueur} from '../../models/joueur.model';
import firebase from 'firebase';

@Component({
  selector: 'app-afficher-infos-aux-joueurs',
  templateUrl: './afficher-infos-aux-joueurs.component.html',
  styleUrls: ['./afficher-infos-aux-joueurs.component.scss']
})
export class AfficherInfosAuxJoueursComponent implements OnInit {

  tournoi: Tournoi; // Le tournoi sur lequel on travaille
  currentTournamentIndex: number; // Index dans la base du tournoi en cours

  triJoueurs: Joueur[] ;

  constructor(private route: ActivatedRoute,
              private tournoiService: TournoiService,
              private formBuilder: FormBuilder,
              private router: Router) {
  }

  ngOnInit(): void {

    this.tournoi = new Tournoi('', '', +'') ;
    this.currentTournamentIndex = this.route.snapshot.params.id;

    this.tournoiService.getTournois();
    this.tournoiService.emitTournois();

    this.tournoiService.getSingleTournoi(this.currentTournamentIndex).then(
      (tournoi: Tournoi) => {
        this.tournoi = tournoi ;

        if (!this.tournoiService.isAuthor(this.tournoi, firebase.auth().currentUser.email))
        { this.router.navigate(['listetournois']) ; }

        else { this.triJoueurs = this.tournoiService.listeDesJoueursParOrdreAlphabetique(this.tournoi) ; }
      }) ;
  }

  matchResearch(pSearch: number): boolean{
    return true ;
  }

  onBackToRound(): void{
    if (this.tournoi.step === 'rounds')
    { this.router.navigate(['gererronde', this.currentTournamentIndex]); }
    else
    { this.router.navigate(['finalmatches', this.currentTournamentIndex]); }
  }

  onSwitchPairings(): void{
    this.router.navigate(['switchpairings', this.currentTournamentIndex]);
  }

  onOpenJoueurs(): void{
    this.router.navigate(['gererjoueurs', this.currentTournamentIndex]);
  }

  getOpponent(player: number, table: number): string{
  let result = '' ;
  // Le joueur est en position j1
  if (this.tournoi.currentMatches[table - 1].joueur1 === player)
  {
    if (this.tournoi.currentMatches[table - 1].joueur2 !== 15000)
    {
      const opponent = this.getPlayer(this.tournoi.currentMatches[table - 1].joueur2) ;
      result = opponent.firstName + ' ' + opponent.lastName + ' [' + opponent.score + ']' ;
    }
  }
  // Le joueur est en position j2
  else
  {
    const opponent = this.getPlayer(this.tournoi.currentMatches[table - 1].joueur1) ;
    result = opponent.firstName + ' ' + opponent.lastName + ' [' + opponent.score + ']' ;
  }
  return result ;
 }

 getOpponentV2(player: Joueur): string{
    if (player.playingAt !== '***bye***')
    {
      let opponent: Joueur ;
      for (const joueur of this.tournoi.registeredPlayers)
      {
        if (joueur.playerIndexInEvent !== player.playerIndexInEvent && joueur.playingAt === player.playingAt)
        { opponent = joueur ; }
      }

      return opponent.firstName + ' ' + opponent.lastName + ' [' + opponent.score + ']' ;
    }
    else { return '*** bye ***' ; }
 }

  getPlayer(pId: number): Joueur{
    return  this.tournoi.registeredPlayers[pId] ;
  }
}

