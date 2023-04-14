import {Component, OnInit} from '@angular/core';
import {Tournoi} from '../../models/tournoi.model';
import {TournoiService} from '../../services/tournoi.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DeckInEvent} from '../../models/deckInEvent';
import {Joueur} from '../../models/joueur.model';
import firebase from 'firebase';

@Component({
  selector: 'app-display-metagame',
  templateUrl: './display-metagame.component.html',
  styleUrls: ['./display-metagame.component.scss']
})
export class DisplayMetagameComponent implements OnInit {

  tournoi: Tournoi; // Le tournoi sur lequel on travaille
  currentTournamentIndex: number; // Index dans la base du tournoi en cours

  metagame: DeckInEvent[] = [] ;
  deckFocus: number ;
  displaypilots: number[] ;
  deckFocusName: string ;
  deckFocusImg: string ;

  constructor(private tournoiService: TournoiService,
              private route: ActivatedRoute,
              private router: Router
              ) { }

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

        else { this.getMetagame() ; }
      }) ;

    this.deckFocus = -1 ;
    this.deckFocusName = '' ;
    this.displaypilots = [] ;
  }

  getMetagame(): void{
    let exists = -1 ;
    let numberOfX = 0 ;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.tournoi.registeredPlayers.length ; i++)
    {
      exists = this.checkIfDeckAlreadyExists(this.tournoi.registeredPlayers[i].commander) ;

      if (exists === -1)
      {
        if (this.tournoi.registeredPlayers[i].commander !== 'x')
        {
          this.metagame.push(new DeckInEvent(
            this.tournoi.registeredPlayers[i].commander, this.tournoi.registeredPlayers[i].commanderImgUrl));
          this.metagame[this.metagame.length - 1].deckImgUrl = this.tournoi.registeredPlayers[i].commanderImgUrl ;
        }
        else
        { numberOfX++ ; }
      }

      else
      { this.metagame[exists].numberOfPlayers++ ; }
    }

    this.metagame = this.sortMetagame(this.metagame) ;

    if (numberOfX > 0)
    {
      this.metagame.push(new DeckInEvent('x', 'x')) ;
      this.metagame[this.metagame.length - 1].numberOfPlayers = numberOfX ;
    }
  }

  checkIfDeckAlreadyExists(deckname: string): number{
    let alreadyExists = -1 ;
    for (let i = 0 ; i < this.metagame.length ; i++)
    {
      if (this.metagame[i].deckName === deckname)
      {
        alreadyExists = i ;
        i = this.metagame.length ;
      }
    }
    return alreadyExists ;
  }

  sortMetagame(decks: DeckInEvent[]): any{
    // tslint:disable-next-line:only-arrow-functions
    return decks.sort(function(a, b): any {
      return b.numberOfPlayers - a.numberOfPlayers;
    }) ;
  }

  getDeckPilots(deck: DeckInEvent): Joueur[]{
    const pilots: Joueur[] = [];

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.tournoi.registeredPlayers.length ; i++)
    {
      if (this.tournoi.registeredPlayers[i].commander === deck.deckName)
      { pilots.push(this.tournoi.registeredPlayers[i]) ; }
    }

    return pilots ;
  }

  onBackToRound(): void{
    if (this.tournoi.step === 'rounds')
    { this.router.navigate(['gererronde', this.currentTournamentIndex]); }
    else
    { this.router.navigate(['finalmatches', this.currentTournamentIndex]); }
  }

  onSetFocus(nb: number): void{
    this.deckFocus = nb ;
    this.deckFocusName = this.metagame[nb].deckName ;
    this.deckFocusImg = this.metagame[nb].deckImgUrl ;
  }

  hidepilots(id: number): void{
    let place = 0 ;

    for (let i = 0 ; i < this.displaypilots.length ; i++)
    {
      if (id === this.displaypilots[i])
      { place = i ; }
    }
    this.displaypilots.splice(place, 1) ;
  }

  checkDisplayPilot(id: number): boolean{
    let display = false ;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.displaypilots.length ; i++)
    {
      if (id === this.displaypilots[i])
      { display = true ; }
    }
    return display ;
  }

  getPlayerMatchUps(pId: number): any{
    if (this.tournoi.rondeEnCours > 1)
    {
      const matchups: string[] = [] ;

      for (let i = 0 ; i < this.tournoi.registeredPlayers[pId].previousOpponents.length ; i++)
      {
        if (this.tournoi.registeredPlayers[pId].previousOpponents[i] !== 15000)
        { matchups.push(this.checkWin(pId, i)) ; }
        else { matchups.push('*** bye ***') ; }
      }
      return matchups ;
    }
    else { return [] ; }
  }

  checkWin(pId: number, roundNumber: number): string{
    let table = 0 ;

    for (const matches of this.tournoi.rondes[roundNumber].matches)
    {
      if (matches.joueur1 === pId || matches.joueur2 === pId)
      { table = matches.table - 1 ; }
    }

    if (pId === this.tournoi.rondes[roundNumber].matches[table].joueur1)
    {
      return this.tournoi.rondes[roundNumber].matches[table].scoreJ1 + ' - ' +  this.tournoi.rondes[roundNumber].matches[table].scoreJ2
      + ' VS ' + this.getPlayer(this.tournoi.rondes[roundNumber].matches[table].joueur2).commander ;
    }
    else
    {
      return this.tournoi.rondes[roundNumber].matches[table].scoreJ2 + ' - ' +  this.tournoi.rondes[roundNumber].matches[table].scoreJ1
        + ' VS ' + this.getPlayer(this.tournoi.rondes[roundNumber].matches[table].joueur1).commander ;
    }
  }

  getPlayer(pId: number): Joueur{
    return this.tournoiService.getPlayer(pId, this.tournoi) ;
  }
}
